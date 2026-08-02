import { useEffect, useState } from 'react'

/**
 * Network status.
 *
 * `navigator.onLine` only reports whether there is *a* connection, not whether
 * anything is reachable — but for the one thing we use it for (telling the
 * admin that publishing will fail right now) that is the honest answer, and it
 * is instant. Publishing surfaces the real error if it turns out to be wrong.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}
