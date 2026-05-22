import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import DataTable from '../../components/tables/DataTable'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import StatusBadge from '../../components/ui/StatusBadge'
import { userService } from '../../services/user.service'
import { Plus, Edit2, Trash2, KeyRound, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { name: '', email: '', department: '', password: '' }

export default function Lecturers() {
  const [lecturers, setLecturers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editLecturer, setEditLecturer] = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await userService.getLecturers()
      setLecturers(data.lecturers || data || [])
    } catch {
      setLecturers([
        { id: 1, name: 'Dr. James Mwangi', email: 'j.mwangi@mku.ac.ke', department: 'Computer Science', units_count: 3, is_active: true },
        { id: 2, name: 'Prof. Sarah Odhiambo', email: 's.odhiambo@mku.ac.ke', department: 'Mathematics', units_count: 2, is_active: true },
        { id: 3, name: 'Mr. Peter Kariuki', email: 'p.kariuki@mku.ac.ke', department: 'Information Technology', units_count: 4, is_active: true },
        { id: 4, name: 'Dr. Grace Wambua', email: 'g.wambua@mku.ac.ke', department: 'Computer Science', units_count: 2, is_active: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditLecturer(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (l) => {
    setEditLecturer(l)
    setForm({ name: l.name, email: l.email, department: l.department || '', password: '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required')
      return
    }
    setSaving(true)
    try {
      if (editLecturer) {
        await userService.updateLecturer(editLecturer.id, form)
        toast.success('Lecturer updated')
      } else {
        await userService.createLecturer({ ...form, role: 'lecturer', password: form.password || 'lecturer123' })
        toast.success('Lecturer added')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (l) => {
    try {
      await userService.resetLecturerPassword(l.id)
      toast.success(`Password reset for ${l.name}. New password: lecturer123`)
    } catch {
      toast.error('Failed to reset password')
    }
  }

  const handleDelete = async () => {
    try {
      await userService.deleteLecturer(deleteModal.id)
      toast.success('Lecturer removed')
      setDeleteModal(null)
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const columns = [
    { label: 'Lecturer', accessor: 'name', sortable: true, render: (v, row) => (
      <div>
        <p className="font-medium text-slate-700">{v}</p>
        <p className="text-xs text-slate-400">{row.email}</p>
      </div>
    )},
    { label: 'Department', accessor: 'department', sortable: true },
    { label: 'Units', accessor: 'units_count', sortable: true, render: v => (
      <div className="flex items-center gap-1 text-slate-600">
        <BookOpen size={13} className="text-slate-400" />
        {v ?? 0}
      </div>
    )},
    { label: 'Status', accessor: 'is_active', render: v => <StatusBadge status={v ? 'active' : 'inactive'} /> },
    { label: 'Actions', accessor: 'id', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700" title="Edit">
          <Edit2 size={14} />
        </button>
        <button onClick={() => handleResetPassword(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600" title="Reset Password">
          <KeyRound size={14} />
        </button>
        <button onClick={() => setDeleteModal(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500" title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ]

  return (
    <PageWrapper title="Manage Lecturers">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Lecturers</h1>
            <p className="text-sm text-slate-500">{lecturers.length} total lecturers</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openAdd}>
            Add Lecturer
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={lecturers}
          loading={loading}
          searchPlaceholder="Search lecturers..."
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editLecturer ? 'Edit Lecturer' : 'Add Lecturer'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editLecturer ? 'Save Changes' : 'Add Lecturer'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. James Mwangi" required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="j.mwangi@mku.ac.ke" required />
          <Input label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Computer Science" />
          {!editLecturer && (
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Default: lecturer123" hint="Leave blank to use default" />
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Remove Lecturer"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        <p className="text-slate-600">
          Remove <strong>{deleteModal?.name}</strong> from the system? Their session history will be preserved.
        </p>
      </Modal>
    </PageWrapper>
  )
}
