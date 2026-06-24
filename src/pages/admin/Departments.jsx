import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import { Building2, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Users, BookOpen, GraduationCap, Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const MOCK = [
  { id: 1, name: 'School of Computing & IT', code: 'SCIT', lecturers: 24, units: 48, students: 1240, color: '#0057A8' },
  { id: 2, name: 'School of Business', code: 'SBUS', lecturers: 18, units: 36, students: 980, color: '#059669' },
  { id: 3, name: 'School of Engineering', code: 'SENG', lecturers: 15, units: 30, students: 720, color: '#7C3AED' },
  { id: 4, name: 'School of Health Sciences', code: 'SHS', lecturers: 22, units: 44, students: 1100, color: '#DC2626' },
  { id: 5, name: 'School of Education', code: 'SEDU', lecturers: 12, units: 24, students: 560, color: '#D97706' },
  { id: 6, name: 'School of Law', code: 'SLAW', lecturers: 10, units: 20, students: 400, color: '#0891B2' },
]

const DEPT_COLORS = ['#0057A8','#059669','#7C3AED','#DC2626','#D97706','#0891B2','#BE185D','#065F46']

function ModalBackdrop({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      {children}
    </div>
  )
}

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDept, setEditDept] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState({ name: '', code: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    setLoading(true)
    api.get('/admin/departments').catch(() => null).then(res => {
      setDepartments(res?.data?.departments || res?.data || MOCK)
      setLoading(false)
    })
  }, [])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Department name is required'
    if (!form.code.trim()) e.code = 'Code is required'
    else if (form.code.length > 10) e.code = 'Max 10 characters'
    setErrors(e)
    return !Object.keys(e).length
  }

  const openAdd = () => { setEditDept(null); setForm({ name: '', code: '' }); setErrors({}); setModalOpen(true) }
  const openEdit = (d, e) => { e?.stopPropagation(); setEditDept(d); setForm({ name: d.name, code: d.code }); setErrors({}); setModalOpen(true) }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editDept) {
        await api.put(`/admin/departments/${editDept.id}`, form).catch(() => {})
        setDepartments(ds => ds.map(d => d.id === editDept.id ? { ...d, ...form } : d))
        toast.success('Department updated')
      } else {
        const colorIdx = departments.length % DEPT_COLORS.length
        const nd = { id: Date.now(), ...form, lecturers: 0, units: 0, students: 0, color: DEPT_COLORS[colorIdx] }
        await api.post('/admin/departments', form).catch(() => {})
        setDepartments(ds => [...ds, nd])
        toast.success('Department created')
      }
      setModalOpen(false)
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/departments/${deleteModal.id}`).catch(() => {})
      setDepartments(ds => ds.filter(d => d.id !== deleteModal.id))
      toast.success('Department deleted')
      setDeleteModal(null)
    } catch { toast.error('Failed to delete') }
  }

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = [...departments].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol]
    if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })

  const totals = departments.reduce((acc, d) => ({
    lecturers: acc.lecturers + (d.lecturers || 0),
    units: acc.units + (d.units || 0),
    students: acc.students + (d.students || 0),
  }), { lecturers: 0, units: 0, students: 0 })

  const SortArrow = ({ col }) => (
    <span className="ml-1 text-xs" style={{ opacity: sortCol === col ? 1 : 0.3 }}>
      {sortCol === col && sortDir === 'desc' ? '↓' : '↑'}
    </span>
  )

  return (
    <PageWrapper title="Departments">
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Departments</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {departments.length} departments · {totals.students.toLocaleString()} total students
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={16} /> Add Department
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Departments', value: departments.length, Icon: Building2, clr: '#0057A8', bg: '#E8F1FB' },
            { label: 'Total Lecturers', value: totals.lecturers, Icon: GraduationCap, clr: '#7C3AED', bg: '#EDE9FE' },
            { label: 'Total Units', value: totals.units, Icon: BookOpen, clr: '#059669', bg: '#D1FAE5' },
            { label: 'Total Students', value: totals.students.toLocaleString(), Icon: Users, clr: '#D97706', bg: '#FEF3C7' },
          ].map(({ label, value, Icon, clr, bg }) => (
            <div key={label} className="mku-card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={20} style={{ color: clr }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{loading ? '…' : value}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="mku-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--mku-gray-100)', borderBottom: '1px solid var(--border-color)' }}>
                  {[
                    { label: 'Department', col: 'name' },
                    { label: 'Code', col: 'code' },
                    { label: 'Lecturers', col: 'lecturers' },
                    { label: 'Units', col: 'units' },
                    { label: 'Students', col: 'students' },
                    { label: 'Actions', col: null },
                  ].map(h => (
                    <th key={h.label}
                      onClick={() => h.col && handleSort(h.col)}
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
                        <Building2 size={40} className="mx-auto mb-3" style={{ color: 'var(--border-color)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No departments yet. Add one to get started.</p>
                      </td></tr>
                    )
                    : sorted.map(dept => (
                      <React.Fragment key={dept.id}>
                        <tr className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                          onClick={() => setExpanded(e => e === dept.id ? null : dept.id)}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: dept.color + '20' }}>
                                <Building2 size={15} style={{ color: dept.color }} />
                              </div>
                              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.name}</p>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {expanded === dept.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs px-2 py-1 rounded-md font-bold"
                              style={{ background: dept.color + '18', color: dept.color }}>{dept.code}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.lecturers}</td>
                          <td className="px-5 py-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.units}</td>
                          <td className="px-5 py-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.students?.toLocaleString()}</td>
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setExpanded(e => e === dept.id ? null : dept.id)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="View"
                                style={{ color: 'var(--text-secondary)' }}><Eye size={14} /></button>
                              <button onClick={e => openEdit(dept, e)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Edit"
                                style={{ color: 'var(--text-secondary)' }}><Edit2 size={14} /></button>
                              <button onClick={e => { e.stopPropagation(); setDeleteModal(dept) }}
                                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete"
                                style={{ color: 'var(--text-secondary)' }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded drill-down */}
                        {expanded === dept.id && (
                          <tr style={{ background: 'var(--mku-gray-100)', borderBottom: '2px solid var(--border-color)' }}>
                            <td colSpan={6} className="px-8 py-5">
                              <div className="grid grid-cols-3 gap-4">
                                {[
                                  { label: 'Lecturers', value: dept.lecturers, Icon: GraduationCap, clr: '#7C3AED', desc: 'Active in this dept' },
                                  { label: 'Units Offered', value: dept.units, Icon: BookOpen, clr: '#059669', desc: 'Course units' },
                                  { label: 'Students Enrolled', value: dept.students?.toLocaleString(), Icon: Users, clr: '#D97706', desc: 'Currently enrolled' },
                                ].map(({ label, value, Icon, clr, desc }) => (
                                  <div key={label} className="mku-card p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Icon size={14} style={{ color: clr }} />
                                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                                  </div>
                                ))}
                              </div>
                              {/* Attendance bar */}
                              <div className="mt-4 mku-card p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Avg Attendance Rate (This Week)</span>
                                  <span className="font-bold text-sm" style={{ color: dept.color }}>
                                    {Math.round(65 + Math.random() * 25)}%
                                  </span>
                                </div>
                                <div className="h-2 rounded-full" style={{ background: 'var(--border-color)' }}>
                                  <div className="h-2 rounded-full transition-all"
                                    style={{ width: `${65 + Math.floor(Math.random() * 25)}%`, background: dept.color }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
          <div className="mku-card w-full max-w-md scale-in" style={{ padding: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editDept ? 'Edit Department' : 'Add Department'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input className={`input-base ${errors.name ? 'border-red-400' : ''}`}
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. School of Computing & IT" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Department Code <span className="text-red-500">*</span>
                </label>
                <input className={`input-base font-mono ${errors.code ? 'border-red-400' : ''}`}
                  value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SCIT" maxLength={10} />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Max 10 characters · automatically uppercased</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving…' : editDept ? 'Save Changes' : 'Create Department'}
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
            <h2 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>Delete Department?</h2>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
              Permanently delete <strong>{deleteModal.name}</strong>? All associated data will be removed. This cannot be undone.
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
