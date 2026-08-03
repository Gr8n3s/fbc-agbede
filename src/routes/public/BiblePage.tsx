import { useMemo, useState } from 'react'
import { BookMarked, BookOpenText, Check, ChevronRight, GraduationCap } from 'lucide-react'
import { RichText } from '@/components/site/RichText'
import {
  Badge,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  PageHeader,
  SearchInput,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDebounced, useDocumentTitle, useLocalState, useRevealAll } from '@/hooks'
import { currentReadingPlan, publishedTeachings, readingForToday } from '@/lib/content'
import { formatDate, matchesQuery, todayIso } from '@/lib/utils'

/**
 * The Bible section: the plan the church is reading together, and the teaching
 * material it keeps available.
 *
 * Reading progress is kept on the device rather than published. Which chapters
 * someone has read is nobody else's business, and storing it locally means it
 * needs no account and works offline.
 */
export default function BiblePage() {
  const { content } = useContent()
  useDocumentTitle(
    'Bible',
    'Daily Bible reading plan and Christian teaching from First Baptist Church Agbede, Ikorodu.',
  )

  const revealRef = useRevealAll<HTMLDivElement>()
  const current = useMemo(() => currentReadingPlan(content.readingPlans), [content.readingPlans])
  const teachings = useMemo(() => publishedTeachings(content.teachings), [content.teachings])

  /**
   * Today's readings, whichever source the church has actually filled in.
   * `source` tells us whether to present it as the plan or as the devotional's
   * list, so the heading never claims a plan that does not exist.
   */
  const reading = useMemo(
    () => readingForToday(content.readingPlans, content.devotionals),
    [content.readingPlans, content.devotionals],
  )

  const [query, setQuery] = useState('')
  const search = useDebounced(query)
  const [topic, setTopic] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  /** Days ticked off, kept on this device. */
  const [read, setRead] = useLocalState<number[]>('reading.done', [])

  const topics = useMemo(
    () => [...new Set(teachings.map((t) => t.topic).filter(Boolean))],
    [teachings],
  )

  const visibleTeachings = useMemo(
    () =>
      teachings
        .filter((t) => !topic || t.topic === topic)
        .filter((t) => matchesQuery(search, t.title, t.topic, t.summary, t.scriptures.join(' '))),
    [teachings, topic, search],
  )

  const toggleDay = (day: number) =>
    setRead(read.includes(day) ? read.filter((d) => d !== day) : [...read, day])

  const plan = current?.plan
  const today = current?.day
  const progress = plan?.days.length ? Math.round((read.length / plan.days.length) * 100) : 0

  /** A fortnight around today, so the page is a schedule rather than a wall. */
  const window = useMemo(() => {
    if (!plan || !current) return []
    const from = Math.max(1, current.dayNumber - 3)
    return plan.days.filter((d) => d.day >= from && d.day < from + 14)
  }, [plan, current])

  return (
    <>
      <PageHeader
        eyebrow="The word of God"
        title="Bible"
        description="Read through the scriptures with the whole church, and study the teachings we hold to."
      />

      <div ref={revealRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        {/* --- today's reading -------------------------------------------- */}
        {plan ? (
          <section className="reveal" aria-labelledby="plan-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="plan-heading" className="font-display text-2xl font-semibold text-ink">
                  {plan.title}
                </h2>
                {plan.description && (
                  <p className="mt-1 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
                    {plan.description}
                  </p>
                )}
              </div>
              {plan.days.length > 0 && (
                <Badge tone="brand">
                  {read.length} of {plan.days.length} days
                </Badge>
              )}
            </div>

            {/* progress */}
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-[0.75rem] text-ink-faint">
                {progress}% complete. Your progress stays on this device.
              </p>
            </div>

            {today && (
              <Card className="mt-5 border-ornament/40 p-5 sm:p-7">
                <p className="eyebrow">Today, day {current.dayNumber}</p>
                <p className="mt-1 text-[0.8125rem] text-ink-faint">
                  {formatDate(todayIso(), 'full')}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {today.references.map((reference) => (
                    <li
                      key={reference}
                      className="rounded-lg border border-line bg-sunken px-3 py-2 font-display text-[1.0625rem] font-semibold text-ink"
                    >
                      {reference}
                    </li>
                  ))}
                </ul>
                {today.note && (
                  <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">{today.note}</p>
                )}
                <button
                  type="button"
                  onClick={() => toggleDay(today.day)}
                  aria-pressed={read.includes(today.day)}
                  className={
                    read.includes(today.day)
                      ? 'mt-5 inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white'
                      : 'mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand'
                  }
                >
                  <Check className="size-4" aria-hidden />
                  {read.includes(today.day) ? 'Read today' : 'Mark today as read'}
                </button>
              </Card>
            )}

            {/* the fortnight around today */}
            {window.length > 0 && (
              <ul className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {window.map((day) => {
                  const done = read.includes(day.day)
                  const isToday = day.day === current.dayNumber
                  return (
                    <li key={day.id}>
                      <button
                        type="button"
                        onClick={() => toggleDay(day.day)}
                        aria-pressed={done}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
                      >
                        <span
                          className={
                            done
                              ? 'grid size-7 shrink-0 place-items-center rounded-full bg-success text-white'
                              : 'grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-[0.7rem] font-bold tabular-nums text-ink-faint'
                          }
                          aria-hidden
                        >
                          {done ? <Check className="size-4" /> : day.day}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              isToday
                                ? 'block text-[0.9375rem] font-semibold text-ink'
                                : 'block text-[0.9375rem] text-ink-soft'
                            }
                          >
                            {day.references.join(' · ')}
                          </span>
                        </span>
                        {isToday && <Badge tone="gold">Today</Badge>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : reading.references.length > 0 ? (
          /*
            No standalone plan published, but the church already puts a reading
            list on each devotional. Showing that here means the page is useful
            from day one instead of asking for the same work twice.
          */
          <Card className="reveal border-ornament/40 p-5 sm:p-7">
            <p className="eyebrow">Today's reading</p>
            <p className="mt-1 text-[0.8125rem] text-ink-faint">{formatDate(todayIso(), 'full')}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {reading.references.map((reference) => (
                <li
                  key={reference}
                  className="rounded-lg border border-line bg-sunken px-3 py-2 font-display text-[1.0625rem] font-semibold text-ink"
                >
                  {reference}
                </li>
              ))}
            </ul>
            <ButtonLink to="/devotional" variant="secondary" icon={BookOpenText} className="mt-5">
              Read today's devotional
            </ButtonLink>
          </Card>
        ) : (
          <EmptyState
            icon={BookMarked}
            title="No reading plan yet"
            description="Once the church publishes a plan, this page shows the passage for today and keeps your place."
            action={
              <ButtonLink to="/devotional" variant="secondary" icon={BookOpenText}>
                Read today's devotional
              </ButtonLink>
            }
          />
        )}

        {/* --- teachings ---------------------------------------------------- */}
        <section className="reveal mt-12" aria-labelledby="teachings-heading">
          <h2
            id="teachings-heading"
            className="flex items-center gap-2 font-display text-2xl font-semibold text-ink"
          >
            <GraduationCap className="size-6 text-ornament" aria-hidden />
            Bible teachings
          </h2>
          <p className="mt-1 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
            What we believe and how we live it out, kept here to read at any time.
          </p>

          {teachings.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={GraduationCap}
              title="No teachings published yet"
              description="Studies on doctrine, Christian living and how to read the Bible will appear here."
            />
          ) : (
            <>
              <div className="mt-5 flex flex-col gap-3">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search teachings…"
                  label="Search teachings"
                />
                {topics.length > 1 && (
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    <Chip active={!topic} onClick={() => setTopic('')}>
                      All
                    </Chip>
                    {topics.map((name) => (
                      <Chip key={name} active={topic === name} onClick={() => setTopic(name)}>
                        {name}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>

              {visibleTeachings.length === 0 ? (
                <EmptyState
                  className="mt-6"
                  icon={GraduationCap}
                  title="Nothing matches"
                  description="Try a different search or topic."
                />
              ) : (
                <ul className="mt-5 space-y-3">
                  {visibleTeachings.map((teaching) => {
                    const open = openId === teaching.id
                    return (
                      <li key={teaching.id}>
                        <Card className="overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenId(open ? null : teaching.id)}
                            aria-expanded={open}
                            className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-sunken/60 sm:p-5"
                          >
                            <ChevronRight
                              className={
                                open
                                  ? 'mt-1 size-4 shrink-0 rotate-90 text-ornament transition-transform'
                                  : 'mt-1 size-4 shrink-0 text-ink-faint transition-transform'
                              }
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-display text-[1.0625rem] font-semibold text-ink">
                                  {teaching.title}
                                </span>
                                {teaching.topic && <Badge tone="neutral">{teaching.topic}</Badge>}
                              </span>
                              {teaching.scriptures.length > 0 && (
                                <span className="mt-1 block text-[0.8125rem] font-medium text-info">
                                  {teaching.scriptures.join(', ')}
                                </span>
                              )}
                              {teaching.summary && (
                                <span className="mt-1.5 block text-[0.875rem] leading-relaxed text-ink-soft">
                                  {teaching.summary}
                                </span>
                              )}
                            </span>
                          </button>

                          {open && teaching.body && (
                            <div className="border-t border-line px-4 py-5 sm:px-5">
                              <RichText>{teaching.body}</RichText>
                              {teaching.author && (
                                <p className="mt-5 text-right font-display text-[0.9375rem] font-semibold italic text-ink-soft">
                                  {teaching.author}
                                </p>
                              )}
                            </div>
                          )}
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
