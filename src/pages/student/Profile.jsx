import React, { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'
import { User, Mail, Hash, BookOpen, Lock, Save, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateUser }    = useAuth()
  const [pwForm, setPwForm]     = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw]     = useState(false)
  const [saving, setSaving]     = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!pwForm.current || !pwForm.newPw) { toast.error('Fill in all fields'); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    if (pwForm.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      await authService.changePassword(pwForm.current, pwForm.newPw)
      toast.success('Password changed successfully')
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
      </div>
    </div>
  )

  return (
    <PageWrapper title="Profile">
      <div className="max-w-lg space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
          <p className="text-sm text-slate-500">Your account information</p>
        </div>

        {/* Avatar + name */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-[#0F172A] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{user?.name}</h2>
              <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>

          <InfoRow icon={User} label="Full Name" value={user?.name} />
          <InfoRow icon={Mail} label="Email" value={user?.email} />
          <InfoRow icon={Hash} label="Registration Number" value={user?.reg_number} />
          <InfoRow icon={BookOpen} label="Course" value={user?.course} />
          {user?.role === 'student' && (
            <>
              <InfoRow 
                icon={User} 
                label="Smartphone Status" 
                value={user?.has_smartphone !== false && user?.has_smartphone !== 0 ? '📱 Yes (QR Scanning active)' : '📵 No (USSD/SMS Fallback active)'} 
              />
              <InfoRow 
                icon={BookOpen} 
                label="Preferred Attendance Method" 
                value={(user?.preferred_attendance_method || 'QR').toUpperCase()} 
              />
            </>
          )}
        </div>

        {/* Change password */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type={showPw ? 'text' : 'password'}
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              placeholder="Enter current password"
              rightIcon={
                <button type="button" onClick={() => setShowPw(s => !s)}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <Input
              label="New Password"
              type={showPw ? 'text' : 'password'}
              value={pwForm.newPw}
              onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm New Password"
              type={showPw ? 'text' : 'password'}
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
            />
            <Button type="submit" variant="primary" leftIcon={<Save size={14} />} loading={saving} className="w-full">
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </PageWrapper>
  )
}
