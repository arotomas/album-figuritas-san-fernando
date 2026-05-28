import { useEffect, useMemo, useRef, useState } from 'react'

function serializeDebouncedValue(value) {
  if (value == null || typeof value !== 'object') return value
  return JSON.stringify(value)
}

function areDebouncedValuesEqual(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => a[key] === b[key])
}

export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)
  const latestRef = useRef(value)
  const valueKey = useMemo(() => serializeDebouncedValue(value), [value])

  latestRef.current = value

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced((current) =>
        areDebouncedValuesEqual(current, latestRef.current) ? current : latestRef.current,
      )
    }, delayMs)

    return () => clearTimeout(timer)
  }, [valueKey, delayMs])

  return debounced
}
