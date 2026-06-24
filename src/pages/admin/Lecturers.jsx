import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import {
  GraduationCap, Plus, Edit2, Trash2, KeyRound, BookOpen,
  Search, X, Clock, Mail, Building2, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../../services/user.service'
import api from '../../services/api'

const MOCK_DEPTS = [
  { id: 1, name: 'School of Computing & IT', code: 'SCIT' },
  { id: 2, name: 'School of Business', code: 'SBUS' },
  { id: 3, name: 'School of Engineering', code: 'SENG' },
  { id: 4, name: 'School of Health Sciences', code: 'SHS' },
]
const MOCK_UNITS = [
  { id: 1, name: 'Data Structures & Algorithms', code: 'SCT211', dept_id: 1 },
  { id: 2, name: 'Database Systems', code: 'SCT222', dept_id: 1 },
  { id: 3, name: 'Web Technologies', code: 'SCT231', dept_id: 1 },
  { id: 4, name: 'Business Mathematics', code: 'SBU101', dept_id: 2 },
  { id: 5, name: 'Principles of Management', code: 'SBU112', dept_id: 2 },
  { id: 6, name: 'Engineering Drawing', code: 'SEG101', dept_id: 3 },
]
const MOCK_LECTURERS = [
  { id: 1, name: 'Dr. James Mwangi',    email: 'j.mwangi@mku.ac.ke',    department: 'School of Computing & IT', dept_id: 1, units_count: 3, is_active: true,  last_active: '2026-06-08T08:32:00Z' },
  { id: 2, name: 'Prof. Sarah Kamau',   email: 's.kamau@mku.ac.ke',     department: 'School of Computing & IT', dept_id: 1, units_count: 2, is_active: true,  last_active: '2026-06-07T14:15:00Z' },
  { id: 3, name: 'Dr. Peter Odhiambo', email: 'p.odhiambo@mku.ac.ke',  department: 'School of Business',       dept_id: 2, units_count: 2, is_active: true,  last_active: '2026-06-08T09:00:00Z' },
  { id: 4, name: 'Ms. Grace Njeri',    email: 'g.njeri@mku.ac.ke',      department: 'School of Business',       dept_id: 2, units_count: 3, is_active: true,  last_active: '2026-06-06T11:00:00Z' },
  { id: 5, name: 'Dr. Michael Otieno', email: 'm.otieno@mku.ac.ke',    department: 'School of Engineering',    dept_id: 3, units_count: 1, is_active: false, last_active: '2026-05-30T16:20:00Z' },
  { id: 6, name: 'Dr. Ann Waweru',     email: 'a.waweru@mku.ac.ke',    department: 'School of Health Sciences',dept_id: 4, units_count: 4, is_active: true,  last_active: '2026-06-08T07:45:00Z' },
]

const emptyForm = { name: '', email: '', dept_id: '', password: '', unit_ids: [] }

function relativeTime(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ModalBackdrop({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      {children}
    </div>
  )
}

export default function Lecturers() {
  const [lecturers, setLecturers]     = useState([])
  const [depts, setDepts]             = useState(MOCK_DEPTS)
  const [units, setUnits]             = useState(MOCK_UNITS)
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [deptFilter, setDeptFilter]   = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editLecturer, setEditLecturer] = useState(null)
  const [form, setForm]               = useState(emptyForm)
  const [errors, setErrors]           = useState({})
  const [saving, setSaving]           = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [sortCol, setSortCol]         = useState('name')
  const [sortDir, setSortDir]         = useState('asc')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await userService.getLecturers()
      setLecturers(data.lecturers || data || [])
    } catch {
      setLecturers(MOCK_LECTURERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    api.get('/admin/departments').catch(() => null).then(r => { if (r?.data) setDepts(r.data?.departments || r.data) })
    api.get('/admin/units').catch(() => null).then(r => { if (r?.data) setUnits(r.data?.units || r.data) })
  }, [])

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address'
    if (!form.dept_id)      e.dept_id = 'Please select a department'
    setErrors(e)
    return !Object.keys(e).length
  }

  const openAdd = () => {
    setEditLecturer(null); setForm(emptyForm); setErrors({}); setModalOpen(true)
  }
  const openEdit = (l) => {
    setEditLecturer(l)
    setForm({ name: l.name, email: l.email, dept_id: l.dept_id || '', password: '', unit_ids: l.unit_ids || [] })
    setErrors({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editLecturer) {
        await userService.updateLecturer(editLecturer.id, form)
        const dept = depts.find(d => String(d.id) === String(form.dept_id))
        setLecturers(ls => ls.map(l => l.id === editLecturer.id
          ? { ...l, ...form, department: dept?.name || l.department } : l))
        toast.success('Lecturer updated')
      } else {
        await userService.createLecturer({ ...form, role: 'lecturer', password: form.password || 'lecturer123' })
        const dept = depts.find(d => String(d.id) === String(form.dept_id))
        setLecturers(ls => [...ls, {
          id: Date.now(), ...form, department: dept?.name || '',
          units_count: form.unit_ids.length, is_active: true, last_active: new Date().toISOString()
        }])
        toast.success('Lecturer added · default password: lecturer123')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleResetPassword = async (l) => {
    try {
      await userService.resetLecturerPassword(l.id)
      toast.success(`Password reset. New password: lecturer123`)
    } catch { toast.error('Failed to reset password') }
  }

  const handleDelete = async () => {
    try {
      await userService.deleteLecturer(deleteModal.id)
      setLecturers(ls => ls.filter(l => l.id !== deleteModal.id))
      toast.success('Lecturer removed')
      setDeleteModal(null)
    } catch { toast.error('Failed to delete') }
  }

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const toggleUnit = (uid) => {
    setForm(f => ({
      ...f,
      unit_ids: f.unit_ids.includes(uid)
        ? f.unit_ids.filter(id => id !== uid)
        : [...f.unit_ids, uid]
    }))
  }

  const availableUnits = form.dept_id
    ? units.filter(u => String(u.dept_id) === String(form.dept_id))
    : units

  const filtered = lecturers.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase())) return false
    if (deptFilter && String(l.dept_id) !== deptFilter) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol]
    if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })

  const SortArrow = ({ col }) => (
    <span className="ml-1 text-xs" style={{ opacity: sortCol === col ? 1 : 0.3 }}>
      {sortCol === col && sortDir === 'desc' ? '↓' : '↑'}
    </span>
  )

  return (
    <PageWrapper title="Lecturers">
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Lecturers</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {filtered.length} of {lecturers.length} lecturers
              {deptFilter && ` · filtered by department`}
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={16} /> Add Lecturer
          </button>
        </div>

        {/* Filters */}
        <div className="mku-card p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input type="text" placeholder="Search by name or email…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 py-2 text-sm w-full" />
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="input-base pl-8 py-2 text-sm w-56">
              <option value="">All Departments</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {(search || deptFilter) && (
            <button onClick={() => { setSearch(''); setDeptFilter('') }}
              className="btn btn-secondary py-2 text-sm">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="mku-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--mku-gray-100)', borderBottom: '1px solid var(--border-color)' }}>
                  {[
                    { label: 'Lecturer', col: 'name' },
                    { label: 'Department', col: 'department' },
                    { label: 'Units', col: 'units_count' },
                    { label: 'Last Active', col: 'last_active' },
                    { label: 'Status', col: 'is_active' },
                    { label: 'Actions', col: null },
                  ].map(h => (
                    <th key={h.label} onClick={() => h.col && handleSort(h.col)}
                      className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${h.col ? 'cursor-pointer select-none' : ''}`}
                      style={{ color: 'var(--text-secondary)' }}>
                      {h.label}{h.col && <SortArrow col={h.col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="skeleton h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                  : sorted.length === 0
                    ? (
                      <tr><td colSpan={6} className="py-16 text-center">
                        <GraduationCap size={40} className="mx-auto mb-3" style={{ color: 'var(--border-color)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {search || deptFilter ? 'No lecturers match your filters.' : 'No lecturers yet.'}
                        </p>
                      </td></tr>
                    )
                    : sorted.map(l => (
                      <tr key={l.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {/* Name + Email */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ background: `hsl(${(l.id * 47) % 360},60%,45%)` }}>
                              {l.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{l.name}</p>
                              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                <Mail size={11} />{l.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Department */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <Building2 size={13} />
                            <span>{l.department || '—'}</span>
                          </div>
                        </td>
                        {/* Units */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <BookOpen size={13} style={{ color: 'var(--text-secondary)' }} />
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{l.units_count ?? 0}</span>
                          </div>
                        </td>
                        {/* Last active */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Clock size={12} />
                            {relativeTime(l.last_active)}
                          </div>
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              background: l.is_active ? '#D1FAE5' : '#F1F5F9',
                              color: l.is_active ? '#065F46' : '#475569'
                            }}>
                            {l.is_active && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                            {l.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(l)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Edit"
                              style={{ color: 'var(--text-secondary)' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleResetPassword(l)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Reset Password"
                              style={{ color: 'var(--text-secondary)' }}><KeyRound size={14} /></button>
                            <button onClick={() => setDeleteModal(l)}
                              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete"
                              style={{ color: 'var(--text-secondary)' }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <ModalBackdrop>
          <div className="mku-card w-full max-w-lg scale-in" style={{ padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editLecturer ? 'Edit Lecturer' : 'Add Lecturer'}
              </h2>
              <button onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input className={`input-base ${errors.name ? 'border-red-400' : ''}`}
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. James Mwangi" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input type="email" className={`input-base ${errors.email ? 'border-red-400' : ''}`}
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="j.mwangi@mku.ac.ke" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              {/* Department */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Department <span className="text-red-500">*</span>
                </label>
                <select className={`input-base ${errors.dept_id ? 'border-red-400' : ''}`}
                  value={form.dept_id}
                  onChange={e => setForm(f => ({ ...f, dept_id: e.target.value, unit_ids: [] }))}>
                  <option value="">Select department…</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.dept_id && <p className="text-xs text-red-500 mt-1">{errors.dept_id}</p>}
              </div>
              {/* Units multi-select */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Assign Units
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                    ({form.unit_ids.length} selected)
                  </span>
                </label>
                {availableUnits.length === 0
                  ? <p className="text-xs py-3 text-center rounded-xl" style={{ background: 'var(--mku-gray-100)', color: 'var(--text-secondary)' }}>
                      {form.dept_id ? 'No units in this department yet.' : 'Select a department first.'}
                    </p>
                  : (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                      {availableUnits.map((u, idx) => (
                        <label key={u.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer table-row-hover"
                          style={{ borderBottom: idx < availableUnits.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <input type="checkbox"
                            checked={form.unit_ids.includes(u.id)}
                            onChange={() => toggleUnit(u.id)}
                            className="w-4 h-4 rounded accent-blue-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{u.code}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )
                }
              </div>
              {/* Password (add only) */}
              {!editLecturer && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Password</label>
                  <input type="password" className="input-base"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Leave blank → uses lecturer123" />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Lecturer should change this on first login</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving…' : editLecturer ? 'Save Changes' : 'Add Lecturer'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Delete Confirm */}
      {deleteModal && (
        <ModalBackdrop>
          <div className="mku-card w-full max-w-sm scale-in" style={{ padding: '28px' }}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>Remove Lecturer?</h2>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
              Remove <strong>{deleteModal.name}</strong> from the system? Their session history will be preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn btn-danger flex-1">Remove</button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </PageWrapper>
  )
}
