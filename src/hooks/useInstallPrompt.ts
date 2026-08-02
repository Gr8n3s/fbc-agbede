import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * "Add to Home Screen" support.
 *
 * Chromium fires `beforeinstallprompt`, which we capture so the church can
 * offer a proper install button instead of hoping people find the browser
 * menu. iOS Safari fires nothing at all and needs written instructions, so we
 * report that case separately rather than pretending the button will work.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS reports installed state on navigator, not via matchMedia.
      (navigator as { standalone?: boolean }).standalone === true
    setInstalled(standalone)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return false
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    return outcome === 'accepted'
  }, [deferred])

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return {
    canInstall: deferred !== null,
    installed,
    /** iOS needs the manual Share → Add to Home Screen instructions. */
    needsManualInstructions: isIos && !installed,
    install,
  }
}
