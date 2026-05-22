import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('mku_token')
    const stored = localStorage.getItem('mku_user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('mku_token')
        localStorage.removeItem('mku_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password })
    const { token, user: userData } = data
    localStorage.setItem('mku_token', token)
    localStorage.setItem('mku_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    localStorage.removeItem('mku_token')
    localStorage.removeItem('mku_user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('mku_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin:    user?.role === 'admin',
    isLecturer: user?.role === 'lecturer',
    isStudent:  user?.role === 'student',
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
