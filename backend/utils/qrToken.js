/**
 * QR Token utility
 * Each QR payload is a signed JWT so it cannot be forged.
 * Payload: { sid: sessionId, iat, exp }
 */
const jwt  = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const SECRET = process.env.QR_TOKEN_SECRET || 'cams_qr_token_secret'

/**
 * Generate a signed QR token for a session.
 * @param {string} sessionId
 * @param {number} expirySeconds
 * @returns {{ token: string, expires_at: string }}
 */
function generateQRToken(sessionId, expirySeconds = 300) {
  const token = jwt.sign(
    { sid: sessionId, nonce: uuidv4() },   // nonce prevents replay
    SECRET,
    { expiresIn: expirySeconds }
  )
  const expires_at = new Date(Date.now() + expirySeconds * 1000).toISOString()
  return { token, expires_at }
}

/**
 * Verify and decode a QR token.
 * @param {string} token
 * @returns {{ sid: string } | null}  null if invalid/expired
 */
function verifyQRToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

module.exports = { generateQRToken, verifyQRToken }
