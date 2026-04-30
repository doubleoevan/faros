import { useEffect, useState } from 'react'

/**
 * Returns `value` delayed by `delayMs`; resets the timer on every change.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])
  return debouncedValue
}
