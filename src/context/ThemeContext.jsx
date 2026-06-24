import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage; default to light
    const stored = localStorage.getItem('mku_theme')
    // Ignore any previously stored 'dark' — reset to light
    return stored === 'light' ? 'light' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    // Always remove dark class and enforce light mode
    root.classList.remove('dark')
    if (theme === 'dark') {
      root.classList.add('dark')
    }
    localStorage.setItem('mku_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
