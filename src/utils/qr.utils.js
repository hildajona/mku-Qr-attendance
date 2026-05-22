/**
 * Generate a QR payload object
 * @param {number} sessionId
 * @param {number|null} courseId
 * @param {number|null} lecturerId
 * @param {number} expirySeconds - seconds until expiry
 * @returns {{ token: string, secure_token: string, session_id: number, course_id: number|null, lecturer_id: number|null, expires_at: string }}
 */
export function generateQRPayload(sessionId, courseId = null, lecturerId = null, expirySeconds = 300) {
  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
  const expires_at = new Date(Date.now() + expirySeconds * 1000).toISOString()
  return { token, secure_token: token, session_id: sessionId, course_id: courseId, lecturer_id: lecturerId, expires_at }
}

/**
 * Encode payload to a JSON string for embedding in QR
 */
export function encodeQRPayload(payload) {
  return JSON.stringify(payload)
}

/**
 * Decode a scanned QR string back to payload object
 * Returns null if invalid
 */
export function decodeQRPayload(raw) {
  try {
    const payload = JSON.parse(raw)
    if (!payload.token || !payload.secure_token || !payload.session_id || !payload.expires_at) return null
    if (payload.token !== payload.secure_token) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Check if a QR payload is still valid (not expired)
 */
export function isQRValid(payload) {
  if (!payload?.expires_at) return false
  return new Date(payload.expires_at) > new Date()
}

/**
 * Get remaining seconds from a QR payload
 */
export function getRemainingSeconds(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  return Math.max(0, Math.floor(diff / 1000))
}

/**
 * Format seconds as MM:SS
 */
export function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
