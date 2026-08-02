import { useMemo, useState } from 'react'
import { Mic, SearchX } from 'lucide-react'
import { SermonCard } from '@/components/site/cards'
import { Chip, EmptyState, PageHeader, SearchInput } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDebounced, useDocumentTitle, useRevealAll } from '@/hooks'
import { publishedSermons } from '@/lib/content'
import { matchesQuery } from '@/lib/utils'

export default function SermonsPage() {
  const { content } = useContent()
  useDocumentTitle('Sermons', 'Sermon notes, scripture references, audio and video messages.')

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [series, setSeries] = useState<string>('all')
  const search = useDebounced(query)
  const revealRef = useRevealAll<HTMLDivElement>()

  const sermons = useMemo(() => publishedSermons(content.sermons), [content.sermons])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of sermons) counts.set(s.category, (counts.get(s.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [sermons])

  const allSeries = useMemo(
    () => [...new Set(sermons.map((s) => s.series).filter(Boolean) as string[])].sort(),
    [sermons],
  )

  const filtered = useMemo(
    () =>
      sermons
        .filter((s) => category === 'all' || s.category === category)
        .filter((s) => series === 'all' || s.series === series)
        .filter((s) =>
          matchesQuery(
            search,
            s.title,
            s.preacher,
            s.summary,
            s.series,
            s.scriptures.join(' '),
            s.tags.join(' '),
          ),
        ),
    [sermons, category, series, search],
  )

  return (
    <>
      <PageHeader
        eyebrow="From the pulpit"
        title="Sermons"
        description="Messages preached at the Chapel of Grace, with notes, scripture references and recordings. Everything here works offline once the app is installed."
      />

      <div ref={revealRef} className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by title, preacher, scripture or topic…"
          label="Search sermons"
        />

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={category === 'all'} onClick={() => setCategory('all')} count={sermons.length}>
            All
          </Chip>
          {categories.map(([value, count]) => (
            <Chip
              key={value}
              active={category === value}
              onClick={() => setCategory(value)}
              count={count}
            >
              {value.replace(/-/g, ' ')}
            </Chip>
          ))}
        </div>

        {allSeries.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={series === 'all'} onClick={() => setSeries('all')}>
              Every series
            </Chip>
            {allSeries.map((value) => (
              <Chip key={value} active={series === value} onClick={() => setSeries(value)}>
                {value}
              </Chip>
            ))}
          </div>
        )}

        <p className="mt-6 text-[0.8125rem] text-ink-faint" aria-live="polite">
          {filtered.length === sermons.length
            ? `${sermons.length} sermon${sermons.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${sermons.length} sermons`}
        </p>

        <div className="mt-4">
          {filtered.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((sermon) => (
                <div key={sermon.id} className="reveal">
                  <SermonCard sermon={sermon} />
                </div>
              ))}
            </div>
          ) : sermons.length === 0 ? (
            <EmptyState
              icon={Mic}
              title="No sermons yet"
              description="Sermon notes and recordings will appear here as they are uploaded."
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="Nothing found"
              description="Try a different search term, or clear the filters."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setCategory('all')
                    setSeries('all')
                  }}
                  className="text-sm font-semibold text-info underline underline-offset-4"
                >
                  Clear all filters
                </button>
              }
            />
          )}
        </div>
      </div>
    </>
  )
}
