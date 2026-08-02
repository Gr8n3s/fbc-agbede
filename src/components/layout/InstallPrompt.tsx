import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { Button, IconButton, Seal } from '@/components/ui'
import { useInstallPrompt, useLocalState } from '@/hooks'

/**
 * "Add to your home screen", offered once rather than nagged.
 *
 * Most people never find the browser's own install menu, so the church has to
 * ask. The rules here are about not being obnoxious about it:
 *
 *   • never shown if the app is already installed
 *   • never on the first few seconds of a first visit, so it does not cover
 *     the page before anyone has read anything
 *   • dismissing it is remembered for a month, not for the session, because a
 *     banner that returns on every visit is an advert
 *   • on iOS, where the browser fires no install event at all, it shows the
 *     Share, then Add to Home Screen steps instead of a button that cannot work
 */

/** Long enough to read the page first. */
const DELAY_MS = 12_000
/** How long a dismissal is respected. */
const SNOOZE_DAYS = 30

export function InstallPrompt() {
  const { canInstall, installed, needsManualInstructions, install } = useInstallPrompt()
  const [dismissedAt, setDismissedAt] = useLocalState<number>('install.dismissed', 0)
  const [ready, setReady] = useState(false)

  const snoozed = Date.now() - dismissedAt < SNOOZE_DAYS * 86_400_000

  useEffect(() => {
    if (installed || snoozed) return
    const timer = setTimeout(() => setReady(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [installed, snoozed])

  if (installed || snoozed || !ready) return null
  if (!canInstall && !needsManualInstructions) return null

  const dismiss = () => {
    setDismissedAt(Date.now())
    setReady(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Install the church app"
      // Clear of the mobile bottom bar and the iPhone home indicator.
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-rise rounded-2xl border border-line bg-raised p-4 shadow-lift backdrop-blur lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
    >
      <div className="flex items-start gap-3">
        <Seal className="size-10 shrink-0" decorative />

        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.9375rem] font-semibold text-ink">
            Add FBC Agbede to your phone
          </p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-ink-soft">
            Opens straight from your home screen, and the programme, sermons and devotional keep
            working when you have no data.
          </p>

          {needsManualInstructions ? (
            <ol className="mt-3 space-y-1.5 text-[0.8125rem] text-ink-soft">
              <li className="flex items-center gap-2">
                <Share className="size-4 shrink-0 text-info" aria-hidden />
                Tap <strong className="text-ink">Share</strong> at the bottom of Safari
              </li>
              <li className="flex items-center gap-2">
                <SquarePlus className="size-4 shrink-0 text-info" aria-hidden />
                Choose <strong className="text-ink">Add to Home Screen</strong>
              </li>
            </ol>
          ) : (
            <Button
              icon={Download}
              size="sm"
              className="mt-3"
              onClick={async () => {
                const accepted = await install()
                // Accepted or not, stop asking for a while.
                if (!accepted) setDismissedAt(Date.now())
                setReady(false)
              }}
            >
              Install the app
            </Button>
          )}
        </div>

        <IconButton icon={X} size="sm" label="Not now" onClick={dismiss} className="-mr-1 -mt-1" />
      </div>
    </div>
  )
}
