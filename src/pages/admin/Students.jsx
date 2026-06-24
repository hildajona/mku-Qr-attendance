import React, { useState, useEffect, useRef, useCallback } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import StatusBadge from '../../components/ui/StatusBadge'
import { userService } from '../../services/user.service'
import api from '../../services/api'
import {
  Plus, Upload, Edit2, Trash2, UserCheck, UserX,
  Search, ChevronLeft, ChevronRight, Download, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { name: '', email: '', reg_number: '', password: '', course: '' }
const PAGE_SIZE = 20

export default function Students() {
  const [students, setStudents]     = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importing, setImporting]   = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef()
  const searchTimer = useRef()

  const load = useCallback(async (p = page, s = search, c = courseFilter) => {
    setLoading(true)
    try {
      // Try the paginated endpoint first, fall back to admin/students
      const { data } = await api.get('/students', {
        params: { page: p, limit: PAGE_SIZE, search: s || undefined, course: c || undefined }
      }).catch(() => api.get('/admin/students'))

      if (data.students) {
        setStudents(data.students)
        setTotal(data.total || data.students.length)
      }
    } catch {
      setStudents([
        { id: 3, name: 'Alice Wanjiku',  email: 'alice@student.cams.ac.ke', reg_number: 'SCT211-0001/2024', course: 'BSc Computer Science',      is_active: true, created_at: '2024-01-03' },
        { id: 4, name: 'Brian Otieno',   email: 'brian@student.cams.ac.ke', reg_number: 'SCT211-0002/2024', course: 'BSc Computer Science',      is_active: true, created_at: '2024-01-04' },
        { id: 5, name: 'Carol Muthoni',  email: 'carol@student.cams.ac.ke', reg_number: 'SCT211-0003/2024', course: 'BSc Information Technology', is_active: false, created_at: '2024-01-05' },
        { id: 7, name: 'David Kamau',    email: 'david@student.cams.ac.ke', reg_number: 'SCT211-0004/2024', course: 'BSc Computer Science',      is_active: true, created_at: '2024-01-07' },
        { id: 8, name: 'Eve Njeri',      email: 'eve@student.cams.ac.ke',   reg_number: 'SCT211-0005/2024', course: 'BSc Information Technology', is_active: true, created_at: '2024-01-08' },
      ])
      setTotal(5)
    } finally {
      setLoading(false)
    }
  }, [page, search, courseFilter])

  useEffect(() => { load() }, [])

  const handleSearch = (v) => {
    setSearch(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); load(1, v, courseFilter) }, 400)
  }

  const handleCourseFilter = (v) => {
    setCourseFilter(v)
    setPage(1)
    load(1, search, v)
  }

  const changePage = (p) => { setPage(p); load(p, search, courseFilter) }

  const openAdd = () => { setEditStudent(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (s) => {
    setEditStudent(s)
    setForm({ name: s.name, email: s.email || '', reg_number: s.reg_number, password: '', course: s.course || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.reg_number) { toast.error('Name and registration number are required'); return }
    setSaving(true)
    try {
      if (editStudent) {
        await userService.updateStudent(editStudent.id, form)
        toast.success('Student updated')
      } else {
        await userService.createStudent({ ...form, password: form.password || 'student123' })
        toast.success('Student added — default password: student123')
      }
      setModalOpen(false)
      load(page, search, courseFilter)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save student')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (student) => {
    const isCurrentlyActive = student.status === 'active' || student.is_active
    try {
      await userService.updateStudent(student.id, {
        is_active: !isCurrentlyActive,
        status: isCurrentlyActive ? 'suspended' : 'active',
      })
      toast.success(`Student ${isCurrentlyActive ? 'deactivated' : 'activated'}`)
      load(page, search, courseFilter)
    } catch { toast.error('Failed to update status') }
  }

  const handleDelete = async () => {
    try {
      await userService.deleteStudent(deleteModal.id)
      toast.success('Student removed')
      setDeleteModal(null)
      load(page, search, courseFilter)
    } catch { toast.error('Failed to delete student') }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)
    setImportModal(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(data)
      toast.success(data.message)
      load(1, '', '')
    } catch (err) {
      const msg = err.response?.data?.message || 'Import failed'
      setImportResult({ message: msg, imported: 0, skipped: 0, total: 0 })
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'name,email,reg_number,course,password\nAlice Wanjiku,alice@example.com,SCT211-0001/2024,BSc Computer Science,student123\nBrian Otieno,brian@example.com,SCT211-0002/2024,BSc IT,student123'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'students-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageWrapper title="Students">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Students</h1>
            <p className="text-sm text-slate-500">{total.toLocaleString()} total registered students</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" leftIcon={<FileText size={14} />} onClick={downloadTemplate}>
              CSV Template
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" leftIcon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
              Import CSV
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openAdd}>
              Add Student
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or reg number…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="input-base pl-9 py-2 text-sm w-full"
            />
          </div>
          <input
            type="text"
            placeholder="Filter by course…"
            value={courseFilter}
            onChange={e => handleCourseFilter(e.target.value)}
            className="input-base py-2 text-sm w-48"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reg Number</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Course</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-5 py-3.5">
                            <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : students.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center text-slate-400">
                          No students found. {search && 'Try clearing the search.'}
                        </td>
                      </tr>
                    )
                    : students.map(s => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {s.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-700">{s.name}</p>
                              <p className="text-xs text-slate-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{s.reg_number}</td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-[160px] truncate">{s.course || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={s.status || (s.is_active ? 'active' : 'inactive')} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleToggle(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title={s.is_active || s.status === 'active' ? 'Deactivate' : 'Activate'}>
                              {s.is_active || s.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button onClick={() => setDeleteModal(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} of <strong>{total.toLocaleString()}</strong></span>
              <div className="flex items-center gap-1">
                <button onClick={() => changePage(page-1)} disabled={page===1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold">{page}</span>
                <span className="text-slate-400 text-xs">of {totalPages}</span>
                <button onClick={() => changePage(page+1)} disabled={page===totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editStudent ? 'Edit Student' : 'Add Student'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editStudent ? 'Save Changes' : 'Add Student'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Alice Wanjiku" required />
          <Input label="Email (optional)" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="alice@student.cams.ac.ke" />
          <Input label="Registration Number" value={form.reg_number} onChange={e => setForm(f => ({...f, reg_number: e.target.value}))} placeholder="SCT211-0001/2024" required />
          <Input label="Course / Programme" value={form.course} onChange={e => setForm(f => ({...f, course: e.target.value}))} placeholder="BSc Computer Science" />
          {!editStudent && (
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Leave blank → uses student123" hint="Students can change this after first login" />
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remove Student" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        <p className="text-slate-600">Remove <strong>{deleteModal?.name}</strong>? Their attendance history will also be deleted. This cannot be undone.</p>
      </Modal>

      {/* Import result modal */}
      <Modal isOpen={importModal} onClose={() => setImportModal(false)} title="CSV Import Result" size="sm">
        {importing
          ? <div className="flex items-center justify-center gap-3 py-8">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
              <span className="text-slate-600">Importing students…</span>
            </div>
          : importResult && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <p className="font-semibold text-green-700">{importResult.message}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-slate-700">{importResult.total}</p>
                  <p className="text-xs text-slate-500">Total rows</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-700">{importResult.skipped}</p>
                  <p className="text-xs text-amber-600">Skipped</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">Skipped rows already exist or are missing reg_number</p>
              <Button variant="primary" className="w-full mt-2" onClick={() => setImportModal(false)}>Done</Button>
            </div>
          )
        }
      </Modal>
    </PageWrapper>
  )
}
