/**
 * Generate a QR payload object (client-side, for fallback)
 */
export function generateQRPayload(sessionId, expirySeconds = 300) {
  const token = crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36)
  const expires_at = new Date(Date.now() + expirySeconds * 1000).toISOString()
  return { token, session_id: sessionId, expires_at }
}

/**
 * Encode payload to JSON string for embedding in QR image
 */
export function encodeQRPayload(payload) {
  return typeof payload === 'string' ? payload : JSON.stringify(payload)
}

/**
 * Decode a scanned QR string.
 * Handles both JSON payloads and raw JWT strings.
 * Returns null if completely unrecognisable.
 */
export function decodeQRPayload(raw) {
  if (!raw) return null
  try {
    const payload = JSON.parse(raw)
    if (!payload.token) return null
    return payload
  } catch {
    // Not JSON — treat as raw JWT token
    if (typeof raw === 'string' && raw.split('.').length === 3) {
      return { token: raw }
    }
    return null
  }
}

/**
 * Alias used by the enterprise scanner.
 * Same as decodeQRPayload.
 */
export function verifyQRPayload(raw) {
  return decodeQRPayload(raw)
}

/**
 * Check if a QR payload is still valid (not expired)
 */
export function isQRValid(payload) {
  if (!payload?.expires_at) return true // JWT — server validates
  return new Date(payload.expires_at) > new Date()
}

/**
 * Get remaining seconds from an expiry date string
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
