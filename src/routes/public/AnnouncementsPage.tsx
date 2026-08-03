import { useMemo, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { AnnouncementCard } from '@/components/site/cards'
import { Chip, EmptyState, PageHeader, SearchInput } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDebounced, useDocumentTitle, useRevealAll } from '@/hooks'
import { bulletinNotices as noticesFromBulletin, publishedAnnouncements } from '@/lib/content'
import { matchesQuery } from '@/lib/utils'

export default function AnnouncementsPage() {
  const { content } = useContent()
  useDocumentTitle('Notice Board', 'Announcements from First Baptist Church Agbede, Ikorodu.')

  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const search = useDebounced(query)
  const revealRef = useRevealAll<HTMLDivElement>()

  const announcements = useMemo(
    () => publishedAnnouncements(content.announcements),
    [content.announcements],
  )

  /** Notices from the current programme sheet, used when the board is empty. */
  const bulletinNotices = useMemo(
    () => noticesFromBulletin(content.bulletins),
    [content.bulletins],
  )

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of announcements) counts.set(a.category, (counts.get(a.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [announcements])

  const filtered = useMemo(
    () =>
      announcements
        .filter((a) => category === 'all' || a.category === category)
        .filter((a) => matchesQuery(search, a.title, a.body)),
    [announcements, category, search],
  )

  return (
    <>
      <PageHeader
        eyebrow="Announcements"
        title="Notice Board"
        description="Everything the church needs to know, service changes, celebrations, department notices and urgent messages."
      />

      <div ref={revealRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search notices…"
          label="Search announcements"
        />

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip
            active={category === 'all'}
            onClick={() => setCategory('all')}
            count={announcements.length}
          >
            All
          </Chip>
          {categories.map(([value, count]) => (
            <Chip
              key={value}
              active={category === value}
              onClick={() => setCategory(value)}
              count={count}
            >
              {value}
            </Chip>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {filtered.length > 0 ? (
            filtered.map((announcement) => (
              <div key={announcement.id} className="reveal">
                <AnnouncementCard announcement={announcement} />
              </div>
            ))
          ) : announcements.length === 0 && bulletinNotices.length > 0 ? (
            /*
              The church already writes its notices onto the weekly programme
              sheet. Leaving the notice board empty while that sheet is full of
              them helps nobody, so they are shown here too.
            */
            <div className="sm:col-span-2">
              <h2 className="font-display text-xl font-semibold text-ink">
                From this week's programme
              </h2>
              <ul className="mt-4 space-y-2.5">
                {bulletinNotices.map((notice, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-ornament" aria-hidden />
                    <span className="text-[0.9375rem] leading-relaxed text-ink-soft">{notice}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <EmptyState
                icon={Megaphone}
                title={announcements.length === 0 ? 'No notices yet' : 'Nothing matches'}
                description={
                  announcements.length === 0
                    ? 'Church announcements will appear here, and stay available offline.'
                    : 'Try a different category or clear the search.'
                }
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
