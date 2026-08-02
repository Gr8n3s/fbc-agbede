/**
 * Generate the admin access key and the hash to publish with it.
 *
 *   node scripts/make-admin-key.mjs              # invent a strong key
 *   node scripts/make-admin-key.mjs "my own key" # hash a key you chose
 *
 * It prints two things:
 *   • the KEY   — give it only to whoever administers the church app
 *   • the HASH  — safe to commit and to put in the deploy workflow
 *
 * Only the hash reaches the browser. Someone holding it still has to guess the
 * key against 600,000 rounds of PBKDF2, which is why the generated key is long.
 *
 * This mirrors src/lib/access.ts exactly. Change one, change the other.
 */

import { webcrypto as crypto } from 'node:crypto'

const ITERATIONS = 600_000
const SALT_BYTES = 16
const KEY_BITS = 256

const WORDS = [
  'anchor', 'banner', 'beacon', 'candle', 'chapel', 'chorus', 'covenant', 'crimson',
  'crown', 'dawn', 'dove', 'ember', 'garden', 'gospel', 'granite', 'harbour',
  'harvest', 'hymn', 'jubilee', 'kindle', 'lantern', 'lattice', 'marble', 'meadow',
  'mercy', 'olive', 'orchard', 'pillar', 'psalm', 'quarry', 'ransom', 'refuge',
  'saffron', 'shepherd', 'solace', 'sparrow', 'steeple', 'summit', 'thistle',
  'timber', 'trellis', 'valley', 'vessel', 'vigil', 'willow', 'wonder', 'zenith',
]

function suggestKey(words = 6) {
  const picks = crypto.getRandomValues(new Uint32Array(words))
  const chosen = Array.from(picks, (n) => WORDS[n % WORDS.length])
  const digits = crypto.getRandomValues(new Uint32Array(1))[0] % 10000
  return `${chosen.join('-')}-${String(digits).padStart(4, '0')}`
}

async function hash(key) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    KEY_BITS,
  )
  const stored = {
    v: 1,
    iterations: ITERATIONS,
    salt: Buffer.from(salt).toString('base64'),
    hash: Buffer.from(bits).toString('base64'),
  }
  return Buffer.from(JSON.stringify(stored)).toString('base64')
}

const provided = process.argv.slice(2).join(' ').trim()

if (provided && provided.length < 16) {
  console.error(
    '\n  That key is too short. The hash is public, so a short key can be cracked offline.\n' +
      '  Use at least 16 characters, or run with no argument for a generated one.\n',
  )
  process.exit(1)
}

const key = provided || suggestKey()
const digest = await hash(key)

console.log(`
  ┌─────────────────────────────────────────────────────────────────
  │  ACCESS KEY  (give this only to the church administrator)
  └─────────────────────────────────────────────────────────────────

    ${key}

  ┌─────────────────────────────────────────────────────────────────
  │  HASH  (safe to commit; put it in the deploy workflow)
  └─────────────────────────────────────────────────────────────────

    VITE_ADMIN_KEY_HASH=${digest}

  To use it:

    1. Save the key somewhere safe. It cannot be recovered from the hash.
    2. On GitHub: Settings, then Secrets and variables, then Actions,
       then Variables, then New repository variable.
         Name:  VITE_ADMIN_KEY_HASH
         Value: ${digest.slice(0, 24)}...
    3. Push, or re-run the deploy. /admin now asks for the key.

  For local development, put the same line in .env.local, or leave it
  out and the gate stays open on localhost.
`)
