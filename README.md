# CAMS — Campus Attendance Management System

A complete, production-ready QR Code Attendance System.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Routing | React Router v6 (role-based guards) |
| QR Generate | qrcode.js |
| QR Scan | jsQR (camera-based, browser-native) |
| Charts | Chart.js + react-chartjs-2 |
| Export | jsPDF + PapaParse (PDF + CSV) |
| HTTP Client | Axios + JWT interceptor |
| Auth | JWT tokens, role-encoded |
| Backend | Node.js + Express |
| Database | MySQL (optional — demo mode works without it) |

---

## Quick Start

### 1. Start the backend

```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

> No MySQL? No problem. The backend runs fully in **demo mode** with in-memory data.

### 2. Start the frontend

```bash
# From the project root
npm install
npm run dev
# Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

For the full MKU-CAMS schema, ERD, API endpoint map, and role-based architecture, see `MKU-CAMS-Blueprint.md`.

---

## Demo Credentials

| Role     | Login                   | Password     |
|----------|-------------------------|--------------|
| Admin    | admin@cams.ac.ke        | admin123     |
| Lecturer | lecturer@cams.ac.ke     | lecturer123  |
| Student  | SCT211-0001/2024        | student123   |

---

## How the QR Flow Works

1. **Lecturer** logs in → goes to **Start Session** → selects unit + room → clicks **Generate QR**
2. A unique UUID token is created and stored; a QR code is rendered encoding `{ token, session_id, expires_at }`
3. Lecturer projects the QR fullscreen for the class
4. **Student** logs in → taps **Scan QR** → camera opens → points at the projected QR
5. App decodes QR → POSTs `{ token, student_id }` to `/api/attendance/mark`
6. Backend validates: session active? token matches? not expired? student enrolled? not already scanned?
7. If all pass → attendance recorded → student sees green success screen
8. QR auto-regenerates every 5 minutes (configurable) to prevent sharing

---

## Roles & Portals

### Admin
- Dashboard with system-wide metrics
- Manage students (add, edit, deactivate, bulk CSV import)
- Manage lecturers (add, edit, reset password)
- Courses & Units management
- Attendance reports — PDF & CSV export
- System settings (QR expiry, university name, thresholds)

### Lecturer
- Dashboard with today's sessions and live stats
- View assigned courses and units
- Create sessions with time-limited QR codes
- Fullscreen QR projector mode with scan count
- Live attendance list (auto-polls every 5 s)
- Mark students absent manually
- Export reports by unit and date range

### Student
- Dashboard showing attendance % per unit (doughnut charts)
- QR Scanner — camera feed, jsQR decode, instant feedback
- Attendance history with calendar heatmap
- Profile and password change

---

## MySQL Setup (optional)

```sql
-- In MySQL:
source backend/config/schema.sql
```

Update `backend/.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cams_attendance
```

The backend auto-connects; no restart needed if you set it up after starting.

---

## Project Structure

```
cams/
├── src/
│   ├── components/
│   │   ├── ui/        Button, Input, Modal, StatusBadge, MetricCard, SessionCard
│   │   ├── layout/    Sidebar, TopBar, PageWrapper, AuthGuard
│   │   ├── qr/        QRGenerator, QRScanner, CountdownTimer
│   │   ├── charts/    AttendanceChart, DoughnutChart, CalendarHeatmap
│   │   └── tables/    DataTable, ExportPanel
│   ├── pages/
│   │   ├── auth/      Login
│   │   ├── admin/     Dashboard, Students, Lecturers, Courses, Reports, Settings
│   │   ├── lecturer/  Dashboard, Courses, Session, Attendance, Export
│   │   └── student/   Dashboard, Scanner, History, Profile
│   ├── context/       AuthContext, SessionContext
│   ├── hooks/         useAuth, useTimer, useCamera, useAttendance, useQR
│   ├── services/      api.js + auth/user/session/attendance services
│   ├── utils/         qr.utils.js, export.utils.js
│   └── router/        index.jsx (all routes + role guards)
└── backend/
    ├── config/        db.js, mockData.js, schema.sql
    ├── middleware/     auth.js (JWT + role enforcement)
    ├── routes/        auth, admin, courses, sessions, attendance
    └── server.js
```
