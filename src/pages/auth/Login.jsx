import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { GraduationCap, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
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
      setError('Please enter your email / registration number and password.')
      return
    }
    setLoading(true)
    try {
      const user = await login(identifier.trim(), password)
      toast.success(`Welcome back, ${user.name}!`)
      const routes = { admin: '/admin', lecturer: '/lecturer', hod: '/hod', student: '/student' }
      navigate(routes[user.role] || '/student', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'QR Code Attendance Scanning',
    'Real-time Live Tracking',
    'PDF & Excel Reports',
    'Role-Based Access Control',
    'SMS & USSD Fallback',
    'GPS Geo-fencing',
  ]

  return (
    <div className="min-h-screen flex items-stretch" style={{ background: '#f0f4f8' }}>

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #003D7A 0%, #0057A8 55%, #1976D2 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: '#FFC107' }} />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#FFC107' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: '#ffffff' }} />

        <div className="relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
            style={{ background: '#FFC107' }}
          >
            <GraduationCap size={48} style={{ color: '#003D7A' }} />
          </div>

          {/* Brand */}
          <h1 className="text-6xl font-black text-white tracking-tight leading-none">CAMS</h1>
          <p className="font-bold text-lg mt-2 tracking-widest uppercase" style={{ color: '#FFC107' }}>
            MKU Campus Attendance
          </p>
          <p className="text-sm mt-1 opacity-70 text-white">Mount Kenya University</p>

          <div className="w-20 h-1 rounded-full mx-auto my-7" style={{ background: '#FFC107' }} />

          {/* Features */}
          <div className="text-left space-y-3">
            {features.map(f => (
              <div key={f} className="flex items-center gap-3 text-white text-sm">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,193,7,0.25)', border: '1px solid rgba(255,193,7,0.5)' }}>
                  <CheckCircle2 size={12} style={{ color: '#FFC107' }} />
                </div>
                {f}
              </div>
            ))}
          </div>

          {/* MKU badge */}
          <div className="mt-10 py-3 px-5 rounded-2xl inline-block"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p className="text-xs text-white opacity-60 uppercase tracking-widest">Powered by</p>
            <p className="text-white font-bold text-sm mt-0.5">Mount Kenya University · Thika Campus</p>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#f0f4f8' }}>
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
              style={{ background: '#0057A8' }}>
              <GraduationCap size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#003D7A' }}>MKU-CAMS</h1>
            <p className="text-sm font-medium mt-1" style={{ color: '#0057A8' }}>Campus Attendance Management System</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border p-8 fade-in" style={{ borderColor: '#D1D5DB' }}>
            {/* Header accent */}
            <div className="h-1 rounded-full mb-6 -mx-8 -mt-8 rounded-t-3xl"
              style={{ background: 'linear-gradient(90deg, #0057A8, #FFC107)' }} />

            <h2 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>Sign In</h2>
            <p className="text-sm mb-7" style={{ color: '#6B7280' }}>Enter your credentials to access your portal</p>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm mb-5"
                style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="login-identifier"
                label="Email or Registration Number"
                type="text"
                placeholder="Enter your email or registration number"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                leftIcon={<Mail size={16} />}
                required
              />
              <Input
                id="login-password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                leftIcon={<Lock size={16} />}
                required
              />

              <div className="flex justify-end">
                <Link to="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#0057A8' }}>
                  Forgot password?
                </Link>
              </div>

              <Button
                id="login-submit"
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <p className="text-sm text-center mt-5" style={{ color: '#6B7280' }}>
              New student?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: '#0057A8' }}>
                Create an account
              </Link>
            </p>

            <p className="text-xs text-center mt-4" style={{ color: '#9CA3AF' }}>
              CAMS © {new Date().getFullYear()} — Mount Kenya University
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
