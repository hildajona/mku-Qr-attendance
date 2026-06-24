import api from './api'

export const attendanceService = {
  // Student scans QR — enterprise endpoint with device fingerprint
  checkIn: (token, studentId, extras = {}) =>
    api.post('/attendance/check-in', {
      token,
      student_id: studentId,
      device_fingerprint: extras.fingerprint || getFingerprint(),
      lat: extras.lat || null,
      lng: extras.lng || null,
    }),

  // Backwards compat alias
  markAttendance: (token, studentId) =>
    api.post('/attendance/check-in', { token, student_id: studentId }),

  // Live list for lecturer (paginated)
  getSessionAttendance: (sessionId, params) =>
    api.get(`/attendance/session/${sessionId}`, { params }),

  // Student history
  getStudentAttendance: (studentId, params) =>
    api.get(`/attendance/student/${studentId}`, { params }),

  // Report with filters + pagination
  getReport: (params) =>
    api.get('/attendance/report', { params }),

  // CSV / Excel export
  exportAttendance: (params) => {
    const q = new URLSearchParams(params).toString()
    const token = localStorage.getItem('cams_token') || localStorage.getItem('mku_token')
    window.open(`/api/attendance/export?${q}&_t=${token}`, '_blank')
  },

  markAbsent: (sessionId, studentId) =>
    api.post(`/attendance/session/${sessionId}/absent`, { student_id: studentId }),

  markManual: (sessionId, studentId, reason) =>
    api.post(`/attendance/session/${sessionId}/manual`, { student_id: studentId, reason }),
}

/** Generate a stable browser fingerprint (non-PII) */
function getFingerprint() {
  try {
    const nav = window.navigator
    const raw = [
      nav.userAgent,
      nav.language,
      new Date().getTimezoneOffset(),
      screen.width + 'x' + screen.height,
    ].join('|')
    // Simple hash
    let h = 0
    for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0
    return Math.abs(h).toString(16)
  } catch {
    return 'unknown'
  }
}
