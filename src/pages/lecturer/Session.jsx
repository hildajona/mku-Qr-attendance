import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import QRGenerator from '../../components/qr/QRGenerator'
import CountdownTimer from '../../components/qr/CountdownTimer'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import StatusBadge from '../../components/ui/StatusBadge'
import { useSession } from '../../context/SessionContext'
import { sessionService } from '../../services/session.service'
import { attendanceService } from '../../services/attendance.service'
import {
  Maximize2, Minimize2, Users, RefreshCw,
  StopCircle, Play, Clock, MapPin, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function Session() {
  const navigate = useNavigate()
  const {
    activeSession, qrToken, expiresAt, expirySeconds,
    attendees, isFullscreen, setIsFullscreen, timerKey,
    startSession, updateQrToken, setAllAttendees, endSession,
  } = useSession()

  const [units, setUnits]           = useState([])
  const [form, setForm]             = useState({ unit_id: '', room: '', classroom_name: '', latitude: '', longitude: '', radius_meters: 100, duration_minutes: 60, qr_expiry_seconds: 300 })
  const [creating, setCreating]     = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [locStatus, setLocStatus]   = useState('')
  const pollRef                     = useRef(null)

  // Load lecturer's units
  useEffect(() => {
    api.get('/lecturer/courses')
      .then(({ data }) => {
        const all = []
        ;(data.courses || []).forEach(c =>
          (c.units || []).forEach(u => all.push({ ...u, course_name: c.name }))
        )
        setUnits(all)
      })
      .catch(() => {
        setUnits([
          { id: 1, name: 'Web Development', code: 'SIT 201', course_name: 'BSc IT' },
          { id: 2, name: 'Network Administration', code: 'SIT 202', course_name: 'BSc IT' },
          { id: 3, name: 'Cybersecurity Fundamentals', code: 'SIT 203', course_name: 'BSc IT' },
        ])
      })
  }, [])

  // Poll attendance every 5 s while session is active
  useEffect(() => {
    if (!activeSession) { clearInterval(pollRef.current); return }
    const fetch = () => {
      attendanceService.getSessionAttendance(activeSession.id)
        .then(({ data }) => setAllAttendees(data.records || []))
        .catch(() => {})
    }
    fetch()
    pollRef.current = setInterval(fetch, 5000)
    return () => clearInterval(pollRef.current)
  }, [activeSession, setAllAttendees])

  // Build the QR payload object that gets encoded into the QR image
  const qrPayload = qrToken && activeSession
    ? {
        token: qrToken,
        secure_token: qrToken,
        session_id: activeSession.id,
        course_id: activeSession.course_id || null,
        lecturer_id: activeSession.lecturer_id || null,
        expires_at: expiresAt,
      }
    : null

  const handleCreate = async () => {
    if (!form.unit_id) { toast.error('Please select a unit'); return }
    if (!form.classroom_name.trim()) { toast.error('Please enter a classroom name'); return }
    if (!form.latitude || !form.longitude) { toast.error('Please capture classroom coordinates'); return }
    setCreating(true)
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: Number(form.radius_meters),
      }
      const { data } = await sessionService.createSession(payload)
      const session = data.session || data
      startSession(session)
      toast.success('Session started — QR code is live!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus('Geolocation is not supported by your browser.')
      return
    }
    setLocStatus('Requesting classroom location...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm(f => ({
          ...f,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          radius_meters: 100,
        }))
        setLocStatus(`Captured location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`)
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Please allow location and try again.',
          2: 'Location unavailable. Try again outside or allow GPS access.',
          3: 'Location request timed out. Try again.',
        }
        setLocStatus(messages[error.code] || 'Unable to get location. Please try again.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  const handleRegenerate = useCallback(async () => {
    if (!activeSession) return
    setRegenerating(true)
    try {
      const { data } = await sessionService.regenerateQR(activeSession.id)
      updateQrToken(data.qr_token, data.expires_at, activeSession.qr_expiry_seconds)
      toast.success('QR refreshed')
    } catch {
      toast.error('Failed to refresh QR')
    } finally {
      setRegenerating(false)
    }
  }, [activeSession, updateQrToken])

  const handleEnd = async () => {
    if (!activeSession) return
    try {
      await sessionService.endSession(activeSession.id)
      endSession()
      toast.success('Session ended')
      navigate('/lecturer/attendance')
    } catch {
      toast.error('Failed to end session')
    }
  }

  // ── FULLSCREEN PROJECTOR MODE ──────────────────────────────────────────────
  if (isFullscreen && activeSession && qrPayload) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 overflow-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Mount Kenya University
          </p>
          <h1 className="text-4xl font-bold text-slate-800">{activeSession.unit_name}</h1>
          {activeSession.room && (
            <p className="text-slate-500 mt-1 flex items-center justify-center gap-1">
              <MapPin size={14} /> {activeSession.room}
            </p>
          )}
        </div>

        {/* QR Code */}
        <div className="p-5 bg-white rounded-3xl shadow-2xl border-4 border-green-100 mb-6 qr-pulse">
          <QRGenerator payload={qrPayload} size={300} />
        </div>

        {/* Countdown */}
        <div className="w-80 mb-6">
          <CountdownTimer
            key={timerKey}
            durationSeconds={expirySeconds}
            onExpired={handleRegenerate}
            large
          />
        </div>

        {/* Scan count */}
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-8 py-4 mb-8">
          <Users size={28} className="text-green-600" />
          <div>
            <p className="text-4xl font-bold text-green-700">{attendees.length}</p>
            <p className="text-sm text-green-600">students scanned</p>
          </div>
        </div>

        {/* Live list preview */}
        {attendees.length > 0 && (
          <div className="w-full max-w-md bg-slate-50 rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto">
            {attendees.slice(0, 10).map((a, i) => (
              <div key={a.id || i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                <span className="font-medium text-slate-700">{a.student_name}</span>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsFullscreen(false)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
        >
          <Minimize2 size={16} /> Exit Fullscreen
        </button>
      </div>
    )
  }

  // ── NORMAL VIEW ────────────────────────────────────────────────────────────
  return (
    <PageWrapper title="Session">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {activeSession ? 'Live Session' : 'Start a New Session'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeSession
              ? 'Your QR code is live — students can scan now'
              : 'Select a unit, set the room, then generate the QR code'}
          </p>
        </div>

        {/* ── SETUP FORM (no active session) ── */}
        {!activeSession && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-700 mb-4">Session Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unit selector */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={form.unit_id}
                  onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
                >
                  <option value="">— Select a unit —</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.course_name} › {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Room / Venue"
                placeholder="e.g. LH-3, Lab-2, Online"
                value={form.room}
                onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
              />

              <Input
                label="Classroom Name"
                placeholder="e.g. Lecture Hall 3"
                value={form.classroom_name}
                onChange={e => setForm(f => ({ ...f, classroom_name: e.target.value }))}
              />

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Latitude"
                  placeholder="-0.416667"
                  value={form.latitude}
                  onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                />
                <Input
                  label="Longitude"
                  placeholder="36.950000"
                  value={form.longitude}
                  onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                />
                <Input
                  label="Radius (m)"
                  type="number"
                  min={25}
                  max={500}
                  value={form.radius_meters}
                  onChange={e => setForm(f => ({ ...f, radius_meters: Number(e.target.value) }))}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={detectLocation}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Auto-detect Classroom Location
                </button>
                {locStatus && <p className="mt-2 text-xs text-slate-500">{locStatus}</p>}
              </div>

              <Input
                label="Class Duration (minutes)"
                type="number"
                min={15}
                max={300}
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
              />

              {/* QR expiry slider */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  QR Code Expiry —{' '}
                  <span className="text-green-600 font-semibold">
                    {Math.floor(form.qr_expiry_seconds / 60)}m {form.qr_expiry_seconds % 60 > 0 ? `${form.qr_expiry_seconds % 60}s` : ''}
                  </span>
                </label>
                <input
                  type="range" min={60} max={600} step={30}
                  value={form.qr_expiry_seconds}
                  onChange={e => setForm(f => ({ ...f, qr_expiry_seconds: Number(e.target.value) }))}
                  className="w-full accent-green-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1 min</span><span>5 min</span><span>10 min</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Play size={16} />}
                loading={creating}
                onClick={handleCreate}
              >
                Generate QR &amp; Start Session
              </Button>
            </div>
          </div>
        )}

        {/* ── ACTIVE SESSION ── */}
        {activeSession && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: QR + timer (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center gap-5">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Scan to mark attendance</p>
                <h2 className="font-bold text-slate-800 text-lg">{activeSession.unit_name}</h2>
                {activeSession.room && (
                  <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                    <MapPin size={12} /> {activeSession.room}
                  </p>
                )}
              </div>

              {/* QR Code */}
              <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-100 qr-pulse">
                <QRGenerator payload={qrPayload} size={240} />
              </div>

              {/* Countdown */}
              <div className="w-full max-w-xs">
                <CountdownTimer
                  key={timerKey}
                  durationSeconds={expirySeconds}
                  onExpired={handleRegenerate}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RefreshCw size={14} />}
                  loading={regenerating}
                  onClick={handleRegenerate}
                  className="flex-1"
                >
                  Refresh QR
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Maximize2 size={14} />}
                  onClick={() => setIsFullscreen(true)}
                  className="flex-1"
                >
                  Project Fullscreen
                </Button>
              </div>
            </div>

            {/* Right: info + attendees (2 cols) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Session info */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen size={15} className="text-green-600" /> Session Info
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['Unit', activeSession.unit_name],
                    ['Course', activeSession.course_name],
                    ['Room', activeSession.room || '—'],
                    ['Classroom', activeSession.classroom_name || '—'],
                    ['Location', activeSession.latitude != null && activeSession.longitude != null ? `${activeSession.latitude}, ${activeSession.longitude} (${activeSession.radius_meters || 100}m)` : '—'],
                    ['Started', new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })],
                    ['Duration', `${activeSession.duration_minutes} min`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-400">{k}</span>
                      <span className="font-medium text-slate-700 text-right max-w-[60%] truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live count */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <Users size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-700">{attendees.length}</p>
                    <p className="text-sm text-green-600">students scanned</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-xs text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </div>
                </div>
              </div>

              {/* Recent scans */}
              {attendees.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex-1 overflow-hidden">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Scans</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {attendees.slice(0, 8).map((a, i) => (
                      <div key={a.id || i} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-700">{a.student_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{a.reg_number}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* End session */}
              <Button
                variant="danger"
                leftIcon={<StopCircle size={16} />}
                onClick={handleEnd}
                className="w-full"
              >
                End Session
              </Button>

              <Button
                variant="secondary"
                onClick={() => navigate('/lecturer/attendance')}
                className="w-full"
              >
                View Full Attendance List
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
