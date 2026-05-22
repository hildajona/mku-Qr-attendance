import { useState, useCallback } from 'react'
import { attendanceService } from '../services/attendance.service'

export function useAttendance() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const markAttendance = useCallback(async (token, studentId) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await attendanceService.markAttendance(token, studentId)
      return { success: true, data }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark attendance'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const getStudentHistory = useCallback(async (studentId, params) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await attendanceService.getStudentAttendance(studentId, params)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, markAttendance, getStudentHistory }
}
