import api from './api'

export const sessionService = {
  createSession: (data) => api.post('/sessions', data),
  getSession: (id) => api.get(`/sessions/${id}`),
  regenerateQR: (id) => api.post(`/sessions/${id}/regenerate-qr`),
  endSession: (id) => api.put(`/sessions/${id}/end`),
  getActiveSessions: () => api.get('/sessions/active'),
  getLecturerSessions: (params) => api.get('/sessions/lecturer', { params }),
}
