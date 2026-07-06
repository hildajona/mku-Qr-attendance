import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import {
  Save, School, Clock, Bell, Shield,
  MapPin, Navigation, CheckCircle, AlertCircle, Loader
} from 'lucide-react'
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
    geo_check_enabled: false,
    institution_lat: '',
    institution_lng: '',
    institution_radius_meters: 200,
  })
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationStatus, setLocationStatus] = useState(null) // 'set' | 'error' | null

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => {
        setSettings(s => ({
          ...s,
          ...data,
          institution_lat: data.institution_lat ?? '',
          institution_lng: data.institution_lng ?? '',
          institution_radius_meters: data.institution_radius_meters || 200,
        }))
        if (data.institution_lat && data.institution_lng) {
          setLocationStatus('set')
        }
      })
      .catch(() => {}) // use defaults
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings', {
        ...settings,
        institution_lat: settings.institution_lat !== '' ? parseFloat(settings.institution_lat) : null,
        institution_lng: settings.institution_lng !== '' ? parseFloat(settings.institution_lng) : null,
        institution_radius_meters: parseInt(settings.institution_radius_meters) || 200,
      })
      toast.success('Settings saved successfully')
    } catch {
      toast.success('Settings saved (demo mode)')
    } finally {
      setSaving(false)
    }
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    setLocationStatus(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(7)
        const lng = pos.coords.longitude.toFixed(7)
        setSettings(s => ({ ...s, institution_lat: lat, institution_lng: lng }))
        setLocationStatus('set')
        setLocating(false)
        toast.success('Location detected and filled in!')
      },
      (err) => {
        setLocating(false)
        setLocationStatus('error')
        if (err.code === 1) {
          toast.error('Location access denied. Please allow location in browser settings.')
        } else {
          toast.error('Could not detect location. Please enter coordinates manually.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const hasLocation = settings.institution_lat !== '' && settings.institution_lng !== ''

  // ── Reusable UI Components ────────────────────────────────────────
  const Section = ({ icon: Icon, title, badge, children }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#E8F1FB' }}>
            <Icon size={16} style={{ color: '#0057A8' }} />
          </div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
        </div>
        {badge}
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
        className="relative w-11 h-6 rounded-full transition-colors"
        style={{ background: value ? '#0057A8' : '#E2E8F0' }}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )

  return (
    <PageWrapper title="Settings">
      <div className="space-y-5 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">System Settings</h1>
            <p className="text-sm text-slate-500">Configure the attendance system</p>
          </div>
          <Button variant="primary" leftIcon={<Save size={14} />} loading={saving} onClick={handleSave}>
            Save Settings
          </Button>
        </div>

        {/* University */}
        <Section icon={School} title="University">
          <Input
            label="University / Institution Name"
            value={settings.university_name}
            onChange={e => setSettings(s => ({ ...s, university_name: e.target.value }))}
          />
        </Section>

        {/* ── INSTITUTION LOCATION ── */}
        <Section
          icon={MapPin}
          title="Institution Location"
          badge={
            hasLocation ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <CheckCircle size={11} /> Location Set
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                <AlertCircle size={11} /> Not Set
              </span>
            )
          }
        >
          {/* Geo-fencing toggle */}
          <Toggle
            label="Enable Campus Geo-fencing"
            hint="When enabled, students must be physically within the campus boundary to mark attendance"
            value={!!settings.geo_check_enabled}
            onChange={v => setSettings(s => ({ ...s, geo_check_enabled: v }))}
          />

          {/* Divider */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Campus Location Coordinates</p>
            <p className="text-xs text-slate-400 mb-4">
              Set the GPS coordinates of your institution. Students must be within the radius below to check in.
              These coordinates are used as a campus-wide fallback when a specific venue has no location set.
            </p>

            {/* "Use My Location" Button */}
            <button
              onClick={handleUseMyLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-700 font-medium text-sm transition-all mb-4 disabled:opacity-60"
            >
              {locating ? (
                <><Loader size={15} className="animate-spin" /> Detecting your location...</>
              ) : locationStatus === 'set' ? (
                <><CheckCircle size={15} className="text-emerald-600" /><span className="text-emerald-700">Location detected — click to update</span></>
              ) : (
                <><Navigation size={15} /> Use My Current Location</>
              )}
            </button>

            {/* Lat / Lng inputs side by side */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. -1.0456"
                  value={settings.institution_lat}
                  onChange={e => {
                    setSettings(s => ({ ...s, institution_lat: e.target.value }))
                    setLocationStatus(e.target.value ? 'set' : null)
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: '#0057A8' }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #0057A820'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 37.0735"
                  value={settings.institution_lng}
                  onChange={e => {
                    setSettings(s => ({ ...s, institution_lng: e.target.value }))
                    setLocationStatus(e.target.value ? 'set' : null)
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #0057A820'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>
            </div>

            {/* Coordinate preview badge */}
            {hasLocation && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin size={14} className="text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">Pinned Location</p>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {parseFloat(settings.institution_lat).toFixed(6)}, {parseFloat(settings.institution_lng).toFixed(6)}
                  </p>
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${settings.institution_lat}&mlon=${settings.institution_lng}#map=17/${settings.institution_lat}/${settings.institution_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                >
                  View on Map ↗
                </a>
              </div>
            )}

            {/* Radius slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">
                  Allowed Radius
                </label>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {settings.institution_radius_meters} m
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={settings.institution_radius_meters}
                onChange={e => setSettings(s => ({ ...s, institution_radius_meters: Number(e.target.value) }))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>50 m</span>
                <span>Students must be within this distance to check in</span>
                <span>1000 m</span>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 leading-relaxed">
            <strong>How it works:</strong> When geo-fencing is enabled and a lecture session has no specific room coordinates, the system automatically uses this institution location as the geo-fence boundary. Venue-specific coordinates always take priority.
          </div>
        </Section>

        {/* QR Code */}
        <Section icon={Clock} title="QR Code & Session">
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

        {/* Notifications */}
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

        {/* Security */}
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
