import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'cams_token'
const USER_KEY  = 'cams_user'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Support both old key (mku_token) and new key (cams_token)
    const token  = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('mku_token')
    const stored = localStorage.getItem(USER_KEY)   || localStorage.getItem('mku_user')
    if (token && stored) {
      try {
        const u = JSON.parse(stored)
        setUser(u)
        // Migrate to new key
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, stored)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password })
    const { token, user: userData } = data
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    ;[TOKEN_KEY, USER_KEY, 'mku_token', 'mku_user'].forEach(k => localStorage.removeItem(k))
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin:         user?.role === 'admin',
    isLecturer:      user?.role === 'lecturer',
    isHod:           user?.role === 'hod',
    isStudent:       user?.role === 'student',
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
