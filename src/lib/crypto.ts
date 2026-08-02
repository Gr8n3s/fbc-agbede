/**
 * Vault encryption.
 *
 * Used for two things:
 *   1. Encrypting the `.fbcvault` backup file the admin exports and keeps
 *      off this (public) repository.
 *   2. Encrypting the local IndexedDB payload at rest, so a stolen or shared
 *      laptop does not hand over the whole membership register.
 *
 * AES-256-GCM for confidentiality + integrity, keys derived with PBKDF2-SHA256.
 * Everything runs in WebCrypto — no library, nothing to audit but this file.
 *
 * Deliberate limits, stated plainly:
 *   • Security rests entirely on the passphrase. A weak one is brute-forceable
 *     offline once someone holds a backup file. `assessPassphrase` exists to
 *     push the admin somewhere sensible, and the UI refuses "weak".
 *   • PBKDF2 is used rather than Argon2id because it is native. 600k iterations
 *     follows OWASP's 2023 guidance for PBKDF2-HMAC-SHA256.
 */

import type { EncryptedEnvelope } from './types'

const ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_BITS = 256

const enc = new TextEncoder()
const dec = new TextDecoder()

export class CryptoUnavailableError extends Error {
  constructor() {
    super(
      'Secure storage is unavailable. This needs a modern browser served over HTTPS (or localhost).',
    )
    this.name = 'CryptoUnavailableError'
  }
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('Wrong passphrase, or this file has been altered.')
    this.name = 'WrongPassphraseError'
  }
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle
  if (!s) throw new CryptoUnavailableError()
  return s
}

export function isCryptoAvailable(): boolean {
  return Boolean(globalThis.crypto?.subtle)
}

// ---------------------------------------------------------------------------
// base64 helpers (binary-safe, chunked so large vaults don't blow the stack)
// ---------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length)
  globalThis.crypto.getRandomValues(out)
  return out
}

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = ITERATIONS,
): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt
// ---------------------------------------------------------------------------

export async function encryptJson(
  data: unknown,
  passphrase: string,
  hint?: EncryptedEnvelope['hint'],
): Promise<EncryptedEnvelope> {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = await deriveKey(passphrase, salt)
  const plaintext = enc.encode(JSON.stringify(data))

  const ciphertext = await subtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource,
  )

  return {
    format: 'fbc-vault',
    version: 1,
    alg: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
    ...(hint ? { hint } : {}),
  }
}

export async function decryptJson<T>(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<T> {
  if (envelope?.format !== 'fbc-vault') {
    throw new Error('This is not an FBC vault file.')
  }
  if (envelope.alg !== 'AES-GCM-256' || envelope.kdf !== 'PBKDF2-SHA256') {
    throw new Error(`Unsupported vault encryption: ${envelope.alg} / ${envelope.kdf}`)
  }

  const salt = fromBase64(envelope.salt)
  const iv = fromBase64(envelope.iv)
  const key = await deriveKey(passphrase, salt, envelope.iterations ?? ITERATIONS)

  let plaintext: ArrayBuffer
  try {
    plaintext = await subtle().decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      fromBase64(envelope.ciphertext) as BufferSource,
    )
  } catch {
    // GCM authentication failure. Indistinguishable by design from tampering,
    // so we report both possibilities rather than guessing.
    throw new WrongPassphraseError()
  }

  return JSON.parse(dec.decode(plaintext)) as T
}

/** Cheap check that a passphrase opens an envelope, without keeping the result. */
export async function verifyPassphrase(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<boolean> {
  try {
    await decryptJson(envelope, passphrase)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Passphrase strength
// ---------------------------------------------------------------------------

export interface PassphraseAssessment {
  score: 0 | 1 | 2 | 3 | 4
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'
  /** Rough log2 of the search space. Indicative, not a guarantee. */
  bits: number
  suggestions: string[]
  acceptable: boolean
}

const COMMON = [
  'password',
  'passphrase',
  '12345678',
  'qwerty',
  'letmein',
  'church',
  'jesus',
  'baptist',
  'admin',
  'welcome',
  'agbede',
  'ikorodu',
  'fbcagbede',
]

export function assessPassphrase(pass: string): PassphraseAssessment {
  const suggestions: string[] = []
  const length = pass.length

  let pool = 0
  if (/[a-z]/.test(pass)) pool += 26
  if (/[A-Z]/.test(pass)) pool += 26
  if (/\d/.test(pass)) pool += 10
  if (/[^a-zA-Z0-9]/.test(pass)) pool += 33

  let bits = length > 0 && pool > 0 ? Math.round(length * Math.log2(pool)) : 0

  const lower = pass.toLowerCase()
  if (COMMON.some((c) => lower.includes(c))) {
    bits = Math.min(bits, 28)
    suggestions.push('Avoid words tied to the church name — they are the first thing guessed.')
  }
  if (/^(.)\1+$/.test(pass)) bits = Math.min(bits, 10)
  if (/^\d+$/.test(pass)) {
    bits = Math.min(bits, 20)
    suggestions.push('Digits alone are quick to break. Mix in words.')
  }

  if (length < 12) suggestions.push('Use at least 12 characters — 4 random words works well.')
  if (!/[A-Z]/.test(pass)) suggestions.push('Add a capital letter.')
  if (!/\d/.test(pass)) suggestions.push('Add a number.')
  if (!/[^a-zA-Z0-9]/.test(pass)) suggestions.push('Add a symbol.')

  let score: PassphraseAssessment['score']
  if (bits < 30) score = 0
  else if (bits < 45) score = 1
  else if (bits < 60) score = 2
  else if (bits < 80) score = 3
  else score = 4

  const labels: PassphraseAssessment['label'][] = [
    'Very weak',
    'Weak',
    'Fair',
    'Strong',
    'Very strong',
  ]

  return {
    score,
    label: labels[score],
    bits,
    suggestions: suggestions.slice(0, 3),
    acceptable: score >= 2 && length >= 10,
  }
}

/** Generate a memorable high-entropy passphrase (~62 bits at 5 words). */
export function suggestPassphrase(words = 5): string {
  const list = [
    'anchor','banner','beacon','candle','chapel','chorus','cornel','covenant','crimson','crown',
    'dawn','dove','ember','fable','garden','gospel','granite','harbour','harvest','hymn',
    'jubilee','kindle','lantern','lattice','marble','meadow','mercy','olive','orchard','pillar',
    'psalm','quarry','ransom','refuge','ripple','saffron','shepherd','solace','sparrow','steeple',
    'summit','thistle','timber','trellis','valley','vessel','vigil','willow','wonder','zenith',
  ]
  const picks = new Uint32Array(words)
  globalThis.crypto.getRandomValues(picks)
  const chosen = Array.from(picks, (n) => list[n % list.length])
  const digits = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 100
  return `${chosen.join('-')}-${String(digits).padStart(2, '0')}`
}

/** SHA-256 hex digest. Used for non-secret fingerprints (e.g. backup identity). */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', enc.encode(input) as BufferSource)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
