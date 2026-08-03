import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  CloudUpload,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UsersRound,
} from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  FileField,
  IconButton,
  Input,
  Modal,
  Panel,
  Select,
  Switch,
  Textarea,
  useConfirm,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useVaultData } from '@/context/VaultContext'
import { useDocumentTitle } from '@/hooks'
import { departmentStats } from '@/lib/stats'
import type { Department } from '@/lib/types'
import { formatNumber, newId, nowIso, pluralise, sanitiseText, slugify } from '@/lib/utils'

/**
 * Departments sit on the *published* side of the line: the church wants the
 * congregation to see that the Choir exists, when it meets and who leads it.
 * The private half — who belongs to it, and their attendance — comes from the
 * vault and is shown here for the office only. It is never written back into
 * the published record.
 */

/** The Baptist units this church actually runs, offered on first setup. */
const STARTER_DEPARTMENTS: {
  key: string
  name: string
  shortName?: string
  summary: string
  accent: Department['accent']
  icon: string
}[] = [
  { key: 'choir', name: 'Choir', summary: 'Leading the congregation in worship through song.', accent: 'vestry', icon: 'music' },
  { key: 'ushers', name: 'Ushers', summary: 'Welcoming, seating and caring for everyone who walks in.', accent: 'gold', icon: 'hand' },
  { key: 'media', name: 'Media', summary: 'Sound, projection and recording of every service.', accent: 'azure', icon: 'video' },
  { key: 'sanctuary-keepers', name: 'Sanctuary Keepers', summary: 'Keeping the house of God clean and ready.', accent: 'vestry', icon: 'sparkles' },
  { key: 'evangelism', name: 'Evangelism', summary: 'Taking the gospel into Agbede and beyond.', accent: 'crimson', icon: 'megaphone' },
  { key: 'children', name: "Children's Department", shortName: 'Children', summary: 'Teaching the youngest members the word of God.', accent: 'azure', icon: 'baby' },
  { key: 'youth', name: 'Youth Fellowship', shortName: 'Youth', summary: 'Discipling young people for a lifetime of faith.', accent: 'crimson', icon: 'users' },
  { key: 'wmu', name: "Women's Missionary Union", shortName: 'WMU', summary: 'The women of the church in mission, prayer and service.', accent: 'gold', icon: 'heart' },
  { key: 'mmu', name: "Men's Missionary Union", shortName: 'MMU', summary: 'The men of the church in mission, prayer and service.', accent: 'vestry', icon: 'shield' },
  { key: 'ra', name: 'Royal Ambassadors', shortName: 'RA', summary: 'Raising boys as ambassadors for Christ.', accent: 'azure', icon: 'flag' },
  { key: 'lydia', name: 'Lydia', summary: 'Young women growing together in faith and service.', accent: 'crimson', icon: 'flower' },
]

const ACCENT_OPTIONS = [
  { value: 'vestry', label: 'Deep blue' },
  { value: 'crimson', label: 'Crimson' },
  { value: 'azure', label: 'Azure' },
  { value: 'gold', label: 'Gold' },
]

const DAY_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
].map((day) => ({ value: day, label: day }))

type Draft = Omit<Department, 'id' | 'createdAt' | 'updatedAt'>

export default function AdminDepartmentsPage() {
  useDocumentTitle('Departments')

  const { content, update, hasUnpublished } = useContent()
  const vault = useVaultData()
  const toast = useToast()
  const { confirm, confirmElement } = useConfirm()

  const [editing, setEditing] = useState<{ draft: Draft; department?: Department } | null>(null)

  const departments = useMemo(
    () => [...content.departments].sort((a, b) => a.order - b.order),
    [content.departments],
  )

  const stats = useMemo(
    () => departmentStats(departments, vault.members, vault.attendance),
    [departments, vault.members, vault.attendance],
  )

  const statFor = (id: string) => stats.find((s) => s.department.id === id)

  const leaderFromRegister = (id: string) => {
    const leader = vault.members.find((m) => m.leadsDepartmentIds.includes(id))
    return leader ? `${leader.firstName} ${leader.lastName}` : ''
  }

  // --- writes --------------------------------------------------------------

  const save = async (draft: Draft) => {
    const existing = editing?.department
    const now = nowIso()
    const record: Department = {
      ...draft,
      name: sanitiseText(draft.name, 80),
      slug: draft.slug || slugify(draft.name),
      summary: sanitiseText(draft.summary, 240),
      description: sanitiseText(draft.description, 4000),
      id: existing?.id ?? newId('dep'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await update('departments', (current) =>
      existing ? current.map((d) => (d.id === record.id ? record : d)) : [...current, record],
    )

    setEditing(null)
    toast.success(
      existing ? 'Department updated' : 'Department added',
      'Publish from the Content page to show this on the church website.',
    )
  }

  const remove = async (department: Department) => {
    const stat = statFor(department.id)
    const ok = await confirm({
      title: `Delete ${department.name}?`,
      message:
        stat && stat.members > 0
          ? `${pluralise(stat.members, 'member')} are assigned to this department. They stay on the register, but lose the assignment.`
          : 'This removes the department from the church website once you publish.',
      confirmLabel: 'Delete department',
    })
    if (!ok) return

    await update('departments', (current) => current.filter((d) => d.id !== department.id))
    toast.warning('Department deleted', 'Publish to remove it from the website.')
  }

  const move = async (department: Department, delta: number) => {
    const index = departments.findIndex((d) => d.id === department.id)
    const target = index + delta
    if (target < 0 || target >= departments.length) return

    const reordered = [...departments]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const renumbered = reordered.map((d, i) => ({ ...d, order: i + 1 }))

    await update('departments', () => renumbered)
  }

  const toggleActive = async (department: Department) => {
    await update('departments', (current) =>
      current.map((d) =>
        d.id === department.id ? { ...d, active: !d.active, updatedAt: nowIso() } : d,
      ),
    )
  }

  const addStarterSet = async () => {
    const now = nowIso()
    const existingKeys = new Set(departments.map((d) => d.key))
    const additions = STARTER_DEPARTMENTS.filter((d) => !existingKeys.has(d.key)).map(
      (starter, index): Department => ({
        id: newId('dep'),
        key: starter.key,
        name: starter.name,
        slug: slugify(starter.name),
        shortName: starter.shortName,
        summary: starter.summary,
        description: '',
        accent: starter.accent,
        icon: starter.icon,
        active: true,
        order: departments.length + index + 1,
        createdAt: now,
        updatedAt: now,
      }),
    )

    if (additions.length === 0) {
      toast.info('Already added', 'Every standard department is already on the list.')
      return
    }

    await update('departments', (current) => [...current, ...additions])
    toast.success(
      `${additions.length} departments added`,
      'Edit each one to add its leader and meeting times.',
    )
  }

  const startNew = () =>
    setEditing({
      draft: {
        key: '',
        name: '',
        slug: '',
        shortName: '',
        summary: '',
        description: '',
        accent: 'vestry',
        icon: 'users',
        meetingDay: '',
        meetingTime: '',
        meetingVenue: '',
        leaderName: '',
        assistantLeaderName: '',
        active: true,
        order: departments.length + 1,
      },
    })

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Church office</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Departments
          </h1>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            {pluralise(departments.length, 'department')} ·{' '}
            {pluralise(departments.filter((d) => d.active).length, 'shown')} on the website
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {departments.length === 0 && (
            <Button variant="secondary" size="sm" icon={Sparkles} onClick={() => void addStarterSet()}>
              Add the standard set
            </Button>
          )}
          <Button icon={Plus} size="sm" onClick={startNew}>
            New department
          </Button>
        </div>
      </header>

      {hasUnpublished && (
        <p className="flex items-center gap-2 rounded-xl border border-ornament/35 bg-ornament/[0.07] px-3.5 py-2.5 text-[0.8125rem] text-ink-soft">
          <CloudUpload className="size-4 shrink-0 text-ornament" aria-hidden />
          Changes are saved on this device.{' '}
          <Link to="/admin/content" className="font-semibold text-ink underline underline-offset-2">
            Publish them
          </Link>{' '}
          to update the church website.
        </p>
      )}

      {departments.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No departments yet"
          description="Add the standard Baptist units. Choir, Ushers, Media, WMU, MMU, RA, Lydia and the rest, then edit each one."
          action={
            <Button icon={Sparkles} onClick={() => void addStarterSet()}>
              Add the standard set
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {departments.map((department, index) => {
            const stat = statFor(department.id)
            const registerLeader = leaderFromRegister(department.id)

            return (
              <li key={department.id}>
                <div className="card-chapel flex flex-wrap items-center gap-3 p-3.5 sm:flex-nowrap">
                  <span className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => void move(department, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${department.name} up`}
                      className="grid size-5 place-items-center rounded text-ink-faint hover:bg-sunken hover:text-ink disabled:opacity-25"
                    >
                      <ChevronDown className="size-3.5 rotate-180" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(department, 1)}
                      disabled={index === departments.length - 1}
                      aria-label={`Move ${department.name} down`}
                      className="grid size-5 place-items-center rounded text-ink-faint hover:bg-sunken hover:text-ink disabled:opacity-25"
                    >
                      <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                  </span>

                  <span className={accentChip(department.accent)} aria-hidden>
                    <UsersRound className="size-4.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-display text-[0.9375rem] font-semibold text-ink">
                        {department.name}
                      </span>
                      {!department.active && <Badge tone="warning">Hidden</Badge>}
                      {department.shortName && department.shortName !== department.name && (
                        <Badge tone="neutral">{department.shortName}</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[0.8125rem] text-ink-faint">
                      {department.summary || 'No summary yet.'}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-ink-faint">
                      <span>{formatNumber(stat?.members ?? 0)} members</span>
                      <span>{formatNumber(stat?.workers ?? 0)} workers</span>
                      {stat && stat.meetings > 0 && (
                        <span>avg {formatNumber(stat.averageAttendance)} at meetings</span>
                      )}
                      {department.meetingDay && (
                        <span>
                          {department.meetingDay}
                          {department.meetingTime ? ` · ${department.meetingTime}` : ''}
                        </span>
                      )}
                      <span>
                        Leader:{' '}
                        {department.leaderName || registerLeader || (
                          <span className="italic">not set</span>
                        )}
                      </span>
                    </p>
                  </div>

                  <span className="flex shrink-0 gap-0.5">
                    <IconButton
                      icon={department.active ? Eye : EyeOff}
                      size="sm"
                      label={
                        department.active
                          ? `Hide ${department.name} from the website`
                          : `Show ${department.name} on the website`
                      }
                      onClick={() => void toggleActive(department)}
                    />
                    <IconButton
                      icon={Pencil}
                      size="sm"
                      label={`Edit ${department.name}`}
                      onClick={() =>
                        setEditing({ draft: toDraft(department), department })
                      }
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      tone="danger"
                      label={`Delete ${department.name}`}
                      onClick={() => void remove(department)}
                    />
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {departments.length > 0 && (
        <Panel
          title="Assigning people"
          description="Membership of a department is private, so it is set on the member record rather than here."
          icon={UsersRound}
        >
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">
            Open a member under{' '}
            <Link to="/admin/members" className="font-semibold text-info hover:underline">
              Members
            </Link>{' '}
            and tick their departments on the “Church life” tab. Mark one as <strong>Leads</strong>{' '}
            and they become that department’s leader in the office view. The leader name shown on
            the public website is set separately, in the department editor, so the church can
            publish a title without publishing a person’s record.
          </p>
        </Panel>
      )}

      {editing && (
        <DepartmentEditor
          key={editing.department?.id ?? 'new'}
          initial={editing.draft}
          existing={editing.department}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      {confirmElement}
    </div>
  )
}

function toDraft(department: Department): Draft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = department
  return rest
}

function accentChip(accent: Department['accent']): string {
  const base = 'grid size-10 shrink-0 place-items-center rounded-lg '
  switch (accent) {
    case 'crimson':
      return `${base}bg-accent/10 text-accent`
    case 'azure':
      return `${base}bg-info/10 text-info`
    case 'gold':
      return `${base}bg-ornament/12 text-ornament`
    default:
      return `${base}bg-brand/10 text-brand`
  }
}

// ---------------------------------------------------------------------------

function DepartmentEditor({
  initial,
  existing,
  onClose,
  onSave,
}: {
  initial: Draft
  existing?: Department
  onClose: () => void
  onSave: (draft: Draft) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    if (!draft.name.trim()) {
      setError('A department needs a name.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSave({
        ...draft,
        key: draft.key || slugify(draft.name),
        slug: draft.slug || slugify(draft.name),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : 'New department'}
      description="This is published to the church website. Do not put personal phone numbers here."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={Save} onClick={submit} loading={busy}>
            Save department
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Input
            label="Name"
            required
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            error={error ?? undefined}
            placeholder="e.g. Women’s Missionary Union"
          />
          <Input
            label="Short name"
            value={draft.shortName ?? ''}
            onChange={(e) => set('shortName', e.target.value)}
            placeholder="e.g. WMU"
          />
        </div>

        <Textarea
          label="Summary"
          rows={2}
          maxLength={240}
          showCount
          value={draft.summary}
          onChange={(e) => set('summary', e.target.value)}
          hint="One sentence, shown on the departments page."
        />

        <Textarea
          label="Full description"
          rows={6}
          maxLength={4000}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          hint="Shown on the department's own page. Blank lines start new paragraphs."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Leader (public name)"
            value={draft.leaderName ?? ''}
            onChange={(e) => set('leaderName', e.target.value)}
            hint="A name and title only, no phone numbers."
            placeholder="e.g. Deaconess Grace Adeyemi"
          />
          <Input
            label="Assistant leader"
            value={draft.assistantLeaderName ?? ''}
            onChange={(e) => set('assistantLeaderName', e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Meeting day"
            value={draft.meetingDay ?? ''}
            onChange={(e) => set('meetingDay', e.target.value)}
            placeholder="Not fixed"
            options={DAY_OPTIONS}
          />
          <Input
            label="Meeting time"
            type="time"
            value={draft.meetingTime ?? ''}
            onChange={(e) => set('meetingTime', e.target.value)}
          />
          <Input
            label="Venue"
            value={draft.meetingVenue ?? ''}
            onChange={(e) => set('meetingVenue', e.target.value)}
            placeholder="e.g. Church auditorium"
          />
        </div>

        <FileField
          label="Department picture"
          folder="departments"
          accept="image/*"
          value={draft.image ?? ''}
          onChange={(next) => set('image', next || undefined)}
          hint="Shown on the departments page. A photograph says more than a summary."
        />

        <Select
          label="Card colour"
          value={draft.accent}
          onChange={(e) => set('accent', e.target.value as Department['accent'])}
          options={ACCENT_OPTIONS}
          className="sm:max-w-xs"
        />

        <Switch
          label="Show on the church website"
          description="Turn off to keep a department on file without publishing it."
          checked={draft.active}
          onChange={(next) => set('active', next)}
        />
      </div>
    </Modal>
  )
}
