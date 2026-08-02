/**
 * The lock on the admin door.
 *
 * The church office is a device-local application: the records are encrypted
 * under a passphrase and the website can only be changed with a GitHub token.
 * Neither of those, though, stops a curious visitor opening /admin and walking
 * through the setup screen on their own device. This is the gate that does.
 *
 * How it works: an access key is chosen at build time and only its PBKDF2 hash
 * is compiled into the bundle. The admin area does not render at all until
 * someone enters a key that hashes to the same value.
 *
 * The honest limit, stated because a security control that oversells itself is
 * worse than none: this is a *static site*, so the hash ships to every visitor
 * and can be attacked offline. Its strength is entirely the strength of the
 * key. Use the generated suggestion, not a word. What it reliably prevents is
 * a visitor, a search engine or a bored teenager reaching the office at all;
 * what it cannot prevent is a determined attacker with the bundle and time.
 *
 * Even if the key were broken, the attacker still has: no church records (they
 * are encrypted, on the admin's device, under a different passphrase) and no
 * ability to publish (that needs the GitHub token, which lives inside the
 * encrypted vault). This gate is the outer of three doors, not the only one.
 */

import { fromBase64, toBase64 } from './crypto'

/** Matches the vault's KDF cost, since both defend against offline attack. */
const ITERATIONS = 600_000
const SALT_BYTES = 16
const KEY_BITS = 256

/** Set at build time from VITE_ADMIN_KEY_HASH. Empty means the gate is off. */
const CONFIGURED: string = (import.meta.env.VITE_ADMIN_KEY_HASH ?? '').trim()

/** Remembered for the tab only, so closing it re-locks the door. */
const SESSION_KEY = 'fbc.admin.unlocked'

/**
 * Whether a key is required at all.
 *
 * With no hash configured the gate stays open, which keeps `npm run dev` and a
 * fresh clone usable. The deploy workflow sets the variable, so the published
 * site is gated even though a local checkout is not.
 */
export function isGateEnabled(): boolean {
  return CONFIGURED.length > 0
}

interface StoredHash {
  v: 1
  iterations: number
  salt: string
  hash: string
}

function parse(value: string): StoredHash | null {
  try {
    const parsed = JSON.parse(atob(value)) as StoredHash
    return parsed?.v === 1 && parsed.salt && parsed.hash ? parsed : null
  } catch {
    return null
  }
}

async function derive(key: string, salt: Uint8Array, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    KEY_BITS,
  )
  return toBase64(new Uint8Array(bits))
}

/**
 * Check a key against the configured hash.
 *
 * Deliberately does not report *why* a key failed, and takes the same work
 * either way, so nothing here helps an attacker narrow the search.
 */
export async function verifyAccessKey(key: string): Promise<boolean> {
  const stored = parse(CONFIGURED)
  if (!stored) return false
  const candidate = await derive(key.trim(), fromBase64(stored.salt), stored.iterations)
  return timingSafeEqual(candidate, stored.hash)
}

/** Constant-time string compare. Overkill here, but free and correct. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Build the value for VITE_ADMIN_KEY_HASH. Used by scripts/make-admin-key.mjs. */
export async function hashAccessKey(key: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(key.trim(), salt, ITERATIONS)
  const stored: StoredHash = {
    v: 1,
    iterations: ITERATIONS,
    salt: toBase64(salt),
    hash,
  }
  return btoa(JSON.stringify(stored))
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function isUnlocked(): boolean {
  if (!isGateEnabled()) return true
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberUnlocked(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* private mode: the key is simply asked for again after a reload */
  }
}

export function forgetUnlocked(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
