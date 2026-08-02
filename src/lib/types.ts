/**
 * Domain model for FBC Agbede.
 *
 * Two storage tiers, and the split is a privacy boundary, not a technical one:
 *
 *  PUBLISHED  — committed to the public GitHub repository and served to everyone.
 *               Impersonal church information only.
 *  VAULT      — never leaves the admin's device except as an encrypted backup
 *               file. Anything that identifies a person lives here.
 *
 * See docs/DATA-PRIVACY.md.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ISO-8601 calendar date, `YYYY-MM-DD`. */
export type IsoDate = string
/** ISO-8601 instant, `YYYY-MM-DDTHH:mm:ss.sssZ`. */
export type IsoDateTime = string

export interface Timestamped {
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type Role =
  | 'super-admin'
  | 'pastor'
  | 'church-admin'
  | 'department-leader'
  | 'worker'
  | 'member'
  | 'visitor'

export const ROLE_LABELS: Record<Role, string> = {
  'super-admin': 'Super Admin',
  pastor: 'Pastor',
  'church-admin': 'Church Administrator',
  'department-leader': 'Department Leader',
  worker: 'Worker',
  member: 'Member',
  visitor: 'Visitor',
}

/** Ordered most- to least-privileged; index doubles as the rank. */
export const ROLE_ORDER: Role[] = [
  'super-admin',
  'pastor',
  'church-admin',
  'department-leader',
  'worker',
  'member',
  'visitor',
]

export function roleRank(role: Role): number {
  const i = ROLE_ORDER.indexOf(role)
  return i === -1 ? ROLE_ORDER.length : i
}

/** True when `role` is at least as privileged as `atLeast`. */
export function roleAtLeast(role: Role, atLeast: Role): boolean {
  return roleRank(role) <= roleRank(atLeast)
}

// ===========================================================================
// PUBLISHED CONTENT — committed to the repository
// ===========================================================================

export interface ServiceTime {
  id: string
  day:
    | 'Sunday'
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Daily'
  name: string
  startTime: string // "08:00" — 24h, church local time
  endTime?: string
  note?: string
}

export interface BankAccount {
  id: string
  purpose: string // "Tithes & Offerings", "Building Fund", …
  bankName: string
  accountName: string
  accountNumber: string
  note?: string
}

export interface SocialLink {
  id: string
  platform: 'facebook' | 'youtube' | 'instagram' | 'whatsapp' | 'x' | 'tiktok' | 'website'
  url: string
  label?: string
}

export interface ChurchProfile {
  name: string
  shortName: string
  motto: string
  tagline: string
  established?: string
  address: string
  city: string
  state: string
  country: string
  /** Public church line. Never a private mobile number. */
  phone: string
  email: string
  /** Digits only, international format, for wa.me deep links. */
  whatsapp?: string
  mapUrl?: string
  pastorName: string
  pastorTitle: string
  pastorMessage?: string
  about: string
  history: string
  mission: string
  vision: string
  beliefs: string[]
  serviceTimes: ServiceTime[]
  bankAccounts: BankAccount[]
  socials: SocialLink[]
  updatedAt: IsoDateTime
}

export type DepartmentKey =
  | 'choir'
  | 'ushers'
  | 'media'
  | 'sanctuary-keepers'
  | 'evangelism'
  | 'children'
  | 'youth'
  | 'wmu'
  | 'mmu'
  | 'ra'
  | 'lydia'
  | string // the church can add its own

export interface Department extends Timestamped {
  id: string
  key: DepartmentKey
  name: string
  slug: string
  shortName?: string
  summary: string
  description: string
  /** Ornament tint for cards. Constrained to the church palette. */
  accent: 'vestry' | 'crimson' | 'azure' | 'gold'
  icon: string
  meetingDay?: string
  meetingTime?: string
  meetingVenue?: string
  /** Display name only. Personal contact details stay in the vault. */
  leaderName?: string
  assistantLeaderName?: string
  image?: string
  active: boolean
  order: number
}

export type EventCategory =
  | 'service'
  | 'revival'
  | 'convention'
  | 'meeting'
  | 'outreach'
  | 'training'
  | 'social'
  | 'special'

export interface ChurchEvent extends Timestamped {
  id: string
  title: string
  slug: string
  description: string
  category: EventCategory
  /** Local date/time, `YYYY-MM-DDTHH:mm` — no timezone suffix, church local. */
  start: string
  end?: string
  allDay: boolean
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly'
  /** Inclusive last date a recurring event repeats until. */
  recurUntil?: IsoDate
  venue: string
  departmentId?: string
  host?: string
  featured: boolean
  image?: string
  published: boolean
}

export interface Sermon extends Timestamped {
  id: string
  title: string
  slug: string
  preacher: string
  date: IsoDate
  series?: string
  category: 'sunday-worship' | 'bible-study' | 'revival' | 'convention' | 'special' | 'teaching'
  scriptures: string[]
  summary: string
  /** Markdown-ish body: headings, lists, blockquotes, bold. */
  notes: string
  audioUrl?: string
  videoUrl?: string
  durationMinutes?: number
  tags: string[]
  published: boolean
}

export interface Announcement extends Timestamped {
  id: string
  title: string
  body: string
  category: 'general' | 'service' | 'department' | 'urgent' | 'celebration' | 'finance'
  departmentId?: string
  featured: boolean
  pinned: boolean
  publishedAt: IsoDateTime
  expiresAt?: IsoDate
  image?: string
  published: boolean
}

// --- Weekly bulletin / order of service ------------------------------------

export interface OrderOfServiceItem {
  id: string
  /** "08:00" or free text like "After the offering". Optional. */
  time?: string
  item: string
  minister?: string
  note?: string
}

export interface BulletinHymn {
  id: string
  /** Baptist Hymnal number, when there is one. */
  number?: string
  title: string
  /** e.g. "Opening", "Offertory", "Closing" */
  slot?: string
}

export type BulletinKind =
  | 'weekly-bulletin'
  | 'midweek'
  | 'special'
  | 'revival'
  | 'convention'
  | 'anniversary'
  | 'harvest'
  | 'other'

export const BULLETIN_KIND_LABELS: Record<BulletinKind, string> = {
  'weekly-bulletin': 'Weekly Bulletin',
  midweek: 'Midweek Programme',
  special: 'Special Programme',
  revival: 'Revival',
  convention: 'Convention',
  anniversary: 'Anniversary',
  harvest: 'Harvest',
  other: 'Other Programme',
}

/**
 * A church programme sheet — the printed order of service.
 *
 * Programmes are NOT Sunday-only: the church runs them on any day of the week
 * (midweek Bible study, workers' meeting, revival nights, harvest, anniversary).
 * `date` is therefore the single source of truth for when it happens, and may
 * fall on any weekday. `weekOf` is optional and only set for the recurring
 * Sunday bulletin, so several programmes can be grouped under one week.
 */
export interface Bulletin extends Timestamped {
  id: string
  /** The day this programme runs. Any day of the week. Primary sort key. */
  date: IsoDate
  /** Sunday that starts the week this programme belongs to. Optional grouping. */
  weekOf?: IsoDate
  kind: BulletinKind
  title: string
  /** Start time, "17:00". Programmes often run in the evening midweek. */
  startTime?: string
  endTime?: string
  venue?: string
  /** Multi-day programmes (revival, convention) run to this date inclusive. */
  endDate?: IsoDate
  theme?: string
  themeVerse?: string
  themeVerseRef?: string
  welcomeNote?: string
  preacher?: string
  serviceName: string
  orderOfService: OrderOfServiceItem[]
  hymns: BulletinHymn[]
  readings: string[]
  /** Free-text notices. Published publicly — no personal contact details. */
  notices: string[]
  /** The rest of the week's activities, one line each. */
  weekAhead: { id: string; day: string; time?: string; activity: string; venue?: string }[]
  offeringNote?: string
  closingNote?: string
  /** Optional path to an uploaded PDF in /media/downloads. */
  pdfUrl?: string
  featured: boolean
  published: boolean
}

export interface GalleryPhoto {
  id: string
  url: string
  caption?: string
  width?: number
  height?: number
}

export interface GalleryAlbum extends Timestamped {
  id: string
  title: string
  slug: string
  date: IsoDate
  description?: string
  cover?: string
  photos: GalleryPhoto[]
  published: boolean
}

export interface GalleryVideo {
  id: string
  title: string
  url: string
  date?: IsoDate
  thumbnail?: string
  description?: string
}

export interface GalleryContent {
  albums: GalleryAlbum[]
  videos: GalleryVideo[]
}

export interface DownloadItem extends Timestamped {
  id: string
  title: string
  description?: string
  category: 'bulletin' | 'outline' | 'constitution' | 'study' | 'form' | 'report' | 'other'
  /** Path within /media/downloads, or an external URL. */
  url: string
  fileType: string
  sizeLabel?: string
  published: boolean
}

export interface Devotional extends Timestamped {
  id: string
  date: IsoDate
  title: string
  verseRef: string
  verseText: string
  body: string
  prayer?: string
  /** Bible references for the day's reading plan. */
  readingPlan: string[]
  author?: string
  published: boolean
}

/** Prayer points the pastor publishes for the whole church to agree with. */
export interface PrayerPoint extends Timestamped {
  id: string
  title: string
  body: string
  category: 'church' | 'nation' | 'missions' | 'thanksgiving' | 'healing' | 'family'
  scripture?: string
  answered: boolean
  answeredNote?: string
  publishedAt: IsoDateTime
  published: boolean
}

/** Everything published, as one addressable map. */
export interface PublishedContent {
  church: ChurchProfile
  departments: Department[]
  events: ChurchEvent[]
  sermons: Sermon[]
  announcements: Announcement[]
  bulletins: Bulletin[]
  gallery: GalleryContent
  downloads: DownloadItem[]
  devotionals: Devotional[]
  prayerPoints: PrayerPoint[]
}

export type CollectionName = keyof PublishedContent

// ===========================================================================
// VAULT — device-local only, never committed
// ===========================================================================

export type MembershipStatus =
  | 'member'
  | 'new-convert'
  | 'visitor'
  | 'transferred-in'
  | 'transferred-out'
  | 'inactive'
  | 'deceased'

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  member: 'Full Member',
  'new-convert': 'New Convert',
  visitor: 'Visitor',
  'transferred-in': 'Transferred In',
  'transferred-out': 'Transferred Out',
  inactive: 'Inactive',
  deceased: 'Deceased',
}

export type MaritalStatus = 'single' | 'married' | 'widowed' | 'separated' | 'divorced'

export type AgeGroup = 'child' | 'teen' | 'youth' | 'adult' | 'senior'

export interface Member extends Timestamped {
  id: string
  firstName: string
  lastName: string
  otherNames?: string
  gender: 'male' | 'female'
  /** `YYYY-MM-DD`. Year may be omitted by storing `0000-MM-DD`. */
  dateOfBirth?: IsoDate
  ageGroup: AgeGroup
  phone?: string
  altPhone?: string
  email?: string
  address?: string
  occupation?: string
  photo?: string // data URL, stored locally only

  maritalStatus: MaritalStatus
  weddingAnniversary?: IsoDate
  familyId?: string
  familyRole?: 'head' | 'spouse' | 'child' | 'dependant' | 'other'

  status: MembershipStatus
  joinedDate?: IsoDate
  role: Role
  isWorker: boolean
  workerSince?: IsoDate
  departmentIds: string[]
  /** Department ids this member leads. */
  leadsDepartmentIds: string[]

  baptised: boolean
  baptismDate?: IsoDate
  baptismPlace?: string
  bornAgain?: boolean
  conversionDate?: IsoDate

  notes?: string
  active: boolean
}

export interface Family extends Timestamped {
  id: string
  name: string
  headMemberId?: string
  address?: string
  phone?: string
  notes?: string
}

export type ServiceType =
  | 'sunday-worship'
  | 'sunday-school'
  | 'bible-study'
  | 'workers-meeting'
  | 'prayer-meeting'
  | 'department-meeting'
  | 'revival'
  | 'convention'
  | 'special'

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  'sunday-worship': 'Sunday Worship',
  'sunday-school': 'Sunday School',
  'bible-study': 'Bible Study',
  'workers-meeting': 'Workers’ Meeting',
  'prayer-meeting': 'Prayer Meeting',
  'department-meeting': 'Department Meeting',
  revival: 'Revival',
  convention: 'Convention',
  special: 'Special Service',
}

/** Head-count buckets recorded even when individual marking is skipped. */
export interface AttendanceCounts {
  men: number
  women: number
  youth: number
  children: number
  visitors: number
}

export interface AttendanceRecord extends Timestamped {
  id: string
  date: IsoDate
  serviceType: ServiceType
  title?: string
  departmentId?: string
  counts: AttendanceCounts
  /** Members marked individually present. May be empty if only counts were taken. */
  presentMemberIds: string[]
  /** Recorded offering, in naira. Optional. */
  offeringTotal?: number
  notes?: string
  recordedBy?: string
}

/** A prayer request submitted on this device. Stays on this device. */
export interface PrayerRequest extends Timestamped {
  id: string
  subject: string
  body: string
  category: PrayerPoint['category'] | 'personal'
  anonymous: boolean
  /** Only ever meaningful once the request has actually been sent out. */
  sharedWithPastor: boolean
  requesterName?: string
  answered: boolean
  answeredNote?: string
}

export interface AuditEntry {
  id: string
  at: IsoDateTime
  actor: string
  action: 'create' | 'update' | 'delete' | 'publish' | 'import' | 'export' | 'unlock' | 'restore'
  entity: string
  entityId?: string
  summary: string
}

/**
 * Publishing credentials.
 *
 * Kept inside the encrypted vault rather than localStorage: the token can
 * write to the church's repository, so it deserves the same protection as the
 * membership register. Scope it to this one repository, Contents read+write.
 */
export interface GitHubSettings {
  owner: string
  repo: string
  branch: string
  token: string
  /** Cached from the last successful check, for display only. */
  verifiedLogin?: string
  verifiedAt?: IsoDateTime
}

export interface AdminIdentity {
  /** Shown on audit entries and reports. Not published anywhere. */
  name: string
  role: Role
}

export interface VaultData {
  members: Member[]
  families: Family[]
  attendance: AttendanceRecord[]
  prayerRequests: PrayerRequest[]
  audit: AuditEntry[]
  github?: GitHubSettings
  admin?: AdminIdentity
}

export type VaultCollection = 'members' | 'families' | 'attendance' | 'prayerRequests' | 'audit'

/** On-disk shape of an exported `.fbcvault` backup. */
export interface EncryptedEnvelope {
  format: 'fbc-vault'
  version: 1
  alg: 'AES-GCM-256'
  kdf: 'PBKDF2-SHA256'
  iterations: number
  salt: string // base64
  iv: string // base64
  ciphertext: string // base64
  createdAt: IsoDateTime
  /** Non-sensitive summary so a backup can be identified without unlocking it. */
  hint?: { members: number; attendance: number; church: string }
}
