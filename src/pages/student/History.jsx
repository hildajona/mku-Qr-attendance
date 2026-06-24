import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import CalendarHeatmap from '../../components/charts/CalendarHeatmap'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { attendanceService } from '../../services/attendance.service'
import { Clock, BookOpen, AlertCircle, FileText } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function History() {
  const { user }          = useAuth()
  const [records, setRecords] = useState([])
  const [appeals, setAppeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  
  // Appeal Modal State
  const [isAppealOpen, setIsAppealOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [reason, setReason] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [submittingAppeal, setSubmittingAppeal] = useState(false)

  const fetchRecords = () => {
    setLoading(true)
    api.get(`/attendance/student/${user?.id}`)
      .then(({ data }) => {
        setRecords(data.recent || [])
      })
      .catch(() => {
        setRecords([
          { id: 1, session_id: 101, unit_code: 'BCS301', unit_name: 'Algorithms', date: '2024-11-20', time: '09:03:00', status: 'present' },
          { id: 2, session_id: 102, unit_code: 'BCS301', unit_name: 'Algorithms', date: '2024-11-18', time: '09:20:00', status: 'late' },
          { id: 3, session_id: 103, unit_code: 'BCS302', unit_name: 'Data Structures', date: '2024-11-19', time: '14:00:00', status: 'absent' },
        ])
      })
      .finally(() => setLoading(false))

    // Fetch user appeals
    api.get('/appeals/student')
      .then(({ data }) => setAppeals(data.appeals || []))
      .catch(() => {})
  }

  useEffect(() => {
    if (user?.id) {
      fetchRecords()
    }
  }, [user])

  const handleOpenAppeal = (record) => {
    setSelectedRecord(record)
    setReason('')
    setEvidenceUrl('')
    setIsAppealOpen(true)
  }

  const handleSubmitAppeal = async (e) => {
    e.preventDefault()
    if (!reason.trim()) return toast.error('Please enter a reason')
    
    setSubmittingAppeal(true)
    try {
      await api.post('/appeals', {
        session_id: selectedRecord.session_id || selectedRecord.id,
        reason: reason.trim(),
        evidence_url: evidenceUrl.trim() || null
      })
      toast.success('Appeal submitted successfully')
      setIsAppealOpen(false)
      fetchRecords() // Refresh
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal')
    } finally {
      setSubmittingAppeal(false)
    }
  }

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)

  return (
    <PageWrapper title="Attendance History">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance History</h1>
          <p className="text-sm text-slate-500">Your attendance record across all units</p>
        </div>

        {/* Calendar heatmap */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <CalendarHeatmap records={records} />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['all', 'present', 'late', 'absent'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
                ${filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'all' && ` (${records.length})`}
              {f !== 'all' && ` (${records.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Records table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                  <div className="flex-1 h-4 bg-slate-100 rounded" />
                  <div className="w-16 h-4 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Unit</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Dispute</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const recordSessionId = r.session_id || r.id
                    const existingAppeal = appeals.find(a => a.session_id === recordSessionId)

                    return (
                      <tr key={r.id} className="border-b border-slate-50 table-row-hover">
                        <td className="px-5 py-3 text-slate-700 font-medium">
                          {new Date(r.scanned_at || r.date).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-medium text-slate-700">{r.unit_name}</p>
                            <p className="text-xs text-slate-400 font-mono">{r.unit_code}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {r.scanned_at ? (
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              {new Date(r.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-5 py-3">
                          {existingAppeal ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                              ${existingAppeal.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : ''}
                              ${existingAppeal.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
                              ${existingAppeal.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' : ''}
                            `}>
                              Appeal {existingAppeal.status.charAt(0).toUpperCase() + existingAppeal.status.slice(1)}
                            </span>
                          ) : (r.status === 'absent' || r.status === 'late') ? (
                            <button
                              onClick={() => handleOpenAppeal(r)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <FileText size={13} /> File Appeal
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Appeal Form Modal */}
      {isAppealOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">File Attendance Appeal</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedRecord.unit_name} ({selectedRecord.unit_code})</p>
              </div>
              <button 
                onClick={() => setIsAppealOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-medium text-lg px-2"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmitAppeal} className="p-6 space-y-4">
              <div className="flex gap-3 bg-blue-50 border border-blue-200 p-3 rounded-2xl text-xs text-blue-800">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>Appeals are reviewed by the course lecturer. Please offer clear reasons (e.g. sick, network outage) and attach any support links if available.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 block">Reason for Absence/Tardiness <span className="text-red-500">*</span></label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. I was unwell and visited the campus clinic. / I had a USSD session timeout error."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-700 resize-none"
                  required
                />
              </div>

              <Input
                label="Supporting Document Link (Optional)"
                type="url"
                placeholder="e.g. Medical report or letter link (Google Drive, OneDrive)"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAppealOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  loading={submittingAppeal}
                >
                  Submit Appeal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
