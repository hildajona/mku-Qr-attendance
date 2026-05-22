import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from '../components/layout/AuthGuard'

// Auth
import Login from '../pages/auth/Login'

// Admin
import AdminDashboard  from '../pages/admin/Dashboard'
import AdminStudents   from '../pages/admin/Students'
import AdminLecturers  from '../pages/admin/Lecturers'
import AdminCourses    from '../pages/admin/Courses'
import AdminReports    from '../pages/admin/Reports'
import AdminSettings   from '../pages/admin/Settings'

// Lecturer
import LecturerDashboard  from '../pages/lecturer/Dashboard'
import LecturerCourses    from '../pages/lecturer/Courses'
import LecturerSession    from '../pages/lecturer/Session'
import LecturerAttendance from '../pages/lecturer/Attendance'
import LecturerExport     from '../pages/lecturer/Export'

// Student
import StudentDashboard from '../pages/student/Dashboard'
import StudentScanner   from '../pages/student/Scanner'
import StudentHistory   from '../pages/student/History'
import StudentProfile   from '../pages/student/Profile'

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin */}
      <Route path="/admin" element={<AuthGuard allowedRoles={['admin']}><AdminDashboard /></AuthGuard>} />
      <Route path="/admin/students" element={<AuthGuard allowedRoles={['admin']}><AdminStudents /></AuthGuard>} />
      <Route path="/admin/lecturers" element={<AuthGuard allowedRoles={['admin']}><AdminLecturers /></AuthGuard>} />
      <Route path="/admin/courses" element={<AuthGuard allowedRoles={['admin']}><AdminCourses /></AuthGuard>} />
      <Route path="/admin/reports" element={<AuthGuard allowedRoles={['admin']}><AdminReports /></AuthGuard>} />
      <Route path="/admin/settings" element={<AuthGuard allowedRoles={['admin']}><AdminSettings /></AuthGuard>} />

      {/* Lecturer */}
      <Route path="/lecturer" element={<AuthGuard allowedRoles={['lecturer']}><LecturerDashboard /></AuthGuard>} />
      <Route path="/lecturer/courses" element={<AuthGuard allowedRoles={['lecturer']}><LecturerCourses /></AuthGuard>} />
      <Route path="/lecturer/session" element={<AuthGuard allowedRoles={['lecturer']}><LecturerSession /></AuthGuard>} />
      <Route path="/lecturer/attendance" element={<AuthGuard allowedRoles={['lecturer']}><LecturerAttendance /></AuthGuard>} />
      <Route path="/lecturer/export" element={<AuthGuard allowedRoles={['lecturer']}><LecturerExport /></AuthGuard>} />

      {/* Student */}
      <Route path="/student" element={<AuthGuard allowedRoles={['student']}><StudentDashboard /></AuthGuard>} />
      <Route path="/student/scanner" element={<AuthGuard allowedRoles={['student']}><StudentScanner /></AuthGuard>} />
      <Route path="/student/history" element={<AuthGuard allowedRoles={['student']}><StudentHistory /></AuthGuard>} />
      <Route path="/student/profile" element={<AuthGuard allowedRoles={['student']}><StudentProfile /></AuthGuard>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
