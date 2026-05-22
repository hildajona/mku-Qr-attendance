import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import DoughnutChart from '../../components/charts/DoughnutChart'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { ScanLine, BookOpen, AlertTriangle } from 'lucide-react'
import api from '../../services/api'

export default function StudentDashboard() {
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/attendance/student/${user?.id}`)
      .then(({ data }) => setData(data))
      .catch(() => {
        setData({
          units: [
            { id: 1, name: 'Data Structures & Algorithms', code: 'SCS 201', attended: 10, total: 12, percentage: 83 },
            { id: 2, name: 'Database Systems', code: 'SCS 202', attended: 8, total: 10, percentage: 80 },
            { id: 3, name: 'Operating Systems', code: 'SCS 203', attended: 5, total: 12, percentage: 42 },
            { id: 4, name: 'Web Development', code: 'SIT 201', attended: 9, total: 10, percentage: 90 },
          ],
          overall: 74,
        })
      })
      .finally(() => setLoading(false))
  }, [user])

  const lowAttendance = data?.units?.filter(u => u.percentage < 75) || []

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Hi, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 text-sm mt-1">{user?.reg_number}</p>
          </div>
          <Button variant="primary" leftIcon={<ScanLine size={16} />} onClick={() => navigate('/student/scanner')}>
            Scan QR
          </Button>
        </div>

        {/* Overall attendance */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          {loading ? (
            <div className="w-44 h-44 bg-slate-100 rounded-full animate-pulse" />
          ) : (
            <DoughnutChart percentage={data?.overall || 0} label="Overall" size={160} />
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-800">Overall Attendance</h2>
            <p className="text-slate-500 text-sm mt-1">
              {data?.overall >= 75
                ? 'Great job! You are above the 75% threshold.'
                : 'Warning: Your attendance is below 75%. Attend more classes.'}
            </p>
            {lowAttendance.length > 0 && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{lowAttendance.length} unit{lowAttendance.length > 1 ? 's' : ''} below 75%</span>
              </div>
            )}
          </div>
        </div>

        {/* Per-unit attendance */}
        <div>
          <h2 className="font-semibold text-slate-800 mb-3">Attendance by Unit</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-28 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.units?.map(unit => {
                const isLow = unit.percentage < 75
                return (
                  <div
                    key={unit.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer
                      ${isLow ? 'border-amber-200' : 'border-slate-100'}`}
                    onClick={() => navigate('/student/history')}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLow ? 'bg-amber-50' : 'bg-green-50'}`}>
                          <BookOpen size={15} className={isLow ? 'text-amber-600' : 'text-green-600'} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{unit.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{unit.code}</p>
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${isLow ? 'text-amber-600' : 'text-green-600'}`}>
                        {unit.percentage}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${isLow ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${unit.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{unit.attended}/{unit.total} classes attended</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
