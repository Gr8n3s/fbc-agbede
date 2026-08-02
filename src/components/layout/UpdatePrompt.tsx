import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { CloudDownload, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useOnline } from '@/hooks'

/**
 * Service-worker lifecycle surface.
 *
 * Updates are offered, never forced: the admin might be halfway through
 * entering an attendance register, and reloading underneath them would throw
 * the work away. "Offline ready" is announced once so people know the app
 * genuinely works without data — the whole point of installing it.
 */
export function UpdatePrompt() {
  const online = useOnline()
  const toast = useToast()

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => console.error('[pwa] registration failed', error),
  })

  useEffect(() => {
    if (!offlineReady) return
    toast.success('Ready to use offline', 'Sermons, programmes and events are saved on this device.')
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, toast])

  return (
    <>
      {needRefresh && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md animate-rise rounded-xl border border-ornament/40 bg-raised p-3.5 shadow-lift lg:bottom-4"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ornament/12 text-ornament">
              <CloudDownload className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">A new version is ready</p>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-soft">
                Reload when you are at a good stopping point.
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" onClick={() => void updateServiceWorker(true)}>
                  Reload now
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
                  Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!online && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-3 lg:bottom-3"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/12 px-3.5 py-1.5 text-[0.75rem] font-semibold text-warning backdrop-blur">
            <WifiOff className="size-3.5" aria-hidden />
            Offline, showing the last saved copy
          </p>
        </div>
      )}
    </>
  )
}
