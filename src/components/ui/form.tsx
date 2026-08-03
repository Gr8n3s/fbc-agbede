import { forwardRef, useId } from 'react'
import { AlertCircle, ChevronDown, Plus, Search, Trash2, X } from 'lucide-react'
import { cx } from '@/lib/utils'
import { IconButton } from './primitives'

/**
 * Form primitives.
 *
 * Every control is wired for accessibility by construction: a real <label>
 * bound by id, errors linked with aria-describedby and announced with
 * role="alert", and aria-invalid set when there is a message. Getting this
 * right once here means no form in the app can quietly get it wrong.
 */

const CONTROL =
  'w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-colors ' +
  'placeholder:text-ink-faint/70 hover:border-ornament/50 ' +
  'focus:border-info focus:outline-none focus:ring-2 focus:ring-info/25 ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20'

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

export interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  /** Hide the label visually but keep it for screen readers. */
  hideLabel?: boolean
  className?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode
}

export function Field({
  label,
  hint,
  error,
  required,
  hideLabel,
  className,
  children,
}: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('min-w-0', className)}>
      <label
        htmlFor={id}
        className={cx(
          'mb-1.5 block text-[0.8125rem] font-semibold text-ink',
          hideLabel && 'sr-only',
        )}
      >
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-label="required">
            *
          </span>
        )}
      </label>
      {hint && !error && (
        <p id={hintId} className="mb-1.5 text-[0.75rem] leading-snug text-ink-faint">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-[0.75rem] font-medium text-danger"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Text inputs
// ---------------------------------------------------------------------------

type InputProps = Omit<FieldProps, 'children'> &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    inputClassName?: string
    prefix?: string
  }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, hideLabel, className, inputClassName, prefix, ...rest },
  ref,
) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-ink-faint">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cx(CONTROL, 'h-11', prefix && 'pl-9', inputClassName)}
            {...rest}
          />
        </div>
      )}
    </Field>
  )
})

type TextareaProps = Omit<FieldProps, 'children'> &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
    /** Show a live character counter — useful for fields that get published. */
    showCount?: boolean
  }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, hideLabel, className, rows = 4, showCount, value, maxLength, ...rest },
  ref,
) {
  const length = typeof value === 'string' ? value.length : 0
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <>
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            required={required}
            value={value}
            maxLength={maxLength}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cx(CONTROL, 'resize-y py-2.5 leading-relaxed')}
            {...rest}
          />
          {showCount && (
            <p className="mt-1 text-right text-[0.7rem] tabular-nums text-ink-faint">
              {length}
              {maxLength ? ` / ${maxLength}` : ''}
            </p>
          )}
        </>
      )}
    </Field>
  )
})

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

type SelectProps = Omit<FieldProps, 'children'> &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
    options: SelectOption[]
    placeholder?: string
  }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, hideLabel, className, options, placeholder, ...rest },
  ref,
) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cx(CONTROL, 'h-11 appearance-none pr-9')}
            {...rest}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
        </div>
      )}
    </Field>
  )
})

// ---------------------------------------------------------------------------
// Combobox
// ---------------------------------------------------------------------------

/**
 * A select that also accepts anything typed.
 *
 * Church vocabulary never fits a fixed list — a category might be "Harvest",
 * "Thanksgiving Service" or something nobody anticipated. This offers the usual
 * options for speed while never blocking a word the church actually uses.
 *
 * Built on a native `<input list>` + `<datalist>`, so it is a real text field
 * with real autocomplete on every platform, including mobile, and needs no
 * popup, no focus trap and no keyboard handling of our own.
 */
type ComboboxProps = Omit<FieldProps, 'children'> &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'list'> & {
    options: SelectOption[]
  }

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  { label, hint, error, required, hideLabel, className, options, ...rest },
  ref,
) {
  const listId = useId()
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <>
          <input
            ref={ref}
            id={id}
            list={listId}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cx(CONTROL, 'h-11')}
            {...rest}
          />
          <datalist id={listId}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label !== option.value ? option.label : undefined}
              </option>
            ))}
          </datalist>
        </>
      )}
    </Field>
  )
})

// ---------------------------------------------------------------------------
// Checkbox, switch, radio
// ---------------------------------------------------------------------------

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: { label: string; description?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={cx('flex items-start gap-2.5', className)}>
      <input
        type="checkbox"
        id={id}
        className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-line-strong accent-[var(--color-brand)]"
        {...rest}
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-[0.875rem] font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink-faint">
            {description}
          </span>
        )}
      </label>
    </div>
  )
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-[0.875rem] font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink-faint">
            {description}
          </span>
        )}
      </label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50',
          checked ? 'bg-brand' : 'bg-line-strong',
        )}
      >
        {/*
          Geometry stated explicitly rather than left to a half-step translate:
          the track is 44x24 with a 20px knob, so anchoring at left-0.5/top-0.5
          and sliding a whole 20px keeps an even 2px margin at either end. The
          knob previously overshot and sat outside the track.
        */}
        <span
          className={cx(
            'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
          aria-hidden
        />
      </button>
    </div>
  )
}

/** Segmented control. Behaves as a radio group for assistive technology. */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: T
  onChange: (next: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex rounded-lg border border-line bg-sunken p-0.5', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded-[0.4rem] px-3 py-1.5 text-[0.8125rem] font-medium transition-all duration-200',
            value === option.value
              ? 'bg-surface text-ink shadow-pew'
              : 'text-ink-faint hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
  className,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  label?: string
  className?: string
}) {
  const id = useId()
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cx(CONTROL, 'h-11 pl-9 pr-9')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Repeatable list editor
// ---------------------------------------------------------------------------

/**
 * Editor for the many ordered lists in church content — order of service,
 * hymns, readings, notices, service times, bank accounts.
 *
 * Rows are addressed by their own id rather than by index, so reordering or
 * deleting mid-list cannot make a later edit land on the wrong row.
 */
export function ListEditor<T extends { id: string }>({
  label,
  hint,
  items,
  onChange,
  renderRow,
  createItem,
  addLabel = 'Add row',
  emptyLabel = 'Nothing added yet.',
  reorderable = true,
}: {
  label: string
  hint?: string
  items: T[]
  onChange: (next: T[]) => void
  renderRow: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode
  createItem: () => T
  addLabel?: string
  emptyLabel?: string
  reorderable?: boolean
}) {
  const update = (id: string, patch: Partial<T>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const remove = (id: string) => onChange(items.filter((item) => item.id !== id))

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[0.8125rem] font-semibold text-ink">{label}</legend>
      {hint && <p className="mb-2 text-[0.75rem] leading-snug text-ink-faint">{hint}</p>}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-[0.8125rem] text-ink-faint">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-lg border border-line bg-sunken/50 p-2"
            >
              {reorderable && (
                <div className="flex shrink-0 flex-col pt-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${label} row ${index + 1} up`}
                    className="grid size-5 place-items-center rounded text-ink-faint hover:bg-surface hover:text-ink disabled:opacity-25"
                  >
                    <ChevronDown className="size-3.5 rotate-180" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${label} row ${index + 1} down`}
                    className="grid size-5 place-items-center rounded text-ink-faint hover:bg-surface hover:text-ink disabled:opacity-25"
                  >
                    <ChevronDown className="size-3.5" aria-hidden />
                  </button>
                </div>
              )}
              <div className="min-w-0 flex-1">{renderRow(item, (patch) => update(item.id, patch), index)}</div>
              <IconButton
                icon={Trash2}
                size="sm"
                tone="danger"
                label={`Remove ${label} row ${index + 1}`}
                onClick={() => remove(item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...items, createItem()])}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ornament hover:text-ink"
      >
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </button>
    </fieldset>
  )
}

/** Compact bare input for use inside ListEditor rows. */
export function RowInput({
  label,
  className,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      aria-label={label}
      placeholder={label}
      className={cx(CONTROL, 'h-9 text-[0.8125rem]', className)}
      {...rest}
    />
  )
}

export { CONTROL as controlClass }
