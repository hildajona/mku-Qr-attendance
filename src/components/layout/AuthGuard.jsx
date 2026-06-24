import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Loader2 } from 'lucide-react'

export default function AuthGuard({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-green-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their own portal
    const roleRoutes = {
      admin:    '/admin',
      lecturer: '/lecturer',
      hod:      '/hod',
      student:  '/student',
    }
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />
  }

  return <>{children}</>
}
