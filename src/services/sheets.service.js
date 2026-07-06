import api from './api'

export const sheetsService = {
  getSyncStatus: async () => {
    const { data } = await api.get('/sheets/status')
    return data
  },

  connectSheet: async (url, forceDemo = false) => {
    const { data } = await api.post('/sheets/connect', { url, forceDemo })
    return data
  },

  previewSheet: async (url, forceDemo = false) => {
    const { data } = await api.post('/sheets/preview', { url, forceDemo })
    return data
  },

  syncSheet: async (url, students, units, forceDemo = false) => {
    const { data } = await api.post('/sheets/sync', { url, students, units, forceDemo })
    return data
  }
}
