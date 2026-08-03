import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, CalendarPlus, Clock, Download, MapPin, Repeat, Share2, User, Users } from 'lucide-react'
import {
  BackLink,
  Badge,
  Button,
  ButtonLink,
  Card,
  DetailRow,
  EmptyState,
  ExternalButton,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/hooks'
import { publishedDepartments, publishedEvents } from '@/lib/content'
import { expandEvent } from '@/lib/schedule'
import { addDays, downloadText, formatDate, formatTime, parseLocal, toIsoDate } from '@/lib/utils'

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { content } = useContent()
  const toast = useToast()

  const event = useMemo(
    () => publishedEvents(content.events).find((e) => e.slug === slug),
    [content.events, slug],
  )

  useDocumentTitle(event?.title ?? 'Event', event?.description)

  const upcomingDates = useMemo(() => {
    if (!event) return []
    const today = toIsoDate(new Date())
    return expandEvent(event, today, toIsoDate(addDays(new Date(), 365))).slice(0, 6)
  }, [event])

  const department = useMemo(
    () =>
      event?.departmentId
        ? publishedDepartments(content.departments).find((d) => d.id === event.departmentId)
        : undefined,
    [content.departments, event],
  )

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={CalendarDays}
          title="Event not found"
          description="This event may have ended or been removed."
          action={
            <ButtonLink to="/events" variant="secondary">
              Back to the calendar
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const start = parseLocal(event.start)
  const end = event.end ? parseLocal(event.end) : undefined

  /**
   * One-tap add for Google Calendar.
   *
   * Google's template URL takes local wall-clock times without a Z suffix, the
   * same convention the .ics uses, so a service at nine in the morning stays at
   * nine wherever the member happens to open it. An event with no end time is
   * given two hours, which is roughly a service and better than a zero-length
   * entry Google would otherwise hide.
   */
  const googleCalendarUrl = (() => {
    const stamp = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
        d.getDate(),
      ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(
        d.getMinutes(),
      ).padStart(2, '0')}00`

    const finish = end ?? new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${stamp(start)}/${stamp(finish)}`,
      details: [event.description, content.church.name].filter(Boolean).join('\n\n'),
      location: event.venue || content.church.address,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  })()

  /**
   * Calendar file, built by hand.
   *
   * An .ics is a few lines of text — no library, and it works with Google
   * Calendar, Outlook and the iOS calendar alike. Times are written as local
   * wall-clock (no Z suffix), which is what a church programme actually means.
   */
  const addToCalendar = () => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`

    const escape = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
    const rrule =
      event.recurrence === 'weekly'
        ? 'RRULE:FREQ=WEEKLY'
        : event.recurrence === 'monthly'
          ? 'RRULE:FREQ=MONTHLY'
          : event.recurrence === 'yearly'
            ? 'RRULE:FREQ=YEARLY'
            : null

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FBC Agbede//Church App//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@fbc-agbede`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end ?? new Date(start.getTime() + 2 * 60 * 60 * 1000))}`,
      `SUMMARY:${escape(event.title)}`,
      event.description ? `DESCRIPTION:${escape(event.description)}` : '',
      event.venue ? `LOCATION:${escape(event.venue)}` : '',
      rrule ?? '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean)

    downloadText(lines.join('\r\n'), `${event.slug}.ics`, 'text/calendar;charset=utf-8')
    toast.success('Added to your downloads', 'Open the file to save it to your calendar.')
  }

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: event.description, url })
        return
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <BackLink to="/events">Back to events</BackLink>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{event.category}</Badge>
          {event.recurrence !== 'none' && (
            <Badge tone="gold" icon={Repeat}>
              {event.recurrence}
            </Badge>
          )}
          {event.featured && <Badge tone="accent">featured</Badge>}
        </div>

        <h1 className="mt-3 text-balance font-display text-title font-semibold text-ink">
          {event.title}
        </h1>
      </header>

      {event.image && (
        <img
          src={event.image}
          alt=""
          className="mt-6 aspect-video w-full rounded-2xl border border-line object-cover"
          loading="lazy"
        />
      )}

      <Card className="mt-6 p-5">
        <dl>
          <DetailRow label="When" icon={CalendarDays}>
            {formatDate(event.start, 'full')}
          </DetailRow>
          {!event.allDay && (
            <DetailRow label="Time" icon={Clock}>
              {formatTime(event.start.split('T')[1]?.slice(0, 5))}
              {end && `, ${formatTime(event.end!.split('T')[1]?.slice(0, 5))}`}
            </DetailRow>
          )}
          {event.venue && (
            <DetailRow label="Venue" icon={MapPin}>
              {event.venue}
            </DetailRow>
          )}
          {event.host && (
            <DetailRow label="Host" icon={User}>
              {event.host}
            </DetailRow>
          )}
          {department && (
            <DetailRow label="Department" icon={Users}>
              <ButtonLink to={`/departments/${department.slug}`} variant="link" size="sm">
                {department.name}
              </ButtonLink>
            </DetailRow>
          )}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {/*
            Google first, because that is what most people here actually use and
            it adds the event in one tap. The .ics download stays for Outlook,
            Apple Calendar and anyone offline.
          */}
          <ExternalButton href={googleCalendarUrl} variant="primary" icon={CalendarPlus}>
            Add to Google Calendar
          </ExternalButton>
          <Button variant="secondary" icon={Download} onClick={addToCalendar}>
            Other calendar
          </Button>
          <Button variant="secondary" icon={Share2} onClick={() => void share()}>
            Share
          </Button>
        </div>
      </Card>

      {event.description && (
        <div className="prose-chapel mt-8">
          <p className="whitespace-pre-line">{event.description}</p>
        </div>
      )}

      {event.recurrence !== 'none' && upcomingDates.length > 1 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-ink">Next dates</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {upcomingDates.map((occurrence) => (
              <li
                key={occurrence.key}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[0.8125rem] font-medium text-ink-soft"
              >
                {formatDate(occurrence.date, 'medium')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
