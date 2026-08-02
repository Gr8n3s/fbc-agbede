import { useMemo, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Badge, Card, Chip, EmptyState, PageHeader } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDocumentTitle, useRevealAll } from '@/hooks'
import { publishedDownloads } from '@/lib/content'
import { asset, formatDate, safeUrl } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  bulletin: 'Bulletins',
  outline: 'Weekly outlines',
  constitution: 'Constitution',
  study: 'Study materials',
  form: 'Forms',
  report: 'Reports',
  other: 'Other',
}

export default function DownloadsPage() {
  const { content } = useContent()
  useDocumentTitle('Downloads', 'Bulletins, weekly outlines, the church constitution and study materials.')

  const [category, setCategory] = useState('all')
  const revealRef = useRevealAll<HTMLDivElement>()

  const downloads = useMemo(() => publishedDownloads(content.downloads), [content.downloads])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of downloads) counts.set(d.category, (counts.get(d.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [downloads])

  const filtered = useMemo(
    () => downloads.filter((d) => category === 'all' || d.category === category),
    [downloads, category],
  )

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Downloads"
        description="Bulletins, weekly outlines, study materials and church documents, download once and keep them on your phone."
      />

      <div ref={revealRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        {categories.length > 1 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={category === 'all'} onClick={() => setCategory('all')} count={downloads.length}>
              All
            </Chip>
            {categories.map(([value, count]) => (
              <Chip
                key={value}
                active={category === value}
                onClick={() => setCategory(value)}
                count={count}
              >
                {CATEGORY_LABELS[value] ?? value}
              </Chip>
            ))}
          </div>
        )}

        <ul className="mt-8 space-y-3">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const href = safeUrl(asset(item.url))
              return (
                <li key={item.id} className="reveal">
                  <Card className="p-0">
                    <a
                      href={href}
                      download
                      target={/^https?:/i.test(item.url) ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-sunken/60"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                        <FileText className="size-5" aria-hidden />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-[1rem] font-semibold text-ink">
                            {item.title}
                          </span>
                          <Badge tone="neutral">{item.fileType.toUpperCase()}</Badge>
                        </span>
                        {item.description && (
                          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-soft">
                            {item.description}
                          </span>
                        )}
                        <span className="mt-1 block text-[0.75rem] text-ink-faint">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                          {item.sizeLabel ? ` · ${item.sizeLabel}` : ''} ·{' '}
                          {formatDate(item.createdAt.slice(0, 10), 'medium')}
                        </span>
                      </span>

                      <Download className="size-5 shrink-0 text-ornament" aria-hidden />
                    </a>
                  </Card>
                </li>
              )
            })
          ) : (
            <EmptyState
              icon={Download}
              title={downloads.length === 0 ? 'Nothing to download yet' : 'Nothing in this category'}
              description="Bulletins, outlines and study materials will be published here."
            />
          )}
        </ul>
      </div>
    </>
  )
}
