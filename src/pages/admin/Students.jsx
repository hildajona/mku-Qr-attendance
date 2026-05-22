import React, { useState, useEffect, useRef } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import DataTable from '../../components/tables/DataTable'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import StatusBadge from '../../components/ui/StatusBadge'
import { userService } from '../../services/user.service'
import { parseCSVFile } from '../../utils/export.utils'
import { Plus, Upload, Edit2, Trash2, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { name: '', email: '', reg_number: '', password: '', course: '' }

export default function Students() {
  const [students, setStudents]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const fileRef                   = useRef()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await userService.getStudents()
      setStudents(data.students || data || [])
    } catch {
      // Mock data
      setStudents([
        { id: 1, name: 'Alice Wanjiku', email: 'alice@student.mku.ac.ke', reg_number: 'SCT211-0001/2024', course: 'BSc CS', is_active: true, created_at: '2024-01-15' },
        { id: 2, name: 'Brian Otieno', email: 'brian@student.mku.ac.ke', reg_number: 'SCT211-0002/2024', course: 'BSc CS', is_active: true, created_at: '2024-01-15' },
        { id: 3, name: 'Carol Muthoni', email: 'carol@student.mku.ac.ke', reg_number: 'SCT211-0003/2024', course: 'BSc IT', is_active: false, created_at: '2024-01-16' },
        { id: 4, name: 'David Kamau', email: 'david@student.mku.ac.ke', reg_number: 'SCT211-0004/2024', course: 'BSc Math', is_active: true, created_at: '2024-01-16' },
        { id: 5, name: 'Eve Njeri', email: 'eve@student.mku.ac.ke', reg_number: 'SCT211-0005/2024', course: 'BSc IT', is_active: true, created_at: '2024-01-17' },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditStudent(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (student) => {
    setEditStudent(student)
    setForm({ name: student.name, email: student.email, reg_number: student.reg_number, password: '', course: student.course || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.reg_number) {
      toast.error('Name and registration number are required')
      return
    }
    setSaving(true)
    try {
      if (editStudent) {
        await userService.updateStudent(editStudent.id, form)
        toast.success('Student updated')
      } else {
        await userService.createStudent({ ...form, password: form.password || 'student123' })
        toast.success('Student added')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save student')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (student) => {
    try {
      await userService.updateStudent(student.id, { is_active: !student.is_active })
      toast.success(`Student ${student.is_active ? 'deactivated' : 'activated'}`)
      load()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await userService.deleteStudent(deleteModal.id)
      toast.success('Student deleted')
      setDeleteModal(null)
      load()
    } catch {
      toast.error('Failed to delete student')
    }
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const rows = await parseCSVFile(file)
      const formData = new FormData()
      formData.append('file', file)
      await userService.importStudents(formData)
      toast.success(`Imported ${rows.length} students`)
      load()
    } catch {
      toast.error('CSV import failed. Check format.')
    }
    e.target.value = ''
  }

  const columns = [
    { label: 'Name', accessor: 'name', sortable: true, render: (v, row) => (
      <div>
        <p className="font-medium text-slate-700">{v}</p>
        <p className="text-xs text-slate-400">{row.email}</p>
      </div>
    )},
    { label: 'Reg Number', accessor: 'reg_number', sortable: true },
    { label: 'Course', accessor: 'course', sortable: true },
    { label: 'Joined', accessor: 'created_at', sortable: true, render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { label: 'Status', accessor: 'is_active', render: v => <StatusBadge status={v ? 'active' : 'inactive'} /> },
    { label: 'Actions', accessor: 'id', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700">
          <Edit2 size={14} />
        </button>
        <button onClick={() => handleToggleActive(row)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700">
          {row.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
        </button>
        <button onClick={() => setDeleteModal(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ]

  return (
    <PageWrapper title="Manage Students">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Students</h1>
            <p className="text-sm text-slate-500">{students.length} total students</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
            <Button variant="outline" size="sm" leftIcon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
              Import CSV
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openAdd}>
              Add Student
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          searchPlaceholder="Search students..."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
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
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alice Wanjiku" required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="alice@student.mku.ac.ke" />
          <Input label="Registration Number" value={form.reg_number} onChange={e => setForm(f => ({ ...f, reg_number: e.target.value }))} placeholder="SCT211-0001/2024" required />
          <Input label="Course" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="BSc Computer Science" />
          {!editStudent && (
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Default: student123" hint="Leave blank to use default password" />
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Student"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-slate-600">
          Are you sure you want to delete <strong>{deleteModal?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </PageWrapper>
  )
}
