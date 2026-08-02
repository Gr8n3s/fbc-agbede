/**
 * Reporting maths for the admin dashboard.
 *
 * Pure functions over vault data — no React, no charts, no formatting. That
 * keeps the numbers testable and lets the same figures feed the dashboard,
 * the printed report and the spreadsheet export without drifting apart.
 */

import type {
  AttendanceRecord,
  Department,
  Member,
  MembershipStatus,
  ServiceType,
} from './types'
import {
  ageFrom,
  daysUntilAnniversary,
  monthKey,
  monthLabel,
  sum,
  toIsoDate,
} from './utils'

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export interface MembershipSummary {
  total: number
  active: number
  workers: number
  baptised: number
  newConverts: number
  visitors: number
  male: number
  female: number
  byStatus: Record<MembershipStatus, number>
  byAgeGroup: Record<string, number>
  averageAge: number | null
}

const EMPTY_STATUS: Record<MembershipStatus, number> = {
  member: 0,
  'new-convert': 0,
  visitor: 0,
  'transferred-in': 0,
  'transferred-out': 0,
  inactive: 0,
  deceased: 0,
}

export function summariseMembership(members: Member[]): MembershipSummary {
  const byStatus = { ...EMPTY_STATUS }
  const byAgeGroup: Record<string, number> = { child: 0, teen: 0, youth: 0, adult: 0, senior: 0 }
  const ages: number[] = []

  let active = 0
  let workers = 0
  let baptised = 0
  let male = 0
  let female = 0

  for (const m of members) {
    byStatus[m.status] = (byStatus[m.status] ?? 0) + 1
    byAgeGroup[m.ageGroup] = (byAgeGroup[m.ageGroup] ?? 0) + 1
    if (m.active) active++
    if (m.isWorker) workers++
    if (m.baptised) baptised++
    if (m.gender === 'male') male++
    else female++
    const age = ageFrom(m.dateOfBirth)
    if (age !== null) ages.push(age)
  }

  return {
    total: members.length,
    active,
    workers,
    baptised,
    newConverts: byStatus['new-convert'],
    visitors: byStatus.visitor,
    male,
    female,
    byStatus,
    byAgeGroup,
    averageAge: ages.length ? Math.round(sum(ages) / ages.length) : null,
  }
}

export interface GrowthPoint {
  key: string
  label: string
  joined: number
  cumulative: number
}

/**
 * Cumulative membership over the last `months` months, from join dates.
 * Members with no recorded join date are counted in the opening balance so the
 * curve still starts at the true total rather than at zero.
 */
export function membershipGrowth(members: Member[], months = 12): GrowthPoint[] {
  const keys = lastMonthKeys(months)
  const joinedByMonth = new Map<string, number>()
  let undated = 0
  let beforeWindow = 0
  const firstKey = keys[0]

  for (const m of members) {
    if (!m.joinedDate) {
      undated++
      continue
    }
    const key = m.joinedDate.slice(0, 7)
    if (key < firstKey) {
      beforeWindow++
      continue
    }
    joinedByMonth.set(key, (joinedByMonth.get(key) ?? 0) + 1)
  }

  let running = beforeWindow + undated
  return keys.map((key) => {
    const joined = joinedByMonth.get(key) ?? 0
    running += joined
    return { key, label: monthLabel(key), joined, cumulative: running }
  })
}

function lastMonthKeys(months: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(d)
    m.setMonth(d.getMonth() - i)
    out.push(monthKey(m))
  }
  return out
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

/** Total heads at one gathering: bucket counts, or marked members if no counts. */
export function attendanceTotal(record: AttendanceRecord): number {
  const counted =
    record.counts.men +
    record.counts.women +
    record.counts.youth +
    record.counts.children +
    record.counts.visitors
  return counted > 0 ? counted : record.presentMemberIds.length
}

export interface AttendanceSummary {
  services: number
  totalAttendance: number
  average: number
  best: { date: string; total: number } | null
  lowest: { date: string; total: number } | null
  totalVisitors: number
  totalOffering: number
}

export function summariseAttendance(records: AttendanceRecord[]): AttendanceSummary {
  if (records.length === 0) {
    return {
      services: 0,
      totalAttendance: 0,
      average: 0,
      best: null,
      lowest: null,
      totalVisitors: 0,
      totalOffering: 0,
    }
  }

  const totals = records.map((r) => ({ date: r.date, total: attendanceTotal(r) }))
  const grand = sum(totals.map((t) => t.total))
  const sorted = [...totals].sort((a, b) => b.total - a.total)

  return {
    services: records.length,
    totalAttendance: grand,
    average: Math.round(grand / records.length),
    best: sorted[0] ?? null,
    lowest: sorted[sorted.length - 1] ?? null,
    totalVisitors: sum(records.map((r) => r.counts.visitors)),
    totalOffering: sum(records.map((r) => r.offeringTotal ?? 0)),
  }
}

export interface AttendanceTrendPoint {
  key: string
  label: string
  total: number
  average: number
  services: number
  men: number
  women: number
  youth: number
  children: number
  visitors: number
}

/** Monthly attendance trend, optionally narrowed to one service type. */
export function attendanceTrend(
  records: AttendanceRecord[],
  months = 12,
  serviceType?: ServiceType,
): AttendanceTrendPoint[] {
  const keys = lastMonthKeys(months)
  const filtered = serviceType ? records.filter((r) => r.serviceType === serviceType) : records
  const buckets = new Map<string, AttendanceRecord[]>()

  for (const record of filtered) {
    const key = record.date.slice(0, 7)
    const list = buckets.get(key)
    if (list) list.push(record)
    else buckets.set(key, [record])
  }

  return keys.map((key) => {
    const list = buckets.get(key) ?? []
    const total = sum(list.map(attendanceTotal))
    return {
      key,
      label: monthLabel(key),
      total,
      services: list.length,
      average: list.length ? Math.round(total / list.length) : 0,
      men: sum(list.map((r) => r.counts.men)),
      women: sum(list.map((r) => r.counts.women)),
      youth: sum(list.map((r) => r.counts.youth)),
      children: sum(list.map((r) => r.counts.children)),
      visitors: sum(list.map((r) => r.counts.visitors)),
    }
  })
}

/** Average attendance per service type, most-attended first. */
export function attendanceByServiceType(
  records: AttendanceRecord[],
): { serviceType: ServiceType; services: number; total: number; average: number }[] {
  const buckets = new Map<ServiceType, AttendanceRecord[]>()
  for (const r of records) {
    const list = buckets.get(r.serviceType)
    if (list) list.push(r)
    else buckets.set(r.serviceType, [r])
  }
  return [...buckets.entries()]
    .map(([serviceType, list]) => {
      const total = sum(list.map(attendanceTotal))
      return {
        serviceType,
        services: list.length,
        total,
        average: Math.round(total / list.length),
      }
    })
    .sort((a, b) => b.average - a.average)
}

/**
 * Per-member attendance rate over the records supplied.
 *
 * Only counts services where individual marking actually happened — otherwise
 * a month of head-count-only registers would show everyone at 0% and look like
 * a congregation that stopped coming.
 */
export function memberAttendanceRates(
  members: Member[],
  records: AttendanceRecord[],
): { member: Member; attended: number; eligible: number; rate: number }[] {
  const marked = records.filter((r) => r.presentMemberIds.length > 0)
  const eligible = marked.length
  const tally = new Map<string, number>()

  for (const record of marked) {
    for (const id of record.presentMemberIds) {
      tally.set(id, (tally.get(id) ?? 0) + 1)
    }
  }

  return members
    .map((member) => {
      const attended = tally.get(member.id) ?? 0
      return {
        member,
        attended,
        eligible,
        rate: eligible ? Math.round((attended / eligible) * 100) : 0,
      }
    })
    .sort((a, b) => b.rate - a.rate)
}

/** Members with no marked attendance in the window — the follow-up list. */
export function absentees(
  members: Member[],
  records: AttendanceRecord[],
  minServices = 3,
): Member[] {
  const marked = records.filter((r) => r.presentMemberIds.length > 0)
  if (marked.length < minServices) return []
  const seen = new Set(marked.flatMap((r) => r.presentMemberIds))
  return members.filter((m) => m.active && m.status === 'member' && !seen.has(m.id))
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export interface DepartmentStat {
  department: Department
  members: number
  workers: number
  meetings: number
  averageAttendance: number
}

export function departmentStats(
  departments: Department[],
  members: Member[],
  records: AttendanceRecord[],
): DepartmentStat[] {
  return departments
    .map((department) => {
      const inDept = members.filter((m) => m.departmentIds.includes(department.id))
      const meetings = records.filter((r) => r.departmentId === department.id)
      const total = sum(meetings.map(attendanceTotal))
      return {
        department,
        members: inDept.length,
        workers: inDept.filter((m) => m.isWorker).length,
        meetings: meetings.length,
        averageAttendance: meetings.length ? Math.round(total / meetings.length) : 0,
      }
    })
    .sort((a, b) => b.members - a.members)
}

// ---------------------------------------------------------------------------
// Celebrations
// ---------------------------------------------------------------------------

export interface Celebration {
  member: Member
  kind: 'birthday' | 'anniversary'
  date: string
  daysAway: number
  turning: number | null
}

/** Birthdays and wedding anniversaries in the next `withinDays`. */
export function upcomingCelebrations(members: Member[], withinDays = 30): Celebration[] {
  const out: Celebration[] = []

  for (const member of members) {
    if (!member.active || member.status === 'deceased') continue

    const birthdayIn = daysUntilAnniversary(member.dateOfBirth)
    if (birthdayIn !== null && birthdayIn <= withinDays) {
      const age = ageFrom(member.dateOfBirth)
      out.push({
        member,
        kind: 'birthday',
        date: member.dateOfBirth!,
        daysAway: birthdayIn,
        turning: age === null ? null : age + (birthdayIn === 0 ? 0 : 1),
      })
    }

    const anniversaryIn = daysUntilAnniversary(member.weddingAnniversary)
    if (anniversaryIn !== null && anniversaryIn <= withinDays) {
      const years = ageFrom(member.weddingAnniversary)
      out.push({
        member,
        kind: 'anniversary',
        date: member.weddingAnniversary!,
        daysAway: anniversaryIn,
        turning: years === null ? null : years + (anniversaryIn === 0 ? 0 : 1),
      })
    }
  }

  return out.sort((a, b) => a.daysAway - b.daysAway)
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

export type RangePreset = '30d' | '90d' | '6m' | '12m' | 'ytd' | 'all'

export const RANGE_LABELS: Record<RangePreset, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  ytd: 'This year',
  all: 'All time',
}

export function rangeStart(preset: RangePreset): string {
  const d = new Date()
  switch (preset) {
    case '30d':
      d.setDate(d.getDate() - 30)
      break
    case '90d':
      d.setDate(d.getDate() - 90)
      break
    case '6m':
      d.setMonth(d.getMonth() - 6)
      break
    case '12m':
      d.setFullYear(d.getFullYear() - 1)
      break
    case 'ytd':
      return `${d.getFullYear()}-01-01`
    case 'all':
      return '0000-01-01'
  }
  return toIsoDate(d)
}

export function withinRange(records: AttendanceRecord[], preset: RangePreset): AttendanceRecord[] {
  const from = rangeStart(preset)
  return records.filter((r) => r.date >= from).sort((a, b) => a.date.localeCompare(b.date))
}
