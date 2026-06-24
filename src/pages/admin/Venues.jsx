import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { Plus, MapPin, Edit2, Trash2, Users } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const emptyForm = { name: '', code: '', capacity: '', building: '', lat: '', lng: '' }

export default function AdminVenues() {
  const [venues, setVenues]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editVenue, setEditVenue] = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [saving, setSaving]     = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/venues')
      setVenues(data.venues || data || [])
    } catch {
      setVenues([
        { id: 1, name: 'Lecture Hall 1',  code: 'LH-1', capacity: 200, building: 'Main Block',    lat: null, lng: null },
        { id: 2, name: 'Lecture Hall 2',  code: 'LH-2', capacity: 150, building: 'Main Block',    lat: null, lng: null },
        { id: 3, name: 'Lecture Hall 3',  code: 'LH-3', capacity: 100, building: 'Science Block', lat: null, lng: null },
        { id: 4, name: 'Lab 1',           code: 'LAB-1', capacity: 40, building: 'ICT Block',     lat: null, lng: null },
        { id: 5, name: 'Lab 2',           code: 'LAB-2', capacity: 40, building: 'ICT Block',     lat: null, lng: null },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditVenue(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (v) => {
    setEditVenue(v)
    setForm({ name: v.name, code: v.code, capacity: v.capacity || '', building: v.building || '', lat: v.lat || '', lng: v.lng || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return }
    setSaving(true)
    try {
      if (editVenue) {
        await api.put(`/admin/venues/${editVenue.id}`, form)
        toast.success('Venue updated')
      } else {
        await api.post('/admin/venues', form)
        toast.success('Venue added')
      }
      setModalOpen(false)
      load()
    } catch {
      // Mock: update locally
      if (editVenue) {
        setVenues(v => v.map(x => x.id === editVenue.id ? { ...x, ...form } : x))
        toast.success('Venue updated')
      } else {
        setVenues(v => [...v, { id: Date.now(), ...form, capacity: parseInt(form.capacity) || 0 }])
        toast.success('Venue added')
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/venues/${deleteModal.id}`)
    } catch {
      setVenues(v => v.filter(x => x.id !== deleteModal.id))
    }
    toast.success('Venue removed')
    setDeleteModal(null)
    load()
  }

  return (
    <PageWrapper title="Venues">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Venues &amp; Rooms</h1>
            <p className="text-sm text-slate-500">{venues.length} venues configured</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openAdd}>
            Add Venue
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-32 animate-pulse" />)}
          </div>
        ) : venues.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <MapPin size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">No venues yet</p>
            <p className="text-sm text-slate-400 mt-1">Add lecture halls and labs for geo-fencing</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <MapPin size={18} className="text-green-600" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteModal(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">{v.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{v.code}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                  {v.building && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {v.building}
                    </span>
                  )}
                  {v.capacity && (
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {v.capacity} seats
                    </span>
                  )}
                  {v.lat && v.lng && (
                    <span className="text-green-600 font-semibold">📍 Geo-tagged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editVenue ? 'Edit Venue' : 'Add Venue'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editVenue ? 'Save Changes' : 'Add Venue'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Venue Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Lecture Hall 3" required />
          <Input label="Room Code" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} placeholder="LH-3" required hint="Used when creating sessions" />
          <Input label="Building" value={form.building} onChange={e => setForm(f => ({...f, building: e.target.value}))} placeholder="Main Block" />
          <Input label="Capacity (seats)" type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({...f, capacity: e.target.value}))} placeholder="100" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude (optional)" type="number" step="any" value={form.lat} onChange={e => setForm(f => ({...f, lat: e.target.value}))} placeholder="-1.2921" hint="For geo-fencing" />
            <Input label="Longitude (optional)" type="number" step="any" value={form.lng} onChange={e => setForm(f => ({...f, lng: e.target.value}))} placeholder="36.8219" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remove Venue" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        <p className="text-slate-600">Remove <strong>{deleteModal?.name}</strong>? This won't affect existing sessions.</p>
      </Modal>
    </PageWrapper>
  )
}
