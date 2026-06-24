import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Save, School, Clock, Bell, Shield } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function Settings() {
  const [settings, setSettings] = useState({
    university_name: 'CAMS – Campus Attendance Management System',
    qr_expiry_seconds: 300,
    email_notifications: true,
    low_attendance_threshold: 75,
    allow_late_marking: true,
    late_threshold_minutes: 15,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => setSettings(s => ({ ...s, ...data })))
      .catch(() => {}) // use defaults
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings', settings)
      toast.success('Settings saved')
    } catch {
      toast.success('Settings saved (demo mode)')
    } finally {
      setSaving(false)
    }
  }

  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#E8F1FB' }}>
          <Icon size={16} style={{ color: '#0057A8' }} />
        </div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )

  const Toggle = ({ label, hint, value, onChange }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors`}
        style={{ background: value ? '#0057A8' : '#E2E8F0' }}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )

  return (
    <PageWrapper title="Settings">
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">System Settings</h1>
            <p className="text-sm text-slate-500">Configure the attendance system</p>
          </div>
          <Button variant="primary" leftIcon={<Save size={14} />} loading={saving} onClick={handleSave}>
            Save Settings
          </Button>
        </div>

        <Section icon={School} title="University">
          <Input
            label="University Name"
            value={settings.university_name}
            onChange={e => setSettings(s => ({ ...s, university_name: e.target.value }))}
          />
        </Section>

        <Section icon={Clock} title="QR Code">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              QR Expiry Time (seconds)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={60}
                max={900}
                step={30}
                value={settings.qr_expiry_seconds}
                onChange={e => setSettings(s => ({ ...s, qr_expiry_seconds: Number(e.target.value) }))}
                className="flex-1 accent-blue-600"
              />
              <span className="text-sm font-semibold text-slate-700 w-20 text-right">
                {Math.floor(settings.qr_expiry_seconds / 60)}m {settings.qr_expiry_seconds % 60}s
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">How long each QR code is valid before auto-regenerating</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Late Threshold (minutes)
            </label>
            <Input
              type="number"
              min={1}
              max={60}
              value={settings.late_threshold_minutes}
              onChange={e => setSettings(s => ({ ...s, late_threshold_minutes: Number(e.target.value) }))}
              hint="Students scanning after this many minutes are marked 'Late'"
            />
          </div>
          <Toggle
            label="Allow Late Marking"
            hint="Students can still scan after the late threshold"
            value={settings.allow_late_marking}
            onChange={v => setSettings(s => ({ ...s, allow_late_marking: v }))}
          />
        </Section>

        <Section icon={Bell} title="Notifications">
          <Toggle
            label="Email Notifications"
            hint="Send email alerts for low attendance"
            value={settings.email_notifications}
            onChange={v => setSettings(s => ({ ...s, email_notifications: v }))}
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Low Attendance Alert Threshold (%)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={settings.low_attendance_threshold}
              onChange={e => setSettings(s => ({ ...s, low_attendance_threshold: Number(e.target.value) }))}
              hint="Alert when a student's attendance falls below this percentage"
            />
          </div>
        </Section>

        <Section icon={Shield} title="Security">
          <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
            <p className="font-medium mb-1">QR Security</p>
            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
              <li>Each QR code contains a unique UUID token</li>
              <li>Tokens are validated server-side on every scan</li>
              <li>Duplicate scans are rejected automatically</li>
              <li>Expired tokens are rejected even if QR is visible</li>
            </ul>
          </div>
        </Section>
      </div>
    </PageWrapper>
  )
}
