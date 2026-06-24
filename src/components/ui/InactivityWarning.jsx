import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'

const IDLE_MS    = 8 * 60 * 60 * 1000  // 8 hours
const WARN_MS    = IDLE_MS - 5 * 60 * 1000  // warn at 7h55m
const EVENTS     = ['mousedown','keydown','touchstart','scroll']

export default function InactivityWarning() {
  const { user, logout } = useAuth()
  const [show, setShow]   = useState(false)
  const timer   = useRef(null)
  const warnRef = useRef(null)

  const resetTimer = useCallback(() => {
    clearTimeout(timer.current)
    clearTimeout(warnRef.current)
    setShow(false)
    if (!user) return
    warnRef.current = setTimeout(() => setShow(true), WARN_MS)
    timer.current   = setTimeout(() => logout(), IDLE_MS)
  }, [user, logout])

  useEffect(() => {
    if (!user) return
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timer.current)
      clearTimeout(warnRef.current)
    }
  }, [user, resetTimer])

  if (!show || !user) return null

  return (
    <div className="inactivity-bar" role="alert" aria-live="assertive">
      <span>⏱ Your session expires in <strong>5 minutes</strong> due to inactivity.</span>
      <button
        className="btn btn-accent text-sm px-4 py-2"
        onClick={resetTimer}
      >
        Stay logged in
      </button>
    </div>
  )
}
