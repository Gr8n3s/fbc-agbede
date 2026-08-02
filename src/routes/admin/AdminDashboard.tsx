import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CakeSlice,
  CalendarCheck,
  CalendarDays,
  CloudUpload,
  Gift,
  HandHeart,
  Heart,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, ButtonLink, EmptyState, Panel, Stat } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useVault, useVaultData } from '@/context/VaultContext'
import { useDocumentTitle } from '@/hooks'
import { publishedEvents } from '@/lib/content'
import {
  attendanceTotal,
  summariseAttendance,
  summariseMembership,
  upcomingCelebrations,
  withinRange,
} from '@/lib/stats'
import type { ChurchEvent } from '@/lib/types'
import { SERVICE_TYPE_LABELS } from '@/lib/types'
import {
  daysBetween,
  formatDate,
  formatNumber,
  fullName,
  initials,
  percentChange,
  pluralise,
  relativeTime,
  todayIso,
} from '@/lib/utils'

/**
 * The church at a glance.
 *
 * Deliberately a *reading* screen: it answers "how are we doing and what needs
 * me today", and every number links to the page where something can be done
 * about it. Nothing here writes.
 */
export default function AdminDashboard() {
  useDocumentTitle('Dashboard')

  const { data, settings } = useVault()
  const vault = useVaultData()
  const { content, hasUnpublished, dirty } = useContent()

  const members = vault.members
  const membership = useMemo(() => summariseMembership(members), [members])

  const last90 = useMemo(() => withinRange(vault.attendance, '90d'), [vault.attendance])
  const attendance = useMemo(() => summariseAttendance(last90), [last90])

  /** Previous 90 days, for the trend arrow on average attendance. */
  const previousAverage = useMemo(() => {
    const from = new Date()
    from.setDate(from.getDate() - 180)
    const to = new Date()
    to.setDate(to.getDate() - 90)
    const fromIso = from.toISOString().slice(0, 10)
    const toIso = to.toISOString().slice(0, 10)
    const window = vault.attendance.filter((r) => r.date >= fromIso && r.date < toIso)
    return summariseAttendance(window).average
  }, [vault.attendance])

  const attendanceTrend = percentChange(attendance.average, previousAverage)

  const celebrations = useMemo(() => upcomingCelebrations(members, 30), [members])

  const recentRegistrations = useMemo(
    () => [...members].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [members],
  )

  const recentRegisters = useMemo(
    () => [...vault.attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [vault.attendance],
  )

  const openPrayer = useMemo(
    () => vault.prayerRequests.filter((r) => !r.answered).length,
    [vault.prayerRequests],
  )

  const upcoming = useMemo(() => upcomingEvents(content.events, 5), [content.events])

  const backupOverdue = useMemo(() => {
    if (members.length === 0) return false
    if (!settings.lastBackupAt) return true
    return Date.now() - new Date(settings.lastBackupAt).getTime() >
      settings.backupReminderDays * 86_400_000
  }, [members.length, settings.lastBackupAt, settings.backupReminderDays])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Church office</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {greeting()}, {data?.admin?.name?.split(' ')[0] ?? 'welcome'}
          </h1>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            {formatDate(todayIso(), 'full')}
          </p>
        </div>
        <ButtonLink to="/admin/members?new=1" icon={UserPlus} size="sm">
          Register a member
        </ButtonLink>
      </header>

      {/* --- things that need attention -------------------------------------- */}
      {(backupOverdue || hasUnpublished) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {backupOverdue && (
            <NoticeCard
              tone="warning"
              icon={AlertTriangle}
              title={settings.lastBackupAt ? 'Backup is overdue' : 'No backup taken yet'}
              body="These records exist only on this device. If it is lost or wiped, they are gone."
              to="/admin/settings"
              action="Back up now"
            />
          )}
          {hasUnpublished && (
            <NoticeCard
              tone="info"
              icon={CloudUpload}
              title={`${pluralise(dirty.length, 'change')} not published`}
              body="Edits are saved on this device but the church website still shows the old version."
              to="/admin/content"
              action="Review and publish"
            />
          )}
        </div>
      )}

      {/* --- headline numbers ------------------------------------------------ */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Members"
          value={formatNumber(membership.total)}
          icon={Users}
          hint={`${formatNumber(membership.active)} active`}
        />
        <Stat
          label="Average attendance"
          value={formatNumber(attendance.average)}
          icon={TrendingUp}
          tone="info"
          hint="last 90 days"
          trend={attendanceTrend === null ? undefined : { value: attendanceTrend, label: 'vs previous' }}
        />
        <Stat
          label="Workers"
          value={formatNumber(membership.workers)}
          icon={ShieldCheck}
          tone="gold"
          hint={`${formatNumber(membership.baptised)} baptised`}
        />
        <Stat
          label="New converts"
          value={formatNumber(membership.newConverts)}
          icon={Sparkles}
          tone="accent"
          hint={`${formatNumber(membership.visitors)} visitors recorded`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* --- celebrations -------------------------------------------------- */}
        <Panel
          title="Celebrations this month"
          description="Birthdays and wedding anniversaries in the next 30 days"
          icon={CakeSlice}
          action={
            celebrations.length > 0 ? (
              <Badge tone="gold">{celebrations.length}</Badge>
            ) : undefined
          }
        >
          {celebrations.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="Nothing coming up"
              description="Birthdays appear here once dates of birth are recorded against members."
            />
          ) : (
            <ul className="divide-y divide-line">
              {celebrations.slice(0, 8).map((celebration) => (
                <li
                  key={`${celebration.member.id}-${celebration.kind}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span
                    className={cxTone(celebration.kind)}
                    aria-hidden
                  >
                    {celebration.kind === 'birthday' ? (
                      <CakeSlice className="size-4" />
                    ) : (
                      <Heart className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-medium text-ink">
                      {fullName(celebration.member)}
                    </p>
                    <p className="text-[0.75rem] text-ink-faint">
                      {celebration.kind === 'birthday' ? 'Birthday' : 'Wedding anniversary'}
                      {celebration.turning !== null && ` · ${celebration.turning}`}
                      {celebration.turning !== null &&
                        (celebration.kind === 'birthday' ? ' years old' : ' years')}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.75rem] font-semibold tabular-nums text-ornament">
                    {celebration.daysAway === 0
                      ? 'Today'
                      : celebration.daysAway === 1
                        ? 'Tomorrow'
                        : `in ${celebration.daysAway} days`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* --- upcoming events ----------------------------------------------- */}
        <Panel
          title="Upcoming programmes"
          description="From the published church calendar"
          icon={CalendarDays}
          action={
            <ButtonLink to="/admin/content/events" variant="ghost" size="sm">
              Manage
            </ButtonLink>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              description="Add services, revivals and conventions so the congregation can plan ahead."
              action={
                <ButtonLink to="/admin/content/events" size="sm" icon={CalendarDays}>
                  Add an event
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((event) => (
                <li key={event.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <DateChip date={event.start.slice(0, 10)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-medium text-ink">{event.title}</p>
                    <p className="truncate text-[0.75rem] text-ink-faint">
                      {event.venue || 'Church auditorium'}
                    </p>
                  </div>
                  {event.featured && <Badge tone="gold">Featured</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* --- recent registers ---------------------------------------------- */}
        <Panel
          title="Recent registers"
          description={`${pluralise(attendance.services, 'service')} recorded in the last 90 days`}
          icon={CalendarCheck}
          action={
            <ButtonLink to="/admin/attendance" variant="ghost" size="sm">
              Open
            </ButtonLink>
          }
        >
          {recentRegisters.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No attendance recorded"
              description="Take the first register after the next service, it takes about a minute."
              action={
                <ButtonLink to="/admin/attendance" size="sm" icon={CalendarCheck}>
                  Take a register
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {recentRegisters.map((record) => (
                <li key={record.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <DateChip date={record.date} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-medium text-ink">
                      {record.title || SERVICE_TYPE_LABELS[record.serviceType]}
                    </p>
                    <p className="text-[0.75rem] text-ink-faint">
                      {pluralise(record.counts.visitors, 'visitor')}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-ink">
                    {formatNumber(attendanceTotal(record))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* --- recent registrations ------------------------------------------ */}
        <Panel
          title="Recently registered"
          description="Newest people on the church register"
          icon={UserPlus}
          action={
            <ButtonLink to="/admin/members" variant="ghost" size="sm">
              Directory
            </ButtonLink>
          }
        >
          {recentRegistrations.length === 0 ? (
            <EmptyState
              icon={Users}
              title="The register is empty"
              description="Add the first member and the directory, attendance and reports come alive."
              action={
                <ButtonLink to="/admin/members?new=1" size="sm" icon={UserPlus}>
                  Register a member
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {recentRegistrations.map((member) => (
                <li key={member.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-[0.75rem] font-bold text-brand">
                    {initials(member.firstName, member.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-medium text-ink">
                      {fullName(member)}
                    </p>
                    <p className="truncate text-[0.75rem] text-ink-faint">
                      Added {relativeTime(member.createdAt)}
                    </p>
                  </div>
                  {member.isWorker && <Badge tone="brand">Worker</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* --- quick actions --------------------------------------------------- */}
      <Panel title="Quick actions" icon={Sparkles}>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            to="/admin/attendance"
            icon={CalendarCheck}
            title="Take a register"
            body="Record today's service"
          />
          <QuickAction
            to="/admin/members?new=1"
            icon={UserPlus}
            title="Register a member"
            body="Add someone new"
          />
          <QuickAction
            to="/admin/content/bulletins"
            icon={ScrollText}
            title="This week's programme"
            body="Order of service"
          />
          <QuickAction
            to="/admin/reports"
            icon={TrendingUp}
            title="Reports"
            body="Export for the church meeting"
          />
        </div>
      </Panel>

      {/* --- prayer + departments ------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Prayer requests"
          value={formatNumber(openPrayer)}
          icon={HandHeart}
          tone="accent"
          hint="awaiting an answer"
        />
        <Stat
          label="Departments"
          value={formatNumber(content.departments.length)}
          icon={UsersRound}
          hint={`${formatNumber(content.departments.filter((d) => d.active).length)} active`}
        />
        <Stat
          label="Offering recorded"
          value={formatNumber(attendance.totalOffering)}
          icon={Gift}
          tone="gold"
          hint="last 90 days, naira"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Next `limit` published events that have not already finished. */
function upcomingEvents(events: ChurchEvent[], limit: number): ChurchEvent[] {
  const today = todayIso()
  return publishedEvents(events)
    .filter((event) => (event.end ?? event.start).slice(0, 10) >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit)
}

function cxTone(kind: 'birthday' | 'anniversary'): string {
  return kind === 'birthday'
    ? 'grid size-9 shrink-0 place-items-center rounded-full bg-ornament/12 text-ornament'
    : 'grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent'
}

function DateChip({ date }: { date: string }) {
  const parsed = new Date(`${date}T00:00:00`)
  const days = daysBetween(todayIso(), date)
  return (
    <span
      className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-sunken text-center leading-none"
      title={formatDate(date, 'full')}
    >
      <span className="block text-[0.6rem] font-semibold uppercase tracking-wider text-ink-faint">
        {parsed.toLocaleDateString('en-NG', { month: 'short' })}
      </span>
      <span
        className={
          days === 0
            ? 'block font-display text-base font-bold tabular-nums text-accent'
            : 'block font-display text-base font-bold tabular-nums text-ink'
        }
      >
        {parsed.getDate()}
      </span>
    </span>
  )
}

function NoticeCard({
  tone,
  icon: Icon,
  title,
  body,
  to,
  action,
}: {
  tone: 'warning' | 'info'
  icon: LucideIcon
  title: string
  body: string
  to: string
  action: string
}) {
  const styles =
    tone === 'warning'
      ? 'border-warning/35 bg-warning/[0.07] text-warning'
      : 'border-info/35 bg-info/[0.07] text-info'

  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 ${styles}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[0.875rem] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-soft">{body}</p>
        <Link
          to={to}
          className="mt-2 inline-block text-[0.8125rem] font-semibold underline underline-offset-2"
        >
          {action} →
        </Link>
      </div>
    </div>
  )
}

function QuickAction({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-line bg-sunken/40 p-3 transition-all duration-200 hover:border-ornament hover:bg-surface hover:shadow-pew"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
        <Icon className="size-[1.15rem]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.875rem] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[0.75rem] text-ink-faint">{body}</span>
      </span>
    </Link>
  )
}
