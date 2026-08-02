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

import { copyFile, readdir, stat, writeFile } from 'node:fs/promises'
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

async function main() {
  await writeFile(join(dist, '.nojekyll'), '', 'utf8')
  console.log('  ✓ .nojekyll')

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
