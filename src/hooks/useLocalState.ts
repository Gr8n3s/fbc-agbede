import { useCallback, useEffect, useState } from 'react'

/**
 * State mirrored into localStorage.
 *
 * For UI preferences only — never for anything personal. Wrapped in try/catch
 * throughout because Safari private mode throws on write rather than degrading.
 */
export function useLocalState<T>(key: string, initial: T) {
  const storageKey = `fbc.${key}`

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* storage unavailable or full — the app keeps working, just without memory */
    }
  }, [storageKey, value])

  const reset = useCallback(() => {
    setValue(initial)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
  }, [initial, storageKey])

  return [value, setValue, reset] as const
}
