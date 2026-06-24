# MKU-CAMS Blueprint

A complete Campus Attendance Management System for Mount Kenya University.

## 1. Data Model

### Core tables
- `roles` — system roles: super_admin, school_admin, admin, lecturer, student
- `schools` — MKU schools and campuses
- `departments` — departments per school
- `courses` — programmes or degree tracks
- `units` — courses taught each semester
- `users` — auth users with role flags and department/school affiliation
- `students` — student profile details linked to `users`
- `lecturers` — lecturer profile details linked to `users`
- `student_units` — student registration per unit
- `lecturer_units` — lecturer assignment to units
- `sessions` — QR attendance sessions for the existing system
- `attendance` — legacy attendance records
- `attendance_sessions` — MKU-specific session entity for new API paths
- `attendance_records` — MKU-specific attendance tracking records
- `settings` — global system defaults

## 2. ERD Overview

- `schools 1:N departments`
- `departments 1:N courses`
- `departments 1:N units`
- `courses 1:N units`
- `users 1:1 students`
- `users 1:1 lecturers`
- `students N:M units` via `student_units`
- `lecturers N:M units` via `lecturer_units`
- `attendance_sessions N:1 units`
- `attendance_sessions N:1 lecturers`
- `attendance_records N:1 attendance_sessions`
- `attendance_records N:1 students`

## 3. API Endpoint Map

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`

### School Management
- `GET /api/schools`
- `POST /api/schools`
- `PUT /api/schools/:id`
- `DELETE /api/schools/:id`
- `GET /api/schools/:id/departments`
- `POST /api/schools/:id/departments`
- `PUT /api/schools/departments/:id`
- `DELETE /api/schools/departments/:id`

### Department/Course/Unit Management
- `GET /api/courses`
- `POST /api/courses`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`
- `GET /api/courses/:id/units`
- `POST /api/courses/:id/units`
- `PUT /api/courses/:courseId/units/:unitId`
- `DELETE /api/courses/:courseId/units/:unitId`

### Attendance
- `POST /api/attendance/check-in`
- `POST /api/attendance/computer`
- `POST /api/attendance/session/:id/manual`
- `POST /api/attendance/mark`

## 4. Dashboard Structure

### Super Admin
- Total schools
- Total departments
- Total units
- Total lecturers
- Total students
- Attendance heatmap by school
- Unit and lecturer growth charts

### School Admin
- Department enrollment summaries
- Unit registration metrics
- Lecturer assignment roster
- Pending student approvals

### Lecturer
- Assigned units
- Active attendance sessions
- QR generation / projector mode
- Live attendance roster
- Export PDF & Excel

### Student
- Unit attendance percentages
- QR scanner page
- Attendance history heatmap
- Profile and registered units

## 5. Backend Architecture

### Existing stack
- Node.js + Express
- MySQL / Redis
- JWT auth
- Socket.IO for live session updates

### Recommended extension
- Add `role_id` and `roles` table for RBAC management
- Expand `users` to support `school_id`, `department_id`, and `status`
- Seed MKU schools, departments, and units
- Keep compatibility with existing `courses`, `units`, `sessions`, and `attendance`

## 6. Deployment Notes

- Use `backend/create_database.js` to bootstrap schema and migrations
- Use `backend/seed.js` to populate initial MKU fixtures
- Frontend routes should be guarded by role values in JWT

## 7. MKU Academic Structure

- School of Computing and Informatics
- School of Business and Economics
- School of Education
- School of Social Sciences
- School of Pure and Applied Sciences
- School of Engineering, Energy and the Built Environment
- School of Law
- School of Nursing
- School of Public Health
- School of Pharmacy
- School of Clinical Medicine
- Medical School
