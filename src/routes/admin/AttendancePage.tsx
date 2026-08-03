import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  CalendarPlus,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
} from 'lucide-react'
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  IconButton,
  Input,
  ListEditor,
  Modal,
  Pagination,
  Panel,
  RowInput,
  Select,
  Stat,
  TableShell,
  Td,
  Textarea,
  Th,
  Tr,
  useConfirm,
  usePagination,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useVault, useVaultData } from '@/context/VaultContext'
import { useDocumentTitle } from '@/hooks'
import { exportCsv, exportExcel, printDocument, type Column } from '@/lib/export'
import {
  attendanceTotal,
  recordOffering,
  summariseAttendance,
  withinRange,
  type RangePreset,
} from '@/lib/stats'
import type { AttendanceCounts, AttendanceGroup, AttendanceRecord, ServiceType } from '@/lib/types'
import { SERVICE_TYPE_LABELS } from '@/lib/types'
import {
  formatDate,
  formatNaira,
  formatNairaShort,
  formatNumber,
  newId,
  nowIso,
  pluralise,
  sanitiseText,
  sum,
  todayIso,
} from '@/lib/utils'

/**
 * Service registers.
 *
 * Attendance is recorded the way the ushers actually work: a head count per
 * group, handed in after the service. Those are the same columns the church
 * already prints on its bulletin, so the two always agree.
 *
 * Sunday School is the exception — it meets as separate classes, each with its
 * own register and its own offering, so a register can also carry a per-class
 * breakdown. `attendanceTotal` uses the buckets when they are filled and falls
 * back to the class registers when they are not.
 */

const SERVICE_OPTIONS = (Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((value) => ({
  value,
  label: SERVICE_TYPE_LABELS[value],
}))

const EMPTY_COUNTS: AttendanceCounts = {
  men: 0,
  women: 0,
  youth: 0,
  teenagers: 0,
  children: 0,
  visitors: 0,
}

/** The classes Sunday School normally splits into. Editable per register. */
const SUNDAY_SCHOOL_CLASSES = [
  'Adults',
  'Young Adults',
  'Youth',
  'Teenagers',
  'Children',
  'New Members',
]

function seedGroup(name: string): AttendanceGroup {
  return { id: newId('grp'), name, count: 0 }
}

type Draft = Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>

export default function AttendancePage() {
  useDocumentTitle('Attendance')

  const { mutate, settings, updateSettings } = useVault()
  const vault = useVaultData()
  const { content } = useContent()
  const toast = useToast()
  const { confirm, confirmElement } = useConfirm()

  const [range, setRange] = useState<RangePreset>('90d')
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')
  const [editing, setEditing] = useState<{ draft: Draft; record?: AttendanceRecord } | null>(null)

  const inRange = useMemo(() => withinRange(vault.attendance, range), [vault.attendance, range])

  const filtered = useMemo(
    () =>
      (serviceFilter === 'all' ? inRange : inRange.filter((r) => r.serviceType === serviceFilter))
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    [inRange, serviceFilter],
  )

  const summary = useMemo(() => summariseAttendance(filtered), [filtered])
  const page = usePagination(filtered, settings.pageSize)

  useEffect(() => {
    page.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, serviceFilter])

  const departmentName = (id?: string) =>
    id ? (content.departments.find((d) => d.id === id)?.name ?? '') : ''

  const startNew = () =>
    setEditing({
      draft: {
        date: todayIso(),
        serviceType: (settings.defaultServiceType as ServiceType) || 'sunday-worship',
        title: '',
        counts: { ...EMPTY_COUNTS },
        notes: '',
      },
    })

  const save = async (draft: Draft) => {
    const existing = editing?.record
    const now = nowIso()
    const record: AttendanceRecord = {
      ...draft,
      title: sanitiseText(draft.title ?? '', 120) || undefined,
      notes: sanitiseText(draft.notes ?? '', 1000) || undefined,
      id: existing?.id ?? newId('att'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      recordedBy: existing?.recordedBy ?? vault.admin?.name,
    }

    await mutate(
      (current) => ({
        ...current,
        attendance: existing
          ? current.attendance.map((r) => (r.id === record.id ? record : r))
          : [...current.attendance, record],
      }),
      {
        action: existing ? 'update' : 'create',
        entity: 'attendance',
        entityId: record.id,
        summary: `${existing ? 'Updated' : 'Recorded'} ${SERVICE_TYPE_LABELS[record.serviceType]} on ${formatDate(record.date, 'long')}, ${attendanceTotal(record)} present.`,
      },
    )

    setEditing(null)
    toast.success(
      existing ? 'Register updated' : 'Register saved',
      `${formatNumber(attendanceTotal(record))} present at ${SERVICE_TYPE_LABELS[record.serviceType]}.`,
    )
  }

  const remove = async (record: AttendanceRecord) => {
    const ok = await confirm({
      title: 'Delete this register?',
      message: `The ${SERVICE_TYPE_LABELS[record.serviceType]} register for ${formatDate(record.date, 'long')} will be removed. Attendance reports will change accordingly.`,
      confirmLabel: 'Delete register',
    })
    if (!ok) return

    await mutate(
      (current) => ({
        ...current,
        attendance: current.attendance.filter((r) => r.id !== record.id),
      }),
      {
        action: 'delete',
        entity: 'attendance',
        entityId: record.id,
        summary: `Deleted the ${SERVICE_TYPE_LABELS[record.serviceType]} register for ${formatDate(record.date, 'long')}.`,
      },
    )
    toast.warning('Register deleted')
  }

  const columns: Column<AttendanceRecord>[] = [
    { key: 'date', header: 'Date', value: (r) => r.date, type: 'date' },
    { key: 'service', header: 'Service', value: (r) => SERVICE_TYPE_LABELS[r.serviceType] },
    { key: 'title', header: 'Title', value: (r) => r.title },
    { key: 'department', header: 'Department', value: (r) => departmentName(r.departmentId) },
    { key: 'men', header: 'Men', value: (r) => r.counts.men, type: 'number' },
    { key: 'women', header: 'Women', value: (r) => r.counts.women, type: 'number' },
    { key: 'youth', header: 'Youth', value: (r) => r.counts.youth, type: 'number' },
    { key: 'teenagers', header: 'Teenagers', value: (r) => r.counts.teenagers ?? 0, type: 'number' },
    { key: 'children', header: 'Children', value: (r) => r.counts.children, type: 'number' },
    { key: 'visitors', header: 'Visitors', value: (r) => r.counts.visitors, type: 'number' },
    { key: 'total', header: 'Total', value: (r) => attendanceTotal(r), type: 'number' },
    { key: 'offering', header: 'Offering (₦)', value: (r) => recordOffering(r), type: 'number' },
    { key: 'notes', header: 'Notes', value: (r) => r.notes, width: 220 },
  ]

  /** One row per class, flattened across the registers in view. */
  const classRows = filtered.flatMap((record) =>
    (record.groups ?? []).map((group) => ({ record, group })),
  )

  const classColumns: Column<(typeof classRows)[number]>[] = [
    { key: 'date', header: 'Date', value: (r) => r.record.date, type: 'date' },
    {
      key: 'service',
      header: 'Service',
      value: (r) => SERVICE_TYPE_LABELS[r.record.serviceType],
    },
    { key: 'class', header: 'Class', value: (r) => r.group.name, width: 160 },
    { key: 'present', header: 'Present', value: (r) => r.group.count, type: 'number' },
    { key: 'offering', header: 'Offering (₦)', value: (r) => r.group.offering, type: 'number' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Church office</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Attendance
          </h1>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            {pluralise(vault.attendance.length, 'register')} recorded in total
          </p>
        </div>
        <Button icon={CalendarPlus} size="sm" onClick={startNew}>
          Take a register
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Services" value={formatNumber(summary.services)} icon={CalendarCheck} />
        <Stat
          label="Average attendance"
          value={formatNumber(summary.average)}
          icon={Users}
          tone="info"
        />
        <Stat
          label="Visitors"
          value={formatNumber(summary.totalVisitors)}
          icon={Users}
          tone="accent"
        />
        <div className="relative">
          <Stat
            label="Offering"
            value={settings.showOfferings ? formatNairaShort(summary.totalOffering) : '••••••'}
            icon={FileText}
            tone="gold"
            hint={settings.showOfferings ? undefined : 'hidden'}
          />
          <IconButton
            icon={settings.showOfferings ? EyeOff : Eye}
            size="sm"
            label={settings.showOfferings ? 'Hide offering figures' : 'Show offering figures'}
            onClick={() => void updateSettings({ showOfferings: !settings.showOfferings })}
            className="absolute bottom-2 right-2"
          />
        </div>
      </div>

      <Panel bodyClassName="flex flex-wrap items-center gap-2">
        <Select
          label="Period"
          hideLabel
          value={range}
          onChange={(e) => setRange(e.target.value as RangePreset)}
          className="w-full sm:w-44"
          options={[
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
            { value: '6m', label: 'Last 6 months' },
            { value: '12m', label: 'Last 12 months' },
            { value: 'ytd', label: 'This year' },
            { value: 'all', label: 'All time' },
          ]}
        />

        <div className="flex flex-wrap gap-1.5">
          <Chip active={serviceFilter === 'all'} onClick={() => setServiceFilter('all')}>
            All services
          </Chip>
          {SERVICE_OPTIONS.filter((option) =>
            inRange.some((r) => r.serviceType === option.value),
          ).map((option) => (
            <Chip
              key={option.value}
              active={serviceFilter === option.value}
              onClick={() => setServiceFilter(option.value)}
              count={inRange.filter((r) => r.serviceType === option.value).length}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        <span className="flex w-full flex-wrap gap-1.5 sm:ml-auto sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            icon={FileText}
            disabled={filtered.length === 0}
            onClick={() =>
              printDocument({
                title: 'Attendance Register',
                subtitle:
                  serviceFilter === 'all' ? 'All services' : SERVICE_TYPE_LABELS[serviceFilter],
                churchName: content.church.name,
                motto: content.church.motto,
                sections: [
                  {
                    tiles: [
                      { label: 'Services', value: String(summary.services) },
                      { label: 'Average', value: String(summary.average) },
                      { label: 'Visitors', value: String(summary.totalVisitors) },
                      { label: 'Offering', value: formatNaira(summary.totalOffering) },
                    ],
                    columns: [
                      { header: 'Date' },
                      { header: 'Service' },
                      { header: 'Men', align: 'right' },
                      { header: 'Women', align: 'right' },
                      { header: 'Youth', align: 'right' },
                      { header: 'Teens', align: 'right' },
                      { header: 'Children', align: 'right' },
                      { header: 'Visitors', align: 'right' },
                      { header: 'Total', align: 'right' },
                    ],
                    rows: filtered.map((r) => [
                      formatDate(r.date, 'medium'),
                      SERVICE_TYPE_LABELS[r.serviceType],
                      r.counts.men,
                      r.counts.women,
                      r.counts.youth,
                      r.counts.teenagers ?? 0,
                      r.counts.children,
                      r.counts.visitors,
                      attendanceTotal(r),
                    ]),
                  },
                ],
              })
            }
          >
            Print
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={FileSpreadsheet}
            disabled={filtered.length === 0}
            onClick={() => {
              exportExcel(
                [
                  { name: 'Attendance', rows: filtered, columns },
                  // Sunday School is counted by class, so the classes get their
                  // own sheet rather than being flattened into one number.
                  ...(classRows.length > 0
                    ? [{ name: 'Classes', rows: classRows, columns: classColumns }]
                    : []),
                ] as never,
                'fbc-attendance',
                'FBC Agbede Attendance',
              )
              toast.success('Excel file downloaded', 'Registers, and a sheet per class where used.')
            }}
          >
            Excel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => {
              exportCsv(filtered, columns, 'fbc-attendance')
              toast.success('CSV file downloaded')
            }}
          >
            CSV
          </Button>
        </span>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={
            vault.attendance.length === 0 ? 'No registers yet' : 'Nothing recorded in this period'
          }
          description={
            vault.attendance.length === 0
              ? 'Record the head count after the next service. Even counts alone unlock the attendance reports.'
              : 'Widen the period, or choose a different service.'
          }
          action={
            <Button icon={CalendarPlus} onClick={startNew}>
              Take a register
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <TableShell
            caption="Attendance registers"
            head={
              <>
                <Th>Date</Th>
                <Th>Service</Th>
                <Th align="right">Men</Th>
                <Th align="right">Women</Th>
                <Th align="right">Youth</Th>
                <Th align="right">Teens</Th>
                <Th align="right">Children</Th>
                <Th align="right">Visitors</Th>
                <Th align="right">Total</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {page.slice.map((record) => (
              <Tr
                key={record.id}
                onClick={() => setEditing({ draft: toDraft(record), record })}
              >
                <Td>
                  <span className="block font-medium text-ink">
                    {formatDate(record.date, 'medium')}
                  </span>
                  <span className="block text-[0.75rem] text-ink-faint">
                    {formatDate(record.date, 'day')}
                  </span>
                </Td>
                <Td>
                  <span className="block text-[0.8125rem] font-medium text-ink">
                    {record.title || SERVICE_TYPE_LABELS[record.serviceType]}
                  </span>
                  <span className="block text-[0.75rem] text-ink-faint">
                    {departmentName(record.departmentId) ||
                      SERVICE_TYPE_LABELS[record.serviceType]}
                  </span>
                </Td>
                <Td align="right">{record.counts.men || '—'}</Td>
                <Td align="right">{record.counts.women || '—'}</Td>
                <Td align="right">{record.counts.youth || '—'}</Td>
                <Td align="right">{record.counts.teenagers || '—'}</Td>
                <Td align="right">{record.counts.children || '—'}</Td>
                <Td align="right">
                  {record.counts.visitors > 0 ? (
                    <Badge tone="accent">{record.counts.visitors}</Badge>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td align="right">
                  <span className="font-display text-base font-semibold text-ink">
                    {formatNumber(attendanceTotal(record))}
                  </span>
                </Td>
                <Td align="right">
                  <span
                    className="inline-flex gap-0.5"
                    onClick={(event) => event.stopPropagation()}
                    role="presentation"
                  >
                    <IconButton
                      icon={Pencil}
                      size="sm"
                      label={`Edit the ${formatDate(record.date, 'long')} register`}
                      onClick={() => setEditing({ draft: toDraft(record), record })}
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      tone="danger"
                      label={`Delete the ${formatDate(record.date, 'long')} register`}
                      onClick={() => void remove(record)}
                    />
                  </span>
                </Td>
              </Tr>
            ))}
          </TableShell>

          <Pagination
            page={page.page}
            pageCount={page.pageCount}
            onPage={page.setPage}
            from={page.from}
            to={page.to}
            total={page.total}
            unit="registers"
          />
        </div>
      )}

      {editing && (
        <RegisterEditor
          key={editing.record?.id ?? 'new'}
          initial={editing.draft}
          existing={editing.record}
          departments={content.departments}
          showOfferings={settings.showOfferings}
          onToggleOfferings={() => void updateSettings({ showOfferings: !settings.showOfferings })}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      {confirmElement}
    </div>
  )
}

function toDraft(record: AttendanceRecord): Draft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = record
  return rest
}

// ---------------------------------------------------------------------------
// Register editor
// ---------------------------------------------------------------------------

/**
 * Take or edit a register.
 *
 * Head counts only. The church records attendance the way its ushers actually
 * work — a count per bucket, handed in after the service — and those are the
 * same columns it already prints on the bulletin, so the figures line up.
 */
function RegisterEditor({
  initial,
  existing,
  departments,
  showOfferings,
  onToggleOfferings,
  onClose,
  onSave,
}: {
  initial: Draft
  existing?: AttendanceRecord
  departments: { id: string; name: string }[]
  showOfferings: boolean
  onToggleOfferings: () => void
  onClose: () => void
  onSave: (draft: Draft) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const setCount = (key: keyof AttendanceCounts, value: number) =>
    setDraft((current) => ({
      ...current,
      counts: { ...current.counts, [key]: Math.max(0, Math.min(100_000, value)) },
    }))

  const countTotal = sum(Object.values(draft.counts))
  const groupTotal = sum((draft.groups ?? []).map((group) => group.count))

  const submit = async () => {
    setBusy(true)
    try {
      await onSave(draft)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit register' : 'Take a register'}
      description="Head counts for each group, as handed in after the service."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={Save} onClick={submit} loading={busy}>
            Save register
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            required
            value={draft.date}
            max={todayIso()}
            onChange={(e) => set('date', e.target.value)}
          />
          <Select
            label="Service"
            value={draft.serviceType}
            onChange={(e) => set('serviceType', e.target.value as ServiceType)}
            options={SERVICE_OPTIONS}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={draft.title ?? ''}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Harvest Thanksgiving"
            hint="Optional. Defaults to the service name."
          />
          {(draft.serviceType === 'department-meeting' || draft.departmentId) && (
            <Select
              label="Department"
              value={draft.departmentId ?? ''}
              onChange={(e) => set('departmentId', e.target.value || undefined)}
              placeholder="No department"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          )}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {(
            [
              ['men', 'Men'],
              ['women', 'Women'],
              ['youth', 'Youth'],
              ['teenagers', 'Teenagers'],
              ['children', 'Children'],
              ['visitors', 'Visitors'],
            ] as const
          ).map(([key, label]) => (
            <Counter
              key={key}
              label={label}
              value={draft.counts[key]}
              onChange={(next) => setCount(key, next)}
            />
          ))}
        </div>

        {/* Classes belong to Sunday School. Other services are one room, so the
            editor only offers this where it actually applies, or where a
            previous register already used it. */}
        {(draft.serviceType === 'sunday-school' || (draft.groups?.length ?? 0) > 0) && (
        <div className="rounded-lg border border-line bg-sunken/40 p-3.5">
          <ListEditor<AttendanceGroup>
            label="Classes / groups"
            hint="Sunday School meets in separate classes. Record each one's attendance and its own offering."
            items={draft.groups ?? []}
            onChange={(next) => set('groups', next)}
            createItem={() => ({ id: newId('grp'), name: '', count: 0 })}
            addLabel="Add a class"
            emptyLabel="No separate classes, the counts above cover the whole service."
            reorderable={false}
            renderRow={(item, updateItem) => (
              <div className="grid gap-1.5 sm:grid-cols-[1fr_6rem_8rem]">
                <RowInput
                  label="Class name"
                  value={item.name}
                  onChange={(e) => updateItem({ name: e.target.value })}
                />
                <RowInput
                  label="Present"
                  type="number"
                  min={0}
                  value={item.count || ''}
                  onChange={(e) => updateItem({ count: Number(e.target.value) || 0 })}
                />
                <RowInput
                  label="Offering (₦)"
                  type={showOfferings ? 'number' : 'password'}
                  min={0}
                  value={item.offering ?? ''}
                  onChange={(e) =>
                    updateItem({ offering: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            )}
          />

          {(draft.groups?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => set('groups', SUNDAY_SCHOOL_CLASSES.map(seedGroup))}
              className="mt-2 text-[0.75rem] font-semibold text-info underline underline-offset-2"
            >
              Reset to the usual Sunday School classes
            </button>
          )}
          {(draft.groups?.length ?? 0) === 0 && draft.serviceType === 'sunday-school' && (
            <button
              type="button"
              onClick={() => set('groups', SUNDAY_SCHOOL_CLASSES.map(seedGroup))}
              className="mt-2 text-[0.75rem] font-semibold text-info underline underline-offset-2"
            >
              Add the usual Sunday School classes
            </button>
          )}
        </div>
        )}

        <p className="rounded-lg bg-brand/[0.07] px-3 py-2.5 text-center text-[0.875rem] font-semibold text-brand">
          Total present: {formatNumber(countTotal || groupTotal)}
          {groupTotal > 0 && countTotal > 0 && (
            <span className="ml-2 font-normal text-ink-faint">
              ({formatNumber(groupTotal)} across {pluralise(draft.groups?.length ?? 0, 'class', 'classes')})
            </span>
          )}
        </p>

        {/* Offering is money, and this screen gets read over shoulders. */}
        <div className="rounded-lg border border-line bg-sunken/40 p-3.5">
          <div className="flex items-end gap-2">
            <Input
              label="Offering total (₦)"
              type={showOfferings ? 'number' : 'password'}
              inputMode="numeric"
              min={0}
              className="flex-1"
              value={draft.offeringTotal ?? ''}
              onChange={(e) =>
                set('offeringTotal', e.target.value === '' ? undefined : Number(e.target.value))
              }
              hint="Optional. Kept on this device only, and hidden on screen until you show it."
            />
            <IconButton
              icon={showOfferings ? EyeOff : Eye}
              label={showOfferings ? 'Hide offering figures' : 'Show offering figures'}
              onClick={onToggleOfferings}
              className="mb-1"
            />
          </div>
        </div>

        <Textarea
          label="Notes"
          rows={3}
          value={draft.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          maxLength={1000}
          placeholder="Anything worth remembering about this service."
        />
      </div>
    </Modal>
  )
}

/**
 * Number stepper.
 *
 * Ushers count on a phone, often standing up, so the tap targets are large and
 * the value is still directly editable for when someone hands over a slip with
 * the number already on it.
 */
function Counter({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-sunken/40 px-3 py-2">
      <span className="text-[0.875rem] font-medium text-ink">{label}</span>
      <span className="flex items-center gap-1">
        <IconButton
          icon={Minus}
          size="sm"
          label={`One fewer ${label.toLowerCase()}`}
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          aria-label={`${label} present`}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-9 w-16 rounded-lg border border-line-strong bg-surface text-center text-sm font-semibold tabular-nums text-ink focus:border-info focus:outline-none focus:ring-2 focus:ring-info/25"
        />
        <IconButton
          icon={Plus}
          size="sm"
          label={`One more ${label.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
        />
      </span>
    </div>
  )
}
