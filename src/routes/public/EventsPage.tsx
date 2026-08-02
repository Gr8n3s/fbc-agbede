import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { EventCard } from '@/components/site/cards'
import {
  Badge,
  Chip,
  EmptyState,
  IconButton,
  PageHeader,
  SegmentedControl,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDocumentTitle, useRevealAll } from '@/hooks'
import { publishedEvents } from '@/lib/content'
import {
  expandEvents,
  monthGrid,
  occurrencesByDate,
  upcomingOccurrences,
  type Occurrence,
} from '@/lib/schedule'
import type { EventCategory } from '@/lib/types'
import { cx, formatTime, toIsoDate } from '@/lib/utils'

const CATEGORIES: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'service', label: 'Services' },
  { value: 'revival', label: 'Revival' },
  { value: 'convention', label: 'Convention' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'training', label: 'Training' },
  { value: 'social', label: 'Social' },
  { value: 'special', label: 'Special' },
]

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function EventsPage() {
  const { content } = useContent()
  useDocumentTitle('Events', 'Church calendar, weekly activities and upcoming programmes.')

  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [category, setCategory] = useState<EventCategory | 'all'>('all')
  const [cursor, setCursor] = useState(() => new Date())
  const revealRef = useRevealAll<HTMLDivElement>()

  const events = useMemo(() => {
    const all = publishedEvents(content.events)
    return category === 'all' ? all : all.filter((e) => e.category === category)
  }, [content.events, category])

  const upcoming = useMemo(() => upcomingOccurrences(events, 40, 365), [events])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const cells = useMemo(() => monthGrid(year, month), [year, month])
  const monthOccurrences = useMemo<Map<string, Occurrence[]>>(() => {
    if (cells.length === 0) return new Map()
    return occurrencesByDate(expandEvents(events, cells[0].date, cells[cells.length - 1].date))
  }, [events, cells])

  const [selectedDate, setSelectedDate] = useState<string>(() => toIsoDate(new Date()))
  const selected = monthOccurrences.get(selectedDate) ?? []

  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const shift = (delta: number) => setCursor(new Date(year, month + delta, 1))

  return (
    <>
      <PageHeader
        eyebrow="Church calendar"
        title="Events &amp; Programmes"
        description="Weekly activities, revivals, conventions and special services — everything the church is doing, on any day of the week."
      />

      <div ref={revealRef} className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {CATEGORIES.map((option) => (
              <Chip
                key={option.value}
                active={category === option.value}
                onClick={() => setCategory(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>

          <SegmentedControl
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List' },
              { value: 'calendar', label: 'Calendar' },
            ]}
            className="self-start sm:self-auto"
          />
        </div>

        {view === 'list' ? (
          <div className="mt-8 space-y-4">
            {upcoming.length > 0 ? (
              upcoming.map((occurrence) => (
                <div key={occurrence.key} className="reveal">
                  <EventCard occurrence={occurrence} />
                </div>
              ))
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Nothing scheduled"
                description={
                  category === 'all'
                    ? 'Upcoming events will appear here once they are published.'
                    : 'No events in this category. Try “All”.'
                }
                action={
                  category !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => setCategory('all')}
                      className="text-sm font-semibold text-info underline underline-offset-4"
                    >
                      Show all events
                    </button>
                  ) : undefined
                }
              />
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="card-chapel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                <IconButton icon={ChevronLeft} label="Previous month" onClick={() => shift(-1)} />
                <p className="font-display text-[0.9375rem] font-semibold text-ink">{monthLabel}</p>
                <IconButton icon={ChevronRight} label="Next month" onClick={() => shift(1)} />
              </div>

              <div className="grid grid-cols-7 border-b border-line bg-sunken/60">
                {WEEKDAYS.map((day, i) => (
                  <span
                    key={i}
                    className="py-2 text-center text-[0.7rem] font-bold uppercase tracking-wider text-ink-faint"
                    aria-hidden
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((cell) => {
                  const dayEvents = monthOccurrences.get(cell.date) ?? []
                  const isSelected = cell.date === selectedDate
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      aria-pressed={isSelected}
                      aria-label={`${cell.date}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                      className={cx(
                        'relative flex aspect-square flex-col items-center justify-center gap-1 border-b border-r border-line text-[0.8125rem] transition-colors last:border-r-0',
                        !cell.inMonth && 'text-ink-faint/40',
                        cell.inMonth && 'text-ink-soft hover:bg-sunken',
                        cell.isSunday && cell.inMonth && 'bg-brand/[0.04]',
                        isSelected && 'bg-brand/12 font-semibold text-brand',
                      )}
                    >
                      <span
                        className={cx(
                          'grid size-7 place-items-center rounded-full tabular-nums',
                          cell.isToday && 'bg-accent font-bold text-white',
                        )}
                      >
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="flex gap-0.5" aria-hidden>
                          {dayEvents.slice(0, 3).map((o) => (
                            <span key={o.key} className="size-1 rounded-full bg-ornament" />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>

              {selected.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {selected.map((occurrence) => (
                    <li key={occurrence.key}>
                      <Link
                        to={`/events/${occurrence.event.slug}`}
                        className="card-chapel hoverable block p-3.5"
                      >
                        <div className="flex items-center gap-2">
                          <Badge tone="brand">{occurrence.event.category}</Badge>
                          {!occurrence.event.allDay && (
                            <span className="text-[0.75rem] font-semibold tabular-nums text-ornament">
                              {formatTime(occurrence.start.toTimeString().slice(0, 5))}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 font-display text-[0.9375rem] font-semibold text-ink">
                          {occurrence.event.title}
                        </p>
                        {occurrence.event.venue && (
                          <p className="mt-0.5 text-[0.8125rem] text-ink-faint">
                            {occurrence.event.venue}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-[0.875rem] text-ink-faint">
                  Nothing scheduled on this day.
                </p>
              )}

              <button
                type="button"
                onClick={() => setView('list')}
                className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-info hover:underline"
              >
                <List className="size-4" aria-hidden />
                See everything coming up
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
