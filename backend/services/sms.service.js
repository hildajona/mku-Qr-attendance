/**
 * SMS Service — Africa's Talking
 * Falls back to console.log in development if API keys not set
 */
const isDev = process.env.NODE_ENV !== 'production'

let AT = null

function getAT() {
  if (AT) return AT
  const apiKey   = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME
  if (!apiKey || !username || apiKey === 'your_api_key_here') {
    return null
  }
  try {
    const AfricasTalking = require('africastalking')
    AT = AfricasTalking({ apiKey, username })
    return AT
  } catch {
    return null
  }
}

async function sendSMS(to, message) {
  // Normalise phone: ensure +254 format
  const phone = to.startsWith('+') ? to : `+254${to.replace(/^0/, '')}`

  const at = getAT()
  if (!at) {
    console.log(`[SMS DEV] To: ${phone}\nMessage: ${message}\n${'─'.repeat(50)}`)
    return { status: 'dev_logged', phone, message }
  }

  try {
    const sms    = at.SMS
    const result = await sms.send({ to: [phone], message, from: process.env.AT_SENDER_ID || 'CAMS' })
    console.log('[SMS] Sent:', result)
    return result
  } catch (err) {
    console.error('[SMS] Error:', err.message)
    // Don't throw — SMS failure should never block core flows
    return { status: 'failed', error: err.message }
  }
}

// ── Pre-built message templates ──────────────────────────────────────────────

const SMS = {
  otp: (otp) =>
    `Your CAMS password reset OTP is: ${otp}. It expires in 10 minutes. Do not share this code.`,

  registerOtp: (otp) =>
    `Your CAMS registration verification OTP is: ${otp}. It expires in 10 minutes.`,

  accountLocked: (minutes) =>
    `Too many failed login attempts. Your CAMS account has been locked for ${minutes} minutes. If this wasn't you, contact your admin immediately.`,

  passwordChanged: () =>
    `Your CAMS password was changed successfully. If this wasn't you, contact your admin immediately.`,

  sessionOpened: (unitCode, dialCode) =>
    `${unitCode} class has started. Scan the QR code or dial *384*${dialCode}# to mark attendance. — CAMS`,

  markedAbsent: (unitCode, date) =>
    `You were marked ABSENT in ${unitCode} on ${date}. If this is wrong, submit an attendance appeal. — CAMS`,

  lowAttendance: (unitCode, pct) =>
    `WARNING: Your attendance in ${unitCode} is now ${pct}%. University requires 75% minimum to sit exams. — CAMS`,

  registrationPending: (name, regNo) =>
    `New student registration: ${name} (${regNo}). Review in CAMS admin panel.`,

  accountApproved: (name, url) =>
    `Hello ${name}, your CAMS account has been approved! Login at: ${url || 'https://attendance.mku.ac.ke'} using your registered phone number and password.`,

  accountRejected: (reason, adminPhone) =>
    `Your registration was not approved. Reason: ${reason}. Please visit the admin office or contact: ${adminPhone || 'Thika Campus'} for assistance.`,
}

module.exports = { sendSMS, SMS }
