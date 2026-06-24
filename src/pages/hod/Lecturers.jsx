import React, { useEffect, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import api from '../../services/api'
import { Users, Mail, Phone, BookOpen, Building2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function HodLecturers() {
  const [lecturers, setLecturers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const loadLecturers = () => {
    setLoading(true)
    api.get('/hod/overview')
      .then(({ data }) => setLecturers(data.lecturers || []))
      .catch((err) => { console.error(err) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let mounted = true
    api.get('/hod/overview')
      .then(({ data }) => { if (mounted) setLecturers(data.lecturers || []) })
      .catch((err) => { console.error(err) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const handleInvite = async (event) => {
    event.preventDefault()
    setInviteError('')
    setInviteSuccess('')

    if (!name.trim() || !email.trim()) {
      setInviteError('Name and email are required to invite a lecturer.')
      return
    }

    setInviteLoading(true)
    try {
      await api.post('/hod/lecturers', { name: name.trim(), email: email.trim() })
      setInviteSuccess(`Invitation sent to ${email.trim()}.`) 
      setName('')
      setEmail('')
      setInviteOpen(false)
      loadLecturers()
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Unable to send invitation. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <PageWrapper title="Department Faculty">
      <div className="space-y-6">
        <div className="mku-card p-6 rounded-3xl border border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Faculty oversight</p>
              <h2 className="text-2xl font-semibold text-slate-900">Academic staff in your department</h2>
            </div>
            <Button
              variant="secondary"
              leftIcon={<Users size={16} />}
              onClick={() => setInviteOpen((open) => !open)}
            >
              Invite lecturer
            </Button>
          </div>

          {inviteOpen && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Invite a new lecturer</h3>
              <p className="text-sm text-slate-500 mt-2">Provide the lecturer's name and email. The account is created under your department and school.</p>
              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleInvite}>
                <Input
                  label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Doe"
                  required
                />
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@cams.ac.ke"
                  required
                />
                <div className="sm:col-span-2 flex flex-col gap-3">
                  {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                  {inviteSuccess && <p className="text-sm text-emerald-600">{inviteSuccess}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" loading={inviteLoading} className="min-w-[160px]">
                      Send invite
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {loading ? (
            new Array(3).fill(null).map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 h-36" />
            ))
          ) : lecturers.length === 0 ? (
            <div className="mku-card p-8 rounded-3xl border border-slate-200 text-center text-slate-500">
              No lecturers are currently assigned to this department.
            </div>
          ) : lecturers.map((lecturer) => (
            <div key={lecturer.id} className="mku-card rounded-3xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{lecturer.name}</p>
                  <p className="text-sm text-slate-500">{lecturer.title || 'Lecturer'}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {lecturer.assigned_units || 0} units
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail size={16} />
                  <span>{lecturer.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone size={16} />
                  <span>{lecturer.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                  <BookOpen size={14} /> {lecturer.department || 'Department'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                  <Building2 size={14} /> {lecturer.school || lecturer.school_name || 'School'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
