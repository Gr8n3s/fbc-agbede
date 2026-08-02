import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/utils'
import { Rule } from './primitives'

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

type CardProps<T extends React.ElementType> = {
  /** Render as a different element — `Link` for a whole-card click target. */
  as?: T
  hover?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

/**
 * Polymorphic so a card can be a `div`, an `<a>` or a router `Link` without a
 * nested-anchor wrapper — which keeps the whole card one tap target and one
 * tab stop rather than a card containing a link.
 */
export function Card<T extends React.ElementType = 'div'>({
  as,
  hover = false,
  className,
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? 'div') as React.ElementType
  return (
    <Tag className={cx('card-chapel', hover && 'hoverable', className)} {...rest}>
      {children}
    </Tag>
  )
}

/**
 * The signature surface: a card whose media is capped with a chapel-window
 * arch. Used for departments, albums and featured programmes — sparingly, so
 * the motif keeps its weight.
 */
export function ArchCard({
  image,
  imageAlt = '',
  fallbackIcon: Icon,
  to,
  href,
  className,
  children,
  aspect = 'portrait',
}: {
  image?: string
  imageAlt?: string
  fallbackIcon?: LucideIcon
  to?: string
  href?: string
  className?: string
  children: React.ReactNode
  aspect?: 'portrait' | 'square'
}) {
  const media = (
    <div
      className={cx(
        'arch relative overflow-hidden bg-gradient-to-b from-azure-200 to-vestry-800 dark:from-vestry-700 dark:to-vestry-950',
        aspect === 'portrait' ? 'aspect-4/5' : 'aspect-square',
      )}
    >
      {image ? (
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.06]"
        />
      ) : (
        <div className="grid size-full place-items-center">
          {Icon && <Icon className="size-12 text-white/35" aria-hidden strokeWidth={1.25} />}
        </div>
      )}
      {/* Gold keyline tracing the arch */}
      <div className="arch pointer-events-none absolute inset-0 ring-1 ring-inset ring-ornament/30" />
    </div>
  )

  const body = (
    <>
      {media}
      <div className="p-4">{children}</div>
    </>
  )

  const shell =
    'group card-chapel hoverable block overflow-hidden'

  if (to) {
    return (
      <Link to={to} className={cx(shell, className)}>
        {body}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cx(shell, className)}>
        {body}
      </a>
    )
  }
  return <div className={cx(shell, className)}>{body}</div>
}

/** Flat panel for admin forms — quieter than Card, used inside dense pages. */
export function Panel({
  title,
  description,
  action,
  icon: Icon,
  className,
  bodyClassName,
  children,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  icon?: LucideIcon
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cx('card-chapel overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <Icon className="size-4" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-display text-base font-semibold text-ink">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-faint">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cx('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
  as: Tag = 'h2',
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  action?: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div
      className={cx(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center',
        className,
      )}
    >
      <div className={cx('max-w-2xl', align === 'center' && 'text-center')}>
        {eyebrow && (
          <p className="eyebrow flex items-center gap-2.5">
            {align === 'center' && <span className="h-px w-6 bg-ornament/60" aria-hidden />}
            {eyebrow}
            <span className="h-px w-6 bg-ornament/60" aria-hidden />
          </p>
        )}
        <Tag
          className={cx(
            'mt-2 text-balance font-display font-semibold tracking-tight text-ink',
            Tag === 'h1' ? 'text-title' : 'text-2xl sm:text-[1.75rem]',
          )}
        >
          {title}
        </Tag>
        {description && (
          <p className="mt-2.5 text-pretty text-[0.9375rem] leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Page header used at the top of every public route. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <header className="relative overflow-hidden border-b border-line bg-surface">
      {/* Faint light-through-the-window wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[34rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--halo-a), transparent 62%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 text-balance font-display text-title font-semibold text-ink">{title}</h1>
        {description && (
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
        <Rule className="mx-auto mt-7 max-w-xs" />
        {children}
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  tone = 'brand',
  className,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  trend?: { value: number; label?: string }
  tone?: 'brand' | 'accent' | 'gold' | 'info'
  className?: string
}) {
  const toneRing = {
    brand: 'text-brand bg-brand/10',
    accent: 'text-accent bg-accent/10',
    gold: 'text-ornament bg-ornament/12',
    info: 'text-info bg-info/10',
  }[tone]

  return (
    <div className={cx('card-chapel p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-ink-faint">
          {label}
        </p>
        {Icon && (
          <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg', toneRing)}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-ink">
        {value}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {trend && (
          <span
            className={cx(
              'text-[0.75rem] font-semibold tabular-nums',
              trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-danger' : 'text-ink-faint',
            )}
          >
            {trend.value > 0 ? '▲' : trend.value < 0 ? '▼' : '—'} {Math.abs(trend.value)}%
            {trend.label ? ` ${trend.label}` : ''}
          </span>
        )}
        {hint && <span className="text-[0.75rem] text-ink-faint">{hint}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-sunken text-ink-faint">
          <Icon className="size-6" strokeWidth={1.4} aria-hidden />
        </span>
      )}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-faint">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />
}

/** Placeholder matching the shape of a card grid, to avoid layout shift. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card-chapel overflow-hidden">
          <Skeleton className="arch aspect-4/5 rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Definition-list row used across detail pages and the bulletin. */
export function DetailRow({
  label,
  children,
  icon: Icon,
}: {
  label: string
  children: React.ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex gap-3 border-b border-line py-2.5 last:border-0">
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-ornament" aria-hidden />}
      <dt className="w-32 shrink-0 text-[0.8125rem] font-medium text-ink-faint">{label}</dt>
      <dd className="min-w-0 flex-1 text-[0.875rem] text-ink">{children}</dd>
    </div>
  )
}

/** Breadcrumb-style back link, kept consistent across detail pages. */
export function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-faint transition-colors hover:text-ink"
    >
      <span aria-hidden>←</span> {children}
    </Link>
  )
}
