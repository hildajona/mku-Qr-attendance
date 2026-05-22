import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null)
  const [qrToken, setQrToken]             = useState(null)
  const [expiresAt, setExpiresAt]         = useState(null)
  const [expirySeconds, setExpirySeconds] = useState(300)
  const [attendees, setAttendees]         = useState([])
  const [isFullscreen, setIsFullscreen]   = useState(false)
  // bump this to force CountdownTimer to restart
  const [timerKey, setTimerKey]           = useState(0)

  const startSession = useCallback((session) => {
    setActiveSession(session)
    setQrToken(session.qr_token)
    setExpiresAt(session.expires_at)
    setExpirySeconds(session.qr_expiry_seconds || 300)
    setAttendees([])
    setTimerKey(k => k + 1)
  }, [])

  const updateQrToken = useCallback((token, newExpiresAt, seconds) => {
    setQrToken(token)
    setExpiresAt(newExpiresAt)
    if (seconds) setExpirySeconds(seconds)
    setTimerKey(k => k + 1)   // restart timer
  }, [])

  const setAllAttendees = useCallback((list) => {
    setAttendees(list)
  }, [])

  const endSession = useCallback(() => {
    setActiveSession(null)
    setQrToken(null)
    setExpiresAt(null)
    setAttendees([])
    setIsFullscreen(false)
    setTimerKey(0)
  }, [])

  const value = {
    activeSession,
    qrToken,
    expiresAt,
    expirySeconds,
    attendees,
    isFullscreen,
    setIsFullscreen,
    timerKey,
    startSession,
    updateQrToken,
    setAllAttendees,
    endSession,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
