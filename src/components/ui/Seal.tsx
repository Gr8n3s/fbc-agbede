import { useId } from 'react'
import { cx } from '@/lib/utils'

/**
 * The church seal, drawn as vector.
 *
 * A redrawn, simplified interpretation of the FBC Agbede badge: the double
 * ring carrying the church name, the crimson banner for "Chapel of Grace",
 * and inside it the cross standing on the open Bible with the dove above.
 *
 * Vector rather than the raster logo because this appears at 20px in the nav,
 * at 200px on the home page and at print resolution on bulletins — one file
 * that stays sharp everywhere, and no image request on first paint.
 *
 * `variant`:
 *   'full'  — complete seal with ring lettering. Needs ~96px to read.
 *   'mark'  — cross, book and dove only. For favicons and tight spaces.
 *   'crest' — ring and banner without lettering. Sits behind headings.
 */
export function Seal({
  variant = 'full',
  className,
  title = 'First Baptist Church Agbede, Ikorodu — Chapel of Grace',
  decorative = false,
}: {
  variant?: 'full' | 'mark' | 'crest'
  className?: string
  title?: string
  decorative?: boolean
}) {
  // Ids must be unique per instance or a second seal on the page reuses the
  // first one's gradients and clip paths.
  const uid = useId().replace(/:/g, '')
  const skyId = `sky-${uid}`
  const ringPathTop = `rt-${uid}`
  const ringPathBottom = `rb-${uid}`
  const clipId = `clip-${uid}`

  return (
    <svg
      viewBox="0 0 200 200"
      className={cx('shrink-0', className)}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!decorative && <title>{title}</title>}

      <defs>
        <radialGradient id={skyId} cx="50%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#bfe4fb" />
          <stop offset="55%" stopColor="#7cc4f4" />
          <stop offset="100%" stopColor="#4aa7ea" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="100" cy="100" r="72" />
        </clipPath>
        {/* Text baselines. Top arc reads left-to-right; bottom arc is reversed
            so the banner lettering is upright rather than upside down. */}
        <path id={ringPathTop} d="M100,15 a85,85 0 1,1 -0.1,0" />
        <path id={ringPathBottom} d="M18,110 a82,82 0 0,0 164,0" />
      </defs>

      {variant !== 'mark' && (
        <>
          {/* Outer ring */}
          <circle cx="100" cy="100" r="97" fill="#2B2750" />
          <circle cx="100" cy="100" r="97" stroke="#1A5C9C" strokeWidth="4" />
          <circle cx="100" cy="100" r="82" stroke="#1A5C9C" strokeWidth="3" />

          {/* Crimson banner across the lower third, clipped to the ring */}
          <g clipPath={`url(#${clipId})`} />
          <path
            d="M100,197 A97,97 0 0,1 8.4,131 L191.6,131 A97,97 0 0,1 100,197 Z"
            fill="#C4142F"
          />

          {/* Sky field */}
          <circle cx="100" cy="100" r="72" fill={`url(#${skyId})`} />

          {/* The two dots that separate the upper and lower lettering */}
          <circle cx="17" cy="128" r="4.5" fill="#fff" />
          <circle cx="183" cy="128" r="4.5" fill="#fff" />
        </>
      )}

      {/* --- Centre device: dove above cross above open Bible --- */}
      <g clipPath={variant === 'mark' ? undefined : `url(#${clipId})`}>
        {variant === 'mark' && <circle cx="100" cy="100" r="96" fill={`url(#${skyId})`} />}

        {/* Cross */}
        <g fill="#1A5C9C">
          <rect x="94" y="62" width="12" height="86" rx="1.5" />
          <rect x="72" y="82" width="56" height="12" rx="1.5" />
        </g>

        {/* Dove in flight, wings raised */}
        <g fill="#ffffff">
          <path
            d="M100 30c-6.5 0-12.4 2.6-16.4 6.6-3.4 3.4-9.2 4.2-13.9 2.1-1.5-.7-3 .9-2.1 2.3 3.4 5.2 9.4 8.6 16.2 8.6h2.6c-1.1 2.4-1.7 5-1.7 7.8 0 4 1.3 7.7 3.5 10.7l6.6-6.6c-.7-1.3-1.1-2.7-1.1-4.2 0-4.9 4-8.9 8.9-8.9s8.9 4 8.9 8.9c0 1.5-.4 2.9-1.1 4.2l6.6 6.6c2.2-3 3.5-6.7 3.5-10.7 0-2.8-.6-5.4-1.7-7.8h2.6c6.8 0 12.8-3.4 16.2-8.6.9-1.4-.6-3-2.1-2.3-4.7 2.1-10.5 1.3-13.9-2.1-4-4-9.9-6.6-16.4-6.6z"
            opacity="0.97"
          />
          <path d="M96 62h8l-2.6 12h-2.8z" />
        </g>

        {/* Open Bible */}
        <g>
          <path
            d="M100 140c-10-7-24-10-38-9v34c14-1 28 2 38 9z"
            fill="#f5efe0"
            stroke="#8a6d3b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M100 140c10-7 24-10 38-9v34c-14-1-28 2-38 9z"
            fill="#faf6ea"
            stroke="#8a6d3b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M100 140v34" stroke="#8a6d3b" strokeWidth="2" strokeLinecap="round" />
          {/* Suggested text lines — evocative at size, invisible noise when tiny */}
          <g stroke="#b9a887" strokeWidth="1.4" strokeLinecap="round" opacity="0.8">
            <path d="M70 141h22M70 147h22M70 153h22M70 159h22M70 165h18" />
            <path d="M108 141h22M108 147h22M108 153h22M108 159h22M112 165h18" />
          </g>
        </g>
      </g>

      {variant === 'full' && (
        <g fill="#ffffff" fontFamily="var(--font-sans, sans-serif)" fontWeight="700">
          <text fontSize="13.6" letterSpacing="1.6">
            <textPath href={`#${ringPathTop}`} startOffset="50%" textAnchor="middle">
              FIRST BAPTIST CHURCH AGBEDE, IKORODU
            </textPath>
          </text>
          <text fontSize="15" letterSpacing="4.4">
            <textPath href={`#${ringPathBottom}`} startOffset="50%" textAnchor="middle">
              CHAPEL OF GRACE
            </textPath>
          </text>
        </g>
      )}
    </svg>
  )
}

/**
 * Wordmark used in the header and footer: the seal beside the church name,
 * stacked so it degrades to just the seal on very narrow screens.
 */
export function Wordmark({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <Seal variant={compact ? 'mark' : 'full'} className="size-9 sm:size-10" decorative />
      <span className={cx('min-w-0 leading-none', compact && 'sr-only')}>
        <span className="block font-display text-[0.95rem] font-semibold tracking-tight text-ink">
          FBC Agbede
        </span>
        <span className="mt-0.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-ornament">
          Chapel of Grace
        </span>
      </span>
    </span>
  )
}

/**
 * Loading indicator built from the seal's rings, so waiting still looks like
 * this app rather than a generic spinner.
 */
export function SealSpinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cx('inline-grid place-items-center', className)}>
      <svg viewBox="0 0 48 48" className="size-full" aria-hidden fill="none">
        <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2.5" opacity="0.16" />
        <circle
          cx="24"
          cy="24"
          r="21"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="34 100"
          style={{ animation: 'spin-slow 1.1s linear infinite', transformOrigin: 'center' }}
        />
        <path d="M24 14v20M17 21h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
