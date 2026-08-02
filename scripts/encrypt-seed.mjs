/**
 * Turn a plain JSON vault into an encrypted `.fbcvault` file.
 *
 * Why this exists: the first time a church sets the app up, the register often
 * already exists — in a spreadsheet, or typed up by the secretary. Rather than
 * re-keying a few hundred members through the browser, convert the export to
 * the vault shape, encrypt it here, and restore the file in Settings.
 *
 *   node scripts/encrypt-seed.mjs seed.json out.fbcvault
 *
 * The passphrase is read from the FBC_VAULT_PASSPHRASE environment variable, so
 * it never lands in shell history:
 *
 *   FBC_VAULT_PASSPHRASE='four random words here' npm run seed:encrypt -- seed.json out.fbcvault
 *
 * The format matches src/lib/crypto.ts exactly — AES-256-GCM, PBKDF2-SHA256 at
 * 600,000 iterations. If one changes, change the other.
 *
 * NEVER commit either file. Both are covered by .gitignore.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { webcrypto as crypto } from 'node:crypto'

const ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12

const EMPTY_VAULT = {
  members: [],
  families: [],
  attendance: [],
  prayerRequests: [],
  audit: [],
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
}

/** Fill in anything the source file left out, so the app can always open it. */
function normalise(raw) {
  const vault = { ...EMPTY_VAULT, ...raw }

  for (const key of ['members', 'families', 'attendance', 'prayerRequests', 'audit']) {
    if (!Array.isArray(vault[key])) {
      fail(`"${key}" must be an array in the seed file (found ${typeof vault[key]}).`)
    }
  }

  const now = new Date().toISOString()
  vault.members = vault.members.map((member, index) => {
    if (!member.firstName || !member.lastName) {
      fail(`Member ${index + 1} is missing firstName or lastName.`)
    }
    return {
      gender: 'male',
      ageGroup: 'adult',
      maritalStatus: 'single',
      status: 'member',
      role: 'member',
      isWorker: false,
      departmentIds: [],
      leadsDepartmentIds: [],
      baptised: false,
      active: true,
      createdAt: now,
      updatedAt: now,
      ...member,
      id: member.id ?? `mem_${crypto.randomUUID()}`,
    }
  })

  vault.audit = [
    {
      id: `aud_${crypto.randomUUID()}`,
      at: now,
      actor: 'Seed import',
      action: 'import',
      entity: 'vault',
      summary: `Seeded from file: ${vault.members.length} members, ${vault.attendance.length} registers.`,
    },
    ...vault.audit,
  ]

  return vault
}

async function main() {
  const [input, output = 'seed.fbcvault'] = process.argv.slice(2)
  const passphrase = process.env.FBC_VAULT_PASSPHRASE

  if (!input) fail('Usage: node scripts/encrypt-seed.mjs <seed.json> [out.fbcvault]')
  if (!passphrase) fail('Set FBC_VAULT_PASSPHRASE before running this.')
  if (passphrase.length < 10) fail('That passphrase is too short to protect a church register.')

  let raw
  try {
    raw = JSON.parse(await readFile(input, 'utf8'))
  } catch (error) {
    fail(`Could not read ${input}: ${error.message}`)
  }

  const vault = normalise(raw)

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(vault)),
  )

  const envelope = {
    format: 'fbc-vault',
    version: 1,
    alg: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    createdAt: new Date().toISOString(),
    hint: {
      members: vault.members.length,
      attendance: vault.attendance.length,
      church: 'FBC Agbede',
    },
  }

  await writeFile(output, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8')

  console.log(`\n  ✓ Encrypted ${vault.members.length} members into ${output}`)
  console.log('    Restore it from Settings → Backups → Restore, using the same passphrase.')
  console.log('    Do not commit this file.\n')
}

main().catch((error) => {
  console.error('Seed encryption failed:', error)
  process.exit(1)
})
