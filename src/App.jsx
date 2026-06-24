import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import { ThemeProvider } from './context/ThemeContext'
import AppRouter from './router/index'
import KeyboardShortcuts from './components/ui/KeyboardShortcuts'
import InactivityWarning from './components/ui/InactivityWarning'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SessionProvider>
            <AppRouter />
            <KeyboardShortcuts />
            <InactivityWarning />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  borderRadius: '10px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                },
                success: {
                  iconTheme: { primary: '#16A34A', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#DC2626', secondary: '#fff' },
                },
              }}
            />
          </SessionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
