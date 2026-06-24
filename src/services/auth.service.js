import api from './api'

export const authService = {
  login: (identifier, password) =>
    api.post('/auth/login', { identifier, password }),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),

  registerStudent: (data) =>
    api.post('/auth/register/student', data),

  getRegistrationMetadata: () =>
    api.get('/auth/registration-metadata'),
}
