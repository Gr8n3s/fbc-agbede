import { useEffect } from 'react'

/**
 * Freeze background scrolling while a modal or drawer is open.
 *
 * Compensates for the scrollbar's width so the page behind does not jump
 * sideways the moment a dialog opens.
 */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return

    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [active])
}
