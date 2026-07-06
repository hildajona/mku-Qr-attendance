import React, { useState, useCallback, useRef, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import QRScanner from '../../components/qr/QRScanner'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { attendanceService } from '../../services/attendance.service'
import { CheckCircle2, XCircle, ScanLine, RotateCcw, Loader2, Shield, MapPin, MapPinOff } from 'lucide-react'

const S = { SCANNING: 'scanning', LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' }

export default function Scanner() {
  const { user }            = useAuth()
  const [state, setState]   = useState(S.SCANNING)
  const [result, setResult] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [locationStatus, setLocationStatus] = useState(null) // 'ok' | 'denied' | 'unavailable'
  const [active, setActive] = useState(true)
  const processing          = useRef(false)
  // Keep a ref in sync with state so handleScan never reads a stale closure value
  const stateRef            = useRef(S.SCANNING)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const handleScan = useCallback(async (raw) => {
    // Use ref to avoid stale-closure issue with state
    if (processing.current || stateRef.current !== S.SCANNING) return
    processing.current = true
    setActive(false)
    setState(S.LOADING)
    stateRef.current = S.LOADING

    try {
      // ── Step 1: Parse QR — JWT string or JSON payload ──────────────────
      let token = raw

      try {
        const parsed = JSON.parse(raw)
        token = parsed.token
      } catch {
        // Raw JWT — use directly
        token = raw
      }

      if (!token) {
        setState(S.ERROR)
        stateRef.current = S.ERROR
        setErrMsg('This is not a valid CAMS attendance QR code.')
        return
      }

      // ── Step 2: Get GPS location (non-blocking — failure is graceful) ───
      let lat = null, lng = null
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 20000,
          })
        )
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        setLocationStatus('ok')
      } catch (geoErr) {
        // GPS failed — backend will decide if it's required for this session
        if (geoErr.code === 1) {
          setLocationStatus('denied')
        } else {
          setLocationStatus('unavailable')
        }
        console.warn('Geolocation failed:', geoErr.message)
      }

      // ── Step 3: Submit to backend ───────────────────────────────────────
      const { data } = await attendanceService.checkIn(token, user?.id, { lat, lng })
      setState(S.SUCCESS)
      stateRef.current = S.SUCCESS
      setResult(data)
    } catch (err) {
      setState(S.ERROR)
      stateRef.current = S.ERROR

      const serverMsg = err.response?.data?.message

      // Provide actionable guidance based on error type
      if (err.response?.status === 400 && serverMsg?.toLowerCase().includes('location')) {
        setErrMsg('📍 ' + serverMsg + '\n\nPlease enable GPS/Location in your device settings and try again.')
      } else if (err.response?.status === 400 && serverMsg?.toLowerCase().includes('expired')) {
        setErrMsg('⏱ ' + serverMsg)
      } else if (err.response?.status === 403) {
        setErrMsg('🚫 ' + (serverMsg || 'You are not enrolled in the unit for this session.'))
      } else if (err.response?.status === 409) {
        setErrMsg('✅ Attendance already recorded for this session.')
      } else if (err.response?.status === 429) {
        setErrMsg('⛔ Too many scan attempts. Please wait a moment and try again.')
      } else if (!err.response) {
        setErrMsg('🌐 Could not reach the server. Check your internet connection and try again.')
      } else {
        setErrMsg(serverMsg || 'Could not record attendance. Try again.')
      }
    } finally {
      processing.current = false
    }
  }, [user])

  const handleCameraError = useCallback((err) => {
    setState(S.ERROR)
    stateRef.current = S.ERROR
    setErrMsg(err)
    setActive(false)
    processing.current = false
  }, [])

  const reset = () => {
    setState(S.SCANNING)
    stateRef.current = S.SCANNING
    setResult(null)
    setErrMsg('')
    setLocationStatus(null)
    setActive(true)
    processing.current = false
  }

  return (
    <PageWrapper title="Scan QR">
      <div className="max-w-sm mx-auto space-y-5 pb-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Scan QR Code</h1>
          <p className="text-sm text-slate-500 mt-1">
            Point your camera at the QR code your lecturer is projecting
          </p>
        </div>

        {/* Location status badge */}
        {locationStatus && state === S.LOADING && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
            locationStatus === 'ok'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {locationStatus === 'ok'
              ? <><MapPin size={13} /> Location captured</>
              : <><MapPinOff size={13} /> Location unavailable — continuing without GPS</>
            }
          </div>
        )}

        {/* SCANNING / LOADING */}
        {(state === S.SCANNING || state === S.LOADING) && (
          <div className="space-y-4">
            <QRScanner onScan={handleScan} onError={handleCameraError} active={state === S.SCANNING} />
            {state === S.LOADING && (
              <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-2xl py-4 text-green-700 font-medium">
                <Loader2 size={18} className="animate-spin" />
                Recording your attendance…
              </div>
            )}
          </div>
        )}

        {/* SUCCESS */}
        {state === S.SUCCESS && (
          <div className="bg-white rounded-3xl border border-green-100 shadow-lg p-8 text-center fade-in">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {result?.status === 'late' ? '⏰ Marked Late' : '✅ Attendance Recorded!'}
            </h2>
            <p className="text-slate-500 text-sm mb-5">{result?.message}</p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2.5 mb-6">
              {[
                ['Student',  result?.student_name || user?.name],
                ['Reg No.',  user?.reg_number],
                ['Unit',     result?.unit_name],
                ['Status',   result?.status === 'late' ? 'Late' : 'Present'],
                ['Time',     new Date().toLocaleTimeString()],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className={`font-semibold ${k === 'Status' && result?.status === 'late' ? 'text-amber-600' : k === 'Status' ? 'text-green-600' : 'text-slate-700'}`}>{v}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-5">
              <Shield size={12} />
              Verified by CAMS — attendance is final
            </div>

            <Button variant="primary" className="w-full" leftIcon={<ScanLine size={16} />} onClick={reset}>
              Scan Another Class
            </Button>
          </div>
        )}

        {/* ERROR */}
        {state === S.ERROR && (
          <div className="bg-white rounded-3xl border border-red-100 shadow-lg p-8 text-center fade-in">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan Failed</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed whitespace-pre-line">{errMsg}</p>
            <Button variant="secondary" className="w-full" leftIcon={<RotateCcw size={16} />} onClick={reset}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
