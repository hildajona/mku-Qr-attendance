# MKU QR Code Attendance System

A complete, production-ready QR Code Attendance System for Mount Kenya University.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MySQL
- **Auth**: JWT (role-based)
- **QR**: qrcode.js (generate) + jsQR (scan)
- **Charts**: Chart.js + react-chartjs-2
- **Export**: jsPDF + PapaParse

---

## Quick Start

### 1. Database Setup

Install MySQL and run the schema:

```bash
mysql -u root -p < backend/config/schema.sql
```

Copy the example environment file and update your values:

```bash
cp .env.example backend/.env
```

Then edit `backend/.env` with your database credentials:

```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mku_attendance
JWT_SECRET=your_jwt_secret_here
```

### 2. Seed Test Data

Run the backend seed script to populate sample users, courses, units, enrollments, and sessions:

```bash
cd backend
npm install
npm run seed
```

### 3. Start the Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on: http://localhost:5000

### 3. Start the Frontend

```bash
# In the mku-attendance root folder
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

---

## Deploying Frontend to Netlify

This project can be deployed as a static Vite app on Netlify. The backend must remain hosted separately, and the frontend will call it through the `VITE_API_BASE_URL` environment variable.

1. Push the `mku-attendance` repo to GitHub.
2. Create a new Netlify site from the GitHub repo.
3. Use the default build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. In Netlify site settings, add an environment variable:
   - `VITE_API_BASE_URL` = your backend URL, e.g. `https://attendance-backend.example.com`
5. If you want Netlify to proxy `/api/*` to your backend, the included `netlify.toml` already contains the redirect rule.

To test locally before deploying, keep the frontend on `http://localhost:5173` and the backend on `http://localhost:5000`.

---

## Demo Credentials

| Role     | Login                    | Password     |
|----------|--------------------------|--------------|
| Admin    | admin@mku.ac.ke          | admin123     |
| Lecturer | lecturer@mku.ac.ke       | lecturer123  |
| Student  | SCT211-0001/2024         | student123   |

---

## Features

### Admin Portal
- Dashboard with system-wide metrics
- Manage students (add, edit, deactivate, bulk CSV import)
- Manage lecturers (add, edit, reset password)
- Courses & Units management
- Attendance reports with PDF/CSV export
- System settings (QR expiry, university name)

### Lecturer Portal
- Dashboard with today's sessions
- View assigned courses and units
- Create class sessions with time-limited QR codes
- Fullscreen QR projector mode
- Live attendance list (polls every 5s)
- Mark students absent manually
- Export reports by unit/date

### Student Portal
- Dashboard with attendance % per unit (doughnut charts)
- QR Scanner (camera-based, browser-native)
- Attendance history with calendar heatmap
- Profile and password change

---

## Project Structure

```
mku-attendance/
├── src/
│   ├── components/
│   │   ├── ui/          # Button, Input, Modal, StatusBadge, MetricCard, SessionCard
│   │   ├── layout/      # Sidebar, TopBar, PageWrapper, AuthGuard
│   │   ├── qr/          # QRGenerator, QRScanner, CountdownTimer
│   │   ├── charts/      # AttendanceChart, DoughnutChart, CalendarHeatmap
│   │   └── tables/      # DataTable, ExportPanel
│   ├── pages/
│   │   ├── auth/        # Login
│   │   ├── admin/       # Dashboard, Students, Lecturers, Courses, Reports, Settings
│   │   ├── lecturer/    # Dashboard, Courses, Session, Attendance, Export
│   │   └── student/     # Dashboard, Scanner, History, Profile
│   ├── context/         # AuthContext, SessionContext
│   ├── hooks/           # useAuth, useTimer, useCamera, useAttendance, useQR
│   ├── services/        # api.js, auth/user/session/attendance services
│   ├── utils/           # qr.utils.js, export.utils.js
│   └── router/          # index.jsx (all routes with role guards)
└── backend/
    ├── config/          # db.js, schema.sql
    ├── middleware/       # auth.js (JWT + role)
    ├── routes/          # auth, admin, courses, sessions, attendance
    └── server.js
```

---

## QR Security Flow

1. Lecturer creates session → backend generates UUID token stored in DB
2. QR encodes: `{ token, session_id, expires_at }`
3. Student scans → POST `/api/attendance/mark` with `{ token, student_id }`
4. Backend validates: session exists? token matches? not expired? student enrolled? not already scanned?
5. If all pass → insert attendance record → return success
6. QR auto-regenerates when timer hits 0 (new token, same session)
