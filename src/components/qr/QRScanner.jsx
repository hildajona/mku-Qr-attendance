import React, { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'
import { useCamera } from '../../hooks/useCamera'
import { Camera, CameraOff, Loader2 } from 'lucide-react'

export default function QRScanner({ onScan, onError, active = true }) {
  const { videoRef, hasPermission, error: camError, isActive, startCamera, stopCamera } = useCamera()
  const canvasRef     = useRef(null)
  const rafRef        = useRef(null)
  const lastScanRef   = useRef(0)
  const frameCountRef = useRef(0)
  const debugRef      = useRef(null)
  const [scanning, setScanning] = useState(false)
 
  const decode = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
 
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(decode)
      return
    }
 
    // Guard: Only check video dimensions. This is 100% reliable across mobile browsers,
    // avoiding readyState bugs while preventing IndexSizeErrors on canvas drawing.
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      rafRef.current = requestAnimationFrame(decode)
      return
    }
 
    try {
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
 
      // Handle interop issues where jsQR could be imported as an object with a default property
      const decodeFn = typeof jsQR === 'function' ? jsQR : jsQR?.default
      if (typeof decodeFn !== 'function') {
        throw new Error('QR scanner library (jsQR) is not loaded correctly.')
      }
 
      // Use attemptBoth inversion to support dark mode QR screens
      const code = decodeFn(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      // Update low-performance debug counter directly on DOM
      frameCountRef.current += 1
      if (debugRef.current) {
        debugRef.current.innerText = `Active - Frames: ${frameCountRef.current} | ${video.videoWidth}x${video.videoHeight}`
      }
 
      if (code) {
        const now = Date.now()
        // Debounce: don't fire same scan within 2 seconds
        if (now - lastScanRef.current > 2000) {
          lastScanRef.current = now
          onScan?.(code.data)
          return // pause loop briefly
        }
      }
    } catch (err) {
      // Transient per-frame decode error (bad pixel data, resize race, etc.)
      // DO NOT stop the loop or call onError — just skip this frame and keep going.
      console.warn('[QRScanner] Skipped frame (decode error):', err.message)
    }
 
    rafRef.current = requestAnimationFrame(decode)
  }, [onScan, onError])
 
  useEffect(() => {
    if (active) {
      startCamera()
    } else {
      stopCamera()
      cancelAnimationFrame(rafRef.current)
    }
  }, [active, startCamera, stopCamera])
 
  useEffect(() => {
    if (isActive) {
      setScanning(true)
      rafRef.current = requestAnimationFrame(decode)
    } else {
      setScanning(false)
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, decode])
 
  useEffect(() => {
    if (camError) onError?.(camError)
  }, [camError, onError])

  if (hasPermission === false || camError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-100 rounded-2xl text-center">
        <CameraOff size={48} className="text-slate-400" />
        <div>
          <p className="font-semibold text-slate-700">Camera Unavailable</p>
          <p className="text-sm text-slate-500 mt-1">{camError || 'Camera permission denied'}</p>
        </div>
        <button
          onClick={startCamera}
          className="btn btn-primary text-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Video feed */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Corner brackets */}
            <div className="relative w-48 h-48">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              {/* Scan line */}
              <div className="absolute left-2 right-2 h-0.5 bg-green-400 opacity-80 animate-bounce top-1/2" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {!isActive && hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm">Starting camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for decoding - positioned off-screen to prevent mobile browser display:none blank pixel optimizations */}
      <canvas ref={canvasRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} />

      {scanning && (
        <>
          <p className="text-center text-sm text-slate-500 mt-3">
            Point your camera at the QR code
          </p>
          <div
            ref={debugRef}
            style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '8px', fontFamily: 'monospace' }}
          />
        </>
      )}
    </div>
  )
}
