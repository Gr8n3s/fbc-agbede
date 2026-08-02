import { forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/lib/utils'
import { SealSpinner } from './Seal'

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand shadow-pew hover:brightness-115 active:brightness-95 disabled:hover:brightness-100',
  secondary:
    'border border-line-strong bg-surface text-ink hover:border-ornament hover:bg-sunken',
  ghost: 'text-ink-soft hover:bg-sunken hover:text-ink',
  danger: 'bg-danger text-white shadow-pew hover:brightness-110',
  gold: 'bg-ornament text-vestry-950 shadow-pew hover:brightness-110',
  link: 'text-info underline-offset-4 hover:underline px-0! h-auto! py-0!',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-[0.8125rem]',
  md: 'h-11 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-13 gap-2.5 rounded-xl px-6 text-[0.9375rem]',
}

const BASE =
  'relative inline-flex select-none items-center justify-center font-semibold tracking-tight ' +
  'transition-[background-color,border-color,color,filter,transform] duration-200 ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50'

interface ButtonOwnProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  fullWidth?: boolean
}

export type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const iconSize = size === 'sm' ? 'size-4' : 'size-[1.05rem]'
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <SealSpinner className={cx(iconSize, 'shrink-0')} label="" />
      ) : (
        Icon && <Icon className={cx(iconSize, 'shrink-0')} aria-hidden />
      )}
      {children}
      {IconRight && !loading && <IconRight className={cx(iconSize, 'shrink-0')} aria-hidden />}
    </button>
  )
})

/** Same visual language as Button, but routes instead of acting. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonOwnProps & LinkProps) {
  const iconSize = size === 'sm' ? 'size-4' : 'size-[1.05rem]'
  return (
    <Link
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {Icon && <Icon className={cx(iconSize, 'shrink-0')} aria-hidden />}
      {children}
      {IconRight && <IconRight className={cx(iconSize, 'shrink-0')} aria-hidden />}
    </Link>
  )
}

/** External link styled as a button. Always opened safely. */
export function ExternalButton({
  href,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  children,
}: ButtonOwnProps & { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(BASE, VARIANTS[variant], SIZES[size], className)}
    >
      {Icon && <Icon className="size-[1.05rem] shrink-0" aria-hidden />}
      {children}
    </a>
  )
}

// ---------------------------------------------------------------------------
// Icon button
// ---------------------------------------------------------------------------

export const IconButton = forwardRef<
  HTMLButtonElement,
  {
    icon: LucideIcon
    label: string
    size?: 'sm' | 'md'
    tone?: 'default' | 'danger'
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton({ icon: Icon, label, size = 'md', tone = 'default', className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-grid place-items-center rounded-lg text-ink-soft transition-colors duration-200',
        'hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger' && 'hover:bg-danger/10 hover:text-danger',
        size === 'sm' ? 'size-8' : 'size-10',
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[1.15rem]'} aria-hidden />
    </button>
  )
})

// ---------------------------------------------------------------------------
// Badge & chip
// ---------------------------------------------------------------------------

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'accent'
  | 'gold'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-ink-soft border-line',
  brand: 'bg-brand/10 text-brand border-brand/25',
  accent: 'bg-accent/10 text-accent border-accent/25',
  gold: 'bg-ornament/12 text-ornament border-ornament/30',
  info: 'bg-info/10 text-info border-info/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/25',
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em]',
        BADGE_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  )
}

/** Selectable filter pill. Uses a real button + aria-pressed for screen readers. */
export function Chip({
  active = false,
  onClick,
  children,
  count,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  count?: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-all duration-200',
        active
          ? 'border-brand bg-brand text-on-brand shadow-pew'
          : 'border-line bg-surface text-ink-soft hover:border-ornament/60 hover:text-ink',
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cx(
            'rounded-full px-1.5 text-[0.65rem] font-bold tabular-nums',
            active ? 'bg-on-brand/20' : 'bg-sunken',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Ornament
// ---------------------------------------------------------------------------

/** The gold hairline with a centred diamond. The app's section divider. */
export function Rule({ className }: { className?: string }) {
  return <div role="separator" className={cx('rule-gold my-8', className)} />
}

export function Spinner({ className }: { className?: string }) {
  return <SealSpinner className={cx('size-6 text-brand', className)} />
}
