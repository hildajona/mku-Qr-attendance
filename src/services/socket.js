import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
    socket.on('connect_error', () => {
      // Silent — polling fallback handles this
    })
  }
  return socket
}

export function joinSession(sessionId) {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.emit('join_session', sessionId)
}

export function leaveSession(sessionId) {
  const s = getSocket()
  s.emit('leave_session', sessionId)
}

export function onAttendanceUpdate(cb) {
  getSocket().on('attendance_update', cb)
  return () => getSocket().off('attendance_update', cb)
}

export function disconnect() {
  if (socket) { socket.disconnect(); socket = null }
}
