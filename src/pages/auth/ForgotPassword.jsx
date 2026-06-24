import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import api from '../../services/api'

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [error, setError]           = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) { setError('Enter your email or registration number'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { identifier: identifier.trim() })
      setSent(true)
    } catch {
      // Always show success to prevent account enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f0f4f8' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: '#0057A8' }}>
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#003D7A' }}>MKU-CAMS</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Campus Attendance Management System</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center fade-in border" style={{ borderColor: '#D1D5DB' }}>
            <div className="h-1.5 rounded-t-3xl -mx-8 -mt-8 mb-8"
              style={{ background: 'linear-gradient(90deg, #0057A8, #FFC107)' }} />
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#E8F1FB' }}>
              <CheckCircle2 size={32} style={{ color: '#0057A8' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Check your inbox</h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
              If an account exists for <strong>{identifier}</strong>, a password reset link has been
              sent. Check your email or SMS, or contact your admin.
            </p>
            <Link to="/login">
              <Button variant="primary" className="w-full">Back to Sign In</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl fade-in border" style={{ borderColor: '#D1D5DB' }}>
            <div className="h-1.5 rounded-t-3xl"
              style={{ background: 'linear-gradient(90deg, #0057A8, #FFC107)' }} />
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>Reset Password</h2>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                  Enter your email or registration number to receive a reset link
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm mb-4"
                  style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email or Registration Number"
                  placeholder="alice@student.example.ac.ke  or  SCT211-0001/2024"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setError('') }}
                  leftIcon={<Mail size={15} />}
                  required
                />
                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login"
                  className="inline-flex items-center gap-1.5 text-sm hover:underline font-medium"
                  style={{ color: '#0057A8' }}>
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
