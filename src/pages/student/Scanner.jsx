import React, { useState, useCallback, useRef } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import QRScanner from '../../components/qr/QRScanner'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import { decodeQRPayload, isQRValid } from '../../utils/qr.utils'
import { CheckCircle2, XCircle, ScanLine, RotateCcw, Loader2 } from 'lucide-react'

const S = { SCANNING: 'scanning', LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' }

export default function Scanner() {
  const { user }              = useAuth()
  const [state, setState]     = useState(S.SCANNING)
  const [result, setResult]   = useState(null)   // { message, unit_name, status }
  const [errMsg, setErrMsg]   = useState('')
  const [active, setActive]   = useState(true)
  const processingRef         = useRef(false)

  const eventDate = result?.scanned_at ? new Date(result.scanned_at) : new Date()

  const getGeolocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            gps_lat: position.coords.latitude,
            gps_lng: position.coords.longitude,
            gps_accuracy: position.coords.accuracy,
          })
        },
        error => {
          const messages = {
            1: 'Location permission denied. Please allow location access and try again.',
            2: 'Location information is unavailable. Please try again in a better signal area.',
            3: 'Location request timed out. Please try again.',
          }
          reject(new Error(messages[error.code] || 'Unable to obtain your location.'))
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }, [])

  const handleScan = useCallback(async (raw) => {
    // Prevent double-fire
    if (processingRef.current || state !== S.SCANNING) return
    processingRef.current = true
    setActive(false)
    setState(S.LOADING)

    try {
      // 1. Try to parse as JSON QR payload
      const payload = decodeQRPayload(raw)

      if (!payload || !payload.token) {
        setState(S.ERROR)
        setErrMsg('This is not a valid MKU attendance QR code.')
        return
      }

      // 2. Client-side expiry check
      if (!isQRValid(payload)) {
        setState(S.ERROR)
        setErrMsg('This QR code has expired. Ask your lecturer to refresh it.')
        return
      }

      // 3. Capture location and submit to backend
      const locationPayload = await getGeolocation()
      const { data } = await api.post('/attendance/mark', {
        token: payload.token,
        student_id: user?.id,
        ...locationPayload,
      })

      setState(S.SUCCESS)
      setResult(data)
    } catch (err) {
      setState(S.ERROR)
      const msg = err.response?.data?.message || 'Could not record attendance. Try again.'
      setErrMsg(msg)
    } finally {
      processingRef.current = false
    }
  }, [state, user])

  const handleCameraError = useCallback((err) => {
    setState(S.ERROR)
    setErrMsg(err)
    setActive(false)
    processingRef.current = false
  }, [])

  const reset = () => {
    setState(S.SCANNING)
    setResult(null)
    setErrMsg('')
    setActive(true)
    processingRef.current = false
  }

  return (
    <PageWrapper title="Scan QR">
      <div className="max-w-sm mx-auto space-y-5 pb-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Scan QR Code</h1>
          <p className="text-sm text-slate-500 mt-1">
            Point your camera at the QR code your lecturer is projecting.
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            This scan also requests your device location to confirm you are physically present in class. Allow location access when prompted.
          </p>
        </div>

        {/* ── SCANNING STATE ── */}
        {(state === S.SCANNING || state === S.LOADING) && (
          <div className="space-y-4">
            <QRScanner
              onScan={handleScan}
              onError={handleCameraError}
              active={state === S.SCANNING}
            />
            <div className="text-xs text-slate-400">
              Your browser may prompt for location permission. This is required for GPS verification of the attendance scan.
            </div>
            {state === S.LOADING && (
              <div className="flex items-center justify-center gap-2 text-green-600 font-medium py-2">
                <Loader2 size={18} className="animate-spin" />
                Recording your attendance…
              </div>
            )}
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {state === S.SUCCESS && (
          <div className="bg-white rounded-3xl border border-green-100 shadow-lg p-8 text-center fade-in">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {result?.status === 'late' ? 'Marked Late' : 'Attendance Recorded!'}
            </h2>
            <p className="text-slate-500 text-sm mb-4">{result?.message}</p>

            {/* Receipt card */}
            <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Student</span>
                <span className="font-semibold text-slate-700">{user?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Reg No.</span>
                <span className="font-mono text-slate-700">{user?.reg_number}</span>
              </div>
              {result?.unit_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Unit</span>
                  <span className="font-semibold text-slate-700">{result.unit_name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`font-bold ${result?.status === 'late' ? 'text-amber-600' : 'text-green-600'}`}>
                  {result?.status === 'late' ? 'Late' : 'Present'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Date</span>
                <span className="text-slate-700">{eventDate.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Time</span>
                <span className="text-slate-700">{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {result?.distance_from_class != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Distance</span>
                  <span className="text-slate-700">{Math.round(result.distance_from_class)} m</span>
                </div>
              )}
              {result?.potential_spoof && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-amber-700 text-sm">
                  Location accuracy is very high; this may indicate a spoofed GPS reading. If this seems wrong, retry the scan from the classroom.
                </div>
              )}
            </div>

            <Button variant="primary" className="w-full" leftIcon={<ScanLine size={16} />} onClick={reset}>
              Scan Another Class
            </Button>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {state === S.ERROR && (
          <div className="bg-white rounded-3xl border border-red-100 shadow-lg p-8 text-center fade-in">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan Failed</h2>
            <p className="text-slate-500 text-sm mb-6">{errMsg}</p>
            <Button variant="secondary" className="w-full" leftIcon={<RotateCcw size={16} />} onClick={reset}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
