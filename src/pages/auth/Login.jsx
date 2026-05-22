import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { School, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const { login }                   = useAuth()
  const navigate                    = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both email/reg number and password')
      return
    }
    setLoading(true)
    try {
      const user = await login(identifier.trim(), password)
      toast.success(`Welcome back, ${user.name}!`)
      // Redirect based on role
      const routes = {
        admin:    '/admin',
        lecturer: '/lecturer',
        student:  '/student',
      }
      navigate(routes[user.role] || '/student', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg shadow-green-900/50">
            <School size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MKU Attendance</h1>
          <p className="text-slate-400 text-sm">Sign in to your account</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 fade-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Email or Registration Number"
              type="text"
              placeholder="admin@mku.ac.ke or SCT211-0001/2024"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={<Mail size={16} />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Mount Kenya University &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <p className="text-xs text-slate-300 text-center mb-2 font-semibold">Demo Credentials</p>
          <div className="text-xs text-slate-400 space-y-1">
            <p><strong className="text-slate-300">Admin:</strong> admin@mku.ac.ke / admin123</p>
            <p><strong className="text-slate-300">Lecturer:</strong> lecturer@mku.ac.ke / lecturer123</p>
            <p><strong className="text-slate-300">Student:</strong> SCT211-0001/2024 / student123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
