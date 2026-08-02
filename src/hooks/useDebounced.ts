import { useEffect, useState } from 'react'

/**
 * Debounced mirror of a value.
 *
 * Used for search boxes: the input stays instant while the expensive filter
 * over a few thousand members only runs once typing pauses.
 */
export function useDebounced<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
