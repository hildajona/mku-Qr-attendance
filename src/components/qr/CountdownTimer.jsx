import React, { useEffect, useRef, useState } from 'react'
import { formatCountdown } from '../../utils/qr.utils'
import { RefreshCw } from 'lucide-react'

/**
 * CountdownTimer
 * Restarts cleanly whenever `durationSeconds` prop changes OR
 * when React re-mounts it via a changed `key` prop.
 */
export default function CountdownTimer({
  durationSeconds = 300,
  onExpired,
  large = false,
}) {
  const [seconds, setSeconds]     = useState(durationSeconds)
  const [expired, setExpired]     = useState(false)
  const intervalRef               = useRef(null)
  const onExpiredRef              = useRef(onExpired)

  useEffect(() => { onExpiredRef.current = onExpired }, [onExpired])

  // Restart whenever durationSeconds changes (or on first mount)
  useEffect(() => {
    clearInterval(intervalRef.current)
    setSeconds(durationSeconds)
    setExpired(false)

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setExpired(true)
          onExpiredRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [durationSeconds])

  const percent = durationSeconds > 0 ? (seconds / durationSeconds) * 100 : 0

  const barColor = seconds <= 30
    ? 'bg-red-500'
    : seconds <= 60
    ? 'bg-amber-500'
    : 'bg-green-500'

  const textColor = seconds <= 30
    ? 'text-red-600'
    : seconds <= 60
    ? 'text-amber-600'
    : 'text-green-700'

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {/* Time display */}
      <div className={`font-mono font-bold ${large ? 'text-5xl' : 'text-2xl'} ${expired ? 'text-slate-400' : textColor}`}>
        {expired
          ? <span className="flex items-center gap-2"><RefreshCw size={large ? 28 : 18} className="animate-spin" /> Refreshing…</span>
          : formatCountdown(seconds)
        }
      </div>

      {/* Progress bar */}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${large ? 'h-3' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!large && (
        <p className="text-xs text-slate-400">
          {expired ? 'Generating new QR code…' : 'QR expires in'}
        </p>
      )}
    </div>
  )
}
