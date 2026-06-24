require('dotenv').config()
const express      = require('express')
const cors         = require('cors')
const http         = require('http')
const { Server }   = require('socket.io')
const rateLimit    = require('express-rate-limit')
const compression  = require('compression')
const morgan       = require('morgan')
const cookieParser = require('cookie-parser')

// ── Routes ─────────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth.routes')
const adminRoutes      = require('./routes/admin.routes')
const coursesRoutes    = require('./routes/courses.routes')
const sessionsRoutes   = require('./routes/sessions.routes')
const attendanceRoutes = require('./routes/attendance.routes')
const studentsRoutes   = require('./routes/students.routes')
const analyticsRoutes   = require('./routes/analytics.routes')
const reportsRoutes     = require('./routes/reports.routes')
const hodRoutes         = require('./routes/hod.routes')
const venuesRoutes      = require('./routes/venues.routes')
const schoolsRoutes     = require('./routes/schools.routes')
const eligibilityRoutes    = require('./routes/eligibility.routes')
const appealsRoutes        = require('./routes/appeals.routes')
const announcementsRoutes  = require('./routes/announcements.routes')
const notificationsRoutes  = require('./routes/notifications.routes')
const ussdRoutes           = require('./routes/ussd.routes')
const smsRoutes            = require('./routes/sms.routes')

const app    = express()
const server = http.createServer(app)
const PORT   = process.env.PORT || 5000

// ── WebSocket (real-time attendance updates) ───────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

io.on('connection', (socket) => {
  socket.on('join_session', (sessionId) => {
    socket.join(`session:${sessionId}`)
  })
  socket.on('leave_session', (sessionId) => {
    socket.leave(`session:${sessionId}`)
  })
  socket.on('disconnect', () => {})
})

// Make io accessible from routes
app.set('io', io)

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(compression())
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))

app.use(cookieParser())

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
}
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Global rate limiter (200 req / 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many requests. Please slow down.' },
})
app.use('/api', globalLimiter)

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes)
app.use('/api/admin',      adminRoutes)
app.use('/api/courses',    coursesRoutes)
app.use('/api/lecturer',   coursesRoutes)
app.use('/api/sessions',   sessionsRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/students',   studentsRoutes)
app.use('/api/analytics',   analyticsRoutes)
app.use('/api/reports',     reportsRoutes)
app.use('/api/hod',         hodRoutes)
app.use('/api/venues',      venuesRoutes)
app.use('/api/schools',       schoolsRoutes)
app.use('/api/eligibility',   eligibilityRoutes)
app.use('/api/appeals',       appealsRoutes)
app.use('/api/announcements', announcementsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/ussd',          ussdRoutes)
app.use('/api/sms',           smsRoutes)

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const { isAvailable: dbOk } = require('./config/db')
  const { isAvailable: redisOk } = require('./config/redis')
  res.json({
    status:    'ok',
    service:   'CAMS – Campus Attendance Management System API',
    version:   '2.0.0',
    timestamp: new Date().toISOString(),
    database:  dbOk()    ? 'mysql (live)'   : 'demo (in-memory)',
    cache:     redisOk() ? 'redis (live)'   : 'disabled',
    websocket: io.engine?.clientsCount || 0,
  })
})

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: `Endpoint ${req.method} ${req.originalUrl} not found` })
  }
  next()
})

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message)
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  })
})

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`)
  console.log(`║  CAMS – Campus Attendance Management System       ║`)
  console.log(`║  API v2.0  →  http://localhost:${PORT}              ║`)
  console.log(`╚══════════════════════════════════════════════════╝\n`)
})

module.exports = { app, server, io }
