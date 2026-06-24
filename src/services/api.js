import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request — support both key names
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cams_token') || localStorage.getItem('mku_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cams_token')
      localStorage.removeItem('mku_token')
      localStorage.removeItem('cams_user')
      localStorage.removeItem('mku_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
