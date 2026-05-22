import { useState, useCallback } from 'react'
import { sessionService } from '../services/session.service'

export function useQR() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const createSession = useCallback(async (sessionData) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await sessionService.createSession(sessionData)
      return { success: true, data }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create session'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const regenerateQR = useCallback(async (sessionId) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await sessionService.regenerateQR(sessionId)
      return { success: true, data }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to regenerate QR'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, createSession, regenerateQR }
}
