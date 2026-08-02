import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Github,
  HardDriveDownload,
  KeyRound,
  Link2Off,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
} from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Panel,
  Select,
  Switch,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useVault, useVaultData } from '@/context/VaultContext'
import { useDocumentTitle, useOnline } from '@/hooks'
import { assessPassphrase } from '@/lib/crypto'
import {
  GitHubError,
  inferRepoFromLocation,
  looksLikeToken,
  maskToken,
  rateLimit,
  verifyAccess,
} from '@/lib/github'
import type { GitHubSettings, Role } from '@/lib/types'
import { ROLE_LABELS, ROLE_ORDER } from '@/lib/types'
import {
  formatDate,
  formatDateTime,
  formatNumber,
  nowIso,
  pluralise,
  relativeTime,
} from '@/lib/utils'

/**
 * Settings: publishing, backups, security and the audit trail.
 *
 * These are the operations that can lose or expose the church's records, so
 * every one of them says plainly what it does before it does it — and the two
 * irreversible ones (erase, replace-on-restore) require typing a phrase.
 */
export default function SettingsPage() {
  useDocumentTitle('Settings')

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="eyebrow">Church office</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-[0.875rem] text-ink-soft">
          Publishing, backups and the security of the records on this device.
        </p>
      </header>

      <AdminIdentityPanel />
      <BackupPanel />
      <GitHubPanel />
      <SecurityPanel />
      <PreferencesPanel />
      <AuditPanel />
      <DangerPanel />
    </div>
  )
}

// ---------------------------------------------------------------------------

function AdminIdentityPanel() {
  const { data, mutate } = useVault()
  const toast = useToast()
  const [name, setName] = useState(data?.admin?.name ?? '')
  const [role, setRole] = useState<Role>(data?.admin?.role ?? 'church-admin')
  const [busy, setBusy] = useState(false)

  const dirty = name !== (data?.admin?.name ?? '') || role !== (data?.admin?.role ?? 'church-admin')

  const save = async () => {
    setBusy(true)
    try {
      await mutate(
        (current) => ({ ...current, admin: { name: name.trim() || 'Church Administrator', role } }),
        { action: 'update', entity: 'settings', summary: 'Updated the administrator profile.' },
      )
      toast.success('Profile saved')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="Who is using this device"
      description="Recorded against every change in the audit trail. Never published."
      icon={UserCog}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Your role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={ROLE_ORDER.map((value) => ({ value, label: ROLE_LABELS[value] }))}
          />
        </div>
        <Button size="sm" onClick={save} loading={busy} disabled={!dirty}>
          Save profile
        </Button>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------

function BackupPanel() {
  const { backup, restore, settings, updateSettings } = useVault()
  const vault = useVaultData()
  const toast = useToast()

  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [confirming, setConfirming] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  /** Held locally so typing "3" on the way to "30" does not save a 3-day cycle. */
  const [reminderDays, setReminderDays] = useState(String(settings.backupReminderDays))
  useEffect(() => setReminderDays(String(settings.backupReminderDays)), [settings.backupReminderDays])

  const dueAt = settings.lastBackupAt
    ? new Date(settings.lastBackupAt).getTime() + settings.backupReminderDays * 86_400_000
    : 0
  const overdue = vault.members.length > 0 && (!settings.lastBackupAt || Date.now() > dueAt)
  const nextReminder = dueAt ? new Date(dueAt) : new Date()

  const runBackup = async () => {
    setBusy(true)
    try {
      await backup()
      toast.success('Backup saved', 'Keep it somewhere safe — it needs the vault passphrase to open.')
    } catch (error) {
      toast.error('Backup failed', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const runRestore = async () => {
    if (!file) return
    setBusy(true)
    try {
      await restore(file, passphrase, mode)
      setFile(null)
      setPassphrase('')
      if (fileInput.current) fileInput.current.value = ''
      toast.success(
        mode === 'merge' ? 'Backup merged' : 'Backup restored',
        mode === 'merge' ? 'Newer records won where they clashed.' : 'This device now matches the backup.',
      )
    } catch (error) {
      toast.error('Restore failed', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <>
      <Panel
        title="Backups"
        description="The only copy of the church register is on this device. A backup is the safety net."
        icon={HardDriveDownload}
        action={
          overdue ? (
            <Badge tone="warning">Overdue</Badge>
          ) : settings.lastBackupAt ? (
            <Badge tone="success">Up to date</Badge>
          ) : undefined
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.875rem] text-ink-soft">
              {settings.lastBackupAt
                ? `Last backup ${relativeTime(settings.lastBackupAt)} · ${formatDateTime(settings.lastBackupAt)}`
                : 'No backup has been taken on this device.'}
              <span className="mt-0.5 block text-[0.75rem] text-ink-faint">
                {pluralise(vault.members.length, 'member')} ·{' '}
                {pluralise(vault.attendance.length, 'register')} ·{' '}
                {pluralise(vault.audit.length, 'audit entry', 'audit entries')}
              </span>
            </p>
            <Button icon={Download} onClick={runBackup} loading={busy}>
              Download backup
            </Button>
          </div>

          <div className="rounded-lg border border-line bg-sunken/40 p-3.5">
            <p className="mb-3 text-[0.8125rem] font-semibold text-ink">Restore from a backup</p>
            <input
              ref={fileInput}
              type="file"
              accept=".fbcvault,application/json"
              aria-label="Backup file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-line-strong bg-surface p-2 text-[0.8125rem] file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-[0.8125rem] file:font-semibold file:text-on-brand"
            />

            {file && (
              <div className="mt-3 space-y-3">
                <Input
                  label="Passphrase the backup was saved with"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoComplete="off"
                />
                <Select
                  label="How to apply it"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'merge' | 'replace')}
                  options={[
                    { value: 'merge', label: 'Merge — keep both, newest wins' },
                    { value: 'replace', label: 'Replace — wipe this device first' },
                  ]}
                  hint={
                    mode === 'merge'
                      ? 'Use this when two people have been entering records on different devices.'
                      : 'Everything currently on this device is discarded.'
                  }
                />
                <Button
                  icon={Upload}
                  variant={mode === 'replace' ? 'danger' : 'primary'}
                  onClick={() => (mode === 'replace' ? setConfirming(true) : void runRestore())}
                  loading={busy}
                  disabled={!passphrase}
                >
                  {mode === 'replace' ? 'Replace everything' : 'Merge this backup'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Remind me to back up every"
              type="number"
              min={1}
              max={365}
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              onBlur={() => {
                const days = Math.min(365, Math.max(1, Number(reminderDays) || 14))
                setReminderDays(String(days))
                void updateSettings({ backupReminderDays: days })
              }}
              hint="Days between reminders."
              className="w-40"
            />
            <p className="pb-2 text-[0.8125rem] text-ink-soft">
              {vault.members.length === 0 ? (
                <>Reminders start once there are records worth losing.</>
              ) : overdue ? (
                <span className="font-semibold text-warning">A backup is due now.</span>
              ) : (
                <>
                  Next reminder{' '}
                  <strong className="text-ink">{formatDate(nextReminder, 'long')}</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={runRestore}
        title="Replace everything on this device?"
        message="Every member, register and audit entry currently held here is discarded and replaced with the contents of the backup. This cannot be undone."
        confirmLabel="Replace everything"
        requirePhrase="REPLACE"
        busy={busy}
      />
    </>
  )
}

// ---------------------------------------------------------------------------

function GitHubPanel() {
  const { data, setGitHub } = useVault()
  const { refresh } = useContent()
  const toast = useToast()
  const online = useOnline()

  const existing = data?.github
  const inferred = useMemo(() => inferRepoFromLocation(), [])

  const [owner, setOwner] = useState(existing?.owner ?? inferred.owner ?? '')
  const [repo, setRepo] = useState(existing?.repo ?? inferred.repo ?? '')
  const [branch, setBranch] = useState(existing?.branch ?? inferred.branch ?? 'main')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setOwner(existing.owner)
    setRepo(existing.repo)
    setBranch(existing.branch)
  }, [existing])

  const connect = async () => {
    setError(null)
    setStatus(null)

    const trimmed = token.trim() || existing?.token || ''
    if (!trimmed) {
      setError('Paste a personal access token to connect.')
      return
    }
    if (!looksLikeToken(trimmed)) {
      setError('That does not look like a GitHub token. Fine-grained tokens start with github_pat_.')
      return
    }

    setBusy(true)
    try {
      const access = await verifyAccess(trimmed, { owner: owner.trim(), repo: repo.trim(), branch })

      if (!access.canWrite) {
        setError(
          `Connected as ${access.identity.login}, but that token cannot write to this repository. It needs Contents: read and write.`,
        )
        return
      }

      const settings: GitHubSettings = {
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || access.defaultBranch,
        token: trimmed,
        verifiedLogin: access.identity.login,
        verifiedAt: nowIso(),
      }

      await setGitHub(settings)
      setToken('')
      setStatus(`Connected as ${access.identity.login}.`)
      toast.success('GitHub connected', 'Content can now be published straight from this device.')

      if (access.private) {
        toast.warning(
          'That repository is private',
          'GitHub Pages will not serve a private repository on the free plan.',
        )
      }

      const limit = await rateLimit(trimmed).catch(() => null)
      if (limit) setQuota(`${formatNumber(limit.remaining)} API calls left this hour.`)
    } catch (err) {
      setError(
        err instanceof GitHubError
          ? [err.message, err.hint].filter(Boolean).join(' ')
          : err instanceof Error
            ? err.message
            : 'Could not reach GitHub.',
      )
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    await setGitHub(undefined)
    setToken('')
    setStatus(null)
    toast.info('Disconnected', 'Edits stay on this device until you connect again.')
  }

  return (
    <Panel
      title="Publishing to the church website"
      description="The app commits content straight to the church's GitHub repository. No server, no hosting bill."
      icon={Github}
      action={existing ? <Badge tone="success">Connected</Badge> : <Badge tone="neutral">Not set up</Badge>}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="church-github-user" />
          <Input label="Repository" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="fbc-agbede" />
          <Input label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
        </div>

        <Input
          label="Personal access token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          placeholder={existing ? maskToken(existing.token) : 'github_pat_…'}
          hint={
            existing
              ? 'Leave blank to keep the token already saved.'
              : 'A fine-grained token, scoped to this one repository, with Contents: read and write.'
          }
        />

        <div className="rounded-lg border border-line bg-sunken/40 p-3.5">
          <p className="text-[0.8125rem] font-semibold text-ink">How to make the token</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[0.8125rem] leading-relaxed text-ink-soft">
            <li>
              Open{' '}
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-info hover:underline"
              >
                GitHub → fine-grained tokens <ExternalLink className="inline size-3" aria-hidden />
              </a>
            </li>
            <li>Repository access → Only select repositories → this church repository</li>
            <li>Permissions → Repository permissions → Contents → Read and write</li>
            <li>Generate, copy once, and paste it above</li>
          </ol>
          <p className="mt-2 flex items-start gap-1.5 text-[0.75rem] leading-snug text-ink-faint">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
            The token is stored inside the encrypted vault, never in plain browser storage, and is
            never written into a published file.
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-[0.8125rem] font-medium text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {status && (
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-[0.8125rem] font-medium text-success">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {status}
            {quota && <span className="font-normal text-ink-faint">{quota}</span>}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button icon={Github} onClick={connect} loading={busy} disabled={!online || !owner || !repo}>
            {existing ? 'Re-check connection' : 'Connect'}
          </Button>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={async () => {
              await refresh()
              toast.success('Reloaded the published content')
            }}
          >
            Reload live content
          </Button>
          {existing && (
            <Button variant="ghost" icon={Link2Off} onClick={disconnect}>
              Disconnect
            </Button>
          )}
        </div>

        {existing?.verifiedAt && (
          <p className="text-[0.75rem] text-ink-faint">
            Last verified {relativeTime(existing.verifiedAt)} as {existing.verifiedLogin} · token{' '}
            {maskToken(existing.token)}
          </p>
        )}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------

function SecurityPanel() {
  const { changePassphrase, lock } = useVault()
  const toast = useToast()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = assessPassphrase(next)

  const submit = async () => {
    setError(null)
    if (!strength.acceptable) {
      setError('Choose a stronger passphrase — it protects the whole membership register.')
      return
    }
    if (next !== confirmValue) {
      setError('The two new passphrases do not match.')
      return
    }

    setBusy(true)
    try {
      await changePassphrase(current, next)
      setCurrent('')
      setNext('')
      setConfirmValue('')
      toast.success('Passphrase changed', 'Take a fresh backup — old backups still use the old one.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the passphrase.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Vault passphrase" description="What encrypts every record on this device." icon={KeyRound}>
      <div className="space-y-4">
        <Input
          label="Current passphrase"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
        <Input
          label="New passphrase"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          hint={next ? `Strength: ${strength.label}` : 'Four or five unrelated words works well.'}
        />
        <Input
          label="Confirm new passphrase"
          type="password"
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
          autoComplete="new-password"
        />

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-[0.8125rem] font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button icon={KeyRound} onClick={submit} loading={busy} disabled={!current || !next}>
            Change passphrase
          </Button>
          <Button variant="secondary" onClick={lock}>
            Lock now
          </Button>
        </div>

        <p className="flex items-start gap-2 rounded-lg border border-warning/35 bg-warning/[0.07] p-3 text-[0.8125rem] leading-relaxed text-ink-soft">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          Backups already downloaded stay locked to the passphrase they were made with. After
          changing it, take a fresh backup.
        </p>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------

function PreferencesPanel() {
  const { settings, updateSettings } = useVault()

  return (
    <Panel
      title="Display preferences"
      description="How this device shows things. Affects nobody else, and nothing on the public website."
      icon={Database}
    >
      <div className="space-y-4">
        <Switch
          label="Show offering figures on screen"
          description="Off by default — attendance screens get read over shoulders. Exports and printed reports always include the money."
          checked={settings.showOfferings}
          onChange={(next) => void updateSettings({ showOfferings: next })}
        />
        <Select
          label="Rows per page"
          value={String(settings.pageSize)}
          onChange={(e) => void updateSettings({ pageSize: Number(e.target.value) })}
          options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} rows` }))}
          className="max-w-xs"
        />
        <Select
          label="Default service for new registers"
          value={settings.defaultServiceType}
          onChange={(e) => void updateSettings({ defaultServiceType: e.target.value })}
          options={[
            { value: 'sunday-worship', label: 'Sunday Worship' },
            { value: 'sunday-school', label: 'Sunday School' },
            { value: 'bible-study', label: 'Bible Study' },
            { value: 'workers-meeting', label: 'Workers’ Meeting' },
            { value: 'prayer-meeting', label: 'Prayer Meeting' },
          ]}
          className="max-w-xs"
        />
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------

function AuditPanel() {
  const vault = useVaultData()
  const [showAll, setShowAll] = useState(false)

  const entries = showAll ? vault.audit.slice(0, 200) : vault.audit.slice(0, 12)

  return (
    <Panel
      title="Audit trail"
      description="Every change made on this device, newest first. Never published."
      icon={ScrollText}
      action={
        vault.audit.length > 12 ? (
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${formatNumber(vault.audit.length)}`}
          </Button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nothing recorded yet" description="Changes appear here as you make them." />
      ) : (
        <ol className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
              <Badge tone={auditTone(entry.action)} className="mt-0.5 shrink-0">
                {entry.action}
              </Badge>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.875rem] text-ink">{entry.summary}</span>
                <span className="block text-[0.75rem] text-ink-faint">
                  {entry.actor} · {formatDateTime(entry.at)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function auditTone(action: string) {
  switch (action) {
    case 'create':
      return 'success' as const
    case 'delete':
      return 'danger' as const
    case 'publish':
      return 'gold' as const
    case 'restore':
    case 'import':
      return 'info' as const
    default:
      return 'neutral' as const
  }
}

// ---------------------------------------------------------------------------

function DangerPanel() {
  const { reset, backup } = useVault()
  const vault = useVaultData()
  const toast = useToast()
  const [erasing, setErasing] = useState(false)

  return (
    <>
      <section className="rounded-xl border border-danger/35 bg-danger/[0.04] p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-danger">
          <Trash2 className="size-4" aria-hidden />
          Erase this device
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
          Deletes the encrypted vault and everything in it —{' '}
          {pluralise(vault.members.length, 'member')},{' '}
          {pluralise(vault.attendance.length, 'register')} and the full audit trail. Published
          website content is untouched. There is no undo without a backup file.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={async () => {
              try {
                await backup()
                toast.success('Backup saved first')
              } catch (error) {
                toast.error('Backup failed', error instanceof Error ? error.message : undefined)
              }
            }}
          >
            Back up first
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setErasing(true)}>
            Erase everything
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={erasing}
        onClose={() => setErasing(false)}
        onConfirm={async () => {
          await reset()
          toast.warning('Vault erased', 'Set up again, or restore from a backup file.')
        }}
        title="Erase every church record on this device?"
        message="The membership register, attendance history, prayer requests and audit trail are destroyed. This cannot be undone unless you have a .fbcvault backup."
        confirmLabel="Erase everything"
        requirePhrase="ERASE"
      />
    </>
  )
}
