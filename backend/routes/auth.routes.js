const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const { pool, isAvailable } = require('../config/db')
const mock     = require('../config/mockData')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'mku_secret_key',
    { expiresIn: '7d' }
  )
}

function safeUser(user) {
  const { password_hash, ...rest } = user
  return rest
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email/reg number and password are required' })
  }

  try {
    let user = null

    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(
        'SELECT * FROM users WHERE (email = ? OR reg_number = ?) AND is_active = TRUE LIMIT 1',
        [identifier.trim(), identifier.trim()]
      )
      user = rows[0] || null
    } else {
      // Mock lookup
      user = mock.users.find(
        u => (u.email === identifier.trim() || u.reg_number === identifier.trim()) && u.is_active
      )
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. Check your email/reg number.' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid password.' })
    }

    const token = makeToken(user)
    res.json({ token, user: safeUser(user) })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Server error during login' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    let user = null
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(
        'SELECT id,name,email,role,reg_number,course,department,is_active,created_at FROM users WHERE id = ?',
        [req.user.id]
      )
      user = rows[0]
    } else {
      user = mock.users.find(u => u.id === req.user.id)
    }
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(safeUser(user))
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both passwords required' })
  }
  try {
    let user = null
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
      user = rows[0]
    } else {
      user = mock.users.find(u => u.id === req.user.id)
    }
    if (!user) return res.status(404).json({ message: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' })

    const hash = await bcrypt.hash(newPassword, 10)
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id])
    } else {
      user.password_hash = hash
    }
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
