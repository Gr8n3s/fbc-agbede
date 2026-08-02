import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useLockBodyScroll } from '@/hooks'
import { cx } from '@/lib/utils'
import { Button, IconButton } from './primitives'

/**
 * Modal dialog.
 *
 * Built on the native <dialog> element, which gives real modality for free:
 * the browser handles the top layer, inert background, Escape, and — the part
 * hand-rolled modals almost always get wrong — focus trapping.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  closeOnBackdrop = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
  children: React.ReactNode
  closeOnBackdrop?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useLockBodyScroll(open)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape fires `cancel`; intercept so React state stays the source of truth.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const onBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop || event.target !== ref.current) return
    onClose()
  }

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size]

  return (
    <dialog
      ref={ref}
      onClick={onBackdropClick}
      aria-labelledby="modal-title"
      className={cx(
        'w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-lift',
        'backdrop:bg-vestry-950/55 backdrop:backdrop-blur-sm',
        'open:animate-rise',
        widths,
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id="modal-title" className="font-display text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-[0.8125rem] leading-snug text-ink-faint">{description}</p>
              )}
            </div>
            <IconButton icon={X} label="Close dialog" onClick={onClose} className="-mr-2 -mt-1" />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-sunken/60 px-5 py-3.5">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  /** Require typing this exact word. For genuinely destructive actions only. */
  requirePhrase,
  busy = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: React.ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  requirePhrase?: string
  busy?: boolean
}) {
  const [typed, setTyped] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const confirm = async () => {
    setWorking(true)
    try {
      await onConfirm()
    } finally {
      setWorking(false)
    }
  }

  const blocked = Boolean(requirePhrase) && typed.trim() !== requirePhrase

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={working || busy}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={confirm}
            disabled={blocked}
            loading={working || busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1 text-[0.875rem] leading-relaxed text-ink-soft">{message}</div>
      </div>

      {requirePhrase && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
            Type <code className="rounded bg-sunken px-1 font-mono text-ink">{requirePhrase}</code> to
            continue
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
          />
        </label>
      )}
    </Modal>
  )
}

/** Imperative confirm, for handlers that would rather await than manage state. */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    props: Omit<React.ComponentProps<typeof ConfirmDialog>, 'open' | 'onClose' | 'onConfirm'>
    resolve?: (value: boolean) => void
  }>({ open: false, props: { title: '', message: '' } })

  const confirm = useCallback(
    (props: Omit<React.ComponentProps<typeof ConfirmDialog>, 'open' | 'onClose' | 'onConfirm'>) =>
      new Promise<boolean>((resolve) => setState({ open: true, props, resolve })),
    [],
  )

  const element = (
    <ConfirmDialog
      {...state.props}
      open={state.open}
      onClose={() => {
        state.resolve?.(false)
        setState((s) => ({ ...s, open: false }))
      }}
      onConfirm={() => {
        state.resolve?.(true)
        setState((s) => ({ ...s, open: false }))
      }}
    />
  )

  return { confirm, confirmElement: element }
}

// ---------------------------------------------------------------------------
// Drawer (mobile navigation)
// ---------------------------------------------------------------------------

export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  side?: 'left' | 'right'
  children: React.ReactNode
}) {
  useLockBodyScroll(open)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Move focus into the drawer so keyboard users are not left behind it.
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cx(
        'fixed inset-0 z-[90] lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cx(
          'absolute inset-0 bg-vestry-950/55 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'absolute inset-y-0 flex w-[min(20rem,85vw)] flex-col border-line bg-surface shadow-lift outline-none',
          'transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
          side === 'right'
            ? cx('right-0 border-l', open ? 'translate-x-0' : 'translate-x-full')
            : cx('left-0 border-r', open ? 'translate-x-0' : '-translate-x-full'),
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
