import { useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileUp, Loader2, Paperclip, X } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useVault } from '@/context/VaultContext'
import { GitHubError, putBinaryFile } from '@/lib/github'
import { asset, safeUrl, slugify } from '@/lib/utils'
import { Button } from './primitives'

/**
 * Pick a file from the device and publish it.
 *
 * There is no upload server, so "upload" here means: read the file in the
 * browser and commit it to the church's repository through the GitHub Contents
 * API. GitHub Pages then serves it, for free, from the same origin as the app —
 * which is also why the stored value is a repo-relative path like
 * `media/gallery/harvest.jpg` rather than an absolute URL.
 *
 * Two consequences worth stating plainly, because they shape the UI:
 *   • It needs the GitHub connection from Settings. Without it, the field falls
 *     back to accepting a typed path or an external link, and says so.
 *   • Unlike content edits, a committed file is public the moment it lands. It
 *     does not wait for "Publish".
 */

/** GitHub rejects Contents API writes over 100 MB, and Pages is slow well before that. */
const MAX_BYTES = 10 * 1024 * 1024

/** Longest edge for an uploaded photo. Plenty for full-screen on any phone. */
const MAX_IMAGE_EDGE = 1800
/** Below this, resizing is not worth the quality loss. */
const RESIZE_THRESHOLD = 400 * 1024

/**
 * Shrink a photo before it is committed.
 *
 * Phone cameras produce four and five megabyte files. Committed as-is they sit
 * in the repository for ever and are downloaded over mobile data by every
 * member who opens the gallery. Resizing in the browser costs nothing and
 * typically takes a 4 MB photo under 300 KB.
 *
 * Anything that is not a raster image, is already small, or fails to decode is
 * passed through untouched: a slightly large upload is a much better outcome
 * than a failed one.
 */
async function shrinkImage(file: File): Promise<{ bytes: Uint8Array; name: string }> {
  const passthrough = async () => ({
    bytes: new Uint8Array(await file.arrayBuffer()),
    name: file.name,
  })

  const resizable = /^image\/(jpeg|png|webp)$/.test(file.type)
  if (!resizable || file.size < RESIZE_THRESHOLD) return passthrough()

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))

    // Already small enough in both dimensions, and re-encoding would only lose.
    if (scale === 1 && file.size < 1024 * 1024) {
      bitmap.close()
      return passthrough()
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) return passthrough()
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    // JPEG unless the source has transparency worth keeping.
    const keepAlpha = file.type === 'image/png'
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, keepAlpha ? 'image/png' : 'image/jpeg', 0.82),
    )
    if (!blob || blob.size >= file.size) return passthrough()

    const stem = file.name.replace(/\.[^.]+$/, '')
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      name: `${stem}.${keepAlpha ? 'png' : 'jpg'}`,
    }
  } catch {
    return passthrough()
  }
}

export function FileField({
  label,
  hint,
  value,
  onChange,
  /** Sub-folder under `public/media`, e.g. "gallery" or "downloads". */
  folder,
  accept,
  placeholder,
  required,
}: {
  label: string
  hint?: string
  value: string
  onChange: (next: string) => void
  folder: string
  accept?: string
  placeholder?: string
  required?: boolean
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { data } = useVault()
  const toast = useToast()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justUploaded, setJustUploaded] = useState(false)

  const github = data?.github
  const preview = safeUrl(value ? asset(value) : undefined)
  const isImage = /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(value)

  const pick = async (file: File | null) => {
    if (!file) return
    setError(null)
    setJustUploaded(false)

    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please keep uploads under 10 MB. The congregation opens this on mobile data.`,
      )
      return
    }
    if (!github) {
      setError('Connect GitHub under Settings before uploading files.')
      return
    }

    setBusy(true)
    try {
      const { bytes, name } = await shrinkImage(file)
      const path = buildPath(folder, name)

      await putBinaryFile(
        github.token,
        { owner: github.owner, repo: github.repo, branch: github.branch },
        `public/${path}`,
        bytes,
        `Upload ${file.name}`,
      )

      onChange(path)
      setJustUploaded(true)
      toast.success('File uploaded', 'It is live once the site finishes rebuilding.')
    } catch (err) {
      const message =
        err instanceof GitHubError
          ? [err.message, err.hint].filter(Boolean).join(' ')
          : err instanceof Error
            ? err.message
            : 'Could not upload that file.'
      setError(message)
    } finally {
      setBusy(false)
      // Let the same file be chosen again after a failure.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-label="required">
            *
          </span>
        )}
      </label>
      {hint && <p className="mb-1.5 text-[0.75rem] leading-snug text-ink-faint">{hint}</p>}

      <div className="flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? `media/${folder}/file.jpg or paste a link`}
          className="h-11 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint/70 hover:border-ornament/50 focus:border-info focus:outline-none focus:ring-2 focus:ring-info/25"
        />

        <Button
          variant="secondary"
          icon={busy ? Loader2 : FileUp}
          loading={busy}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          Browse
        </Button>

        {value && !busy && (
          <Button
            variant="ghost"
            icon={X}
            onClick={() => {
              onChange('')
              setJustUploaded(false)
              setError(null)
            }}
            className="shrink-0"
            aria-label={`Clear ${label}`}
          >
            <span className="sr-only">Clear</span>
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void pick(e.target.files?.[0] ?? null)}
      />

      {/* --- state ---------------------------------------------------------- */}
      {error && (
        <p
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-[0.75rem] font-medium text-danger"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {!error && justUploaded && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] font-medium text-success">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
          Committed to the repository. It goes live with the next site build.
        </p>
      )}

      {!error && !github && (
        <p className="mt-1.5 text-[0.75rem] text-ink-faint">
          Uploading needs the GitHub connection from Settings. Until then you can paste a path or an
          external link.
        </p>
      )}

      {/* --- preview -------------------------------------------------------- */}
      {preview && (
        <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-line bg-sunken/40 p-2">
          {isImage ? (
            <img
              src={preview}
              alt=""
              className="size-12 shrink-0 rounded object-cover"
              onError={(e) => {
                // Not yet deployed, or a bad path. Leave the row, drop the image.
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded bg-surface text-ink-faint">
              <Paperclip className="size-4" aria-hidden />
            </span>
          )}
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-[0.75rem] text-info hover:underline"
          >
            {value}
          </a>
        </div>
      )}
    </div>
  )
}

/**
 * Pick many files at once and publish them all.
 *
 * A gallery album is a dozen photos from one programme, so adding an empty row
 * and browsing for a single file each time is not a workflow. This takes a
 * whole selection and reports the paths back once they are committed.
 *
 * Uploads run one after another rather than in parallel: the GitHub Contents
 * API serialises writes to a branch, and firing a dozen at once produces 409
 * conflicts against each other. A handful of photos takes a few seconds, which
 * is the right trade for every one of them actually landing.
 */
export function MultiFileField({
  label,
  hint,
  folder,
  accept,
  onAdd,
}: {
  label: string
  hint?: string
  folder: string
  accept?: string
  onAdd: (paths: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { data } = useVault()
  const toast = useToast()

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const github = data?.github

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)

    if (!github) {
      setError('Connect GitHub under Settings before uploading files.')
      return
    }

    const chosen = [...files]
    const tooBig = chosen.find((f) => f.size > MAX_BYTES)
    if (tooBig) {
      setError(`${tooBig.name} is over 10 MB. Please resize it before uploading.`)
      return
    }

    const added: string[] = []
    const failed: string[] = []

    for (const [index, file] of chosen.entries()) {
      setProgress({ done: index, total: chosen.length })
      try {
        const { bytes, name } = await shrinkImage(file)
        const path = buildPath(folder, name)
        await putBinaryFile(
          github.token,
          { owner: github.owner, repo: github.repo, branch: github.branch },
          `public/${path}`,
          bytes,
          `Upload ${file.name}`,
        )
        added.push(path)
      } catch {
        failed.push(file.name)
      }
    }

    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''

    // Keep whatever landed, even if some of the batch failed.
    if (added.length > 0) onAdd(added)
    if (failed.length > 0) {
      setError(`${failed.length} of ${chosen.length} did not upload: ${failed.join(', ')}`)
    } else {
      toast.success(
        `${added.length} file${added.length === 1 ? '' : 's'} uploaded`,
        'Remember to save, then publish.',
      )
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-line-strong p-3.5">
      <p className="text-[0.8125rem] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-1 text-[0.75rem] leading-snug text-ink-faint">{hint}</p>}

      <Button
        variant="secondary"
        icon={FileUp}
        size="sm"
        className="mt-2.5"
        loading={progress !== null}
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        {progress ? `Uploading ${progress.done + 1} of ${progress.total}` : 'Choose files'}
      </Button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void pick(e.target.files)}
      />

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[0.75rem] font-medium text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {!github && !error && (
        <p className="mt-2 text-[0.75rem] text-ink-faint">
          Uploading needs the GitHub connection from Settings.
        </p>
      )}
    </div>
  )
}

/**
 * Where an uploaded file lands.
 *
 * The original name is slugified and stamped, so two people uploading
 * "IMG_1234.jpg" from different phones cannot overwrite each other's photo —
 * which, with a plain Contents API write, is exactly what would happen.
 */
function buildPath(folder: string, filename: string): string {
  const dot = filename.lastIndexOf('.')
  const stem = dot > 0 ? filename.slice(0, dot) : filename
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'
  const stamp = new Date().toISOString().slice(0, 10)
  return `media/${folder}/${stamp}-${slugify(stem) || 'file'}.${ext}`
}
