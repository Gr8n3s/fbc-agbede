/**
 * Rasterise the church seal into the PWA icon set.
 *
 * Run with `npm run icons`. The output is committed, so a normal build and the
 * GitHub Pages workflow never need `sharp` — it stays a development-only
 * dependency and CI stays fast.
 *
 * Maskable icons get their own render with the artwork inset to 80%, because
 * Android crops the outer 20% to whatever shape the launcher uses. Reusing the
 * standard icon there is what produces the well-known "cropped logo" bug.
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

/**
 * Source artwork, best first.
 *
 * The church's own logo wins when it is in the repository. `assets/` holds the
 * full-resolution original, which is never served to the browser but is exactly
 * what an icon should be rasterised from. The drawn SVG is the fallback so a
 * fresh clone can still generate a full icon set.
 */
const SOURCES = [
  join(root, 'assets', 'logo-original.png'),
  join(root, 'public', 'logo.png'),
  join(root, 'public', 'favicon.svg'),
]

async function pickSource() {
  for (const candidate of SOURCES) {
    try {
      await access(candidate)
      return candidate
    } catch {
      /* try the next one */
    }
  }
  throw new Error('No source artwork found.')
}

/** Behind the seal on maskable icons, so the crop never exposes the page. */
const BRAND = '#2B2750'

const TARGETS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'maskable-512.png', size: 512, maskable: true },
]

async function main() {
  const source = await pickSource()
  const art = await readFile(source)
  console.log(`  source: ${source.replace(root, '.')}`)
  await mkdir(outDir, { recursive: true })

  for (const target of TARGETS) {
    const { size, maskable } = target

    if (!maskable) {
      await sharp(art, { density: 384 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, target.file))
    } else {
      // 80% safe zone: render the art smaller, then centre it on brand colour.
      const inner = Math.round(size * 0.8)
      const inset = await sharp(art, { density: 384 })
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()

      await sharp({
        create: { width: size, height: size, channels: 4, background: BRAND },
      })
        .composite([{ input: inset, gravity: 'centre' }])
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, target.file))
    }

    console.log(`  ✓ icons/${target.file} (${size}×${size}${maskable ? ', maskable' : ''})`)
  }

  // A tiny ICO-free favicon fallback for browsers that ignore SVG icons.
  await sharp(art, { density: 192 })
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(root, 'public', 'favicon-48.png'))
  console.log('  ✓ favicon-48.png')

  await writeFile(
    join(outDir, 'README.md'),
    '# Generated icons\n\nRun `npm run icons` after changing the church artwork in `assets/logo-original.png`.\nThese files are committed so the deploy workflow does not need sharp.\n',
    'utf8',
  )
}

main().catch((error) => {
  console.error('Icon generation failed:', error)
  process.exit(1)
})
