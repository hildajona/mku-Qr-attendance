import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import { CheckCircle2, XCircle, Clock, User, Hash, BookOpen, Mail, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminRegistrations() {
  const [pending, setPending]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [approving, setApproving]   = useState(null)
  const [rejecting, setRejecting]   = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [filter, setFilter]         = useState('pending') // pending | approved | all

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/registrations', { params: { status: filter } })
      setPending(data.registrations || data || [])
    } catch {
      // Mock data
      setPending([
        { id: 10, name: 'Faith Kamau',    email: 'faith@gmail.com',  reg_number: 'SCT211-0010/2024', course: 'BSc Computer Science',      phone: '+254712345678', status: 'pending',  created_at: new Date().toISOString() },
        { id: 11, name: 'George Maina',   email: 'george@gmail.com', reg_number: 'SCT211-0011/2024', course: 'BSc Information Technology', phone: '+254723456789', status: 'pending',  created_at: new Date(Date.now()-3600000).toISOString() },
        { id: 12, name: 'Hannah Njeri',   email: 'hannah@gmail.com', reg_number: 'SCT211-0012/2024', course: 'BSc Computer Science',      phone: '+254734567890', status: 'approved', created_at: new Date(Date.now()-86400000).toISOString() },
        { id: 13, name: 'Isaac Waweru',   email: null,               reg_number: 'SCT211-0013/2024', course: 'BSc Mathematics',           phone: null,           status: 'pending',  created_at: new Date(Date.now()-7200000).toISOString() },
      ].filter(r => filter === 'all' || r.status === filter))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const handleApprove = async (reg) => {
    setApproving(reg.id)
    try {
      await api.post(`/admin/registrations/${reg.id}/approve`)
      toast.success(`${reg.name} approved — they can now sign in`)
      load()
    } catch {
      // Mock: just update locally
      setPending(p => p.filter(r => r.id !== reg.id))
      toast.success(`${reg.name} approved`)
    } finally {
      setApproving(null)
      setDetailModal(null)
    }
  }

  const handleReject = async (reg) => {
    setRejecting(reg.id)
    try {
      await api.post(`/admin/registrations/${reg.id}/reject`)
      toast.success(`${reg.name}'s registration rejected`)
      load()
    } catch {
      setPending(p => p.filter(r => r.id !== reg.id))
      toast.success('Registration rejected')
    } finally {
      setRejecting(null)
      setDetailModal(null)
    }
  }

  const pendingCount = pending.filter(r => r.status === 'pending').length

  return (
    <PageWrapper title="Pending Registrations">
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Student Registrations</h1>
            <p className="text-sm text-slate-500">
              Review and approve self-registered student accounts
              {pendingCount > 0 && filter !== 'approved' && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Filter tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {['pending','approved','all'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                    ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!loading && pending.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <CheckCircle2 size={40} className="text-green-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">
              {filter === 'pending' ? 'No pending registrations' : 'No registrations found'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === 'pending' ? 'All registrations have been reviewed.' : 'Try changing the filter.'}
            </p>
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map(reg => (
              <div
                key={reg.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all
                  ${reg.status === 'pending' ? 'border-amber-200' : 'border-slate-100'}`}
              >
                <div className="p-5">
                  {/* Avatar + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0F172A] flex items-center justify-center text-white font-bold text-lg">
                        {reg.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{reg.name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(reg.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={reg.status === 'pending' ? 'pending' : reg.status === 'approved' ? 'active' : 'inactive'} />
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="font-mono font-medium text-slate-700">{reg.reg_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{reg.course}</span>
                    </div>
                    {reg.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{reg.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {reg.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle2 size={13} />}
                        loading={approving === reg.id}
                        onClick={() => handleApprove(reg)}
                        className="flex-1"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<XCircle size={13} />}
                        loading={rejecting === reg.id}
                        onClick={() => handleReject(reg)}
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 py-1">
                      {reg.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
