import React, { useState, useEffect } from 'react'
import { X, ArrowRight, SkipForward } from 'lucide-react'

const TOURS = {
  student: [
    { title: 'Welcome to MKU Attend! 🎓', body: 'This is your personal attendance dashboard. Everything you need is right here.', target: 'tour-dashboard' },
    { title: 'Your Courses', body: 'Your enrolled courses appear here with live attendance percentages. Keep each above 75% to sit exams.', target: 'tour-courses' },
    { title: 'Scan QR Code', body: 'Tap "Scan QR" when your lecturer opens a session to mark yourself present.', target: 'tour-scan' },
    { title: 'Exam Eligibility', body: 'This card shows your eligibility to sit end-of-semester exams per course. Stay in the green!', target: 'tour-eligibility' },
  ],
  lecturer: [
    { title: 'Lecturer Dashboard', body: 'Welcome! This is your session control panel. You can manage all your classes from here.', target: 'tour-dashboard' },
    { title: 'Create a Session', body: 'Select a course and venue, then click "Open Session" to generate a QR code for students to scan.', target: 'tour-session' },
    { title: 'Live Attendance Feed', body: 'Watch students scan in real-time. The list updates instantly via WebSocket.', target: 'tour-live' },
    { title: 'Student Management', body: 'View and manage your class lists, attendance records, and export reports under My Courses.', target: 'tour-courses' },
  ],
  admin: [
    { title: 'Admin Dashboard', body: 'Welcome, Administrator! This is your system control center.', target: 'tour-dashboard' },
    { title: 'Pending Registrations', body: 'New student registrations appear here for your review. Approve or reject from the Pending Queue.', target: 'tour-registrations' },
    { title: 'Analytics', body: 'View attendance trends, at-risk students, and departmental comparisons in the Analytics section.', target: 'tour-analytics' },
    { title: 'System Settings', body: 'Configure SMS alerts, attendance thresholds, and security settings from the Settings menu.', target: 'tour-settings' },
  ],
}

const STORAGE_KEY = (role) => `mku_tour_done_${role}`

export default function OnboardingTour({ role }) {
  const [step, setStep]   = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!role || localStorage.getItem(STORAGE_KEY(role))) return
    // Brief delay so layout settles
    const t = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(t)
  }, [role])

  const steps = TOURS[role] || []
  const current = steps[step]

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY(role), '1')
    setVisible(false)
  }

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  if (!visible || !current) return null

  return (
    <>
      {/* Dark overlay */}
      <div className="tour-overlay" aria-hidden="true" onClick={dismiss} />

      {/* Tooltip */}
      <div
        className="tour-tooltip"
        role="dialog"
        aria-modal="true"
        aria-label={`Onboarding step ${step + 1} of ${steps.length}`}
        style={{ bottom: 120, left: '50%', transform: 'translateX(-50%)' }}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'bg-mku-blue w-6' : 'bg-[var(--border-color)] w-1.5'
              }`}
            />
          ))}
        </div>

        <h3 className="font-bold text-[var(--text-primary)] text-base mb-2">{current.title}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{current.body}</p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
          <button
            onClick={dismiss}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
          >
            <SkipForward size={12} /> Skip tour
          </button>
          <button
            onClick={next}
            className="btn btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            {step < steps.length - 1 ? (
              <><span>Next</span><ArrowRight size={14} /></>
            ) : (
              <span>Get started! 🚀</span>
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-[var(--text-secondary)] mt-2">
          Step {step + 1} of {steps.length}
        </p>
      </div>
    </>
  )
}
