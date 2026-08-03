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
  startTime: string // "08:00", 24h, church local time
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
  /** Path to the pastor's photograph, e.g. media/church/pastor.jpg. */
  pastorPhoto?: string
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

/**
 * One line of the order of service.
 *
 * The printed bulletin is bilingual throughout — every item reads
 * "In Processional Hymn BH 20 / Ninu Orin Akowole – YBH 8". English and Yoruba
 * are separate fields rather than one string with a slash so the app can lay
 * them out properly, and so a church that prints English-only loses nothing.
 */
export interface OrderOfServiceItem {
  id: string
  /** "08:00" or free text like "After the offering". Optional. */
  time?: string
  item: string
  /** The same line in Yoruba. */
  itemYoruba?: string
  minister?: string
  /** Hymn cited inline on this line, e.g. "BH 20". */
  hymnNumber?: string
  /** The Yoruba hymnal number for the same slot, e.g. "YBH 8". */
  hymnNumberYoruba?: string
  note?: string
}

/**
 * A named block of the order of service — "IN WORSHIP / NINU ISIN",
 * "WORD MINISTRATIONS / NINU ISE IRANSE ORO NAA", and so on. The church groups
 * the service this way on the printed sheet, so the model does too.
 */
export interface OrderOfServiceSection {
  id: string
  heading: string
  headingYoruba?: string
  items: OrderOfServiceItem[]
}

export interface BulletinHymn {
  id: string
  /** Baptist Hymnal number, when there is one. */
  number?: string
  title: string
  /** e.g. "Opening", "Offertory", "Closing" */
  slot?: string
}

/** A row of the service timetable printed at the head of the sheet. */
export interface BulletinScheduleRow {
  id: string
  name: string
  startTime: string
  endTime?: string
}

/** The Sunday School / Church-in-Classes lesson, in both languages. */
export interface SundaySchoolLesson {
  topic: string
  topicYoruba?: string
  /** Passages for the lesson, e.g. "John 11:14-16; 14:5-8; 20:24-29". */
  text: string
  memoryVerse?: string
  memoryVerseRef?: string
  /**
   * When the classes run. The printed sheet carries the time in the heading
   * itself, "CHURCH IN CLASSES (9.00am - 10.00am)", separately from the
   * timetable above it.
   */
  startTime?: string
  endTime?: string
}

/**
 * A published attendance line.
 *
 * Aggregate head counts only — the church already prints these, and no
 * individual is identifiable from them. Names never appear here. Note the
 * separate teenagers column: the church counts teenagers apart from both youth
 * and children.
 */
export interface BulletinAttendanceRow {
  id: string
  /** "Combined Worship", "English Worship", "Mid-Week Prayer and Bible Study". */
  label: string
  men?: number
  women?: number
  youth?: number
  teenagers?: number
  children?: number
  /** Printed total. Left blank, it is summed from the columns. */
  total?: number
}

/**
 * A name on the month's birthday list.
 *
 * This is a deliberate, church-decided exception to the rule that people are
 * not published: the congregation already prints this list on paper every
 * month. It is typed in by hand rather than generated from the member register,
 * so publishing someone is always an explicit act. See docs/DATA-PRIVACY.md.
 */
export interface BulletinBirthday {
  id: string
  name: string
  /** Day of the month, 1–31. */
  day: number
}

/** A line of the "Our Coming Programs" table. */
export interface BulletinProgramme {
  id: string
  /** Month heading this falls under, e.g. "August". Optional; groups the table. */
  month?: string
  /** Free text, because the church writes "Sat., 1st – Mon., 3rd". */
  when: string
  what: string
}

/** The full sermon printed under "FROM THE THRONE OF GLORY!". */
export interface BulletinMessage {
  /** Section heading. Defaults to "From the Throne of Glory!". */
  heading?: string
  topic: string
  /** Scripture the message is built on, e.g. "Acts 6:1–7". */
  text?: string
  /** The message itself. Headings start with #, lists with -, quotes with >. */
  body: string
  author?: string
}

/** A bilingual discipleship theme for the month. */
export interface BulletinTheme {
  id: string
  topic: string
  topicYoruba?: string
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

  // --- masthead ------------------------------------------------------------
  /** The church's theme for the year, e.g. "2026: My Year of Fruitful Outpouring!". */
  yearTheme?: string
  /** Which Sunday of the year this is. The sheet opens with it: "the 29th Sunday". */
  sundayNumber?: number
  /** "You are welcome to the 29th Sunday." Overrides the generated line. */
  welcomeLine?: string
  /** The day's emphasis, e.g. "2026 Social Ministries Emphasis Sunday". */
  occasion?: string
  /** Its subtitle — usually the topic and text. */
  occasionSubtitle?: string
  /** The timetable printed under the masthead. */
  schedule: BulletinScheduleRow[]

  // --- lesson & service ----------------------------------------------------
  sundaySchool?: SundaySchoolLesson
  /** The boxed motto above the order of service. */
  serviceMotto?: string
  serviceMottoYoruba?: string
  theme?: string
  themeVerse?: string
  themeVerseRef?: string
  welcomeNote?: string
  preacher?: string
  serviceName: string
  /** The order of service, grouped into its named blocks. */
  sections: OrderOfServiceSection[]
  /** Hymns called out separately, when the church lists them apart. */
  hymns: BulletinHymn[]
  readings: string[]
  /** The teenagers' own order of service — a plain list on the printed sheet. */
  teenagersOrder: string[]

  // --- announcements -------------------------------------------------------
  /** Last week's head counts, as printed. Aggregate only, never names. */
  attendanceSummary: BulletinAttendanceRow[]
  /** Free-text notices. Published publicly — no personal contact details. */
  notices: string[]
  /** The rest of the week's activities, one line each. */
  weekAhead: { id: string; day: string; time?: string; activity: string; venue?: string }[]
  comingProgrammes: BulletinProgramme[]
  /** Typed by hand, never generated from the register. See BulletinBirthday. */
  birthdays: BulletinBirthday[]

  // --- the message ---------------------------------------------------------
  message?: BulletinMessage
  prayerPoints: string[]
  /** Next week's Sunday School lesson, trailed at the end of the sheet. */
  nextSundaySchool?: SundaySchoolLesson
  disciplesThisMonth: BulletinTheme[]
  disciplesNextMonth: BulletinTheme[]

  // --- appeals -------------------------------------------------------------
  urgentNeeds: string[]
  /** The church projects list — roofing, generator, tiles, and so on. */
  projects: string[]
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

// --- Bible reading plan -----------------------------------------------------

/** One day of a reading plan. */
export interface ReadingPlanDay {
  id: string
  /**
   * Day number within the plan, starting at 1. Deliberately not a date: a
   * church runs the same plan again next year, and a member who starts in
   * March should be on day 1, not eleven weeks behind.
   */
  day: number
  /** Passages for the day, e.g. ["Genesis 1-2", "Matthew 1"]. */
  references: string[]
  note?: string
}

export interface ReadingPlan extends Timestamped {
  id: string
  title: string
  slug: string
  description: string
  /** Where day 1 falls when the church reads it together. Optional. */
  startDate?: IsoDate
  days: ReadingPlanDay[]
  published: boolean
}

/**
 * A general Bible teaching.
 *
 * Distinct from a sermon on purpose: a sermon is an event, tied to a date, a
 * preacher and a service. A teaching is reference material the church keeps
 * available, on doctrine, Christian living, or how to study scripture.
 */
export interface Teaching extends Timestamped {
  id: string
  title: string
  slug: string
  /** Free text so the church is not boxed in, e.g. "Doctrine", "Baptist Faith". */
  topic: string
  scriptures: string[]
  summary: string
  /** Markdown-ish body: headings, lists, blockquotes, bold. */
  body: string
  author?: string
  order: number
  published: boolean
}

/** Prayer points the pastor publishes for the whole church to agree with. */
export interface PrayerPoint extends Timestamped {
  id: string
  title: string
  body: string
  category: 'church' | 'nation' | 'missions' | 'thanksgiving' | 'healing' | 'family'
  scripture?: string
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
  readingPlans: ReadingPlan[]
  teachings: Teaching[]
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

/**
 * Head-count buckets recorded even when individual marking is skipped.
 *
 * These mirror the columns on the church's own printed attendance table —
 * including teenagers, which the church counts separately from both youth and
 * children. Visitors are ours: the printed sheet does not break them out, but
 * the office needs the number for follow-up.
 */
export interface AttendanceCounts {
  men: number
  women: number
  youth: number
  teenagers: number
  children: number
  visitors: number
}

/**
 * One class or group within a service.
 *
 * Sunday School does not meet as a single room — it splits into classes, each
 * with its own register and its own offering, and the church wants those
 * figures kept apart rather than merged into one number. Any service can use
 * groups; Sunday School is simply the one that always does.
 */
export interface AttendanceGroup {
  id: string
  /** "Adults", "Young Adults", "Teens", "Beginners", … */
  name: string
  count: number
  /** Offering collected in this class, in naira. */
  offering?: number
}

export interface AttendanceRecord extends Timestamped {
  id: string
  date: IsoDate
  serviceType: ServiceType
  title?: string
  departmentId?: string
  counts: AttendanceCounts
  /** Per-class breakdown. Empty for services taken as a single head count. */
  groups?: AttendanceGroup[]
  /**
   * Recorded offering, in naira. Optional, and hidden on screen by default —
   * see `DeviceSettings.showOfferings`. Attendance registers get read over
   * someone's shoulder far more often than anyone expects.
   */
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
