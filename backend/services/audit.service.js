/**
 * Audit Log Service
 * Records every important admin/system action to the audit_logs table
 */
const { pool, isAvailable } = require('../config/db')

/**
 * @param {object} opts
 * @param {number}  opts.userId   - Who performed the action
 * @param {string}  opts.action   - e.g. 'LOGIN', 'CREATE_SESSION', 'APPROVE_STUDENT'
 * @param {string}  [opts.target] - e.g. 'user:42', 'session:17'
 * @param {string}  [opts.detail] - Extra JSON/text detail
 * @param {string}  [opts.ip]     - IP address
 */
async function auditLog({ userId, action, target = null, detail = null, ip = null }) {
  try {
    if (!isAvailable()) {
      console.log(`[AUDIT] ${action} by user:${userId} | target:${target} | ${detail}`)
      return
    }
    const db = pool()
    await db.query(
      'INSERT INTO audit_logs (user_id, action, target, detail, ip_address) VALUES (?,?,?,?,?)',
      [userId, action, target, detail ? JSON.stringify(detail) : null, ip]
    )
  } catch (err) {
    // Audit log failure must NEVER break the main flow
    console.error('[AUDIT] Failed to write log:', err.message)
  }
}

module.exports = { auditLog }
