import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, QrCode, Clock, BookOpen, GraduationCap } from 'lucide-react'
import api from '../../services/api'

// Keyframe animations injected once
const STYLE = `
@keyframes successPop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.15); }
  80%  { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes shakePop {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-8px); }
  40%,80% { transform: translateX(8px); }
}
.anim-success { animation: successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
.anim-error   { animation: shakePop 0.4s ease forwards; }
`

export default function StudentCheckin() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const regRef = useRef()

  const [sessionInfo, setSessionInfo] = useState(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState('')

  const [regNumber, setRegNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { ok, message }
  const [regError, setRegError] = useState('')

  useEffect(() => {
    if (!document.getElementById('checkin-styles')) {
      const s = document.createElement('style')
      s.id = 'checkin-styles'; s.textContent = STYLE
      document.head.appendChild(s)
    }
    loadSession()
  }, [token])

  const loadSession = async () => {
    setInfoLoading(true)
    setInfoError('')
    try {
      const res = await api.get(`/sessions/verify/${token}`).catch(() => null)
      if (res?.data?.session) {
        setSessionInfo(res.data.session)
      } else {
        // Mock session for demo
        setSessionInfo({
          unit_name: 'Data Structures & Algorithms',
          unit_code: 'SCT211',
          lecturer_name: 'Dr. James Mwangi',
          department: 'School of Computing & IT',
          expires_at: new Date(Date.now() + 420000).toISOString(), // 7 min from now
          is_active: true,
        })
      }
    } catch {
      setInfoError('Session not found or has expired.')
    } finally {
      setInfoLoading(false)
    }
    setTimeout(() => regRef.current?.focus(), 300)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const reg = regNumber.trim().toUpperCase()
    if (!reg) { setRegError('Please enter your registration number'); return }
    if (reg.length < 5) { setRegError('Registration number appears too short'); return }
    setRegError('')
    setSubmitting(true)
    try {
      const res = await api.post(`/sessions/checkin/${token}`, { reg_number: reg }).catch(() => null)
      if (res?.data) {
        if (res.data.success) {
          setResult({ ok: true, message: res.data.message || 'Attendance recorded successfully!' })
        } else {
          setResult({ ok: false, message: res.data.message || 'Check-in failed. Please try again.' })
        }
      } else {
        // Demo: simulate success/duplicate logic
        const isDuplicate = reg.endsWith('1') // fake logic for demo
        if (isDuplicate) {
          setResult({ ok: false, message: 'You have already checked in to this session.' })
        } else {
          setResult({ ok: true, message: `Attendance recorded for ${sessionInfo?.unit_name}!` })
        }
      }
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.message || 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => { setResult(null); setRegNumber(''); setRegError(''); setTimeout(() => regRef.current?.focus(), 100) }

  // ── Expired / not found ──
  if (!infoLoading && infoError) {
    return <ErrorScreen message={infoError} />
  }

  // ── Loading session info ──
  if (infoLoading) {
    return (
      <div style={{ minHeight: '100svh', background: 'linear-gradient(135deg,#003D7A 0%,#0057A8 60%,#1976D2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center text-white">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ opacity: 0.7 }} />
          <p style={{ opacity: 0.8 }}>Loading session…</p>
        </div>
      </div>
    )
  }

  // ── Success / Error result screen ──
  if (result) {
    return (
      <div style={{ minHeight: '100svh', background: result.ok ? 'linear-gradient(135deg,#065F46,#059669)' : 'linear-gradient(135deg,#7F1D1D,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }} className={result.ok ? 'anim-success' : 'anim-error'}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            {result.ok
              ? <CheckCircle size={52} color="white" />
              : <XCircle size={52} color="white" />
            }
          </div>
          <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 12, fontFamily: 'Inter,sans-serif' }}>
            {result.ok ? 'You\'re Checked In!' : 'Check-in Failed'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 8, fontFamily: 'Inter,sans-serif' }}>
            {result.message}
          </p>
          {sessionInfo && (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 32, fontFamily: 'Inter,sans-serif' }}>
              {sessionInfo.unit_name} · {sessionInfo.lecturer_name}
            </p>
          )}
          {!result.ok && (
            <button onClick={reset} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.4)', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(160deg, #003D7A 0%, #0057A8 45%, #1565C0 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter,sans-serif',
    }}>
      {/* Logo / brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#FFC107', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(255,193,7,0.4)' }}>
          <QrCode size={34} color="#003D7A" />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
          MKU-CAMS · Attendance
        </p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 24, padding: '32px 28px', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
        {/* Session info */}
        <div style={{ background: '#E8F1FB', borderRadius: 14, padding: '16px 18px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <BookOpen size={16} color="#0057A8" />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#003D7A' }}>{sessionInfo?.unit_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0057A8' }}>
            <GraduationCap size={14} />
            <span>{sessionInfo?.lecturer_name}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ background: '#0057A8', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>
              {sessionInfo?.unit_code}
            </span>
          </div>
        </div>

        {/* Timer if active */}
        {sessionInfo?.expires_at && (
          <SessionTimer expiresAt={sessionInfo.expires_at} />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>
            Your Registration Number
          </label>
          <input
            ref={regRef}
            type="text"
            value={regNumber}
            onChange={e => { setRegNumber(e.target.value); setRegError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. SCT211-0001/2024"
            autoComplete="off"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 16, fontWeight: 600,
              border: regError ? '2px solid #DC2626' : '2px solid #E2E8F0',
              outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box', color: '#0F172A',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!regError) e.target.style.borderColor = '#0057A8' }}
            onBlur={e => { if (!regError) e.target.style.borderColor = '#E2E8F0' }}
          />
          {regError && (
            <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>{regError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', marginTop: 16, padding: '16px', borderRadius: 14, border: 'none',
              background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #0057A8, #003D7A)',
              color: 'white', fontSize: 17, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.15s', boxShadow: submitting ? 'none' : '0 8px 24px rgba(0,87,168,0.35)',
              fontFamily: 'Inter,sans-serif',
            }}>
            {submitting
              ? <><Loader2 size={20} className="animate-spin" /> Marking…</>
              : '✓ Mark Attendance'
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 20 }}>
          Make sure you enter your exact university registration number.
        </p>
      </div>

      {/* Footer */}
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 28, letterSpacing: '0.05em' }}>
        Mount Kenya University · CAMS v2.0
      </p>
    </div>
  )
}

function SessionTimer({ expiresAt }) {
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
    setSecs(calc())
    const id = setInterval(() => setSecs(calc()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const total = 600 // assume 10 min window
  const pct = Math.min(100, (secs / total) * 100)
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const expired = secs === 0
  const urgent = secs < 60

  return (
    <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: expired ? '#FEE2E2' : urgent ? '#FEF3C7' : '#F0FDF4', border: `1px solid ${expired ? '#FCA5A5' : urgent ? '#FDE68A' : '#BBF7D0'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} color={expired ? '#DC2626' : urgent ? '#D97706' : '#059669'} />
          <span style={{ fontSize: 12, fontWeight: 600, color: expired ? '#DC2626' : urgent ? '#D97706' : '#059669' }}>
            {expired ? 'Session Expired' : 'Session Window'}
          </span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: expired ? '#DC2626' : urgent ? '#D97706' : '#059669' }}>
          {expired ? '00:00' : `${mm}:${ss}`}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, transition: 'width 1s linear', background: expired ? '#DC2626' : urgent ? '#D97706' : '#059669' }} />
      </div>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div style={{ minHeight: '100svh', background: 'linear-gradient(135deg,#1E293B,#0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <XCircle size={44} color="#F87171" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Session Unavailable</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, maxWidth: 300, margin: '0 auto' }}>{message}</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 32 }}>Please ask your lecturer to start a new session.</p>
      </div>
    </div>
  )
}
