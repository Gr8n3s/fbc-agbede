import { useMemo, useState } from 'react'
import { CalendarRange, ScrollText } from 'lucide-react'
import { BulletinCard } from '@/components/site/cards'
import { Chip, EmptyState, PageHeader, SearchInput } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDebounced, useDocumentTitle, useRevealAll } from '@/hooks'
import { publishedBulletins } from '@/lib/content'
import { bulletinsThisWeek } from '@/lib/schedule'
import { BULLETIN_KIND_LABELS, type BulletinKind } from '@/lib/types'
import { matchesQuery, todayIso } from '@/lib/utils'

type Filter = 'upcoming' | 'this-week' | 'past' | BulletinKind

export default function ProgrammePage() {
  const { content } = useContent()
  useDocumentTitle(
    'Church Programme',
    'Order of service and programme sheets for First Baptist Church Agbede, Ikorodu.',
  )

  const [filter, setFilter] = useState<Filter>('upcoming')
  const [query, setQuery] = useState('')
  const search = useDebounced(query)
  const revealRef = useRevealAll<HTMLDivElement>()

  const all = useMemo(() => publishedBulletins(content.bulletins), [content.bulletins])
  const today = todayIso()

  const thisWeek = useMemo(() => bulletinsThisWeek(all), [all])

  /** Kinds actually present, so the filter bar never offers an empty option. */
  const kinds = useMemo(() => {
    const counts = new Map<BulletinKind, number>()
    for (const b of all) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [all])

  const filtered = useMemo(() => {
    let list = all
    switch (filter) {
      case 'upcoming':
        list = all
          .filter((b) => (b.endDate ?? b.date) >= today)
          .sort((a, b) => a.date.localeCompare(b.date))
        break
      case 'this-week':
        list = thisWeek
        break
      case 'past':
        list = all.filter((b) => (b.endDate ?? b.date) < today)
        break
      default:
        list = all.filter((b) => b.kind === filter)
    }
    if (!search.trim()) return list
    return list.filter((b) =>
      matchesQuery(search, b.title, b.theme, b.preacher, b.serviceName, b.venue),
    )
  }, [all, filter, search, thisWeek, today])

  return (
    <>
      <PageHeader
        eyebrow="Order of service"
        title="Church Programme"
        description="Our programmes run through the whole week — Sunday worship, midweek Bible study, workers’ meetings, revivals and special services. Every order of service is here, and you can print any of them."
      />

      <div ref={revealRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search programmes, themes or preachers…"
            label="Search programmes"
          />

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>
              Upcoming
            </Chip>
            <Chip
              active={filter === 'this-week'}
              onClick={() => setFilter('this-week')}
              count={thisWeek.length}
            >
              This week
            </Chip>
            {kinds.map(([kind, count]) => (
              <Chip
                key={kind}
                active={filter === kind}
                onClick={() => setFilter(kind)}
                count={count}
              >
                {BULLETIN_KIND_LABELS[kind] ?? kind}
              </Chip>
            ))}
            <Chip active={filter === 'past'} onClick={() => setFilter('past')}>
              Past
            </Chip>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {filtered.length > 0 ? (
            filtered.map((bulletin) => (
              <div key={bulletin.id} className="reveal">
                <BulletinCard bulletin={bulletin} featured={bulletin.featured} />
              </div>
            ))
          ) : all.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No programmes published yet"
              description="Once the church administrator uploads an order of service it will appear here, and stay available on your phone even offline."
            />
          ) : (
            <EmptyState
              icon={CalendarRange}
              title="Nothing matches"
              description="Try a different filter or clear the search."
            />
          )}
        </div>
      </div>
    </>
  )
}
