import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  appendAudit,
  changePassphrase as changeVaultPassphrase,
  createVault,
  destroyVault,
  EMPTY_VAULT,
  exportVaultFile,
  forgetSessionPassphrase,
  getSettings,
  importVaultFile,
  mergeVaults,
  readSessionPassphrase,
  rememberSessionPassphrase,
  saveSettings,
  unlockVault,
  vaultExists,
  writeVault,
  type DeviceSettings,
} from '@/lib/db'
import type { AuditEntry, GitHubSettings, VaultData } from '@/lib/types'
import { downloadBlob, nowIso } from '@/lib/utils'

export type VaultStatus = 'checking' | 'absent' | 'locked' | 'unlocked' | 'unavailable'

interface VaultValue {
  status: VaultStatus
  data: VaultData | null
  settings: DeviceSettings
  /** Whether a save is currently being written to disk. */
  saving: boolean
  lastSavedAt: string | null

  create: (passphrase: string, adminName: string, remember: boolean) => Promise<void>
  unlock: (passphrase: string, remember: boolean) => Promise<void>
  lock: () => void
  reset: () => Promise<void>

  /** Apply a change to the vault and persist it. The single write path. */
  mutate: (
    recipe: (draft: VaultData) => VaultData,
    audit?: Omit<AuditEntry, 'id' | 'at' | 'actor'>,
  ) => Promise<void>

  setGitHub: (settings: GitHubSettings | undefined) => Promise<void>
  changePassphrase: (current: string, next: string) => Promise<void>
  updateSettings: (patch: Partial<DeviceSettings>) => Promise<void>

  backup: () => Promise<void>
  restore: (file: File, passphrase: string, mode: 'replace' | 'merge') => Promise<void>
}

const VaultContext = createContext<VaultValue | null>(null)

/** Auto-lock after this long with no interaction, so a shared laptop re-locks. */
const IDLE_LOCK_MS = 30 * 60 * 1000

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('checking')
  const [data, setData] = useState<VaultData | null>(null)
  const [settings, setSettings] = useState<DeviceSettings>({
    backupReminderDays: 14,
    defaultServiceType: 'sunday-worship',
    pageSize: 25,
    vaultInitialised: false,
  })
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  /**
   * The passphrase is held in a ref, never in state. Keeping it out of state
   * means it is never captured in a render snapshot, never serialised by
   * devtools, and cannot end up in a React error boundary payload.
   */
  const passphraseRef = useRef<string | null>(null)

  /** Mirrors `data` so writes always compose against the newest copy. */
  const dataRef = useRef<VaultData | null>(null)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // --- boot ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [exists, stored] = await Promise.all([vaultExists(), getSettings()])
        if (cancelled) return
        setSettings(stored)

        if (!exists) {
          setStatus('absent')
          return
        }

        // Restore an in-progress session (same tab, after a reload).
        const remembered = readSessionPassphrase()
        if (remembered) {
          try {
            const opened = await unlockVault(remembered)
            if (cancelled) return
            passphraseRef.current = remembered
            setData(opened)
            setStatus('unlocked')
            return
          } catch {
            forgetSessionPassphrase()
          }
        }
        if (!cancelled) setStatus('locked')
      } catch (error) {
        console.error('[vault] unavailable', error)
        if (!cancelled) setStatus('unavailable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // --- idle auto-lock -----------------------------------------------------
  useEffect(() => {
    if (status !== 'unlocked') return
    let timer: ReturnType<typeof setTimeout>

    const lockNow = () => {
      passphraseRef.current = null
      forgetSessionPassphrase()
      setData(null)
      setStatus('locked')
    }
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(lockNow, IDLE_LOCK_MS)
    }

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'focus']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [status])

  // --- operations ---------------------------------------------------------

  const persist = useCallback(async (next: VaultData) => {
    const passphrase = passphraseRef.current
    if (!passphrase) throw new Error('The vault is locked.')
    setSaving(true)
    try {
      await writeVault(next, passphrase)
      setData(next)
      setLastSavedAt(nowIso())
    } finally {
      setSaving(false)
    }
  }, [])

  const create = useCallback<VaultValue['create']>(
    async (passphrase, adminName, remember) => {
      const seed: VaultData = {
        ...EMPTY_VAULT,
        admin: { name: adminName.trim() || 'Church Administrator', role: 'super-admin' },
      }
      const withAudit = appendAudit(seed, {
        actor: seed.admin!.name,
        action: 'create',
        entity: 'vault',
        summary: 'Vault created on this device.',
      })
      await createVault(passphrase, withAudit)
      passphraseRef.current = passphrase
      if (remember) rememberSessionPassphrase(passphrase)
      setData(withAudit)
      setSettings(await saveSettings({ vaultInitialised: true }))
      setStatus('unlocked')
    },
    [],
  )

  const unlock = useCallback<VaultValue['unlock']>(async (passphrase, remember) => {
    const opened = await unlockVault(passphrase)
    passphraseRef.current = passphrase
    if (remember) rememberSessionPassphrase(passphrase)
    setData(opened)
    setStatus('unlocked')
  }, [])

  const lock = useCallback(() => {
    passphraseRef.current = null
    forgetSessionPassphrase()
    setData(null)
    setStatus('locked')
  }, [])

  const reset = useCallback(async () => {
    await destroyVault()
    passphraseRef.current = null
    setData(null)
    setStatus('absent')
    setSettings(await getSettings())
  }, [])

  /**
   * Applies every change to the vault, and the only path that writes to disk.
   *
   * Reads through `dataRef` rather than the `data` closure so two edits
   * dispatched in the same tick compose instead of the second silently
   * discarding the first.
   */
  const mutate = useCallback<VaultValue['mutate']>(
    async (recipe, audit) => {
      const base = dataRef.current
      if (!base) throw new Error('The vault is locked.')
      let next = recipe(base)
      if (audit) {
        next = appendAudit(next, { ...audit, actor: base.admin?.name ?? 'Administrator' })
      }
      dataRef.current = next
      await persist(next)
    },
    [persist],
  )

  const setGitHub = useCallback<VaultValue['setGitHub']>(
    async (github) => {
      await mutate((draft) => ({ ...draft, github }), {
        action: 'update',
        entity: 'settings',
        summary: github ? 'GitHub publishing configured.' : 'GitHub publishing disconnected.',
      })
    },
    [mutate],
  )

  const changePassphrase = useCallback<VaultValue['changePassphrase']>(async (current, next) => {
    await changeVaultPassphrase(current, next)
    passphraseRef.current = next
  }, [])

  const updateSettings = useCallback<VaultValue['updateSettings']>(async (patch) => {
    setSettings(await saveSettings(patch))
  }, [])

  const backup = useCallback(async () => {
    const passphrase = passphraseRef.current
    const current = dataRef.current
    if (!passphrase || !current) throw new Error('Unlock the vault before making a backup.')
    const blob = await exportVaultFile(current, passphrase)
    const filename = `fbc-agbede-${new Date().toISOString().slice(0, 10)}.fbcvault`
    downloadBlob(blob, filename)
    setSettings(await saveSettings({ lastBackupAt: nowIso() }))
  }, [])

  const restore = useCallback<VaultValue['restore']>(
    async (file, passphrase, mode) => {
      const incoming = await importVaultFile(file, passphrase)
      const current = dataRef.current ?? EMPTY_VAULT
      const merged =
        mode === 'replace'
          ? { ...incoming, github: incoming.github ?? current.github, admin: incoming.admin ?? current.admin }
          : mergeVaults(current, incoming)

      const withAudit = appendAudit(merged, {
        actor: merged.admin?.name ?? 'Administrator',
        action: 'restore',
        entity: 'vault',
        summary: `Restored from backup (${mode}): ${incoming.members.length} members, ${incoming.attendance.length} registers.`,
      })
      await persist(withAudit)
    },
    [persist],
  )

  const value = useMemo<VaultValue>(
    () => ({
      status,
      data,
      settings,
      saving,
      lastSavedAt,
      create,
      unlock,
      lock,
      reset,
      mutate,
      setGitHub,
      changePassphrase,
      updateSettings,
      backup,
      restore,
    }),
    [
      status, data, settings, saving, lastSavedAt,
      create, unlock, lock, reset, mutate, setGitHub, changePassphrase, updateSettings, backup, restore,
    ],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault(): VaultValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used inside <VaultProvider>')
  return ctx
}

/** Vault data, or empty collections when locked. Lets read-only views stay simple. */
export function useVaultData(): VaultData {
  return useVault().data ?? EMPTY_VAULT
}
