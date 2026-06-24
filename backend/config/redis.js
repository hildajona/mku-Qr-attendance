/**
 * Redis client — gracefully disabled when Redis is not available.
 * When REDIS_ENABLED=false or connection fails, all operations become no-ops
 * and the system falls back to DB-only validation.
 */
const ENABLED = process.env.REDIS_ENABLED !== 'false'

let client = null
let available = false

if (ENABLED) {
  try {
    const Redis = require('ioredis')
    client = new Redis({
      host:           process.env.REDIS_HOST     || '127.0.0.1',
      port:           parseInt(process.env.REDIS_PORT) || 6379,
      password:       process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 2000,
      lazyConnect:    true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
    client.on('connect',        () => { available = true;  console.log('✅  Redis connected') })
    client.on('error',          (e) => { available = false; console.log('⚠️   Redis unavailable:', e.message) })
    client.on('close',          () => { available = false })
    client.connect().catch(() => { available = false })
  } catch {
    console.log('⚠️   ioredis not installed — Redis disabled')
  }
} else {
  console.log('ℹ️   Redis disabled (REDIS_ENABLED=false)')
}

// ── Token cache helpers ────────────────────────────────────────────────────

/** Store active QR token in Redis with TTL */
async function cacheToken(token, sessionId, ttlSeconds) {
  if (!available) return
  try {
    await client.set(`qr:${token}`, String(sessionId), 'EX', ttlSeconds)
  } catch { /* ignore */ }
}

/** Check if token exists in Redis (fast path — avoids DB hit) */
async function getTokenSession(token) {
  if (!available) return null
  try {
    return await client.get(`qr:${token}`)
  } catch { return null }
}

/** Invalidate a token (session ended or QR regenerated) */
async function deleteToken(token) {
  if (!available) return
  try {
    await client.del(`qr:${token}`)
  } catch { /* ignore */ }
}

/** Track scan attempts per student per session (rate limiting) */
async function getScanAttempts(studentId, sessionId) {
  if (!available) return 0
  try {
    const val = await client.get(`scans:${studentId}:${sessionId}`)
    return parseInt(val) || 0
  } catch { return 0 }
}

async function incrementScanAttempts(studentId, sessionId) {
  if (!available) return
  try {
    const key = `scans:${studentId}:${sessionId}`
    await client.incr(key)
    await client.expire(key, 3600) // expire after 1 hour
  } catch { /* ignore */ }
}

/** Cache attendance count for a session (invalidated on new scan) */
async function cacheAttendanceCount(sessionId, count) {
  if (!available) return
  try {
    await client.set(`count:${sessionId}`, String(count), 'EX', 10)
  } catch { /* ignore */ }
}

async function getCachedCount(sessionId) {
  if (!available) return null
  try {
    const val = await client.get(`count:${sessionId}`)
    return val !== null ? parseInt(val) : null
  } catch { return null }
}

async function invalidateCount(sessionId) {
  if (!available) return
  try {
    await client.del(`count:${sessionId}`)
  } catch { /* ignore */ }
}

module.exports = {
  isAvailable: () => available,
  cacheToken,
  getTokenSession,
  deleteToken,
  getScanAttempts,
  incrementScanAttempts,
  cacheAttendanceCount,
  getCachedCount,
  invalidateCount,
  client: () => client,
}
