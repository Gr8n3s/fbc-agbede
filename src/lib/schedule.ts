/**
 * Turning stored events into a calendar.
 *
 * Events are stored once with a `recurrence` rule rather than as thousands of
 * rows. Everything the calendar, the home page and reminders need is derived
 * here by expanding that rule over a bounded window — never unbounded, so a
 * yearly event with no end date cannot spin the browser.
 */

import type { Bulletin, ChurchEvent, ServiceTime } from './types'
import { addDays, parseLocal, toIsoDate } from './utils'

export interface Occurrence {
  /** Stable per-occurrence key: `${event.id}@${date}`. */
  key: string
  event: ChurchEvent
  date: string // YYYY-MM-DD
  start: Date
  end?: Date
  isRecurrence: boolean
}

const MAX_OCCURRENCES = 400

/**
 * Expand one event into every occurrence falling within [from, to].
 * `to` is inclusive; both are `YYYY-MM-DD`.
 */
export function expandEvent(event: ChurchEvent, from: string, to: string): Occurrence[] {
  const out: Occurrence[] = []
  const first = parseLocal(event.start)
  if (Number.isNaN(first.getTime())) return out

  const windowStart = parseLocal(from)
  const windowEnd = parseLocal(to)
  windowEnd.setHours(23, 59, 59, 999)

  const limit = event.recurUntil ? parseLocal(event.recurUntil) : null
  if (limit) limit.setHours(23, 59, 59, 999)

  const durationMs = event.end
    ? Math.max(0, parseLocal(event.end).getTime() - first.getTime())
    : 0

  const push = (date: Date, isRecurrence: boolean) => {
    if (date > windowEnd || (limit && date > limit)) return false
    if (date >= windowStart) {
      const iso = toIsoDate(date)
      out.push({
        key: `${event.id}@${iso}`,
        event,
        date: iso,
        start: new Date(date),
        end: durationMs ? new Date(date.getTime() + durationMs) : undefined,
        isRecurrence,
      })
    }
    return true
  }

  if (event.recurrence === 'none') {
    push(first, false)
    return out
  }

  const cursor = new Date(first)
  let guard = 0

  while (guard++ < MAX_OCCURRENCES) {
    if (!push(cursor, guard > 1)) break

    switch (event.recurrence) {
      case 'weekly':
        cursor.setDate(cursor.getDate() + 7)
        break
      case 'monthly': {
        // Keep the day-of-month stable: an event on the 31st skips short
        // months rather than sliding into the 1st of the next one.
        const day = first.getDate()
        cursor.setDate(1)
        cursor.setMonth(cursor.getMonth() + 1)
        const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
        if (day > daysInMonth) continue
        cursor.setDate(day)
        break
      }
      case 'yearly':
        cursor.setFullYear(cursor.getFullYear() + 1)
        break
      default:
        return out
    }
  }

  return out
}

export function expandEvents(events: ChurchEvent[], from: string, to: string): Occurrence[] {
  return events
    .flatMap((event) => expandEvent(event, from, to))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

/** The next `count` occurrences from today, looking ahead `horizonDays`. */
export function upcomingOccurrences(
  events: ChurchEvent[],
  count = 6,
  horizonDays = 180,
): Occurrence[] {
  const today = new Date()
  const from = toIsoDate(today)
  const to = toIsoDate(addDays(today, horizonDays))
  const now = Date.now()
  return expandEvents(events, from, to)
    .filter((o) => (o.end ?? o.start).getTime() >= now - 60 * 60 * 1000) // grace: still "on" for an hour
    .slice(0, count)
}

export function occurrencesOn(events: ChurchEvent[], date: string): Occurrence[] {
  return expandEvents(events, date, date)
}

/** Group occurrences by `YYYY-MM-DD` for month-grid rendering. */
export function occurrencesByDate(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>()
  for (const o of occurrences) {
    const list = map.get(o.date)
    if (list) list.push(o)
    else map.set(o.date, [o])
  }
  return map
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

export interface CalendarCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  isSunday: boolean
}

/** Six-week grid (always 42 cells) starting on Sunday, for a stable layout. */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const todayIso = toIsoDate(new Date())

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = toIsoDate(d)
    return {
      date: iso,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === todayIso,
      isSunday: d.getDay() === 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Weekly rhythm
// ---------------------------------------------------------------------------

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

/** The next occurrence of a weekly service time, as a Date. */
export function nextServiceDate(service: ServiceTime, from = new Date()): Date | null {
  const [hh, mm] = service.startTime.split(':').map(Number)
  if (Number.isNaN(hh)) return null

  if (service.day === 'Daily') {
    const d = new Date(from)
    d.setHours(hh, mm || 0, 0, 0)
    if (d < from) d.setDate(d.getDate() + 1)
    return d
  }

  const target = DAY_INDEX[service.day]
  if (target === undefined) return null

  const d = new Date(from)
  d.setHours(hh, mm || 0, 0, 0)
  let delta = (target - d.getDay() + 7) % 7
  if (delta === 0 && d < from) delta = 7
  d.setDate(d.getDate() + delta)
  return d
}

/** Which service is next up. Drives the "Next service" strip on the home page. */
export function nextService(services: ServiceTime[]): { service: ServiceTime; at: Date } | null {
  const now = new Date()
  const candidates = services
    .map((service) => ({ service, at: nextServiceDate(service, now) }))
    .filter((c): c is { service: ServiceTime; at: Date } => c.at !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
  return candidates[0] ?? null
}

// ---------------------------------------------------------------------------
// Programmes (bulletins)
// ---------------------------------------------------------------------------

/**
 * Programmes running today or later, soonest first. Programmes are not
 * Sunday-only, so this is a plain date comparison over any weekday.
 */
export function upcomingBulletins(bulletins: Bulletin[], count = 5): Bulletin[] {
  const today = toIsoDate(new Date())
  return bulletins
    .filter((b) => b.published !== false && (b.endDate ?? b.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count)
}

/** Programmes falling inside the current Sunday-to-Saturday week. */
export function bulletinsThisWeek(bulletins: Bulletin[]): Bulletin[] {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay())
  const from = toIsoDate(start)
  const to = toIsoDate(addDays(start, 6))
  return bulletins
    .filter((b) => b.published !== false && b.date >= from && b.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
}
