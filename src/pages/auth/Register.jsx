import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  GraduationCap, User, Mail, Lock, Hash, BookOpen,
  Eye, EyeOff, AlertCircle, CheckCircle2, Phone, Smartphone
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()

  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [courses, setCourses] = useState([])
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    name:         '',
    email:        '',
    reg_number:   '',
    phone:        '',
    course:       '',
    password:     '',
    confirm_pw:   '',
    has_smartphone: true,
  })

  const [touched, setTouched] = useState({})

  useEffect(() => {
    api.get('/auth/registration-metadata')
      .then(({ data }) => setCourses(data.programmes || []))
      .catch(() => setCourses([
        { id: 1, name: 'Bachelor of Science in Computer Science',        code: 'BSC-CS'   },
        { id: 2, name: 'Bachelor of Science in Information Technology',  code: 'BSC-IT'   },
        { id: 3, name: 'Bachelor of Science in Mathematics',             code: 'BSC-MATH' },
        { id: 4, name: 'Bachelor of Commerce',                           code: 'BCOM'     },
        { id: 5, name: 'Bachelor of Laws (LLB)',                         code: 'LLB'      },
        { id: 6, name: 'Bachelor of Science in Nursing',                 code: 'BSC-NRS'  },
        { id: 7, name: 'Bachelor of Science in Clinical Medicine',       code: 'BSC-CM'   },
        { id: 8, name: 'Bachelor of Public Health',                      code: 'BPH'      },
      ]))
  }, [])

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [field]: val }))
    setTouched(t => ({ ...t, [field]: true }))
    setError('')
  }

  const validate = () => {
    if (!form.name.trim())       return 'Full name is required'
    if (!form.reg_number.trim()) return 'Registration number is required'
    if (!form.phone.trim())      return 'Phone number is required'
    if (!form.course)            return 'Please select your course / programme'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return 'Email address is invalid'
    if (!form.password)          return 'Password is required'
    if (form.password.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(form.password)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(form.password)) return 'Password must contain at least one number'
    if (form.password !== form.confirm_pw) return 'Passwords do not match'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    setError('')
    try {
      await api.post('/auth/register', {
        full_name:      form.name.trim(),
        email:          form.email.trim() || undefined,
        student_reg_no: form.reg_number.trim().toUpperCase(),
        phone:          form.phone.trim() || undefined,
        programme:      form.course,
        password:       form.password,
        has_smartphone: form.has_smartphone,
      })
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 2: Success screen ── */
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f0f4f8' }}>
        <div className="bg-white rounded-3xl shadow-xl border p-10 max-w-md w-full text-center fade-in"
          style={{ borderColor: '#D1D5DB' }}>
          {/* Gold accent bar */}
          <div className="h-1.5 rounded-full -mx-10 -mt-10 mb-8 rounded-t-3xl"
            style={{ background: 'linear-gradient(90deg, #0057A8, #FFC107)' }} />

          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: '#E8F1FB' }}>
            <CheckCircle2 size={40} style={{ color: '#0057A8' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>Registration Submitted!</h1>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
            Your account is pending admin approval. You will be notified once your account is
            activated and you can sign in.
          </p>
          <div className="rounded-2xl p-4 text-left text-sm space-y-2 mb-6" style={{ background: '#f0f4f8' }}>
            {[
              ['Name',    form.name],
              ['Reg No.', form.reg_number.toUpperCase()],
              ['Course',  form.course],
              ['Phone',   form.phone],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span style={{ color: '#9CA3AF' }}>{label}</span>
                <span className="font-medium text-right max-w-[60%]" style={{ color: '#374151' }}>{val}</span>
              </div>
            ))}
          </div>
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
            Go to Sign In
          </Button>
        </div>
      </div>
    )
  }

  /* ── Step 1: Registration form ── */
  return (
    <div className="min-h-screen flex items-stretch">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[40%] flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #003D7A 0%, #0057A8 55%, #1976D2 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10"
          style={{ background: '#FFC107' }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: '#FFC107' }} />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
            style={{ background: '#FFC107' }}>
            <GraduationCap size={40} style={{ color: '#003D7A' }} />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">MKU-CAMS</h1>
          <p className="font-semibold mt-2 tracking-widest uppercase text-sm" style={{ color: '#FFC107' }}>
            Campus Attendance Management
          </p>
          <div className="w-12 h-1 rounded-full mx-auto my-6" style={{ background: '#FFC107' }} />
          <p className="text-white opacity-70 text-sm max-w-xs leading-relaxed">
            Create your student account to start tracking your class attendance with QR codes.
          </p>
          <div className="mt-8 p-4 rounded-2xl text-left space-y-2"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-xs uppercase tracking-wide font-semibold mb-3 opacity-60 text-white">
              After registering you can:
            </p>
            {['Scan QR codes in class', 'View attendance history', 'Download attendance records',
              'Get alerts for low attendance', 'Mark via USSD if no smartphone'].map(f => (
              <div key={f} className="flex items-center gap-2 text-white text-sm opacity-80">
                <CheckCircle2 size={14} style={{ color: '#FFC107' }} className="flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto"
        style={{ background: '#f0f4f8' }}>
        <div className="w-full max-w-md py-6">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg"
              style={{ background: '#0057A8' }}>
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold" style={{ color: '#003D7A' }}>MKU-CAMS</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border fade-in" style={{ borderColor: '#D1D5DB' }}>
            {/* Gold accent bar */}
            <div className="h-1.5 rounded-t-3xl"
              style={{ background: 'linear-gradient(90deg, #0057A8, #FFC107)' }} />

            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>Create Account</h2>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Register as a new MKU student</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm mb-5"
                  style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="Alice Wanjiku"
                  value={form.name}
                  onChange={set('name')}
                  leftIcon={<User size={15} />}
                  required
                />

                <Input
                  label="Registration Number"
                  placeholder="SCT211-0001/2024"
                  value={form.reg_number}
                  onChange={set('reg_number')}
                  leftIcon={<Hash size={15} />}
                  hint="Use the exact reg number from your admission letter"
                  required
                />

                {/* Course select */}
                <div>
                  <label className="text-sm font-medium block mb-1" style={{ color: '#374151' }}>
                    Course / Programme <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div className="relative">
                    <BookOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#9CA3AF' }} />
                    <select
                      className="input-base pl-9"
                      value={form.course}
                      onChange={set('course')}
                      required
                    >
                      <option value="">— Select your programme —</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  value={form.phone}
                  onChange={set('phone')}
                  leftIcon={<Phone size={15} />}
                  hint="Required — used for SMS notifications and USSD login"
                  required
                />

                <Input
                  label="Email Address (optional)"
                  type="email"
                  placeholder="alice@student.example.ac.ke"
                  value={form.email}
                  onChange={set('email')}
                  leftIcon={<Mail size={15} />}
                  hint="Used for email notifications. You can skip this."
                />

                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  value={form.password}
                  onChange={set('password')}
                  leftIcon={<Lock size={15} />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPw(s => !s)}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  required
                />

                <Input
                  label="Confirm Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirm_pw}
                  onChange={set('confirm_pw')}
                  leftIcon={<Lock size={15} />}
                  error={touched.confirm_pw && form.confirm_pw && form.password !== form.confirm_pw
                    ? 'Passwords do not match' : ''}
                  required
                />

                {/* Smartphone toggle */}
                <div className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: '#E8F1FB', border: '1px solid #c3daef' }}>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      id="has-smartphone"
                      type="checkbox"
                      checked={form.has_smartphone}
                      onChange={set('has_smartphone')}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                  </div>
                  <label htmlFor="has-smartphone" className="text-xs leading-relaxed cursor-pointer"
                    style={{ color: '#1e40af' }}>
                    <span className="font-semibold flex items-center gap-1 mb-0.5">
                      <Smartphone size={13} /> I have a smartphone
                    </span>
                    Uncheck this if you attend class without a smartphone — you'll be enabled for
                    USSD / SMS attendance marking.
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full mt-2"
                >
                  {loading ? 'Submitting…' : 'Create Account'}
                </Button>
              </form>

              <p className="text-sm text-center mt-6" style={{ color: '#6B7280' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold hover:underline" style={{ color: '#0057A8' }}>
                  Sign in
                </Link>
              </p>

              <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
                CAMS © {new Date().getFullYear()} — Mount Kenya University
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
