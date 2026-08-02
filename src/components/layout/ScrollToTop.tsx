import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Reset scroll on navigation.
 *
 * A router keeps the DOM alive across route changes, so without this the new
 * page opens halfway down where the last one was left. Hash links are left
 * alone so in-page anchors still work, and `instant` avoids a distracting
 * smooth-scroll on every navigation despite the global `scroll-behavior`.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}
