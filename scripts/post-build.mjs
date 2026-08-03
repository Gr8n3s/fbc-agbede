/**
 * Make the build servable by GitHub Pages.
 *
 * Two things Pages needs that Vite does not do:
 *
 *  1. `.nojekyll` — without it Pages runs the output through Jekyll, which
 *     silently drops every file and folder beginning with an underscore. Vite
 *     does not emit those today, but plugins do, and the failure mode is a
 *     blank page with a 404 in the console.
 *
 *  2. `404.html` — Pages has no SPA rewrite. A visitor who opens
 *     /sermons/grace directly, or refreshes on it, gets a 404 from the server
 *     before the app ever loads. Pages serves 404.html for unknown paths, so
 *     shipping a copy of index.html there hands control to the router.
 *
 * Both are pure copies with no build-time dependencies.
 */

import { copyFile, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

async function directorySize(path) {
  let total = 0
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) total += await directorySize(full)
    else total += (await stat(full)).size
  }
  return total
}

/**
 * Pin the inline theme script in the Content-Security-Policy.
 *
 * The policy is `script-src 'self'`, which would block the small inline script
 * that applies the saved theme before first paint. That script has to be inline
 * — an external file means a round trip before paint and dark mode flashes
 * white — so it is allowed by hash rather than by opening the policy up with
 * 'unsafe-inline'.
 *
 * Computed here rather than written into index.html by hand, because a hash
 * maintained by hand drifts the moment anyone edits the script, and the failure
 * is silent: the theme simply stops applying.
 */
async function pinCspHash(file) {
  const html = await readFile(file, 'utf8')
  const match = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/.exec(html)

  if (!match) {
    // No inline script is a fine outcome; drop the placeholder and move on.
    await writeFile(file, html.replace(" '__INLINE_SCRIPT_HASH__'", ''), 'utf8')
    return null
  }

  const hash = `sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}`
  await writeFile(file, html.replaceAll('__INLINE_SCRIPT_HASH__', hash), 'utf8')
  return hash
}

async function main() {
  await writeFile(join(dist, '.nojekyll'), '', 'utf8')
  console.log('  ✓ .nojekyll')

  const hash = await pinCspHash(join(dist, 'index.html'))
  console.log(`  ✓ CSP inline-script hash ${hash ? `pinned (${hash.slice(0, 24)}…)` : 'not needed'}`)

  // Copied after pinning so the fallback carries the finished policy too.
  await copyFile(join(dist, 'index.html'), join(dist, '404.html'))
  console.log('  ✓ 404.html (SPA fallback)')

  const bytes = await directorySize(dist)
  console.log(`  ✓ dist is ${(bytes / 1024 / 1024).toFixed(2)} MB`)

  if (bytes > 100 * 1024 * 1024) {
    console.warn('  ! Over 100 MB — GitHub Pages will refuse to publish this.')
  }
}

main().catch((error) => {
  console.error('Post-build step failed:', error)
  process.exit(1)
})
