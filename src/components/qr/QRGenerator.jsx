import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

/**
 * QRGenerator
 * Renders a QR code onto a canvas.
 * Re-generates whenever `payload` changes.
 */
export default function QRGenerator({ payload, size = 280, className = '' }) {
  const canvasRef = useRef(null)
  const [error, setError]   = useState(null)
  const [ready, setReady]   = useState(false)

  useEffect(() => {
    if (!payload) return
    const canvas = canvasRef.current
    if (!canvas) return

    const data = typeof payload === 'string' ? payload : JSON.stringify(payload)

    setReady(false)
    setError(null)

    QRCode.toCanvas(canvas, data, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(() => setReady(true))
      .catch(err => setError(err.message))
  }, [payload, size])

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-red-50 rounded-xl text-red-500 text-xs text-center p-4"
      >
        QR Error: {error}
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className={`rounded-xl ${className}`}
        style={{ width: size, height: size, display: 'block' }}
      />
      {/* Fade-in overlay while generating */}
      {!ready && (
        <div
          className="absolute inset-0 bg-white rounded-xl flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
