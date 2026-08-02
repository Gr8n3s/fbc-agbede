import { Link } from 'react-router-dom'
import {
  BookOpenText,
  CalendarDays,
  Clock,
  Headphones,
  MapPin,
  Mic,
  Pin,
  ScrollText,
  Video,
} from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import type { Announcement, Bulletin, Devotional, Sermon } from '@/lib/types'
import { BULLETIN_KIND_LABELS } from '@/lib/types'
import type { Occurrence } from '@/lib/schedule'
import { cx, dayName, formatDate, formatTime, truncate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Date block — the recurring "torn calendar page" device
// ---------------------------------------------------------------------------

export function DateBlock({
  date,
  className,
  tone = 'brand',
}: {
  date: string | Date
  className?: string
  tone?: 'brand' | 'accent'
}) {
  const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T00:00:00`) : date
  const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()

  return (
    <div
      className={cx(
        'grid size-14 shrink-0 place-items-center rounded-lg border text-center leading-none',
        tone === 'accent'
          ? 'border-accent/25 bg-accent/8 text-accent'
          : 'border-brand/20 bg-brand/8 text-brand',
        className,
      )}
      aria-hidden
    >
      <span>
        <span className="block text-[0.6rem] font-bold tracking-[0.14em]">{month}</span>
        <span className="mt-0.5 block font-display text-xl font-semibold tabular-nums">
          {d.getDate()}
        </span>
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Programme (bulletin)
// ---------------------------------------------------------------------------

const KIND_TONE: Record<string, 'brand' | 'accent' | 'gold' | 'info'> = {
  'weekly-bulletin': 'brand',
  midweek: 'info',
  revival: 'accent',
  convention: 'accent',
  anniversary: 'gold',
  harvest: 'gold',
  special: 'gold',
  other: 'brand',
}

/** Total lines in the order of service, across all its named sections. */
function itemCount(bulletin: Bulletin): number {
  return (bulletin.sections ?? []).reduce((total, section) => total + section.items.length, 0)
}

export function BulletinCard({ bulletin, featured = false }: { bulletin: Bulletin; featured?: boolean }) {
  const multiDay = bulletin.endDate && bulletin.endDate !== bulletin.date

  return (
    <Card
      as={Link}
      hover
      to={`/programme/${bulletin.date}`}
      className={cx('block p-4 sm:p-5', featured && 'border-ornament/40')}
    >
      <div className="flex items-start gap-4">
        <DateBlock date={bulletin.date} tone={featured ? 'accent' : 'brand'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={KIND_TONE[bulletin.kind] ?? 'brand'}>
              {BULLETIN_KIND_LABELS[bulletin.kind] ?? 'Programme'}
            </Badge>
            <span className="text-[0.75rem] font-medium text-ink-faint">
              {dayName(bulletin.date)}
              {multiDay ? `, ${formatDate(bulletin.endDate, 'medium')}` : ''}
            </span>
          </div>

          <h3 className="mt-1.5 text-pretty font-display text-lg font-semibold leading-snug text-ink">
            {bulletin.title}
          </h3>

          {bulletin.theme && (
            <p className="mt-1 text-[0.875rem] italic text-ink-soft">“{bulletin.theme}”</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-faint">
            {bulletin.startTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-ornament" aria-hidden />
                {formatTime(bulletin.startTime)}
              </span>
            )}
            {bulletin.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ornament" aria-hidden />
                {bulletin.venue}
              </span>
            )}
            {bulletin.preacher && (
              <span className="inline-flex items-center gap-1.5">
                <Mic className="size-3.5 text-ornament" aria-hidden />
                {bulletin.preacher}
              </span>
            )}
            {itemCount(bulletin) > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <ScrollText className="size-3.5 text-ornament" aria-hidden />
                {itemCount(bulletin)} items
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

const CATEGORY_TONE = {
  service: 'brand',
  revival: 'accent',
  convention: 'accent',
  meeting: 'neutral',
  outreach: 'info',
  training: 'info',
  social: 'gold',
  special: 'gold',
} as const

export function EventCard({ occurrence }: { occurrence: Occurrence }) {
  const { event, start, date } = occurrence

  return (
    <Card as={Link} hover to={`/events/${event.slug}`} className="block p-4">
      <div className="flex items-start gap-4">
        <DateBlock date={date} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={CATEGORY_TONE[event.category] ?? 'neutral'}>{event.category}</Badge>
            {occurrence.isRecurrence && <Badge tone="neutral">recurring</Badge>}
          </div>

          <h3 className="mt-1.5 text-pretty font-display text-[1.0625rem] font-semibold leading-snug text-ink">
            {event.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-ornament" aria-hidden />
              {dayName(date)}
              {!event.allDay && ` · ${formatTime(start.toTimeString().slice(0, 5))}`}
            </span>
            {event.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ornament" aria-hidden />
                {event.venue}
              </span>
            )}
          </div>

          {event.description && (
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
              {truncate(event.description, 110)}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sermon
// ---------------------------------------------------------------------------

export function SermonCard({ sermon }: { sermon: Sermon }) {
  return (
    <Card as={Link} hover to={`/sermons/${sermon.slug}`} className="flex flex-col p-4">
      <div className="flex items-center gap-2">
        <Badge tone="brand">{sermon.category.replace(/-/g, ' ')}</Badge>
        {sermon.audioUrl && (
          <span className="text-ornament" title="Audio available">
            <Headphones className="size-4" aria-label="Audio available" />
          </span>
        )}
        {sermon.videoUrl && (
          <span className="text-ornament" title="Video available">
            <Video className="size-4" aria-label="Video available" />
          </span>
        )}
      </div>

      <h3 className="mt-2 text-pretty font-display text-[1.0625rem] font-semibold leading-snug text-ink">
        {sermon.title}
      </h3>

      {sermon.scriptures.length > 0 && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-info">
          <BookOpenText className="size-3.5" aria-hidden />
          {sermon.scriptures.slice(0, 2).join('; ')}
        </p>
      )}

      {sermon.summary && (
        <p className="mt-2 flex-1 text-[0.8125rem] leading-relaxed text-ink-soft">
          {truncate(sermon.summary, 130)}
        </p>
      )}

      <p className="mt-3 border-t border-line pt-2.5 text-[0.75rem] text-ink-faint">
        {sermon.preacher} · {formatDate(sermon.date, 'medium')}
      </p>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Announcement
// ---------------------------------------------------------------------------

const ANNOUNCEMENT_TONE = {
  general: 'neutral',
  service: 'brand',
  department: 'info',
  urgent: 'danger',
  celebration: 'gold',
  finance: 'success',
} as const

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card
      className={cx(
        'p-4',
        announcement.pinned && 'border-ornament/45',
        announcement.category === 'urgent' && 'border-danger/40',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={ANNOUNCEMENT_TONE[announcement.category] ?? 'neutral'}>
          {announcement.category}
        </Badge>
        {announcement.pinned && (
          <Badge tone="gold" icon={Pin}>
            pinned
          </Badge>
        )}
        <span className="ml-auto text-[0.75rem] text-ink-faint">
          {formatDate(announcement.publishedAt.slice(0, 10), 'medium')}
        </span>
      </div>

      <h3 className="mt-2 text-pretty font-display text-[1.0625rem] font-semibold leading-snug text-ink">
        {announcement.title}
      </h3>
      <p className="mt-1.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-soft">
        {announcement.body}
      </p>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Devotional
// ---------------------------------------------------------------------------

export function VerseBlock({
  reference,
  text,
  className,
}: {
  reference: string
  text: string
  className?: string
}) {
  return (
    <figure className={cx('relative', className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -left-1 -top-6 select-none font-display text-7xl leading-none text-ornament/25"
      >
        “
      </span>
      <blockquote className="relative text-pretty font-display text-lg leading-relaxed text-ink sm:text-xl">
        {text}
      </blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5">
        <span className="h-px w-8 bg-ornament" aria-hidden />
        <cite className="text-[0.8125rem] font-semibold not-italic uppercase tracking-[0.12em] text-ornament">
          {reference}
        </cite>
      </figcaption>
    </figure>
  )
}

export function DevotionalCard({ devotional }: { devotional: Devotional }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-sunken/60 px-4 py-2.5 sm:px-5">
        <p className="eyebrow">Devotional · {formatDate(devotional.date, 'full')}</p>
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="font-display text-xl font-semibold text-ink">{devotional.title}</h3>
        <VerseBlock
          reference={devotional.verseRef}
          text={devotional.verseText}
          className="mt-4"
        />
        <p className="mt-4 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink-soft">
          {truncate(devotional.body, 340)}
        </p>
        {devotional.readingPlan.length > 0 && (
          <div className="mt-4 rounded-lg border border-line bg-sunken/50 p-3">
            <p className="eyebrow">Today’s reading</p>
            <p className="mt-1 text-[0.875rem] font-medium text-ink">
              {devotional.readingPlan.join(' · ')}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Event list item (compact, used in sidebars)
// ---------------------------------------------------------------------------

export function CompactEventRow({ occurrence }: { occurrence: Occurrence }) {
  return (
    <Link
      to={`/events/${occurrence.event.slug}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sunken"
    >
      <DateBlock date={occurrence.date} className="size-11" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.875rem] font-medium text-ink">
          {occurrence.event.title}
        </span>
        <span className="block truncate text-[0.75rem] text-ink-faint">
          {dayName(occurrence.date)}
          {!occurrence.event.allDay &&
            ` · ${formatTime(occurrence.start.toTimeString().slice(0, 5))}`}
          {occurrence.event.venue ? ` · ${occurrence.event.venue}` : ''}
        </span>
      </span>
    </Link>
  )
}

/** Bare event-less date pill used by the calendar grid. */
export function EventDot({ tone = 'brand' }: { tone?: 'brand' | 'accent' | 'gold' }) {
  return (
    <span
      className={cx(
        'block size-1.5 rounded-full',
        tone === 'accent' ? 'bg-accent' : tone === 'gold' ? 'bg-ornament' : 'bg-brand',
      )}
      aria-hidden
    />
  )
}
