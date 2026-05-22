require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const authRoutes       = require('./routes/auth.routes')
const adminRoutes      = require('./routes/admin.routes')
const coursesRoutes    = require('./routes/courses.routes')
const sessionsRoutes   = require('./routes/sessions.routes')
const attendanceRoutes = require('./routes/attendance.routes')

const app  = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API Routes
app.use('/api/auth',       authRoutes)
app.use('/api/admin',      adminRoutes)
app.use('/api/courses',    coursesRoutes)
app.use('/api/lecturer',   coursesRoutes)   // /api/lecturer/courses uses same router
app.use('/api/sessions',   sessionsRoutes)
app.use('/api/attendance', attendanceRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MKU Attendance API' })
})

// 404 handler for unknown API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: `Route ${req.originalUrl} not found` })
  }
  next()
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 MKU Attendance API running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`)
})

module.exports = app
