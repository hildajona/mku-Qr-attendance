import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from '../components/layout/AuthGuard'

// Auth
import Login          from '../pages/auth/Login'
import Register       from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'

// Admin
import AdminDashboard     from '../pages/admin/Dashboard'
import AdminStudents      from '../pages/admin/Students'
import AdminLecturers     from '../pages/admin/Lecturers'
import AdminCourses       from '../pages/admin/Courses'
import AdminReports       from '../pages/admin/Reports'
import AdminSettings      from '../pages/admin/Settings'
import AdminRegistrations from '../pages/admin/Registrations'
import AdminSchools       from '../pages/admin/Schools'
import AdminAnalytics     from '../pages/admin/Analytics'
import AdminDepartments   from '../pages/admin/Departments'
import AdminUnits         from '../pages/admin/Units'
import AdminSessions      from '../pages/admin/Sessions'
import AdminGoogleSheetsSync from '../pages/admin/GoogleSheetsSync'


// Lecturer
import LecturerDashboard  from '../pages/lecturer/Dashboard'
import LecturerCourses    from '../pages/lecturer/Courses'
import LecturerSession    from '../pages/lecturer/Session'
import LecturerAttendance from '../pages/lecturer/Attendance'
import LecturerExport     from '../pages/lecturer/Export'

// HOD
import HodDashboard    from '../pages/hod/Dashboard'
import HodCourses      from '../pages/hod/Courses'
import HodSessions     from '../pages/hod/Sessions'
import HodLecturers    from '../pages/hod/Lecturers'
import HodReports      from '../pages/hod/Reports'

// Student
import StudentDashboard from '../pages/student/Dashboard'
import StudentScanner   from '../pages/student/Scanner'
import StudentHistory   from '../pages/student/History'
import StudentProfile   from '../pages/student/Profile'
import StudentCheckin   from '../pages/student/Checkin'

export default function AppRouter() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/"                element={<Navigate to="/login" replace />} />

      {/* ── Public student check-in (no auth) ── */}
      <Route path="/checkin/:token"  element={<StudentCheckin />} />

      {/* ── Admin ── */}
      <Route path="/admin"              element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard"    element={<AuthGuard allowedRoles={['admin']}><AdminDashboard /></AuthGuard>} />
      <Route path="/admin/departments"  element={<AuthGuard allowedRoles={['admin']}><AdminDepartments /></AuthGuard>} />
      <Route path="/admin/lecturers"    element={<AuthGuard allowedRoles={['admin']}><AdminLecturers /></AuthGuard>} />
      <Route path="/admin/units"        element={<AuthGuard allowedRoles={['admin']}><AdminUnits /></AuthGuard>} />
      <Route path="/admin/students"     element={<AuthGuard allowedRoles={['admin']}><AdminStudents /></AuthGuard>} />
      <Route path="/admin/sessions"     element={<AuthGuard allowedRoles={['admin']}><AdminSessions /></AuthGuard>} />
      <Route path="/admin/reports"      element={<AuthGuard allowedRoles={['admin']}><AdminReports /></AuthGuard>} />
      <Route path="/admin/analytics"    element={<AuthGuard allowedRoles={['admin']}><AdminAnalytics /></AuthGuard>} />
      <Route path="/admin/settings"     element={<AuthGuard allowedRoles={['admin']}><AdminSettings /></AuthGuard>} />
      <Route path="/admin/sheets-sync" element={<AuthGuard allowedRoles={['admin']}><AdminGoogleSheetsSync /></AuthGuard>} />

      {/* Legacy routes preserved */}
      <Route path="/admin/courses"      element={<AuthGuard allowedRoles={['admin']}><AdminCourses /></AuthGuard>} />
      <Route path="/admin/registrations"element={<AuthGuard allowedRoles={['admin']}><AdminRegistrations /></AuthGuard>} />
      <Route path="/admin/schools"      element={<AuthGuard allowedRoles={['admin']}><AdminSchools /></AuthGuard>} />

      {/* ── Lecturer ── */}
      <Route path="/lecturer"             element={<Navigate to="/lecturer/dashboard" replace />} />
      <Route path="/lecturer/dashboard"   element={<AuthGuard allowedRoles={['lecturer']}><LecturerDashboard /></AuthGuard>} />
      <Route path="/lecturer/courses"     element={<AuthGuard allowedRoles={['lecturer']}><LecturerCourses /></AuthGuard>} />
      <Route path="/lecturer/session"     element={<AuthGuard allowedRoles={['lecturer']}><LecturerSession /></AuthGuard>} />
      <Route path="/lecturer/attendance"  element={<AuthGuard allowedRoles={['lecturer']}><LecturerAttendance /></AuthGuard>} />
      <Route path="/lecturer/export"      element={<AuthGuard allowedRoles={['lecturer']}><LecturerExport /></AuthGuard>} />

      {/* ── HOD ── */}
      <Route path="/hod"                  element={<Navigate to="/hod/dashboard" replace />} />
      <Route path="/hod/dashboard"        element={<AuthGuard allowedRoles={['hod']}><HodDashboard /></AuthGuard>} />
      <Route path="/hod/courses"          element={<AuthGuard allowedRoles={['hod']}><HodCourses /></AuthGuard>} />
      <Route path="/hod/sessions"         element={<AuthGuard allowedRoles={['hod']}><HodSessions /></AuthGuard>} />
      <Route path="/hod/lecturers"        element={<AuthGuard allowedRoles={['hod']}><HodLecturers /></AuthGuard>} />
      <Route path="/hod/reports"          element={<AuthGuard allowedRoles={['hod']}><HodReports /></AuthGuard>} />

      {/* ── Student ── */}
      <Route path="/student"             element={<Navigate to="/student/dashboard" replace />} />
      <Route path="/student/dashboard"   element={<AuthGuard allowedRoles={['student']}><StudentDashboard /></AuthGuard>} />
      <Route path="/student/scanner"     element={<AuthGuard allowedRoles={['student']}><StudentScanner /></AuthGuard>} />
      <Route path="/student/history"     element={<AuthGuard allowedRoles={['student']}><StudentHistory /></AuthGuard>} />
      <Route path="/student/profile"     element={<AuthGuard allowedRoles={['student']}><StudentProfile /></AuthGuard>} />

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
