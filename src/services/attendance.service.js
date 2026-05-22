import api from './api'

export const attendanceService = {
  markAttendance: (token, studentId, gpsData = {}) =>
    api.post('/attendance/mark', { token, student_id: studentId, ...gpsData }),

  getSessionAttendance: (sessionId) =>
    api.get(`/attendance/session/${sessionId}`),

  getStudentAttendance: (studentId, params) =>
    api.get(`/attendance/student/${studentId}`, { params }),

  getReport: (params) =>
    api.get('/attendance/report', { params }),

  markAbsent: (sessionId, studentId) =>
    api.post(`/attendance/session/${sessionId}/absent`, { student_id: studentId }),
}
