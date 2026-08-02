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

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public', 'favicon.svg')
const outDir = join(root, 'public', 'icons')

/** Behind the seal on maskable icons, so the crop never exposes the page. */
const BRAND = '#2B2750'

const TARGETS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'maskable-512.png', size: 512, maskable: true },
]

async function main() {
  const svg = await readFile(source)
  await mkdir(outDir, { recursive: true })

  for (const target of TARGETS) {
    const { size, maskable } = target

    if (!maskable) {
      await sharp(svg, { density: 384 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, target.file))
    } else {
      // 80% safe zone: render the art smaller, then centre it on brand colour.
      const inner = Math.round(size * 0.8)
      const art = await sharp(svg, { density: 384 })
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()

      await sharp({
        create: { width: size, height: size, channels: 4, background: BRAND },
      })
        .composite([{ input: art, gravity: 'centre' }])
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, target.file))
    }

    console.log(`  ✓ icons/${target.file} (${size}×${size}${maskable ? ', maskable' : ''})`)
  }

  // A tiny ICO-free favicon fallback for browsers that ignore SVG icons.
  await sharp(svg, { density: 192 })
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(root, 'public', 'favicon-48.png'))
  console.log('  ✓ favicon-48.png')

  await writeFile(
    join(outDir, 'README.md'),
    '# Generated icons\n\nRun `npm run icons` after editing `public/favicon.svg`.\nThese files are committed so the deploy workflow does not need sharp.\n',
    'utf8',
  )
}

main().catch((error) => {
  console.error('Icon generation failed:', error)
  process.exit(1)
})
