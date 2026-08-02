import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Cake,
  Droplets,
  FileSpreadsheet,
  FileText,
  Filter,
  Home,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Pagination,
  Panel,
  SearchInput,
  Select,
  SortHeader,
  TableShell,
  Td,
  Th,
  Tr,
  useConfirm,
  usePagination,
  useSort,
  type BadgeTone,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useVault, useVaultData } from '@/context/VaultContext'
import { useDebounced, useDocumentTitle } from '@/hooks'
import { exportCsv, exportExcel, printDocument, type Column } from '@/lib/export'
import type { Family, Member, MembershipStatus } from '@/lib/types'
import { MEMBERSHIP_STATUS_LABELS, ROLE_LABELS } from '@/lib/types'
import {
  ageFrom,
  formatDate,
  fullName,
  initials,
  matchesQuery,
  newId,
  nowIso,
  pluralise,
  sanitiseText,
  toWhatsAppNumber,
} from '@/lib/utils'
import { MemberForm, emptyMember, materialise, toDraft, type MemberDraft } from './MemberForm'

/**
 * The church register.
 *
 * This is the most sensitive screen in the app — it is the entire membership
 * of the church, names, phone numbers and all. It reads from the vault, which
 * only exists in memory while unlocked, and nothing on this page can publish.
 */

type StatusFilter = MembershipStatus | 'all'
type SortKey = 'name' | 'status' | 'joined' | 'age' | 'phone'

export default function MembersPage() {
  useDocumentTitle('Members')

  const { mutate, settings } = useVault()
  const vault = useVaultData()
  const { content } = useContent()
  const toast = useToast()
  const { confirm, confirmElement } = useConfirm()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const search = useDebounced(query)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [departmentId, setDepartmentId] = useState('')
  const [workersOnly, setWorkersOnly] = useState(false)
  const [inactiveShown, setInactiveShown] = useState(false)
  const [familyId, setFamilyId] = useState('')

  const [editing, setEditing] = useState<{ draft: MemberDraft; member?: Member } | null>(null)
  const [viewing, setViewing] = useState<Member | null>(null)
  const [familiesOpen, setFamiliesOpen] = useState(false)

  const departments = content.departments
  const members = vault.members

  // `?new=1` from the dashboard's quick action opens the form straight away.
  useEffect(() => {
    if (params.get('new') !== '1') return
    setEditing({ draft: emptyMember() })
    params.delete('new')
    setParams(params, { replace: true })
  }, [params, setParams])

  const filtered = useMemo(() => {
    return members.filter((member) => {
      if (!inactiveShown && !member.active) return false
      if (status !== 'all' && member.status !== status) return false
      if (departmentId && !member.departmentIds.includes(departmentId)) return false
      if (familyId && member.familyId !== familyId) return false
      if (workersOnly && !member.isWorker) return false
      return matchesQuery(
        search,
        member.firstName,
        member.lastName,
        member.otherNames,
        member.phone,
        member.email,
        member.occupation,
        member.address,
      )
    })
  }, [members, search, status, departmentId, familyId, workersOnly, inactiveShown])

  const { sort, sorted, toggle } = useSort<Member, SortKey>(
    filtered,
    {
      name: (m) => `${m.lastName} ${m.firstName}`.toLowerCase(),
      status: (m) => MEMBERSHIP_STATUS_LABELS[m.status],
      joined: (m) => m.joinedDate ?? '',
      age: (m) => ageFrom(m.dateOfBirth) ?? -1,
      phone: (m) => m.phone ?? '',
    },
    { key: 'name', dir: 'asc' },
  )

  const page = usePagination(sorted, settings.pageSize)

  // Any filter change should land on page one, or the admin sees an empty page.
  useEffect(() => {
    page.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, departmentId, familyId, workersOnly, inactiveShown])

  const departmentName = (id: string) => departments.find((d) => d.id === id)?.name ?? 'Unknown'
  const familyName = (id?: string) =>
    id ? (vault.families.find((f) => f.id === id)?.name ?? '') : ''

  // --- writes --------------------------------------------------------------

  const save = async (draft: MemberDraft) => {
    const existing = editing?.member
    const record = materialise(draft, existing)

    await mutate(
      (current) => ({
        ...current,
        members: existing
          ? current.members.map((m) => (m.id === record.id ? record : m))
          : [...current.members, record],
      }),
      {
        action: existing ? 'update' : 'create',
        entity: 'member',
        entityId: record.id,
        summary: `${existing ? 'Updated' : 'Registered'} ${fullName(record)}.`,
      },
    )

    setEditing(null)
    toast.success(
      existing ? 'Member updated' : 'Member registered',
      `${fullName(record)} is on the church register.`,
    )
  }

  const remove = async (member: Member) => {
    const ok = await confirm({
      title: 'Remove from the register?',
      message: (
        <>
          <strong className="text-ink">{fullName(member)}</strong> will be deleted from this device,
          along with their attendance history. If they have simply moved away, switch them to
          inactive instead, that keeps the record without losing the history.
        </>
      ),
      confirmLabel: 'Delete permanently',
    })
    if (!ok) return

    await mutate(
      (current) => ({
        ...current,
        members: current.members.filter((m) => m.id !== member.id),
      }),
      {
        action: 'delete',
        entity: 'member',
        entityId: member.id,
        summary: `Deleted ${fullName(member)} from the register.`,
      },
    )

    setViewing(null)
    toast.warning('Member deleted', `${fullName(member)} is no longer on the register.`)
  }

  // --- exports -------------------------------------------------------------

  const columns: Column<Member>[] = useMemo(
    () => [
      { key: 'lastName', header: 'Surname', value: (m) => m.lastName },
      { key: 'firstName', header: 'First name', value: (m) => m.firstName },
      { key: 'otherNames', header: 'Other names', value: (m) => m.otherNames },
      { key: 'gender', header: 'Gender', value: (m) => (m.gender === 'male' ? 'Male' : 'Female') },
      { key: 'dob', header: 'Date of birth', value: (m) => m.dateOfBirth, type: 'date' },
      { key: 'age', header: 'Age', value: (m) => ageFrom(m.dateOfBirth), type: 'number' },
      { key: 'phone', header: 'Phone', value: (m) => m.phone },
      { key: 'email', header: 'Email', value: (m) => m.email },
      { key: 'address', header: 'Address', value: (m) => m.address, width: 200 },
      { key: 'status', header: 'Status', value: (m) => MEMBERSHIP_STATUS_LABELS[m.status] },
      { key: 'role', header: 'Role', value: (m) => ROLE_LABELS[m.role] },
      { key: 'worker', header: 'Worker', value: (m) => m.isWorker },
      {
        key: 'departments',
        header: 'Departments',
        value: (m) => m.departmentIds.map(departmentName).join('; '),
        width: 180,
      },
      { key: 'baptised', header: 'Baptised', value: (m) => m.baptised },
      { key: 'baptismDate', header: 'Baptism date', value: (m) => m.baptismDate, type: 'date' },
      { key: 'joined', header: 'Joined', value: (m) => m.joinedDate, type: 'date' },
      { key: 'family', header: 'Family', value: (m) => familyName(m.familyId) },
      { key: 'active', header: 'Active', value: (m) => m.active },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments, vault.families],
  )

  const exportLabel = describeFilters({
    status,
    department: departmentId ? departmentName(departmentId) : '',
    workersOnly,
    search,
  })

  const printDirectory = () => {
    printDocument({
      title: 'Church Member Directory',
      subtitle: exportLabel,
      churchName: content.church.name,
      motto: content.church.motto,
      sections: [
        {
          tiles: [
            { label: 'Members listed', value: String(sorted.length) },
            { label: 'Workers', value: String(sorted.filter((m) => m.isWorker).length) },
            { label: 'Baptised', value: String(sorted.filter((m) => m.baptised).length) },
          ],
          columns: [
            { header: 'Name' },
            { header: 'Gender' },
            { header: 'Phone' },
            { header: 'Status' },
            { header: 'Departments' },
          ],
          rows: sorted.map((m) => [
            fullName(m),
            m.gender === 'male' ? 'M' : 'F',
            m.phone ?? '—',
            MEMBERSHIP_STATUS_LABELS[m.status],
            m.departmentIds.map(departmentName).join(', ') || '—',
          ]),
        },
      ],
      footNote:
        'Confidential church member directory. Contains personal contact details; handle accordingly.',
    })
  }

  const activeFilters =
    (status !== 'all' ? 1 : 0) +
    (departmentId ? 1 : 0) +
    (familyId ? 1 : 0) +
    (workersOnly ? 1 : 0) +
    (inactiveShown ? 1 : 0)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Church office</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Members
          </h1>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            {pluralise(members.length, 'person')} on the register ·{' '}
            {pluralise(members.filter((m) => m.isWorker).length, 'worker')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={UsersRound}
            onClick={() => setFamiliesOpen(true)}
          >
            Families
          </Button>
          <Button icon={UserPlus} size="sm" onClick={() => setEditing({ draft: emptyMember() })}>
            Register member
          </Button>
        </div>
      </header>

      <Panel bodyClassName="space-y-3">
        <div className="flex flex-wrap gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search name, phone, email, address…"
            label="Search members"
            className="min-w-[14rem] flex-1"
          />
          <Select
            label="Status"
            hideLabel
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-full sm:w-48"
            options={[
              { value: 'all', label: 'All statuses' },
              ...(Object.keys(MEMBERSHIP_STATUS_LABELS) as MembershipStatus[]).map((value) => ({
                value,
                label: MEMBERSHIP_STATUS_LABELS[value],
              })),
            ]}
          />
          <Select
            label="Department"
            hideLabel
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full sm:w-48"
            placeholder="All departments"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip active={workersOnly} onClick={() => setWorkersOnly((v) => !v)}>
            Workers only
          </Chip>
          <Chip active={inactiveShown} onClick={() => setInactiveShown((v) => !v)}>
            Include inactive
          </Chip>
          {vault.families.length > 0 && (
            <Select
              label="Family"
              hideLabel
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="w-48"
              placeholder="All families"
              options={vault.families.map((f) => ({ value: f.id, label: f.name }))}
            />
          )}

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => {
                setStatus('all')
                setDepartmentId('')
                setFamilyId('')
                setWorkersOnly(false)
                setInactiveShown(false)
              }}
              className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-ink-faint hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
              Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
            </button>
          )}

          <span className="ml-auto flex flex-wrap gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              icon={FileText}
              onClick={printDirectory}
              disabled={sorted.length === 0}
            >
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={FileSpreadsheet}
              disabled={sorted.length === 0}
              onClick={() => {
                exportExcel([{ name: 'Members', rows: sorted, columns }], 'fbc-members', 'FBC Agbede Members')
                toast.success('Excel file downloaded')
              }}
            >
              Excel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={sorted.length === 0}
              onClick={() => {
                exportCsv(sorted, columns, 'fbc-members')
                toast.success('CSV file downloaded')
              }}
            >
              CSV
            </Button>
          </span>
        </div>
      </Panel>

      {sorted.length === 0 ? (
        <EmptyState
          icon={members.length === 0 ? Users : Filter}
          title={members.length === 0 ? 'The register is empty' : 'Nobody matches those filters'}
          description={
            members.length === 0
              ? 'Register the first member. Everything else builds on this: attendance, reports, birthdays.'
              : 'Try a different search, or clear the filters.'
          }
          action={
            members.length === 0 ? (
              <Button icon={UserPlus} onClick={() => setEditing({ draft: emptyMember() })}>
                Register the first member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <TableShell
            caption="Church members"
            head={
              <>
                <SortHeader label="Name" sortKey="name" sort={sort} onToggle={toggle} />
                <Th align="center">Age</Th>
                <SortHeader label="Phone" sortKey="phone" sort={sort} onToggle={toggle} />
                <SortHeader label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                <Th>Departments</Th>
                <SortHeader label="Joined" sortKey="joined" sort={sort} onToggle={toggle} />
                <Th align="right">Actions</Th>
              </>
            }
          >
            {page.slice.map((member) => (
              <Tr key={member.id} onClick={() => setViewing(member)}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 text-[0.7rem] font-bold text-brand">
                      {initials(member.firstName, member.lastName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{fullName(member)}</span>
                      <span className="block truncate text-[0.75rem] text-ink-faint">
                        {member.isWorker ? 'Worker' : ROLE_LABELS[member.role]}
                        {!member.active && ' · inactive'}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td align="center">{ageFrom(member.dateOfBirth) ?? '—'}</Td>
                <Td>{member.phone || '—'}</Td>
                <Td>
                  <Badge tone={statusTone(member.status)}>
                    {MEMBERSHIP_STATUS_LABELS[member.status]}
                  </Badge>
                </Td>
                <Td>
                  <span className="line-clamp-1 text-[0.8125rem]">
                    {member.departmentIds.map(departmentName).join(', ') || '—'}
                  </span>
                </Td>
                <Td>{member.joinedDate ? formatDate(member.joinedDate, 'medium') : '—'}</Td>
                <Td align="right">
                  <span
                    className="inline-flex gap-0.5"
                    onClick={(event) => event.stopPropagation()}
                    role="presentation"
                  >
                    <IconButton
                      icon={Pencil}
                      size="sm"
                      label={`Edit ${fullName(member)}`}
                      onClick={() => setEditing({ draft: toDraft(member), member })}
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      tone="danger"
                      label={`Delete ${fullName(member)}`}
                      onClick={() => void remove(member)}
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
            unit="members"
          />
        </div>
      )}

      {editing && (
        <MemberForm
          key={editing.member?.id ?? 'new'}
          open
          onClose={() => setEditing(null)}
          onSave={save}
          initial={editing.draft}
          departments={departments}
          families={vault.families}
          title={editing.member ? `Edit ${fullName(editing.member)}` : 'Register a member'}
        />
      )}

      {viewing && (
        <MemberDetail
          member={viewing}
          departmentName={departmentName}
          familyName={familyName(viewing.familyId)}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing({ draft: toDraft(viewing), member: viewing })
            setViewing(null)
          }}
          onDelete={() => void remove(viewing)}
        />
      )}

      <FamiliesModal open={familiesOpen} onClose={() => setFamiliesOpen(false)} />

      {confirmElement}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

function MemberDetail({
  member,
  departmentName,
  familyName,
  onClose,
  onEdit,
  onDelete,
}: {
  member: Member
  departmentName: (id: string) => string
  familyName: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const age = ageFrom(member.dateOfBirth)
  const whatsapp = toWhatsAppNumber(member.phone)

  return (
    <Modal
      open
      onClose={onClose}
      title={fullName(member)}
      description={`${MEMBERSHIP_STATUS_LABELS[member.status]} · ${ROLE_LABELS[member.role]}`}
      size="lg"
      footer={
        <>
          <Button variant="danger" size="sm" icon={Trash2} onClick={onDelete}>
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" icon={Pencil} onClick={onEdit}>
            Edit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {member.isWorker && <Badge tone="brand">Worker</Badge>}
          {member.baptised && <Badge tone="info">Baptised</Badge>}
          {member.bornAgain && <Badge tone="success">Born again</Badge>}
          {!member.active && <Badge tone="warning">Inactive</Badge>}
          {member.leadsDepartmentIds.map((id) => (
            <Badge key={id} tone="gold">
              Leads {departmentName(id)}
            </Badge>
          ))}
        </div>

        <dl className="grid gap-x-6 sm:grid-cols-2">
          <Detail icon={Phone} label="Phone">
            {member.phone ? (
              <span className="flex flex-wrap items-center gap-2">
                <a href={`tel:${member.phone}`} className="text-info hover:underline">
                  {member.phone}
                </a>
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.75rem] font-semibold text-success hover:underline"
                  >
                    WhatsApp
                  </a>
                )}
              </span>
            ) : (
              '—'
            )}
          </Detail>
          <Detail icon={Phone} label="Alternative">
            {member.altPhone || '—'}
          </Detail>
          <Detail icon={Mail} label="Email">
            {member.email ? (
              <a href={`mailto:${member.email}`} className="break-all text-info hover:underline">
                {member.email}
              </a>
            ) : (
              '—'
            )}
          </Detail>
          <Detail icon={Cake} label="Date of birth">
            {member.dateOfBirth
              ? `${formatDate(member.dateOfBirth, 'long')}${age !== null ? ` · ${age} years` : ''}`
              : '—'}
          </Detail>
          <Detail icon={MapPin} label="Address">
            {member.address || '—'}
          </Detail>
          <Detail icon={Users} label="Occupation">
            {member.occupation || '—'}
          </Detail>
          <Detail icon={Home} label="Family">
            {familyName ? `${familyName}${member.familyRole ? ` · ${member.familyRole}` : ''}` : '—'}
          </Detail>
          <Detail icon={Users} label="Marital status">
            <span className="capitalize">{member.maritalStatus}</span>
            {member.weddingAnniversary && ` · ${formatDate(member.weddingAnniversary, 'long')}`}
          </Detail>
          <Detail icon={Droplets} label="Baptism">
            {member.baptised
              ? `${member.baptismDate ? formatDate(member.baptismDate, 'long') : 'Date not recorded'}${
                  member.baptismPlace ? ` · ${member.baptismPlace}` : ''
                }`
              : 'Not baptised'}
          </Detail>
          <Detail icon={Users} label="Joined">
            {member.joinedDate ? formatDate(member.joinedDate, 'long') : '—'}
          </Detail>
        </dl>

        <div>
          <p className="mb-1.5 text-[0.8125rem] font-semibold text-ink">Departments</p>
          {member.departmentIds.length === 0 ? (
            <p className="text-[0.875rem] text-ink-faint">Not assigned to any department.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {member.departmentIds.map((id) => (
                <Badge key={id} tone="neutral">
                  {departmentName(id)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {member.notes && (
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-ink">Pastoral notes</p>
            <p className="whitespace-pre-wrap rounded-lg bg-sunken p-3 text-[0.875rem] leading-relaxed text-ink-soft">
              {member.notes}
            </p>
          </div>
        )}

        <p className="text-[0.75rem] text-ink-faint">
          Registered {formatDate(member.createdAt.slice(0, 10), 'long')} · last updated{' '}
          {formatDate(member.updatedAt.slice(0, 10), 'long')}
        </p>
      </div>
    </Modal>
  )
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 border-b border-line py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-ornament" aria-hidden />
      <dt className="w-28 shrink-0 text-[0.8125rem] font-medium text-ink-faint">{label}</dt>
      <dd className="min-w-0 flex-1 text-[0.875rem] text-ink">{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

function FamiliesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mutate } = useVault()
  const vault = useVaultData()
  const toast = useToast()
  const { confirm, confirmElement } = useConfirm()
  const [name, setName] = useState('')

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const member of vault.members) {
      if (member.familyId) map.set(member.familyId, (map.get(member.familyId) ?? 0) + 1)
    }
    return map
  }, [vault.members])

  const add = async () => {
    const clean = sanitiseText(name, 80)
    if (!clean) return
    const family: Family = {
      id: newId('fam'),
      name: clean,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    await mutate((current) => ({ ...current, families: [...current.families, family] }), {
      action: 'create',
      entity: 'family',
      entityId: family.id,
      summary: `Created the ${clean} family group.`,
    })
    setName('')
    toast.success('Family group created')
  }

  const remove = async (family: Family) => {
    const ok = await confirm({
      title: 'Delete this family group?',
      message: `Members of ${family.name} stay on the register, they simply stop being grouped together.`,
      confirmLabel: 'Delete group',
    })
    if (!ok) return

    await mutate(
      (current) => ({
        ...current,
        families: current.families.filter((f) => f.id !== family.id),
        members: current.members.map((m) =>
          m.familyId === family.id ? { ...m, familyId: undefined, familyRole: undefined } : m,
        ),
      }),
      {
        action: 'delete',
        entity: 'family',
        entityId: family.id,
        summary: `Deleted the ${family.name} family group.`,
      },
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Family groups"
        description="Group households together so the directory reads the way the church actually knows people."
        footer={
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="flex items-end gap-2">
          <Input
            label="New family name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Adeyemi Family"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void add()
              }
            }}
          />
          <Button icon={Plus} onClick={() => void add()} disabled={!name.trim()}>
            Add
          </Button>
        </div>

        {vault.families.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-[0.8125rem] text-ink-faint">
            No family groups yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {vault.families.map((family) => (
              <li key={family.id} className="flex items-center gap-3 py-2.5">
                <Home className="size-4 shrink-0 text-ornament" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-medium text-ink">
                    {family.name}
                  </span>
                  <span className="block text-[0.75rem] text-ink-faint">
                    {pluralise(counts.get(family.id) ?? 0, 'member')}
                  </span>
                </span>
                <IconButton
                  icon={Trash2}
                  size="sm"
                  tone="danger"
                  label={`Delete ${family.name}`}
                  onClick={() => void remove(family)}
                />
              </li>
            ))}
          </ul>
        )}
      </Modal>
      {confirmElement}
    </>
  )
}

// ---------------------------------------------------------------------------

function statusTone(status: MembershipStatus): BadgeTone {
  switch (status) {
    case 'member':
      return 'brand'
    case 'new-convert':
      return 'success'
    case 'visitor':
      return 'info'
    case 'transferred-in':
      return 'gold'
    case 'transferred-out':
    case 'inactive':
      return 'warning'
    case 'deceased':
      return 'neutral'
  }
}

function describeFilters({
  status,
  department,
  workersOnly,
  search,
}: {
  status: StatusFilter
  department: string
  workersOnly: boolean
  search: string
}): string {
  const parts: string[] = []
  if (status !== 'all') parts.push(MEMBERSHIP_STATUS_LABELS[status])
  if (department) parts.push(department)
  if (workersOnly) parts.push('workers only')
  if (search) parts.push(`matching “${search}”`)
  return parts.length ? parts.join(' · ') : 'All members'
}
