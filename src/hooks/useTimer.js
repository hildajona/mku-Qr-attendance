import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Countdown timer hook
 * @param {number} initialSeconds - starting seconds
 * @param {Function} onExpired - callback when timer hits 0
 * @returns {{ seconds, percent, isRunning, start, pause, reset }}
 */
export function useTimer(initialSeconds = 300, onExpired) {
  const [seconds, setSeconds]     = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const totalRef                  = useRef(initialSeconds)
  const intervalRef               = useRef(null)
  const onExpiredRef              = useRef(onExpired)

  useEffect(() => { onExpiredRef.current = onExpired }, [onExpired])

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const start = useCallback((fromSeconds) => {
    clear()
    const startVal = fromSeconds ?? initialSeconds
    totalRef.current = startVal
    setSeconds(startVal)
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setIsRunning(false)
          onExpiredRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [initialSeconds])

  const pause = useCallback(() => {
    clear()
    setIsRunning(false)
  }, [])

  const reset = useCallback((newSeconds) => {
    clear()
    const val = newSeconds ?? initialSeconds
    totalRef.current = val
    setSeconds(val)
    setIsRunning(false)
  }, [initialSeconds])

  useEffect(() => () => clear(), [])

  const percent = totalRef.current > 0
    ? Math.round((seconds / totalRef.current) * 100)
    : 0

  return { seconds, percent, isRunning, start, pause, reset }
}
