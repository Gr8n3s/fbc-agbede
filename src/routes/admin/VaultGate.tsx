import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Button, Card, Checkbox, Input, Rule, Seal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useVault } from '@/context/VaultContext'
import { assessPassphrase, isCryptoAvailable, suggestPassphrase } from '@/lib/crypto'
import { peekVaultFile } from '@/lib/db'
import { cx, formatDate } from '@/lib/utils'

/**
 * The door to the admin area.
 *
 * There is no login server, so "authentication" here is possession of the
 * passphrase that decrypts the vault on this device. That is a real boundary
 * — without it the data is ciphertext — but it is a *device* boundary, not an
 * account. Stated plainly on screen so nobody assumes otherwise.
 */
export function VaultGate({ onSignOut }: { onSignOut?: () => void }) {
  const { status } = useVault()

  if (!isCryptoAvailable()) return <CryptoUnavailable />
  if (status === 'unavailable') return <StorageUnavailable />
  if (status === 'absent') return <SetupVault onSignOut={onSignOut} />
  return <UnlockVault onSignOut={onSignOut} />
}

/**
 * Leaves the office entirely, rather than only locking the vault.
 *
 * Offered on the vault screens because that is where someone who opened the
 * office by mistake ends up, and without it the only way out is the browser
 * back button.
 */
function SignOutLink({ onSignOut }: { onSignOut?: () => void }) {
  if (!onSignOut) return null
  return (
    <p className="mt-6 text-center">
      <button
        type="button"
        onClick={onSignOut}
        className="text-[0.8125rem] font-medium text-ink-faint underline underline-offset-2 hover:text-ink"
      >
        Sign out of the church office
      </button>
    </p>
  )
}

// ---------------------------------------------------------------------------

function Shell({
  icon: Icon,
  title,
  description,
  children,
  tone = 'brand',
}: {
  icon: typeof Lock
  title: string
  description: string
  children: React.ReactNode
  tone?: 'brand' | 'danger'
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-faint hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to the church app
        </Link>

        <Card className="overflow-hidden">
          <div className="border-b border-line px-6 py-7 text-center">
            <Seal className="mx-auto size-16" decorative />
            <span
              className={cx(
                'mx-auto -mt-5 grid size-9 place-items-center rounded-full ring-4 ring-surface',
                tone === 'danger' ? 'bg-danger text-white' : 'bg-brand text-on-brand',
              )}
            >
              <Icon className="size-4.5" aria-hidden />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold text-ink">{title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-pretty text-[0.875rem] leading-relaxed text-ink-soft">
              {description}
            </p>
          </div>
          <div className="p-6">{children}</div>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function CryptoUnavailable() {
  return (
    <Shell
      icon={AlertTriangle}
      tone="danger"
      title="Secure storage unavailable"
      description="Church records can only be stored when the browser provides encryption."
    >
      <div className="prose-chapel text-[0.875rem]">
        <p>This happens when the app is opened:</p>
        <ul>
          <li>over plain <code>http://</code> rather than <code>https://</code></li>
          <li>from a file on disk rather than a web address</li>
          <li>in a browser too old to support Web Crypto</li>
        </ul>
        <p>
          Open the app at its <strong>https://</strong> address in Chrome, Edge, Firefox or Safari
          and this screen will not appear.
        </p>
      </div>
    </Shell>
  )
}

function StorageUnavailable() {
  return (
    <Shell
      icon={AlertTriangle}
      tone="danger"
      title="Local storage blocked"
      description="The browser will not let the app store church records on this device."
    >
      <div className="prose-chapel text-[0.875rem]">
        <p>The usual causes:</p>
        <ul>
          <li>private / incognito browsing</li>
          <li>site data blocked in browser settings</li>
          <li>the device is completely out of storage</li>
        </ul>
      </div>
      <Button icon={RefreshCw} onClick={() => window.location.reload()} fullWidth className="mt-4">
        Try again
      </Button>
    </Shell>
  )
}

// ---------------------------------------------------------------------------

function SetupVault({ onSignOut }: { onSignOut?: () => void }) {
  const { create, restore } = useVault()
  const toast = useToast()

  const [name, setName] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [remember, setRemember] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'new' | 'restore'>('new')

  const strength = assessPassphrase(passphrase)
  const mismatch = confirmPass.length > 0 && confirmPass !== passphrase

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!strength.acceptable) {
      setError('Please choose a stronger passphrase, this protects the whole membership register.')
      return
    }
    if (passphrase !== confirmPass) {
      setError('The two passphrases do not match.')
      return
    }
    if (!acknowledged) {
      setError('Please confirm you understand the passphrase cannot be recovered.')
      return
    }

    setBusy(true)
    try {
      await create(passphrase, name, remember)
      toast.success('Vault created', 'Make a backup as soon as you have entered some records.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the vault.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'restore') {
    return <RestoreVault onCancel={() => setMode('new')} onRestore={restore} />
  }

  return (
    <Shell
      icon={Sparkles}
      title="Set up the church vault"
      description="This device will hold the church's private records. They are encrypted here and never published."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Your name"
          hint="Recorded against changes in the audit trail. Never published."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="e.g. Church Administrator"
        />

        <div>
          <Input
            label="Vault passphrase"
            type="password"
            required
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="new-password"
            hint="Four or five unrelated words is stronger and easier to remember than one complicated word."
          />

          {passphrase && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                  <div
                    className={cx(
                      'h-full rounded-full transition-all duration-300',
                      strength.score <= 1
                        ? 'bg-danger'
                        : strength.score === 2
                          ? 'bg-warning'
                          : 'bg-success',
                    )}
                    style={{ width: `${((strength.score + 1) / 5) * 100}%` }}
                  />
                </div>
                <span
                  className={cx(
                    'text-[0.75rem] font-semibold',
                    strength.score <= 1
                      ? 'text-danger'
                      : strength.score === 2
                        ? 'text-warning'
                        : 'text-success',
                  )}
                >
                  {strength.label}
                </span>
              </div>
              {strength.suggestions.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {strength.suggestions.map((suggestion) => (
                    <li key={suggestion} className="text-[0.75rem] text-ink-faint">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const generated = suggestPassphrase()
              setPassphrase(generated)
              setConfirmPass(generated)
              toast.info('Passphrase generated', 'Write it down somewhere safe before continuing.')
            }}
            className="mt-2 text-[0.75rem] font-semibold text-info underline underline-offset-2"
          >
            Suggest a strong passphrase for me
          </button>
        </div>

        <Input
          label="Confirm passphrase"
          type="password"
          required
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          autoComplete="new-password"
          error={mismatch ? 'The passphrases do not match.' : undefined}
        />

        <div className="rounded-lg border border-warning/35 bg-warning/[0.07] p-3">
          <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-soft">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              <strong className="text-ink">There is no password reset.</strong> Nobody, not the
              church, not the developer, not GitHub, can recover this passphrase. Lose it and the
              records on this device are unrecoverable. Write it down and keep it somewhere safe.
            </span>
          </p>
        </div>

        <Checkbox
          label="I understand the passphrase cannot be recovered"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />

        <Checkbox
          label="Stay unlocked while this tab is open"
          description="Locks automatically after 30 minutes idle, and when the tab closes."
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-[0.8125rem] font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" icon={ShieldCheck} loading={busy} fullWidth size="lg">
          Create the vault
        </Button>
      </form>

      <Rule className="my-6" />

      <Button variant="secondary" icon={Upload} fullWidth onClick={() => setMode('restore')}>
        Restore from a backup file
      </Button>

      <SignOutLink onSignOut={onSignOut} />
    </Shell>
  )
}

// ---------------------------------------------------------------------------

function UnlockVault({ onSignOut }: { onSignOut?: () => void }) {
  const { unlock, reset } = useVault()
  const toast = useToast()

  const [passphrase, setPassphrase] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await unlock(passphrase, remember)
      setPassphrase('')
      toast.success('Vault unlocked')
    } catch (err) {
      setAttempts((n) => n + 1)
      setError(err instanceof Error ? err.message : 'Could not unlock the vault.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell
      icon={Lock}
      title="Unlock the church vault"
      description="Enter the passphrase to open the private records held on this device."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Vault passphrase"
          type="password"
          required
          autoFocus
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="current-password"
          error={error ?? undefined}
        />

        <Checkbox
          label="Stay unlocked while this tab is open"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />

        <Button type="submit" icon={KeyRound} loading={busy} fullWidth size="lg">
          Unlock
        </Button>
      </form>

      {attempts >= 3 && (
        <>
          <Rule className="my-6" />
          {confirmingReset ? (
            <div className="rounded-lg border border-danger/35 bg-danger/[0.06] p-3">
              <p className="text-[0.8125rem] font-semibold text-danger">
                Erase all church records on this device?
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                Every member record, attendance register and audit entry stored here will be
                destroyed. This cannot be undone unless you have a <code>.fbcvault</code> backup.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await reset()
                    toast.warning('Vault erased', 'You can now set up again or restore a backup.')
                  }}
                >
                  Yes, erase everything
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-[0.8125rem] text-ink-faint">
              Forgotten the passphrase?{' '}
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="font-semibold text-danger underline underline-offset-2"
              >
                Erase and start again
              </button>
            </p>
          )}
        </>
      )}

      <SignOutLink onSignOut={onSignOut} />
    </Shell>
  )
}

// ---------------------------------------------------------------------------

function RestoreVault({
  onCancel,
  onRestore,
}: {
  onCancel: () => void
  onRestore: (file: File, passphrase: string, mode: 'replace' | 'merge') => Promise<void>
}) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (selected: File | null) => {
    setFile(selected)
    setHint(null)
    setError(null)
    if (!selected) return

    const envelope = await peekVaultFile(selected)
    if (!envelope) {
      setError('That is not an FBC vault backup file.')
      setFile(null)
      return
    }
    setHint(
      `Backup from ${formatDate(envelope.createdAt.slice(0, 10), 'long')}` +
        (envelope.hint
          ? ` to ${envelope.hint.members} members, ${envelope.hint.attendance} registers.`
          : '.'),
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      await onRestore(file, passphrase, 'replace')
      toast.success('Backup restored', 'Your records are back on this device.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore that backup.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell
      icon={Upload}
      title="Restore from backup"
      description="Choose a .fbcvault file and enter the passphrase it was saved with."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="vault-file"
            className="mb-1.5 block text-[0.8125rem] font-semibold text-ink"
          >
            Backup file
          </label>
          <input
            id="vault-file"
            type="file"
            accept=".fbcvault,application/json"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-line-strong bg-surface p-2 text-[0.8125rem] file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-[0.8125rem] file:font-semibold file:text-on-brand"
          />
          {hint && <p className="mt-1.5 text-[0.75rem] text-success">{hint}</p>}
        </div>

        <Input
          label="Backup passphrase"
          type="password"
          required
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-[0.8125rem] font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" icon={Upload} loading={busy} disabled={!file} fullWidth size="lg">
          Restore this backup
        </Button>
        <Button variant="ghost" fullWidth onClick={onCancel}>
          Cancel
        </Button>
      </form>
    </Shell>
  )
}
