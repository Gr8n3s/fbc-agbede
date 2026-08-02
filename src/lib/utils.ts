import type { IsoDate, IsoDateTime } from './types'

// ---------------------------------------------------------------------------
// Class names
// ---------------------------------------------------------------------------

/** Tiny classnames joiner. No dependency needed for what amounts to a filter. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

/**
 * Collision-resistant id. Uses the platform CSPRNG; falls back to a
 * timestamp + Math.random pair only where crypto is unavailable (very old
 * WebViews), which is acceptable because ids are never security-bearing.
 */
export function newId(prefix = ''): string {
  const c = globalThis.crypto
  const core =
    typeof c?.randomUUID === 'function'
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}_${core}` : core
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function nowIso(): IsoDateTime {
  return new Date().toISOString()
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date())
}

// ---------------------------------------------------------------------------
// Dates
//
// Deliberately local-time based. Church dates are wall-clock dates in Ikorodu;
// converting through UTC is what makes "Sunday" render as Saturday for anyone
// west of Lagos.
// ---------------------------------------------------------------------------

export function toIsoDate(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` as *local* time. */
export function parseLocal(value: string): Date {
  const [datePart, timePart = '00:00'] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh || 0, mm || 0, 0, 0)
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatDate(
  value: string | Date | undefined,
  style: 'full' | 'long' | 'medium' | 'short' | 'day' = 'long',
): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseLocal(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.getDate()
  const month = MONTHS[d.getMonth()]
  const year = d.getFullYear()
  switch (style) {
    case 'full':
      return `${DAYS[d.getDay()]}, ${day} ${month} ${year}`
    case 'long':
      return `${day} ${month} ${year}`
    case 'medium':
      return `${day} ${month.slice(0, 3)} ${year}`
    case 'short':
      return `${String(day).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${year}`
    case 'day':
      return DAYS[d.getDay()]
  }
}

export function dayName(value: string | Date): string {
  const d = typeof value === 'string' ? parseLocal(value) : value
  return DAYS[d.getDay()] ?? ''
}

/** "08:00" -> "8:00 AM". Accepts free text and passes it through unchanged. */
export function formatTime(time?: string): string {
  if (!time) return ''
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return time
  let h = Number(m[1])
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${suffix}`
}

export function formatDateTime(value?: string): string {
  if (!value) return '—'
  const d = value.includes('T') && value.endsWith('Z') ? new Date(value) : parseLocal(value)
  return `${formatDate(d, 'long')} · ${formatTime(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  )}`
}

export function relativeTime(value?: string): string {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const diff = then - Date.now()
  const abs = Math.abs(diff)
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [1000 * 60 * 60 * 24 * 365, 'year'],
    [1000 * 60 * 60 * 24 * 30, 'month'],
    [1000 * 60 * 60 * 24 * 7, 'week'],
    [1000 * 60 * 60 * 24, 'day'],
    [1000 * 60 * 60, 'hour'],
    [1000 * 60, 'minute'],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [ms, unit] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit)
  }
  return 'just now'
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const d1 = typeof a === 'string' ? parseLocal(a) : a
  const d2 = typeof b === 'string' ? parseLocal(b) : b
  return Math.round((d2.setHours(0, 0, 0, 0) - d1.setHours(0, 0, 0, 0)) / 86_400_000)
}

export function addDays(value: string | Date, days: number): Date {
  const d = typeof value === 'string' ? parseLocal(value) : new Date(value)
  d.setDate(d.getDate() + days)
  return d
}

/** The Sunday on or before `value`. */
export function startOfWeek(value: string | Date): Date {
  const d = typeof value === 'string' ? parseLocal(value) : new Date(value)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

export function monthKey(value: string | Date): string {
  const d = typeof value === 'string' ? parseLocal(value) : value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS[m - 1]?.slice(0, 3) ?? key} ${y}`
}

/**
 * Age from a date of birth. Returns null when the year is unknown, which we
 * encode as `0000-MM-DD` so members can record a birthday without a birth year.
 */
export function ageFrom(dob?: string): number | null {
  if (!dob || dob.startsWith('0000')) return null
  const d = parseLocal(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}

/** Days until the next anniversary of `dateStr`; null if unparseable. */
export function daysUntilAnniversary(dateStr?: string): number | null {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length < 3) return null
  const month = Number(parts[1]) - 1
  const day = Number(parts[2])
  if (Number.isNaN(month) || Number.isNaN(day)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), month, day)
  next.setHours(0, 0, 0, 0)
  if (next < today) next = new Date(today.getFullYear() + 1, month, day)
  return Math.round((next.getTime() - today.getTime()) / 86_400_000)
}

// ---------------------------------------------------------------------------
// Text & numbers
// ---------------------------------------------------------------------------

export function initials(...names: (string | undefined)[]): string {
  return names
    .filter(Boolean)
    .map((n) => n!.trim()[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

export function fullName(p: { firstName: string; lastName: string; otherNames?: string }): string {
  return [p.firstName, p.otherNames, p.lastName].filter(Boolean).join(' ')
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return `${s.slice(0, n).trimEnd()}…`
}

export function pluralise(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

const NAIRA = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export function formatNaira(amount?: number): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  return NAIRA.format(amount)
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-NG')
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Case- and accent-insensitive substring search across several fields.
 * Every whitespace-separated term must match somewhere — so "john choir"
 * finds John in the choir, not everyone called John plus everyone in choir.
 */
export function matchesQuery(query: string, ...fields: (string | undefined | null)[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
  return q
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .every((term) => haystack.includes(term))
}

export function sortBy<T>(items: T[], key: (item: T) => string | number, dir: 'asc' | 'desc' = 'asc') {
  const factor = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka < kb) return -1 * factor
    if (ka > kb) return 1 * factor
    return 0
  })
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const k = key(item)
    ;(out[k] ??= []).push(item)
  }
  return out
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

/**
 * Allow-list URL check. Used before anything is written into an href, so a
 * `javascript:` payload in admin-authored content can never execute.
 */
export function safeUrl(url?: string): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  // Relative paths within the app are fine; anything else is rejected outright.
  if (/^[./]/.test(trimmed) && !/^\/\//.test(trimmed)) return trimmed
  return undefined
}

/** Escape for safe interpolation into HTML we build ourselves (print views). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Strip control characters and clamp length on any admin-entered string. */
export function sanitiseText(input: unknown, maxLength = 5000): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/[ --]/g, '')
    .slice(0, maxLength)
    .trim()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

/** Nigerian mobile numbers, local (0803…) or international (+234803…). */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s()-]/g, '')
  return /^(\+?234|0)\d{10}$/.test(digits) || /^\+\d{8,15}$/.test(digits)
}

/** Normalise a Nigerian number to wa.me form (234XXXXXXXXXX). */
export function toWhatsAppNumber(phone?: string): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`
  if (digits.length >= 8) return digits
  return undefined
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 250) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next frame; revoking synchronously aborts the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, filename: string, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename)
}

/** Base path the app is served from, e.g. "/fbc-agbede/". Always trailing-slashed. */
export const BASE_URL: string = import.meta.env.BASE_URL || '/'

/** Resolve a repo-relative asset path against the deployment base. */
export function asset(path: string): string {
  if (/^https?:/i.test(path)) return path
  return `${BASE_URL}${path.replace(/^\/+/, '')}`
}
