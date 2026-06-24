import React, { useState, useCallback, useRef } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import QRScanner from '../../components/qr/QRScanner'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { attendanceService } from '../../services/attendance.service'
import { verifyQRPayload } from '../../utils/qr.utils'
import { CheckCircle2, XCircle, ScanLine, RotateCcw, Loader2, Shield } from 'lucide-react'

const S = { SCANNING: 'scanning', LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' }

export default function Scanner() {
  const { user }           = useAuth()
  const [state, setState]  = useState(S.SCANNING)
  const [result, setResult] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [active, setActive] = useState(true)
  const processing          = useRef(false)

  const handleScan = useCallback(async (raw) => {
    if (processing.current || state !== S.SCANNING) return
    processing.current = true
    setActive(false)
    setState(S.LOADING)

    try {
      // 1. Parse QR — could be a JWT string or JSON payload
      let token = raw
      let clientExpiry = null

      // Try JSON format first (older QR codes)
      try {
        const parsed = JSON.parse(raw)
        token = parsed.token
        clientExpiry = parsed.expires_at
      } catch {
        // It's a raw JWT — use directly
        token = raw
      }

      if (!token) {
        setState(S.ERROR)
        setErrMsg('This is not a valid CAMS attendance QR code.')
        return
      }

      // 2. Client-side expiry check for JSON payloads
      if (clientExpiry && new Date(clientExpiry) < new Date()) {
        setState(S.ERROR)
        setErrMsg('This QR code has expired. Ask your lecturer to refresh it.')
        return
      }

      // 3. Optional: get GPS location
      let lat = null, lng = null
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
        )
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch { /* GPS optional */ }

      // 4. Submit to backend
      const { data } = await attendanceService.checkIn(token, user?.id, { lat, lng })
      setState(S.SUCCESS)
      setResult(data)
    } catch (err) {
      setState(S.ERROR)
      setErrMsg(err.response?.data?.message || 'Could not record attendance. Try again.')
    } finally {
      processing.current = false
    }
  }, [state, user])

  const handleCameraError = useCallback((err) => {
    setState(S.ERROR)
    setErrMsg(err)
    setActive(false)
    processing.current = false
  }, [])

  const reset = () => {
    setState(S.SCANNING)
    setResult(null)
    setErrMsg('')
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
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">{errMsg}</p>
            <Button variant="secondary" className="w-full" leftIcon={<RotateCcw size={16} />} onClick={reset}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
