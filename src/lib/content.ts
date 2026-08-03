/**
 * Published content — the impersonal church information that IS committed to
 * the public repository and served to everyone.
 *
 * Flow:
 *   1. The app fetches `/content/*.json` (bundled with the build, cached by the
 *      service worker, so it works offline and costs nothing to serve).
 *   2. The admin edits content in-app. Edits land in a local *draft* held in
 *      IndexedDB — nothing is public yet.
 *   3. "Publish" commits the draft to GitHub via the Contents API. Pages
 *      rebuilds and everyone sees it.
 *
 * Nothing personal ever passes through here. See docs/DATA-PRIVACY.md.
 */

import { deviceStore } from './db'
import type {
  Announcement,
  Bulletin,
  ChurchEvent,
  ChurchProfile,
  CollectionName,
  Department,
  Devotional,
  DownloadItem,
  GalleryContent,
  PrayerPoint,
  PublishedContent,
  ReadingPlan,
  ReadingPlanDay,
  Sermon,
  Teaching,
} from './types'
import { BASE_URL, nowIso } from './utils'

const DRAFT_KEY = 'content-draft'

/** Which JSON file backs each collection, relative to `public/content/`. */
export const CONTENT_FILES: Record<CollectionName, string> = {
  church: 'church.json',
  departments: 'departments.json',
  events: 'events.json',
  sermons: 'sermons.json',
  announcements: 'announcements.json',
  bulletins: 'bulletins.json',
  gallery: 'gallery.json',
  downloads: 'downloads.json',
  devotionals: 'devotionals.json',
  prayerPoints: 'prayer-points.json',
  readingPlans: 'reading-plans.json',
  teachings: 'teachings.json',
}

export const CONTENT_DIR = 'public/content'

// ---------------------------------------------------------------------------
// Defaults — used on a cold install, or if a file is missing/corrupt.
// ---------------------------------------------------------------------------

export const DEFAULT_CHURCH: ChurchProfile = {
  name: 'First Baptist Church Agbede, Ikorodu',
  shortName: 'FBC Agbede',
  motto: 'Chapel of Grace',
  tagline: 'A household of faith in Agbede, Ikorodu.',
  established: '',
  address: 'Agbede, Ikorodu',
  city: 'Ikorodu',
  state: 'Lagos',
  country: 'Nigeria',
  phone: '',
  email: '',
  whatsapp: '',
  mapUrl: '',
  pastorName: '',
  pastorTitle: 'Resident Pastor',
  pastorMessage: '',
  about:
    'First Baptist Church Agbede, Ikorodu, the Chapel of Grace, is a Baptist congregation committed to the worship of God, the teaching of His word, and the care of one another.',
  history: '',
  mission: '',
  vision: '',
  beliefs: [
    'The Bible is the inspired word of God and our sole authority for faith and practice.',
    'Salvation is by grace through faith in Jesus Christ alone.',
    'Believer’s baptism by immersion, following personal confession of faith.',
    'The priesthood of all believers.',
    'The autonomy of the local church, in voluntary cooperation with other churches.',
  ],
  serviceTimes: [],
  bankAccounts: [],
  socials: [],
  updatedAt: nowIso(),
}

export const EMPTY_CONTENT: PublishedContent = {
  church: DEFAULT_CHURCH,
  departments: [],
  events: [],
  sermons: [],
  announcements: [],
  bulletins: [],
  gallery: { albums: [], videos: [] },
  downloads: [],
  devotionals: [],
  prayerPoints: [],
  readingPlans: [],
  teachings: [],
}

// ---------------------------------------------------------------------------
// Shape guards
//
// Content files are hand-editable on GitHub, so a stray comma or a half-saved
// file must degrade to "this section is empty", never to a white screen.
// ---------------------------------------------------------------------------

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asGallery(value: unknown): GalleryContent {
  const v = value as Partial<GalleryContent> | null
  return { albums: asArray(v?.albums), videos: asArray(v?.videos) }
}

function asChurch(value: unknown): ChurchProfile {
  if (!value || typeof value !== 'object') return DEFAULT_CHURCH
  const v = value as Partial<ChurchProfile>
  return {
    ...DEFAULT_CHURCH,
    ...v,
    beliefs: asArray<string>(v.beliefs).length ? asArray<string>(v.beliefs) : DEFAULT_CHURCH.beliefs,
    serviceTimes: asArray(v.serviceTimes),
    bankAccounts: asArray(v.bankAccounts),
    socials: asArray(v.socials),
  }
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

export function contentUrl(name: CollectionName): string {
  return `${BASE_URL}content/${CONTENT_FILES[name]}`
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

/** Load a single collection, falling back to its empty default. */
export async function loadCollection<K extends CollectionName>(
  name: K,
  signal?: AbortSignal,
): Promise<PublishedContent[K]> {
  try {
    const raw = await fetchJson(contentUrl(name), signal)
    return coerce(name, raw)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    console.warn(`[content] "${name}" unavailable, using defaults.`, error)
    return EMPTY_CONTENT[name]
  }
}

function coerce<K extends CollectionName>(name: K, raw: unknown): PublishedContent[K] {
  switch (name) {
    case 'church':
      return asChurch(raw) as PublishedContent[K]
    case 'gallery':
      return asGallery(raw) as PublishedContent[K]
    default:
      return asArray(raw) as PublishedContent[K]
  }
}

/** Load everything in parallel. One slow or missing file never blocks the rest. */
export async function loadContent(signal?: AbortSignal): Promise<PublishedContent> {
  const names = Object.keys(CONTENT_FILES) as CollectionName[]
  const results = await Promise.all(
    names.map(async (name) => [name, await loadCollection(name, signal)] as const),
  )
  const out = { ...EMPTY_CONTENT }
  for (const [name, value] of results) {
    // Safe: `coerce` guarantees the value matches the collection's type.
    ;(out as Record<string, unknown>)[name] = value
  }
  return out
}

// ---------------------------------------------------------------------------
// Local draft
//
// The admin's unpublished working copy. Impersonal, so it is stored in the
// clear alongside device settings rather than inside the encrypted vault.
// ---------------------------------------------------------------------------

export interface ContentDraft {
  content: PublishedContent
  /** Collections changed since the last publish. Drives the "unpublished" badge. */
  dirty: CollectionName[]
  savedAt: string
}

export async function readDraft(): Promise<ContentDraft | undefined> {
  return deviceStore.get<ContentDraft>(DRAFT_KEY)
}

export async function writeDraft(draft: ContentDraft): Promise<void> {
  await deviceStore.put(DRAFT_KEY, draft)
}

export async function clearDraft(): Promise<void> {
  await deviceStore.delete(DRAFT_KEY)
}

export function markDirty(dirty: CollectionName[], name: CollectionName): CollectionName[] {
  return dirty.includes(name) ? dirty : [...dirty, name]
}

/** Serialise one collection exactly as it should appear in the repository. */
export function serialiseCollection(
  content: PublishedContent,
  name: CollectionName,
): string {
  return `${JSON.stringify(content[name], null, 2)}\n`
}

// ---------------------------------------------------------------------------
// Public-facing selectors
//
// Every list the public site renders passes through here, so `published:false`
// is filtered in exactly one place and a draft can never leak into the site.
// ---------------------------------------------------------------------------

const isPublished = <T extends { published?: boolean }>(item: T) => item.published !== false

export function publishedEvents(events: ChurchEvent[]): ChurchEvent[] {
  return events.filter(isPublished)
}

export function publishedSermons(sermons: Sermon[]): Sermon[] {
  return sermons
    .filter(isPublished)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function publishedAnnouncements(items: Announcement[]): Announcement[] {
  const today = new Date().toISOString().slice(0, 10)
  return items
    .filter(isPublished)
    .filter((a) => !a.expiresAt || a.expiresAt >= today)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.publishedAt.localeCompare(a.publishedAt)
    })
}

export function publishedBulletins(items: Bulletin[]): Bulletin[] {
  return items.filter(isPublished).sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * The programme to show on the home page: the next one coming up, or the most
 * recent past one if nothing is scheduled. Multi-day programmes stay "current"
 * until their end date passes.
 */
export function currentBulletin(items: Bulletin[]): Bulletin | undefined {
  const today = new Date().toISOString().slice(0, 10)
  const list = publishedBulletins(items)
  const upcoming = list
    .filter((b) => (b.endDate ?? b.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  return upcoming[0] ?? list[0]
}

export function publishedDepartments(items: Department[]): Department[] {
  return items.filter((d) => d.active !== false).sort((a, b) => a.order - b.order)
}

export function publishedDownloads(items: DownloadItem[]): DownloadItem[] {
  return items.filter(isPublished).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function publishedPrayerPoints(items: PrayerPoint[]): PrayerPoint[] {
  return items.filter(isPublished).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function publishedAlbums(gallery: GalleryContent): GalleryContent['albums'] {
  return gallery.albums.filter(isPublished).sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * The plan the church is currently reading, and which day it is on.
 *
 * Day is worked out from the plan's start date and wraps at the end, so a plan
 * shorter than the year simply repeats rather than running out. A plan with no
 * start date has no "today", and the page shows it as a list instead.
 */
export function currentReadingPlan(
  plans: ReadingPlan[],
): { plan: ReadingPlan; day: ReadingPlanDay | undefined; dayNumber: number } | undefined {
  const published = plans.filter(isPublished)
  const plan = published.find((p) => p.startDate) ?? published[0]
  if (!plan || plan.days.length === 0) return undefined

  if (!plan.startDate) return { plan, day: undefined, dayNumber: 0 }

  const start = new Date(`${plan.startDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const elapsed = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
  if (elapsed < 0) return { plan, day: plan.days[0], dayNumber: 1 }

  const dayNumber = (elapsed % plan.days.length) + 1
  return { plan, day: plan.days.find((d) => d.day === dayNumber), dayNumber }
}

/** Published teachings, in the order the church arranged them. */
export function publishedTeachings(items: Teaching[]): Teaching[] {
  return items.filter(isPublished).sort((a, b) => a.order - b.order)
}

// ---------------------------------------------------------------------------
// Falling back to what the church already publishes
//
// This church writes its notices onto the weekly programme sheet and its
// readings onto the devotional. Pages that looked only at their own collection
// therefore sat empty while the same information sat one file away. These
// selectors express "use the dedicated collection, else fall back", and they
// live here rather than in the components because it is a rule about the
// content, not about how a page draws. Each reports which source it used so
// the page can be honest in its heading.
// ---------------------------------------------------------------------------

/**
 * Notices written onto the current programme sheet.
 *
 * The notice board shows these when no announcement has been published. Kept
 * as a plain selector rather than folded into a combined "notice board" call:
 * announcements and notice lines are different shapes, and a function returning
 * a union of the two is harder to use than the two lines it saves.
 */
export function bulletinNotices(bulletins: Bulletin[]): string[] {
  return currentBulletin(bulletins)?.notices ?? []
}

/**
 * Today's reading: the dedicated plan, else the references on the devotional.
 */
export function readingForToday(
  plans: ReadingPlan[],
  devotionals: Devotional[],
): { references: string[]; source: 'primary' | 'devotional' } {
  const current = currentReadingPlan(plans)
  if (current?.day?.references.length) {
    return { references: current.day.references, source: 'primary' }
  }
  return {
    references: devotionalForToday(devotionals)?.readingPlan ?? [],
    source: 'devotional',
  }
}

/** Today's devotional, else the most recent one already published. */
export function devotionalForToday(items: Devotional[]): Devotional | undefined {
  const today = new Date().toISOString().slice(0, 10)
  const list = items.filter(isPublished).sort((a, b) => b.date.localeCompare(a.date))
  return list.find((d) => d.date === today) ?? list.find((d) => d.date <= today) ?? list[0]
}
