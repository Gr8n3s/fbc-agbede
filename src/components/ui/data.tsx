import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { cx } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Client-side pagination.
 *
 * Everything lives on the device already, so there is nothing to fetch — but a
 * register of two thousand members still must not render two thousand rows.
 * The page is clamped on every render so deleting the last row of the last
 * page lands the admin on a real page rather than an empty one.
 */
export function usePagination<T>(items: T[], pageSize = 25) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, pageCount)

  const slice = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )

  return {
    page: safePage,
    pageCount,
    setPage,
    slice,
    from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, items.length),
    total: items.length,
    reset: () => setPage(1),
  }
}

export function Pagination({
  page,
  pageCount,
  onPage,
  from,
  to,
  total,
  unit = 'records',
}: {
  page: number
  pageCount: number
  onPage: (next: number) => void
  from: number
  to: number
  total: number
  unit?: string
}) {
  if (total === 0) return null

  // Windowed page numbers: first, last, and a few either side of the current.
  const pages: (number | 'gap')[] = []
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap')
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3"
      aria-label="Pagination"
    >
      <p className="text-[0.8125rem] tabular-nums text-ink-faint">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {unit}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-sunken disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>

          {pages.map((entry, i) =>
            entry === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-ink-faint" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPage(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={cx(
                  'min-w-9 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-medium tabular-nums transition-colors',
                  entry === page ? 'bg-brand text-on-brand' : 'text-ink-soft hover:bg-sunken',
                )}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page === pageCount}
            aria-label="Next page"
            className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-sunken disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export interface SortState<K extends string> {
  key: K
  dir: 'asc' | 'desc'
}

export function useSort<T, K extends string>(
  items: T[],
  accessors: Record<K, (item: T) => string | number>,
  initial: SortState<K>,
) {
  const [sort, setSort] = useState<SortState<K>>(initial)

  const sorted = useMemo(() => {
    const accessor = accessors[sort.key]
    if (!accessor) return items
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      const va = accessor(a)
      const vb = accessor(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb), 'en', { sensitivity: 'base' }) * factor
    })
    // `accessors` is a literal rebuilt each render; keying on sort alone is
    // correct here and avoids re-sorting on every keystroke elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort])

  const toggle = (key: K) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )

  return { sort, sorted, toggle }
}

export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'left',
  className,
}: {
  label: string
  sortKey: K
  sort: SortState<K>
  onToggle: (key: K) => void
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const active = sort.key === sortKey
  const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cx('px-3 py-2.5', className)}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={cx(
          'inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] transition-colors',
          active ? 'text-ink' : 'text-ink-faint hover:text-ink',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        <Icon className={cx('size-3', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
      </button>
    </th>
  )
}

// ---------------------------------------------------------------------------
// Table shell
// ---------------------------------------------------------------------------

/**
 * Horizontally scrollable table wrapper.
 *
 * Church registers have a lot of columns and most people will open this on a
 * phone, so the table scrolls inside its own container and the page body never
 * does. The header sticks so column meanings survive a long scroll.
 */
export function TableShell({
  caption,
  head,
  children,
  className,
}: {
  caption: string
  head: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-line', className)}>
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-sunken/95 backdrop-blur">
          <tr className="border-b border-line">{head}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

export function Th({
  children,
  align = 'left',
  className,
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cx(
        'px-3 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-faint',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <td
      className={cx(
        'px-3 py-2.5 align-middle text-ink-soft',
        align === 'right' && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  )
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={cx(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-sunken/70',
        className,
      )}
    >
      {children}
    </tr>
  )
}
