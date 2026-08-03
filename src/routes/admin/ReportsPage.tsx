import { useMemo, useState } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import {
  Button,
  EmptyState,
  Panel,
  Select,
  Stat,
  TableShell,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { useVaultData } from '@/context/VaultContext'
import { useDocumentTitle } from '@/hooks'
import { exportExcel, printDocument, type Column } from '@/lib/export'
import {
  attendanceByServiceType,
  attendanceTrend,
  departmentStats,
  membershipGrowth,
  summariseAttendance,
  summariseMembership,
  withinRange,
  RANGE_LABELS,
  type RangePreset,
} from '@/lib/stats'
import { MEMBERSHIP_STATUS_LABELS, SERVICE_TYPE_LABELS, type ServiceType } from '@/lib/types'
import {
  formatNaira,
  formatNairaShort,
  formatNumber,
  pluralise,
} from '@/lib/utils'

/**
 * Reports for the church business meeting.
 *
 * Chart.js is registered here rather than globally: this route is the only one
 * that draws charts and it is lazily loaded, so the chart bundle never reaches
 * anyone who just opened the site to check what time the service starts.
 */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
)

/** Church palette, as literals — Chart.js cannot read CSS custom properties. */
const PALETTE = {
  vestry: '#2b2750',
  vestryLight: '#7b73b3',
  crimson: '#c4142f',
  azure: '#2f76d9',
  gold: '#c9a43a',
  green: '#157f5b',
}

const SERIES = [PALETTE.vestry, PALETTE.gold, PALETTE.azure, PALETTE.crimson, PALETTE.green, PALETTE.vestryLight]

export default function ReportsPage() {
  useDocumentTitle('Reports')

  const vault = useVaultData()
  const { content } = useContent()
  const { resolved } = useTheme()
  const toast = useToast()

  const [range, setRange] = useState<RangePreset>('12m')
  const [serviceType, setServiceType] = useState<ServiceType | 'all'>('all')
  const [months, setMonths] = useState(12)

  const records = useMemo(() => withinRange(vault.attendance, range), [vault.attendance, range])

  const membership = useMemo(() => summariseMembership(vault.members), [vault.members])
  const attendance = useMemo(() => summariseAttendance(records), [records])
  const growth = useMemo(() => membershipGrowth(vault.members, months), [vault.members, months])
  const trend = useMemo(
    () => attendanceTrend(records, months, serviceType === 'all' ? undefined : serviceType),
    [records, months, serviceType],
  )
  const byService = useMemo(() => attendanceByServiceType(records), [records])
  const departments = useMemo(
    () => departmentStats(content.departments, vault.members, vault.attendance),
    [content.departments, vault.members, vault.attendance],
  )

  const grid = resolved === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(21,18,48,0.08)'
  const tick = resolved === 'dark' ? '#a8a3bd' : '#5b5676'

  const baseOptions: ChartOptions<'line' | 'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: tick, boxWidth: 12, usePointStyle: true } },
      },
      scales: {
        x: { grid: { color: grid }, ticks: { color: tick, maxRotation: 0, autoSkipPadding: 12 } },
        y: { beginAtZero: true, grid: { color: grid }, ticks: { color: tick, precision: 0 } },
      },
    }),
    [grid, tick],
  )

  const hasData = vault.members.length > 0 || vault.attendance.length > 0

  if (!hasData) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={BarChart3}
          title="Nothing to report yet"
          description="Reports are built from the member register and attendance records. Add a few of each and the charts fill in on their own."
        />
      </div>
    )
  }

  // --- exports -------------------------------------------------------------

  const printFullReport = () => {
    printDocument({
      title: 'Church Report',
      subtitle: `${RANGE_LABELS[range]}${serviceType === 'all' ? '' : ` · ${SERVICE_TYPE_LABELS[serviceType]}`}`,
      churchName: content.church.name,
      motto: content.church.motto,
      sections: [
        {
          heading: 'Membership',
          tiles: [
            { label: 'Total', value: formatNumber(membership.total) },
            { label: 'Active', value: formatNumber(membership.active) },
            { label: 'Workers', value: formatNumber(membership.workers) },
            { label: 'Baptised', value: formatNumber(membership.baptised) },
            { label: 'Men', value: formatNumber(membership.male) },
            { label: 'Women', value: formatNumber(membership.female) },
          ],
          columns: [{ header: 'Status' }, { header: 'Members', align: 'right' }],
          rows: Object.entries(membership.byStatus).map(([status, count]) => [
            MEMBERSHIP_STATUS_LABELS[status as keyof typeof MEMBERSHIP_STATUS_LABELS],
            count,
          ]),
        },
        {
          heading: 'Attendance',
          intro: `${pluralise(attendance.services, 'service')} recorded in this period.`,
          tiles: [
            { label: 'Average', value: formatNumber(attendance.average) },
            { label: 'Best', value: attendance.best ? formatNumber(attendance.best.total) : '—' },
            { label: 'Visitors', value: formatNumber(attendance.totalVisitors) },
            { label: 'Offering', value: formatNaira(attendance.totalOffering) },
          ],
          columns: [
            { header: 'Month' },
            { header: 'Services', align: 'right' },
            { header: 'Total', align: 'right' },
            { header: 'Average', align: 'right' },
            { header: 'Visitors', align: 'right' },
          ],
          rows: trend.map((point) => [
            point.label,
            point.services,
            point.total,
            point.average,
            point.visitors,
          ]),
        },
        {
          heading: 'Departments',
          columns: [
            { header: 'Department' },
            { header: 'Members', align: 'right' },
            { header: 'Workers', align: 'right' },
            { header: 'Meetings', align: 'right' },
            { header: 'Avg attendance', align: 'right' },
          ],
          rows: departments.map((stat) => [
            stat.department.name,
            stat.members,
            stat.workers,
            stat.meetings,
            stat.averageAttendance,
          ]),
        },
        {
          heading: 'Membership growth',
          columns: [
            { header: 'Month' },
            { header: 'Joined', align: 'right' },
            { header: 'Running total', align: 'right' },
          ],
          rows: growth.map((point) => [point.label, point.joined, point.cumulative]),
        },
      ],
    })
  }

  const exportWorkbook = () => {
    const growthColumns: Column<(typeof growth)[number]>[] = [
      { key: 'month', header: 'Month', value: (r) => r.label },
      { key: 'joined', header: 'Joined', value: (r) => r.joined, type: 'number' },
      { key: 'total', header: 'Running total', value: (r) => r.cumulative, type: 'number' },
    ]
    const trendColumns: Column<(typeof trend)[number]>[] = [
      { key: 'month', header: 'Month', value: (r) => r.label },
      { key: 'services', header: 'Services', value: (r) => r.services, type: 'number' },
      { key: 'total', header: 'Total attendance', value: (r) => r.total, type: 'number' },
      { key: 'average', header: 'Average', value: (r) => r.average, type: 'number' },
      { key: 'men', header: 'Men', value: (r) => r.men, type: 'number' },
      { key: 'women', header: 'Women', value: (r) => r.women, type: 'number' },
      { key: 'youth', header: 'Youth', value: (r) => r.youth, type: 'number' },
      { key: 'teenagers', header: 'Teenagers', value: (r) => r.teenagers, type: 'number' },
      { key: 'children', header: 'Children', value: (r) => r.children, type: 'number' },
      { key: 'visitors', header: 'Visitors', value: (r) => r.visitors, type: 'number' },
    ]
    const departmentColumns: Column<(typeof departments)[number]>[] = [
      { key: 'name', header: 'Department', value: (r) => r.department.name, width: 160 },
      { key: 'members', header: 'Members', value: (r) => r.members, type: 'number' },
      { key: 'workers', header: 'Workers', value: (r) => r.workers, type: 'number' },
      { key: 'meetings', header: 'Meetings held', value: (r) => r.meetings, type: 'number' },
      {
        key: 'average',
        header: 'Average attendance',
        value: (r) => r.averageAttendance,
        type: 'number',
      },
    ]

    exportExcel(
      [
        { name: 'Membership growth', rows: growth, columns: growthColumns },
        { name: 'Attendance trend', rows: trend, columns: trendColumns },
        { name: 'Departments', rows: departments, columns: departmentColumns },
      ] as never,
      'fbc-reports',
      'FBC Agbede Church Reports',
    )
    toast.success('Workbook downloaded', 'Four sheets: growth, attendance, departments and rates.')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Church office</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            Built entirely from records on this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={FileText} onClick={printFullReport}>
            Print / PDF
          </Button>
          <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={exportWorkbook}>
            Excel
          </Button>
        </div>
      </header>

      <Panel bodyClassName="flex flex-wrap items-center gap-3">
        <Select
          label="Period"
          hideLabel
          value={range}
          onChange={(e) => setRange(e.target.value as RangePreset)}
          className="w-full sm:w-44"
          options={(Object.keys(RANGE_LABELS) as RangePreset[]).map((value) => ({
            value,
            label: RANGE_LABELS[value],
          }))}
        />
        <Select
          label="Service"
          hideLabel
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value as ServiceType | 'all')}
          className="w-full sm:w-52"
          options={[
            { value: 'all', label: 'All services' },
            ...(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((value) => ({
              value,
              label: SERVICE_TYPE_LABELS[value],
            })),
          ]}
        />
        <Select
          label="Chart span"
          hideLabel
          value={String(months)}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="w-full sm:w-40"
          options={[
            { value: '6', label: 'Last 6 months' },
            { value: '12', label: 'Last 12 months' },
            { value: '24', label: 'Last 24 months' },
          ]}
        />
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total members" value={formatNumber(membership.total)} icon={UsersRound} />
        <Stat
          label="Average attendance"
          value={formatNumber(attendance.average)}
          icon={TrendingUp}
          tone="info"
          hint={RANGE_LABELS[range].toLowerCase()}
        />
        <Stat
          label="Visitors"
          value={formatNumber(attendance.totalVisitors)}
          icon={UsersRound}
          tone="accent"
        />
        <Stat
          label="Offering"
          value={formatNairaShort(attendance.totalOffering)}
          icon={BarChart3}
          tone="gold"
        />
      </div>

      <Panel
        title="Membership growth"
        description="Running total of the register, from recorded join dates"
        icon={TrendingUp}
      >
        <div className="h-72">
          <Line
            data={{
              labels: growth.map((point) => point.label),
              datasets: [
                {
                  label: 'Total members',
                  data: growth.map((point) => point.cumulative),
                  borderColor: PALETTE.vestry,
                  backgroundColor: 'rgba(43,39,80,0.12)',
                  fill: true,
                  tension: 0.35,
                  pointRadius: 2,
                },
                {
                  label: 'Joined that month',
                  data: growth.map((point) => point.joined),
                  borderColor: PALETTE.gold,
                  backgroundColor: PALETTE.gold,
                  tension: 0.35,
                  pointRadius: 2,
                },
              ],
            }}
            options={baseOptions as ChartOptions<'line'>}
          />
        </div>
      </Panel>

      <Panel
        title="Attendance trend"
        description={
          serviceType === 'all'
            ? 'All services, by month'
            : `${SERVICE_TYPE_LABELS[serviceType]}, by month`
        }
        icon={BarChart3}
      >
        <div className="h-72">
          <Bar
            data={{
              labels: trend.map((point) => point.label),
              datasets: [
                { label: 'Men', data: trend.map((p) => p.men), backgroundColor: PALETTE.vestry },
                { label: 'Women', data: trend.map((p) => p.women), backgroundColor: PALETTE.crimson },
                { label: 'Youth', data: trend.map((p) => p.youth), backgroundColor: PALETTE.azure },
                {
                  label: 'Teenagers',
                  data: trend.map((p) => p.teenagers),
                  backgroundColor: PALETTE.vestryLight,
                },
                {
                  label: 'Children',
                  data: trend.map((p) => p.children),
                  backgroundColor: PALETTE.green,
                },
                {
                  label: 'Visitors',
                  data: trend.map((p) => p.visitors),
                  backgroundColor: PALETTE.gold,
                },
              ],
            }}
            options={
              {
                ...baseOptions,
                scales: {
                  x: { ...baseOptions.scales?.x, stacked: true },
                  y: { ...baseOptions.scales?.y, stacked: true },
                },
              } as ChartOptions<'bar'>
            }
          />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Membership by status" icon={UsersRound}>
          <div className="h-64">
            <Doughnut
              data={{
                labels: Object.keys(membership.byStatus).map(
                  (key) => MEMBERSHIP_STATUS_LABELS[key as keyof typeof MEMBERSHIP_STATUS_LABELS],
                ),
                datasets: [
                  {
                    data: Object.values(membership.byStatus),
                    backgroundColor: SERIES,
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '58%',
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { color: tick, boxWidth: 10, usePointStyle: true },
                  },
                },
              }}
            />
          </div>
        </Panel>

        <Panel title="Average attendance by service" icon={BarChart3}>
          {byService.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No registers in this period"
              description="Widen the period above."
            />
          ) : (
            <div className="h-64">
              <Bar
                data={{
                  labels: byService.map((row) => SERVICE_TYPE_LABELS[row.serviceType]),
                  datasets: [
                    {
                      label: 'Average present',
                      data: byService.map((row) => row.average),
                      backgroundColor: PALETTE.azure,
                      borderRadius: 4,
                    },
                  ],
                }}
                options={
                  {
                    ...baseOptions,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                  } as ChartOptions<'bar'>
                }
              />
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Department report"
        description="Membership is counted from the register; meeting attendance from department registers"
        icon={UsersRound}
      >
        {departments.length > 0 && vault.members.length === 0 && (
          <p className="mb-3 rounded-lg bg-sunken px-3 py-2.5 text-[0.8125rem] leading-relaxed text-ink-soft">
            Every column here is zero because nothing feeds it yet.{' '}
            <strong className="text-ink">Members</strong> and{' '}
            <strong className="text-ink">workers</strong> are counted from the register: open a
            member under Members, and tick their departments on the “Church life” tab.{' '}
            <strong className="text-ink">Meetings</strong> and{' '}
            <strong className="text-ink">average attendance</strong> come from registers taken with
            the service set to “Department meeting” and a department chosen.
          </p>
        )}
        {departments.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No departments yet"
            description="Add departments and assign members to them."
          />
        ) : (
          <TableShell
            caption="Department report"
            head={
              <>
                <Th>Department</Th>
                <Th align="right">Members</Th>
                <Th align="right">Workers</Th>
                <Th align="right">Meetings</Th>
                <Th align="right">Avg attendance</Th>
              </>
            }
          >
            {departments.map((stat) => (
              <Tr key={stat.department.id}>
                <Td>
                  <span className="font-medium text-ink">{stat.department.name}</span>
                  {stat.department.leaderName && (
                    <span className="block text-[0.75rem] text-ink-faint">
                      {stat.department.leaderName}
                    </span>
                  )}
                </Td>
                <Td align="right">{formatNumber(stat.members)}</Td>
                <Td align="right">{formatNumber(stat.workers)}</Td>
                <Td align="right">{formatNumber(stat.meetings)}</Td>
                <Td align="right">
                  {stat.meetings > 0 ? formatNumber(stat.averageAttendance) : '—'}
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </Panel>

    </div>
  )
}
