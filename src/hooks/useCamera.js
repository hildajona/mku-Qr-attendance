import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Camera hook for QR scanning
 */
export function useCamera() {
  const videoRef                    = useRef(null)
  const streamRef                   = useRef(null)
  const isStartingRef               = useRef(false)
  const [hasPermission, setHasPermission] = useState(null) // null=unknown, true, false
  const [error, setError]           = useState(null)
  const [isActive, setIsActive]     = useState(false)

  const startCamera = useCallback(async () => {
    if (isStartingRef.current || streamRef.current) {
      setHasPermission(true)
      setIsActive(true)
      return
    }

    isStartingRef.current = true
    setError(null)

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        const playPromise = videoRef.current.play()
        if (playPromise && typeof playPromise.then === 'function') {
          await playPromise.catch(err => {
            if (err.name !== 'AbortError') {
              throw err
            }
          })
        }
      }
      setHasPermission(true)
      setIsActive(true)
    } catch (err) {
      setHasPermission(false)
      setIsActive(false)
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError(`Camera error: ${err.message}`)
      }
    } finally {
      isStartingRef.current = false
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  return { videoRef, hasPermission, error, isActive, startCamera, stopCamera }
}
