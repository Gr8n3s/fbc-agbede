import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button, Card, Input, Seal } from '@/components/ui'
import { rememberUnlocked, verifyAccessKey } from '@/lib/access'

/**
 * The outer door to the church office.
 *
 * Shown before anything else in /admin, including the vault setup screen, so a
 * visitor cannot create a vault or look around the office at all.
 *
 * Wrong attempts are slowed deliberately. There is no server to rate-limit
 * against, so the delay is here: it costs an honest admin nothing on the first
 * try and makes an in-browser guessing loop pointless. Anyone serious would
 * attack the hash offline instead, which is why the key itself must be strong.
 */
export function AccessGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  /**
   * Throw away the offline copy and reload from the network.
   *
   * The service worker is what makes this app usable without data, but it also
   * means a device can keep running a build from before the access key was
   * changed, rejecting a key that is perfectly correct. Unregistering it and
   * emptying the caches is the only reliable way out from inside the app.
   */
  const forceRefresh = async () => {
    setRefreshing(true)
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map((name) => caches.delete(name)))
      }
    } finally {
      // Cache-busted so the browser cannot serve index.html from memory either.
      window.location.replace(`${window.location.pathname}?fresh=${Date.now()}`)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      // Back off after the first failure. Honest typos cost nothing.
      if (attempts > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(4000, attempts * 750)))
      }

      if (await verifyAccessKey(key)) {
        rememberUnlocked()
        onUnlocked()
        return
      }

      setAttempts((n) => n + 1)
      setKey('')
      setError('That key is not right.')
    } catch {
      setError('This browser cannot check the key. Open the app over https.')
    } finally {
      setBusy(false)
    }
  }

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
            {/* Sits clear of the seal. It used to tuck into the drawn ring,
                which collides with the church's real badge. */}
            <span className="mx-auto mt-3 grid size-9 place-items-center rounded-full bg-brand text-on-brand">
              <KeyRound className="size-4.5" aria-hidden />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold text-ink">Church office</h1>
            <p className="mx-auto mt-2 max-w-xs text-pretty text-[0.875rem] leading-relaxed text-ink-soft">
              This area is for the church administrator. Enter the access key to continue.
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={submit} className="space-y-4" noValidate>
              {/*
                A phone keyboard will happily capitalise the first letter of a
                hyphenated key and quietly break it, so every helpful text
                behaviour is turned off here.
              */}
              <Input
                label="Access key"
                type="password"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                error={error ?? undefined}
              />

              <Button type="submit" icon={ShieldCheck} loading={busy} fullWidth size="lg">
                Continue
              </Button>
            </form>

            {attempts >= 2 && (
              <div className="mt-5 rounded-lg border border-line bg-sunken/60 p-3.5">
                <p className="text-[0.8125rem] font-semibold text-ink">
                  Certain the key is right?
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                  This app keeps working offline, which means it can still be running an older copy
                  of itself. If the key was changed recently, this device may not have caught up
                  yet.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  className="mt-3"
                  loading={refreshing}
                  onClick={forceRefresh}
                >
                  Fetch the latest version
                </Button>
              </div>
            )}

            {attempts >= 3 && (
              <p className="mt-4 text-center text-[0.8125rem] leading-relaxed text-ink-faint">
                If you are a member looking for service times, sermons or the weekly programme,
                everything is on the{' '}
                <Link to="/" className="font-semibold text-info underline underline-offset-2">
                  main church app
                </Link>
                .
              </p>
            )}
          </div>
        </Card>

        <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-ink-faint">
          The key is separate from your vault passphrase. It only opens this door; the church
          records behind it stay encrypted.
        </p>
      </div>
    </div>
  )
}
