import { useEffect, useRef } from 'react'

/**
 * Reveal-on-scroll.
 *
 * Adds `data-revealed` once an element enters the viewport; the CSS in
 * `.reveal` handles the rest. Deliberately one-shot — content that fades out
 * again when scrolled past is irritating to read, and re-animating on every
 * pass is what makes a page feel cheap.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // No IntersectionObserver (or reduced motion): show immediately.
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      node.setAttribute('data-revealed', '')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-revealed', '')
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}

/**
 * Reveal every `.reveal` inside a container, staggered by DOM order.
 * One observer for a whole list beats one per card.
 */
export function useRevealAll<T extends HTMLElement = HTMLDivElement>(stagger = 60) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>('.reveal'))
    if (targets.length === 0) return

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      targets.forEach((t) => t.setAttribute('data-revealed', ''))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          const index = targets.indexOf(el)
          el.style.setProperty('--reveal-delay', `${Math.min(index, 8) * stagger}ms`)
          el.setAttribute('data-revealed', '')
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    )

    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [stagger])

  return ref
}
