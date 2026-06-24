import React, { useEffect, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import api from '../../services/api'
import { BookOpen, Users, Layers, Building2 } from 'lucide-react'

export default function HodCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/hod/overview')
      .then(({ data }) => { if (mounted) setCourses(data.courses || []) })
      .catch((err) => { console.error(err) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <PageWrapper title="Department Courses">
      <div className="space-y-6">
        <div className="mku-card p-6 rounded-3xl border border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Course catalogue</p>
              <h2 className="text-2xl font-semibold text-slate-900">Manage programmes and units</h2>
            </div>
            <button className="btn btn-secondary inline-flex items-center gap-2">
              <BookOpen size={16} /> New course
            </button>
          </div>
        </div>

        <div className="mku-card overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-[0.2em]">
              <tr>
                <th className="px-5 py-4">Course</th>
                <th className="px-5 py-4">Units</th>
                <th className="px-5 py-4">Students</th>
                <th className="px-5 py-4">Attendance</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                new Array(5).fill(null).map((_, idx) => (
                  <tr key={idx} className="animate-pulse bg-white">
                    <td className="px-5 py-4 h-12" colSpan={5}><div className="h-4 w-full rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : courses.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>No courses found for your department.</td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{course.code}</p>
                      <p className="text-sm text-slate-500 mt-1">{course.name}</p>
                    </td>
                    <td className="px-5 py-4">{course.units_count}</td>
                    <td className="px-5 py-4">{course.students_count}</td>
                    <td className="px-5 py-4">{course.avg_attendance || '—'}%</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        <Layers size={12} /> Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="mku-card p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-slate-500">
              <BookOpen size={18} />
              <span>Courses in review</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{courses.length}</p>
            <p className="text-sm text-slate-500 mt-2">Programs assigned to your department.</p>
          </div>
          <div className="mku-card p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-slate-500">
              <Users size={18} />
              <span>Total students</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{loading ? '…' : courses.reduce((sum, c) => sum + (c.students_count || 0), 0)}</p>
            <p className="text-sm text-slate-500 mt-2">Estimated enrollment across courses.</p>
          </div>
          <div className="mku-card p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-slate-500">
              <Building2 size={18} />
              <span>Unit coverage</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{loading ? '…' : courses.reduce((sum, c) => sum + (c.units_count || 0), 0)}</p>
            <p className="text-sm text-slate-500 mt-2">Units currently managed by this department.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
