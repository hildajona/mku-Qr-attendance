import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import { BookOpen, Plus, Edit2, Trash2, Users, X, Search, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const MOCK_DEPTS = [
  { id: 1, name: 'School of Computing & IT', code: 'SCIT' },
  { id: 2, name: 'School of Business', code: 'SBUS' },
  { id: 3, name: 'School of Engineering', code: 'SENG' },
  { id: 4, name: 'School of Health Sciences', code: 'SHS' },
]
const MOCK_LECTURERS = [
  { id: 1, name: 'Dr. James Mwangi', dept_id: 1 },
  { id: 2, name: 'Prof. Sarah Kamau', dept_id: 1 },
  { id: 3, name: 'Dr. Peter Odhiambo', dept_id: 2 },
  { id: 4, name: 'Ms. Grace Njeri', dept_id: 2 },
  { id: 5, name: 'Dr. Michael Otieno', dept_id: 3 },
]
const MOCK_UNITS = [
  { id: 1, name: 'Data Structures & Algorithms', code: 'SCT211', dept_id: 1, dept_name: 'School of Computing & IT', lecturer_id: 1, lecturer_name: 'Dr. James Mwangi', enrolled: 128, semester: 'Semester 1', year: '2024' },
  { id: 2, name: 'Database Systems', code: 'SCT222', dept_id: 1, dept_name: 'School of Computing & IT', lecturer_id: 2, lecturer_name: 'Prof. Sarah Kamau', enrolled: 112, semester: 'Semester 2', year: '2024' },
  { id: 3, name: 'Web Technologies', code: 'SCT231', dept_id: 1, dept_name: 'School of Computing & IT', lecturer_id: 1, lecturer_name: 'Dr. James Mwangi', enrolled: 95, semester: 'Semester 1', year: '2024' },
  { id: 4, name: 'Business Mathematics', code: 'SBU101', dept_id: 2, dept_name: 'School of Business', lecturer_id: 3, lecturer_name: 'Dr. Peter Odhiambo', enrolled: 200, semester: 'Semester 1', year: '2024' },
  { id: 5, name: 'Principles of Management', code: 'SBU112', dept_id: 2, dept_name: 'School of Business', lecturer_id: 4, lecturer_name: 'Ms. Grace Njeri', enrolled: 185, semester: 'Semester 2', year: '2024' },
  { id: 6, name: 'Engineering Drawing', code: 'SEG101', dept_id: 3, dept_name: 'School of Engineering', lecturer_id: 5, lecturer_name: 'Dr. Michael Otieno', enrolled: 78, semester: 'Semester 1', year: '2024' },
]

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3']
const YEARS = ['2023', '2024', '2025', '2026']

const emptyForm = { name: '', code: '', dept_id: '', lecturer_id: '', semester: 'Semester 1', year: '2024' }

function ModalBackdrop({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      {children}
    </div>
  )
}

export default function Units() {
  const [units, setUnits] = useState([])
  const [depts, setDepts] = useState(MOCK_DEPTS)
  const [lecturers, setLecturers] = useState(MOCK_LECTURERS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editUnit, setEditUnit] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [enrollModal, setEnrollModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [enrollSearch, setEnrollSearch] = useState('')

  // Mock students for enroll picker
  const mockStudents = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: ['Alice Wanjiku','Brian Otieno','Carol Muthoni','David Kamau','Eve Njeri','Faith Auma','George Maina','Hannah Waweru'][i % 8] + ` #${i + 1}`,
    reg: `SCT211-${String(i + 1).padStart(4, '0')}/2024`,
    enrolled: i % 3 === 0,
  }))

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/units').catch(() => null),
      api.get('/admin/departments').catch(() => null),
      api.get('/admin/lecturers').catch(() => null),
    ]).then(([uRes, dRes, lRes]) => {
      setUnits(uRes?.data?.units || uRes?.data || MOCK_UNITS)
      if (dRes?.data) setDepts(dRes.data?.departments || dRes.data)
      if (lRes?.data) setLecturers(lRes.data?.lecturers || lRes.data)
      setLoading(false)
    })
  }, [])

  const filteredLecturers = form.dept_id
    ? lecturers.filter(l => String(l.dept_id) === String(form.dept_id))
    : lecturers

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Unit name is required'
    if (!form.code.trim()) e.code = 'Unit code is required'
    if (!form.dept_id) e.dept_id = 'Please select a department'
    setErrors(e)
    return !Object.keys(e).length
  }

  const openAdd = () => { setEditUnit(null); setForm(emptyForm); setErrors({}); setModalOpen(true) }
  const openEdit = (u) => {
    setEditUnit(u)
    setForm({ name: u.name, code: u.code, dept_id: u.dept_id, lecturer_id: u.lecturer_id, semester: u.semester, year: u.year })
    setErrors({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const dept = depts.find(d => String(d.id) === String(form.dept_id))
      const lec = lecturers.find(l => String(l.id) === String(form.lecturer_id))
      const payload = {
        ...form,
        dept_name: dept?.name || '',
        lecturer_name: lec?.name || '',
        enrolled: editUnit?.enrolled || 0,
      }
      if (editUnit) {
        await api.put(`/admin/units/${editUnit.id}`, form).catch(() => {})
        setUnits(us => us.map(u => u.id === editUnit.id ? { ...u, ...payload } : u))
        toast.success('Unit updated')
      } else {
        const nu = { id: Date.now(), ...payload }
        await api.post('/admin/units', form).catch(() => {})
        setUnits(us => [...us, nu])
        toast.success('Unit created')
      }
      setModalOpen(false)
    } catch { toast.error('Failed to save unit') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/units/${deleteModal.id}`).catch(() => {})
      setUnits(us => us.filter(u => u.id !== deleteModal.id))
      toast.success('Unit deleted')
      setDeleteModal(null)
    } catch { toast.error('Failed to delete') }
  }

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = units.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.code.toLowerCase().includes(search.toLowerCase())
    const matchDept = !deptFilter || String(u.dept_id) === deptFilter
    return matchSearch && matchDept
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

  const filteredStudents = mockStudents.filter(s =>
    !enrollSearch || s.name.toLowerCase().includes(enrollSearch.toLowerCase()) || s.reg.includes(enrollSearch)
  )

  return (
    <PageWrapper title="Units">
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Units</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filtered.length} units across {depts.length} departments</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> Add Unit</button>
        </div>

        {/* Filters */}
        <div className="mku-card p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input type="text" placeholder="Search by unit name or code…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 py-2 text-sm w-full" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="input-base py-2 text-sm w-56">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="mku-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--mku-gray-100)', borderBottom: '1px solid var(--border-color)' }}>
                  {[
                    { label: 'Unit Name', col: 'name' },
                    { label: 'Code', col: 'code' },
                    { label: 'Department', col: 'dept_name' },
                    { label: 'Lecturer', col: 'lecturer_name' },
                    { label: 'Enrolled', col: 'enrolled' },
                    { label: 'Semester', col: 'semester' },
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
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="skeleton h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                  : sorted.length === 0
                    ? (
                      <tr><td colSpan={7} className="py-16 text-center">
                        <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--border-color)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {search || deptFilter ? 'No units match your filters.' : 'No units yet. Add one to get started.'}
                        </p>
                      </td></tr>
                    )
                    : sorted.map(unit => (
                      <tr key={unit.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--mku-blue-light)' }}>
                              <BookOpen size={14} style={{ color: 'var(--mku-blue)' }} />
                            </div>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{unit.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs px-2 py-1 rounded font-bold"
                            style={{ background: 'var(--mku-blue-light)', color: 'var(--mku-blue-dark)' }}>{unit.code}</span>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{unit.dept_name || '—'}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{unit.lecturer_name || '—'}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Users size={13} style={{ color: 'var(--text-secondary)' }} />
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{unit.enrolled}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {unit.semester} · {unit.year}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEnrollModal(unit)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                              style={{ background: 'var(--mku-blue-light)', color: 'var(--mku-blue)' }}
                              title="Enroll Students">Enroll</button>
                            <button onClick={() => openEdit(unit)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Edit"
                              style={{ color: 'var(--text-secondary)' }}><Edit2 size={14} /></button>
                            <button onClick={() => setDeleteModal(unit)}
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ModalBackdrop>
          <div className="mku-card w-full max-w-lg scale-in" style={{ padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editUnit ? 'Edit Unit' : 'Add Unit'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Unit Name <span className="text-red-500">*</span></label>
                <input className={`input-base ${errors.name ? 'border-red-400' : ''}`}
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Data Structures & Algorithms" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Unit Code <span className="text-red-500">*</span></label>
                <input className={`input-base font-mono ${errors.code ? 'border-red-400' : ''}`}
                  value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SCT211" maxLength={10} />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Department <span className="text-red-500">*</span></label>
                <select className={`input-base ${errors.dept_id ? 'border-red-400' : ''}`}
                  value={form.dept_id} onChange={e => setForm(f => ({ ...f, dept_id: e.target.value, lecturer_id: '' }))}>
                  <option value="">Select department…</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.dept_id && <p className="text-xs text-red-500 mt-1">{errors.dept_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Lecturer</label>
                <select className="input-base" value={form.lecturer_id}
                  onChange={e => setForm(f => ({ ...f, lecturer_id: e.target.value }))}>
                  <option value="">Select lecturer (optional)…</option>
                  {filteredLecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {form.dept_id && filteredLecturers.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">No lecturers in this department yet.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Semester</label>
                  <select className="input-base" value={form.semester}
                    onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                    {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Year</label>
                  <select className="input-base" value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving…' : editUnit ? 'Save Changes' : 'Create Unit'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Enroll Students Modal */}
      {enrollModal && (
        <ModalBackdrop>
          <div className="mku-card w-full max-w-lg scale-in" style={{ padding: '28px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Enroll Students</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{enrollModal.name} · {enrollModal.code}</p>
              </div>
              <button onClick={() => { setEnrollModal(null); setEnrollSearch('') }}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div className="relative my-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input type="text" placeholder="Search students…" value={enrollSearch}
                onChange={e => setEnrollSearch(e.target.value)}
                className="input-base pl-9 py-2 text-sm w-full" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: '360px' }}>
              {filteredStudents.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer table-row-hover">
                  <input type="checkbox" defaultChecked={s.enrolled}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--mku-blue)' }}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{s.reg}</p>
                  </div>
                  {s.enrolled && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#D1FAE5', color: '#065F46' }}>Enrolled</span>
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => { setEnrollModal(null); setEnrollSearch('') }} className="btn btn-secondary">Cancel</button>
              <button onClick={() => { toast.success('Enrollment updated'); setEnrollModal(null); setEnrollSearch('') }} className="btn btn-primary">
                Save Enrollment
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
            <h2 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>Delete Unit?</h2>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
              Permanently delete <strong>{deleteModal.name}</strong>? All session records will also be removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn btn-danger flex-1">Delete</button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </PageWrapper>
  )
}
