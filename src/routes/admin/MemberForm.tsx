import { useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Switch,
  Textarea,
  type SelectOption,
} from '@/components/ui'
import type {
  AgeGroup,
  Department,
  Family,
  MaritalStatus,
  Member,
  MembershipStatus,
  Role,
} from '@/lib/types'
import { MEMBERSHIP_STATUS_LABELS, ROLE_LABELS, ROLE_ORDER } from '@/lib/types'
import { isValidEmail, isValidPhone, newId, nowIso, sanitiseText, todayIso } from '@/lib/utils'

/**
 * Register a member, or edit one.
 *
 * The form is deliberately forgiving: in a real church register almost nothing
 * is known on day one. Only a first and last name are required — every other
 * field can be filled in as it becomes known, which is what actually happens
 * when a visitor gradually becomes a member.
 */

export type MemberDraft = Omit<Member, 'id' | 'createdAt' | 'updatedAt'>

const STATUS_OPTIONS: SelectOption[] = (
  Object.keys(MEMBERSHIP_STATUS_LABELS) as MembershipStatus[]
).map((value) => ({ value, label: MEMBERSHIP_STATUS_LABELS[value] }))

const ROLE_OPTIONS: SelectOption[] = ROLE_ORDER.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}))

const AGE_GROUP_OPTIONS: SelectOption[] = [
  { value: 'child', label: 'Child (0–12)' },
  { value: 'teen', label: 'Teenager (13–17)' },
  { value: 'youth', label: 'Youth (18–35)' },
  { value: 'adult', label: 'Adult (36–59)' },
  { value: 'senior', label: 'Senior (60+)' },
]

const MARITAL_OPTIONS: SelectOption[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
  { value: 'divorced', label: 'Divorced' },
]

const FAMILY_ROLE_OPTIONS: SelectOption[] = [
  { value: 'head', label: 'Head of the family' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'dependant', label: 'Dependant' },
  { value: 'other', label: 'Other' },
]

export function emptyMember(): MemberDraft {
  return {
    firstName: '',
    lastName: '',
    otherNames: '',
    gender: 'male',
    dateOfBirth: '',
    ageGroup: 'adult',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    occupation: '',
    maritalStatus: 'single',
    weddingAnniversary: '',
    familyId: '',
    familyRole: 'other',
    status: 'member',
    joinedDate: todayIso(),
    role: 'member',
    isWorker: false,
    workerSince: '',
    departmentIds: [],
    leadsDepartmentIds: [],
    baptised: false,
    baptismDate: '',
    baptismPlace: '',
    bornAgain: false,
    conversionDate: '',
    notes: '',
    active: true,
  }
}

/** Strip a stored member back to an editable draft. */
export function toDraft(member: Member): MemberDraft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = member
  return rest
}

type Errors = Partial<Record<'firstName' | 'lastName' | 'phone' | 'email' | 'dateOfBirth', string>>

export function MemberForm({
  open,
  onClose,
  onSave,
  initial,
  departments,
  families,
  title,
}: {
  open: boolean
  onClose: () => void
  onSave: (draft: MemberDraft) => Promise<void> | void
  initial: MemberDraft
  departments: Department[]
  families: Family[]
  title: string
}) {
  const [draft, setDraft] = useState<MemberDraft>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [section, setSection] = useState<'personal' | 'church' | 'family'>('personal')

  // Re-seed whenever a different member is opened. Keyed by the caller via
  // `key`, so this only runs on a genuine change of subject.
  const seeded = useMemo(() => initial, [initial])
  const [seedRef, setSeedRef] = useState(seeded)
  if (seedRef !== seeded) {
    setSeedRef(seeded)
    setDraft(seeded)
    setErrors({})
    setSection('personal')
  }

  const set = <K extends keyof MemberDraft>(key: K, value: MemberDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const toggleDepartment = (departmentId: string) =>
    setDraft((current) => {
      const has = current.departmentIds.includes(departmentId)
      return {
        ...current,
        departmentIds: has
          ? current.departmentIds.filter((id) => id !== departmentId)
          : [...current.departmentIds, departmentId],
        // Leading a department you are no longer in makes no sense.
        leadsDepartmentIds: has
          ? current.leadsDepartmentIds.filter((id) => id !== departmentId)
          : current.leadsDepartmentIds,
      }
    })

  const toggleLeads = (departmentId: string) =>
    setDraft((current) => ({
      ...current,
      leadsDepartmentIds: current.leadsDepartmentIds.includes(departmentId)
        ? current.leadsDepartmentIds.filter((id) => id !== departmentId)
        : [...current.leadsDepartmentIds, departmentId],
      departmentIds: current.departmentIds.includes(departmentId)
        ? current.departmentIds
        : [...current.departmentIds, departmentId],
    }))

  const validate = (): Errors => {
    const next: Errors = {}
    if (!draft.firstName.trim()) next.firstName = 'A first name is needed.'
    if (!draft.lastName.trim()) next.lastName = 'A surname is needed.'
    if (draft.phone && !isValidPhone(draft.phone)) {
      next.phone = 'Use a Nigerian number like 0803 123 4567, or an international one.'
    }
    if (draft.email && !isValidEmail(draft.email)) next.email = 'That email address is not valid.'
    if (draft.dateOfBirth && draft.dateOfBirth > todayIso()) {
      next.dateOfBirth = 'A date of birth cannot be in the future.'
    }
    return next
  }

  const submit = async () => {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Send the admin to the tab that actually holds the problem.
      setSection(found.firstName || found.lastName || found.phone || found.email ? 'personal' : 'church')
      return
    }

    setBusy(true)
    try {
      await onSave(cleanDraft(draft))
    } finally {
      setBusy(false)
    }
  }

  const familyOptions: SelectOption[] = [
    ...families.map((family) => ({ value: family.id, label: family.name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Everything here stays on this device, encrypted. It is never published."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={Save} onClick={submit} loading={busy}>
            Save member
          </Button>
        </>
      }
    >
      <div
        role="tablist"
        aria-label="Member details"
        className="mb-5 flex gap-1 rounded-lg border border-line bg-sunken p-0.5"
      >
        {(
          [
            ['personal', 'Personal'],
            ['church', 'Church life'],
            ['family', 'Family & notes'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={
              section === key
                ? 'flex-1 rounded-[0.4rem] bg-surface px-3 py-2 text-[0.8125rem] font-semibold text-ink shadow-pew'
                : 'flex-1 rounded-[0.4rem] px-3 py-2 text-[0.8125rem] font-medium text-ink-faint hover:text-ink'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'personal' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              required
              value={draft.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              error={errors.firstName}
              autoComplete="off"
            />
            <Input
              label="Surname"
              required
              value={draft.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              error={errors.lastName}
              autoComplete="off"
            />
          </div>

          <Input
            label="Other names"
            value={draft.otherNames ?? ''}
            onChange={(e) => set('otherNames', e.target.value)}
            autoComplete="off"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Gender"
              value={draft.gender}
              onChange={(e) => set('gender', e.target.value as Member['gender'])}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
            />
            <Select
              label="Age group"
              value={draft.ageGroup}
              onChange={(e) => set('ageGroup', e.target.value as AgeGroup)}
              options={AGE_GROUP_OPTIONS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date of birth"
              type="date"
              value={draft.dateOfBirth ?? ''}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              error={errors.dateOfBirth}
              hint="Used for birthday reminders. Leave blank if unknown."
            />
            <Input
              label="Occupation"
              value={draft.occupation ?? ''}
              onChange={(e) => set('occupation', e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              type="tel"
              inputMode="tel"
              value={draft.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              error={errors.phone}
              placeholder="0803 123 4567"
            />
            <Input
              label="Alternative phone"
              type="tel"
              inputMode="tel"
              value={draft.altPhone ?? ''}
              onChange={(e) => set('altPhone', e.target.value)}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={draft.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
          />

          <Textarea
            label="Home address"
            rows={2}
            value={draft.address ?? ''}
            onChange={(e) => set('address', e.target.value)}
          />
        </div>
      )}

      {section === 'church' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Membership status"
              value={draft.status}
              onChange={(e) => set('status', e.target.value as MembershipStatus)}
              options={STATUS_OPTIONS}
            />
            <Input
              label="Joined the church"
              type="date"
              value={draft.joinedDate ?? ''}
              onChange={(e) => set('joinedDate', e.target.value)}
              hint="Drives the membership growth report."
            />
          </div>

          <Select
            label="Role"
            value={draft.role}
            onChange={(e) => set('role', e.target.value as Role)}
            options={ROLE_OPTIONS}
            hint="What this person is within the church. It does not grant access to this app."
          />

          <div className="rounded-lg border border-line bg-sunken/40 p-3.5">
            <Switch
              label="Serving as a worker"
              description="Workers appear in worker meeting registers and department reports."
              checked={draft.isWorker}
              onChange={(next) => set('isWorker', next)}
            />
            {draft.isWorker && (
              <Input
                className="mt-3"
                label="Worker since"
                type="date"
                value={draft.workerSince ?? ''}
                onChange={(e) => set('workerSince', e.target.value)}
              />
            )}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-[0.8125rem] font-semibold text-ink">Departments</legend>
            <p className="mb-2 text-[0.75rem] text-ink-faint">
              Tick each department this person belongs to. Use the star to mark one they lead.
            </p>
            {departments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-[0.8125rem] text-ink-faint">
                No departments yet, add them under Departments.
              </p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {departments.map((department) => {
                  const belongs = draft.departmentIds.includes(department.id)
                  const leads = draft.leadsDepartmentIds.includes(department.id)
                  return (
                    <li
                      key={department.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2"
                    >
                      <Checkbox
                        label={department.name}
                        checked={belongs}
                        onChange={() => toggleDepartment(department.id)}
                      />
                      <button
                        type="button"
                        onClick={() => toggleLeads(department.id)}
                        aria-pressed={leads}
                        aria-label={`${leads ? 'Remove' : 'Set'} as leader of ${department.name}`}
                        title="Leads this department"
                        className={
                          leads
                            ? 'shrink-0 rounded-md bg-ornament/15 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-ornament'
                            : 'shrink-0 rounded-md px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-ink-faint hover:bg-sunken'
                        }
                      >
                        Leads
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </fieldset>

          <div className="rounded-lg border border-line bg-sunken/40 p-3.5 space-y-3">
            <Switch
              label="Born again"
              checked={Boolean(draft.bornAgain)}
              onChange={(next) => set('bornAgain', next)}
            />
            {draft.bornAgain && (
              <Input
                label="Date of conversion"
                type="date"
                value={draft.conversionDate ?? ''}
                onChange={(e) => set('conversionDate', e.target.value)}
              />
            )}

            <Switch
              label="Baptised by immersion"
              checked={draft.baptised}
              onChange={(next) => set('baptised', next)}
            />
            {draft.baptised && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Baptism date"
                  type="date"
                  value={draft.baptismDate ?? ''}
                  onChange={(e) => set('baptismDate', e.target.value)}
                />
                <Input
                  label="Baptism place"
                  value={draft.baptismPlace ?? ''}
                  onChange={(e) => set('baptismPlace', e.target.value)}
                  placeholder="e.g. FBC Agbede"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'family' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Marital status"
              value={draft.maritalStatus}
              onChange={(e) => set('maritalStatus', e.target.value as MaritalStatus)}
              options={MARITAL_OPTIONS}
            />
            {draft.maritalStatus === 'married' && (
              <Input
                label="Wedding anniversary"
                type="date"
                value={draft.weddingAnniversary ?? ''}
                onChange={(e) => set('weddingAnniversary', e.target.value)}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Family"
              value={draft.familyId ?? ''}
              onChange={(e) => set('familyId', e.target.value)}
              options={familyOptions}
              placeholder="Not in a family group"
              hint="Family groups keep households together in the directory."
            />
            {draft.familyId && (
              <Select
                label="Role in the family"
                value={draft.familyRole ?? 'other'}
                onChange={(e) => set('familyRole', e.target.value as Member['familyRole'])}
                options={FAMILY_ROLE_OPTIONS}
              />
            )}
          </div>

          <Textarea
            label="Pastoral notes"
            rows={5}
            value={draft.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            maxLength={2000}
            showCount
            hint="Private to this device. Write only what the church would be comfortable being read back."
          />

          <Switch
            label="Active on the register"
            description="Turn off for people who have moved away, without deleting their history."
            checked={draft.active}
            onChange={(next) => set('active', next)}
          />
        </div>
      )}
    </Modal>
  )
}

/** Trim, clamp and drop empty optional fields so the vault stays tidy. */
function cleanDraft(draft: MemberDraft): MemberDraft {
  const text = (value?: string, max = 200) => {
    const cleaned = sanitiseText(value ?? '', max)
    return cleaned || undefined
  }

  return {
    ...draft,
    firstName: sanitiseText(draft.firstName, 60),
    lastName: sanitiseText(draft.lastName, 60),
    otherNames: text(draft.otherNames, 60),
    phone: text(draft.phone, 24),
    altPhone: text(draft.altPhone, 24),
    email: text(draft.email, 120),
    address: text(draft.address, 300),
    occupation: text(draft.occupation, 80),
    baptismPlace: text(draft.baptismPlace, 120),
    notes: text(draft.notes, 2000),
    dateOfBirth: draft.dateOfBirth || undefined,
    weddingAnniversary: draft.weddingAnniversary || undefined,
    joinedDate: draft.joinedDate || undefined,
    workerSince: draft.isWorker ? draft.workerSince || undefined : undefined,
    baptismDate: draft.baptised ? draft.baptismDate || undefined : undefined,
    conversionDate: draft.bornAgain ? draft.conversionDate || undefined : undefined,
    familyId: draft.familyId || undefined,
    familyRole: draft.familyId ? draft.familyRole : undefined,
  }
}

/** Build a storable record from a draft. */
export function materialise(draft: MemberDraft, existing?: Member): Member {
  const now = nowIso()
  return {
    ...draft,
    id: existing?.id ?? newId('mem'),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}
