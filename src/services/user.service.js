import api from './api'

export const userService = {
  // Students
  getStudents: (params) => api.get('/admin/students', { params }),
  createStudent: (data) => api.post('/admin/students', data),
  updateStudent: (id, data) => api.put(`/admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`),
  importStudents: (formData) =>
    api.post('/admin/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Lecturers
  getLecturers: (params) => api.get('/admin/lecturers', { params }),
  createLecturer: (data) => api.post('/admin/lecturers', data),
  updateLecturer: (id, data) => api.put(`/admin/lecturers/${id}`, data),
  deleteLecturer: (id) => api.delete(`/admin/lecturers/${id}`),
  resetLecturerPassword: (id) => api.post(`/admin/lecturers/${id}/reset-password`),

  // Profile
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
}
