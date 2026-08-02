import { useMemo, useState } from 'react'
import { Eye, EyeOff, FileQuestion, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Modal,
  Pagination,
  SearchInput,
  useConfirm,
  usePagination,
} from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { matchesQuery, nowIso } from '@/lib/utils'

/**
 * One list-and-form pattern, shared by every published collection.
 *
 * Events, sermons, announcements, bulletins, downloads, devotionals and prayer
 * points are all the same shape of job: a searchable list, an add/edit modal, a
 * publish toggle and a delete. Writing that seven times would guarantee seven
 * slightly different behaviours, so it is written once here and each collection
 * supplies only what is genuinely different — its fields, and how a row reads.
 */

export interface RowView {
  title: string
  /** Small line under the title. */
  meta?: string
  /** Right-hand column, usually a date. */
  trailing?: string
  badges?: { label: string; tone?: React.ComponentProps<typeof Badge>['tone'] }[]
}

export interface CollectionManagerProps<T extends { id: string }> {
  /** Plural noun, lower case: "sermons". Used in prose. */
  noun: string
  /** Singular noun, lower case: "sermon". */
  singular: string
  icon: LucideIcon
  items: T[]
  onChange: (next: T[]) => Promise<void>
  /** A blank record, already carrying an id and timestamps. */
  createItem: () => T
  renderRow: (item: T) => RowView
  renderForm: (draft: T, set: <K extends keyof T>(key: K, value: T[K]) => void) => React.ReactNode
  /** Fields searched by the box above the list. */
  searchFields: (item: T) => (string | undefined)[]
  /** Validation. Return a message to block saving. */
  validate?: (draft: T) => string | null
  /** Sort applied before display. Defaults to insertion order. */
  sortBy?: (a: T, b: T) => number
  /** Present when the record has a `published` flag to toggle. */
  publishable?: boolean
  formSize?: 'md' | 'lg' | 'xl'
  emptyHint?: string
  pageSize?: number
}

export function CollectionManager<T extends { id: string; published?: boolean; updatedAt?: string }>({
  noun,
  singular,
  icon: Icon,
  items,
  onChange,
  createItem,
  renderRow,
  renderForm,
  searchFields,
  validate,
  sortBy,
  publishable = true,
  formSize = 'lg',
  emptyHint,
  pageSize = 15,
}: CollectionManagerProps<T>) {
  const toast = useToast()
  const { confirm, confirmElement } = useConfirm()

  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ draft: T; isNew: boolean } | null>(null)

  const sorted = useMemo(() => {
    const list = [...items]
    return sortBy ? list.sort(sortBy) : list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const filtered = useMemo(
    () => sorted.filter((item) => matchesQuery(query, ...searchFields(item))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, query],
  )

  const page = usePagination(filtered, pageSize)

  const save = async (draft: T, isNew: boolean) => {
    const stamped = { ...draft, updatedAt: nowIso() }
    await onChange(
      isNew ? [...items, stamped] : items.map((item) => (item.id === draft.id ? stamped : item)),
    )
    setEditing(null)
    toast.success(isNew ? `${capitalise(singular)} added` : `${capitalise(singular)} updated`)
  }

  const remove = async (item: T) => {
    const row = renderRow(item)
    const ok = await confirm({
      title: `Delete this ${singular}?`,
      message: (
        <>
          <strong className="text-ink">{row.title}</strong> will be removed. It disappears from the
          church website the next time you publish.
        </>
      ),
      confirmLabel: `Delete ${singular}`,
    })
    if (!ok) return

    await onChange(items.filter((existing) => existing.id !== item.id))
    toast.warning(`${capitalise(singular)} deleted`)
  }

  const togglePublished = async (item: T) => {
    await onChange(
      items.map((existing) =>
        existing.id === item.id
          ? { ...existing, published: !(existing.published ?? true), updatedAt: nowIso() }
          : existing,
      ),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Search ${noun}…`}
          label={`Search ${noun}`}
          className="min-w-[12rem] flex-1"
        />
        <Button icon={Plus} onClick={() => setEditing({ draft: createItem(), isNew: true })}>
          Add {singular}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={items.length === 0 ? Icon : query ? Search : FileQuestion}
          title={items.length === 0 ? `No ${noun} yet` : `Nothing matches “${query}”`}
          description={items.length === 0 ? emptyHint : 'Try a different search.'}
          action={
            items.length === 0 ? (
              <Button icon={Plus} onClick={() => setEditing({ draft: createItem(), isNew: true })}>
                Add the first {singular}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {page.slice.map((item) => {
              const row = renderRow(item)
              const isPublished = item.published ?? true
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[0.9375rem] font-semibold text-ink">
                        {row.title}
                      </span>
                      {publishable && !isPublished && <Badge tone="warning">Draft</Badge>}
                      {row.badges?.map((badge) => (
                        <Badge key={badge.label} tone={badge.tone ?? 'neutral'}>
                          {badge.label}
                        </Badge>
                      ))}
                    </p>
                    {row.meta && (
                      <p className="mt-0.5 line-clamp-1 text-[0.8125rem] text-ink-faint">
                        {row.meta}
                      </p>
                    )}
                  </div>

                  {row.trailing && (
                    <span className="shrink-0 text-[0.8125rem] tabular-nums text-ink-faint">
                      {row.trailing}
                    </span>
                  )}

                  <span className="flex shrink-0 gap-0.5">
                    {publishable && (
                      <IconButton
                        icon={isPublished ? Eye : EyeOff}
                        size="sm"
                        label={
                          isPublished
                            ? `Hide "${row.title}" from the website`
                            : `Show "${row.title}" on the website`
                        }
                        onClick={() => void togglePublished(item)}
                      />
                    )}
                    <IconButton
                      icon={Pencil}
                      size="sm"
                      label={`Edit "${row.title}"`}
                      onClick={() => setEditing({ draft: item, isNew: false })}
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      tone="danger"
                      label={`Delete "${row.title}"`}
                      onClick={() => void remove(item)}
                    />
                  </span>
                </li>
              )
            })}
          </ul>

          <Pagination
            page={page.page}
            pageCount={page.pageCount}
            onPage={page.setPage}
            from={page.from}
            to={page.to}
            total={page.total}
            unit={noun}
          />
        </>
      )}

      {editing && (
        <RecordForm
          key={editing.draft.id}
          initial={editing.draft}
          isNew={editing.isNew}
          singular={singular}
          size={formSize}
          renderForm={renderForm}
          validate={validate}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      {confirmElement}
    </div>
  )
}

// ---------------------------------------------------------------------------

function RecordForm<T extends { id: string }>({
  initial,
  isNew,
  singular,
  size,
  renderForm,
  validate,
  onClose,
  onSave,
}: {
  initial: T
  isNew: boolean
  singular: string
  size: 'md' | 'lg' | 'xl'
  renderForm: (draft: T, set: <K extends keyof T>(key: K, value: T[K]) => void) => React.ReactNode
  validate?: (draft: T) => string | null
  onClose: () => void
  onSave: (draft: T, isNew: boolean) => Promise<void>
}) {
  const [draft, setDraft] = useState<T>(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof T>(key: K, value: T[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    const message = validate?.(draft) ?? null
    setError(message)
    if (message) return

    setBusy(true)
    try {
      await onSave(draft, isNew)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? `Add ${singular}` : `Edit ${singular}`}
      description="Saved on this device. Nothing goes public until you publish."
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={Save} onClick={submit} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {renderForm(draft, set)}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-danger/10 px-3 py-2 text-[0.8125rem] font-medium text-danger"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Timestamps every new published record starts with. */
export function stamps() {
  const now = nowIso()
  return { createdAt: now, updatedAt: now }
}
