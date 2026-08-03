/**
 * Device-local vault storage.
 *
 * Every record that identifies a person — members, families, attendance
 * registers, prayer requests, the audit trail — lives here and only here.
 * It is never committed to the repository and never sent anywhere.
 *
 * On disk (IndexedDB) the whole vault is one AES-256-GCM envelope, so a
 * shared or stolen machine yields ciphertext rather than the church register.
 * It is decrypted into memory on unlock and re-encrypted on every save.
 *
 * Whole-vault re-encryption per save is intentional: it keeps the format a
 * single self-describing envelope that the backup file and the database share,
 * and at church scale (a few thousand members) AES-GCM does the work in
 * single-digit milliseconds.
 */

import { decryptJson, encryptJson, WrongPassphraseError } from './crypto'
import type {
  AttendanceGroup,
  AttendanceRecord,
  AuditEntry,
  EncryptedEnvelope,
  Member,
  VaultData,
} from './types'
import { newId, nowIso } from './utils'

const DB_NAME = 'fbc-agbede'
const DB_VERSION = 1
const STORE = 'vault'
const VAULT_KEY = 'vault-envelope'
const SETTINGS_KEY = 'device-settings'

/** Passphrase held here (not localStorage) so closing the tab locks the vault. */
const SESSION_PASS_KEY = 'fbc.session.pass'

/**
 * Schema version of the vault *contents*, not of IndexedDB.
 *
 * Bump this whenever a field is added that existing code assumes is present.
 * `normaliseVault` is what makes that safe; this number is how we know a
 * backup predates it.
 */
export const VAULT_SCHEMA_VERSION = 1

/**
 * Fill in anything an older vault is missing.
 *
 * A backup is the admin's recovery path, and it is opened at the worst
 * possible moment — a lost laptop, a wiped phone. Spreading `EMPTY_VAULT` over
 * it restores missing *collections*, but nothing restored missing *fields on
 * records*, so a backup taken before `leadsDepartmentIds` existed would restore
 * members without it and then crash the first screen that called `.includes()`
 * on it.
 *
 * Every list this app calls array methods on is guaranteed here. It is
 * deliberately forgiving rather than strict: a slightly odd record that opens
 * is worth more to a church than a correct one that refuses to.
 */
export function normaliseVault(data: Partial<VaultData> | null | undefined): VaultData {
  const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

  return {
    ...EMPTY_VAULT,
    ...data,
    members: list<Member>(data?.members).map((member) => ({
      ...member,
      departmentIds: list<string>(member.departmentIds),
      leadsDepartmentIds: list<string>(member.leadsDepartmentIds),
      active: member.active ?? true,
      isWorker: member.isWorker ?? false,
      baptised: member.baptised ?? false,
      status: member.status ?? 'member',
      role: member.role ?? 'member',
      gender: member.gender ?? 'male',
      ageGroup: member.ageGroup ?? 'adult',
      maritalStatus: member.maritalStatus ?? 'single',
      createdAt: member.createdAt ?? nowIso(),
      updatedAt: member.updatedAt ?? nowIso(),
    })),
    families: list(data?.families),
    attendance: list<AttendanceRecord>(data?.attendance).map((record) => ({
      ...record,
      groups: list<AttendanceGroup>(record.groups),
      // Every bucket must be a number: the totals add them unguarded, and one
      // undefined turns a whole register's attendance into NaN.
      counts: {
        men: record.counts?.men ?? 0,
        women: record.counts?.women ?? 0,
        youth: record.counts?.youth ?? 0,
        teenagers: record.counts?.teenagers ?? 0,
        children: record.counts?.children ?? 0,
        visitors: record.counts?.visitors ?? 0,
      },
      createdAt: record.createdAt ?? nowIso(),
      updatedAt: record.updatedAt ?? nowIso(),
    })),
    prayerRequests: list(data?.prayerRequests),
    audit: list(data?.audit),
    schemaVersion: VAULT_SCHEMA_VERSION,
  }
}

export const EMPTY_VAULT: VaultData = {
  members: [],
  families: [],
  attendance: [],
  prayerRequests: [],
  audit: [],
}

/** Non-sensitive, unencrypted device preferences. Safe to keep in the clear. */
export interface DeviceSettings {
  lastBackupAt?: string
  backupReminderDays: number
  defaultServiceType: string
  pageSize: number
  /**
   * Whether offering figures are shown on screen. Off by default: attendance
   * registers get read over someone's shoulder far more often than anyone
   * expects, and the money is the one thing on the page that invites comment.
   */
  showOfferings: boolean
  /** Set once a vault exists, so the UI can offer "unlock" vs "set up". */
  vaultInitialised: boolean
}

const DEFAULT_SETTINGS: DeviceSettings = {
  backupReminderDays: 14,
  defaultServiceType: 'sunday-worship',
  pageSize: 25,
  showOfferings: false,
  vaultInitialised: false,
}

// ---------------------------------------------------------------------------
// Minimal IndexedDB promise wrapper
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('This browser has no IndexedDB, so church records cannot be stored.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => {
      const db = request.result
      // If another tab upgrades the schema, close here so it is not blocked.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'))
    request.onblocked = () =>
      reject(new Error('Another tab is holding the database open. Close it and retry.'))
  })
  return dbPromise
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Write aborted, the device may be out of space.'))
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Generic device-local key/value access, for data that is *not* personal and
 * therefore does not need the vault — e.g. the unpublished content draft.
 */
export const deviceStore = {
  get: idbGet,
  put: idbPut,
  delete: idbDelete,
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<DeviceSettings> {
  const stored = await idbGet<Partial<DeviceSettings>>(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(patch: Partial<DeviceSettings>): Promise<DeviceSettings> {
  const next = { ...(await getSettings()), ...patch }
  await idbPut(SETTINGS_KEY, next)
  return next
}

export async function vaultExists(): Promise<boolean> {
  return Boolean(await idbGet<EncryptedEnvelope>(VAULT_KEY))
}

export async function getVaultEnvelope(): Promise<EncryptedEnvelope | undefined> {
  return idbGet<EncryptedEnvelope>(VAULT_KEY)
}

// ---------------------------------------------------------------------------
// Vault lifecycle
// ---------------------------------------------------------------------------

export async function createVault(passphrase: string, seed: VaultData = EMPTY_VAULT): Promise<VaultData> {
  if (await vaultExists()) {
    throw new Error('A vault already exists on this device. Unlock it, or reset it first.')
  }
  await writeVault(seed, passphrase)
  await saveSettings({ vaultInitialised: true })
  return seed
}

export async function unlockVault(passphrase: string): Promise<VaultData> {
  const envelope = await getVaultEnvelope()
  if (!envelope) throw new Error('No vault on this device yet.')
  const data = await decryptJson<Partial<VaultData>>(envelope, passphrase)
  return normaliseVault(data)
}

export async function writeVault(data: VaultData, passphrase: string): Promise<void> {
  const envelope = await encryptJson(data, passphrase, {
    members: data.members.length,
    attendance: data.attendance.length,
    church: 'FBC Agbede',
  })
  await idbPut(VAULT_KEY, envelope)
}

export async function changePassphrase(current: string, next: string): Promise<void> {
  const data = await unlockVault(current) // throws WrongPassphraseError if wrong
  await writeVault(data, next)
  if (readSessionPassphrase()) rememberSessionPassphrase(next)
}

/**
 * Destroy the local vault. Irreversible without a backup file — the caller is
 * responsible for having warned about that.
 */
export async function destroyVault(): Promise<void> {
  await idbDelete(VAULT_KEY)
  await saveSettings({ vaultInitialised: false })
  forgetSessionPassphrase()
}

// ---------------------------------------------------------------------------
// Session passphrase
//
// Trade-off, stated so it is a choice and not an accident: holding the
// passphrase in sessionStorage keeps the admin unlocked across page reloads
// and route changes, and it is dropped the moment the tab closes. It is
// readable by any script running on this origin, so it is opt-in.
// ---------------------------------------------------------------------------

export function rememberSessionPassphrase(passphrase: string): void {
  try {
    sessionStorage.setItem(SESSION_PASS_KEY, passphrase)
  } catch {
    /* private mode — unlocking simply won't persist across reloads */
  }
}

export function readSessionPassphrase(): string | null {
  try {
    return sessionStorage.getItem(SESSION_PASS_KEY)
  } catch {
    return null
  }
}

export function forgetSessionPassphrase(): void {
  try {
    sessionStorage.removeItem(SESSION_PASS_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Backup files
// ---------------------------------------------------------------------------

export async function exportVaultFile(data: VaultData, passphrase: string): Promise<Blob> {
  const envelope = await encryptJson(data, passphrase, {
    members: data.members.length,
    attendance: data.attendance.length,
    church: 'FBC Agbede',
  })
  return new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
}

export async function importVaultFile(file: File, passphrase: string): Promise<VaultData> {
  let envelope: EncryptedEnvelope
  try {
    envelope = JSON.parse(await file.text()) as EncryptedEnvelope
  } catch {
    throw new Error('That file is not readable. Choose a .fbcvault backup.')
  }
  const data = await decryptJson<Partial<VaultData>>(envelope, passphrase)
  return normaliseVault(data)
}

/** Read a backup's hint block without the passphrase, to preview before restoring. */
export async function peekVaultFile(file: File): Promise<EncryptedEnvelope | null> {
  try {
    const envelope = JSON.parse(await file.text()) as EncryptedEnvelope
    return envelope.format === 'fbc-vault' ? envelope : null
  } catch {
    return null
  }
}

/**
 * Merge a backup into the current vault, newest-write-wins per record.
 * Used when the admin works on two devices and needs them reconciled.
 */
export function mergeVaults(base: VaultData, incoming: VaultData): VaultData {
  const merged = { ...EMPTY_VAULT } as VaultData

  const mergeList = <T extends { id: string; updatedAt?: string }>(a: T[], b: T[]): T[] => {
    const byId = new Map<string, T>()
    for (const item of a) byId.set(item.id, item)
    for (const item of b) {
      const existing = byId.get(item.id)
      if (!existing) {
        byId.set(item.id, item)
        continue
      }
      const newer = (item.updatedAt ?? '') > (existing.updatedAt ?? '') ? item : existing
      byId.set(item.id, newer)
    }
    return [...byId.values()]
  }

  merged.members = mergeList(base.members, incoming.members)
  merged.families = mergeList(base.families, incoming.families)
  merged.attendance = mergeList(base.attendance, incoming.attendance)
  merged.prayerRequests = mergeList(base.prayerRequests, incoming.prayerRequests)
  // The audit trail is append-only, so union by id and keep it bounded.
  merged.audit = mergeList(base.audit, incoming.audit)
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 2000)

  return merged
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

const AUDIT_LIMIT = 2000

export function appendAudit(
  data: VaultData,
  entry: Omit<AuditEntry, 'id' | 'at'> & { at?: string },
): VaultData {
  const record: AuditEntry = {
    id: newId('aud'),
    at: entry.at ?? nowIso(),
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    summary: entry.summary,
  }
  return { ...data, audit: [record, ...data.audit].slice(0, AUDIT_LIMIT) }
}

export { WrongPassphraseError }
