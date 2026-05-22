import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import { BookOpen, Users, Hash } from 'lucide-react'
import api from '../../services/api'

export default function LecturerCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/lecturer/courses')
      .then(({ data }) => setCourses(data.courses || data || []))
      .catch(() => {
        setCourses([
          {
            id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSC-CS',
            units: [
              { id: 1, name: 'Data Structures & Algorithms', code: 'SCS 201', students_count: 80, sessions_count: 12 },
              { id: 2, name: 'Database Systems', code: 'SCS 202', students_count: 80, sessions_count: 10 },
            ]
          },
          {
            id: 2, name: 'Bachelor of Science in Information Technology', code: 'BSC-IT',
            units: [
              { id: 3, name: 'Web Development', code: 'SIT 201', students_count: 65, sessions_count: 8 },
            ]
          },
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper title="My Courses">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Courses</h1>
          <p className="text-sm text-slate-500">Units assigned to you</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-64 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1,2].map(j => <div key={j} className="h-24 bg-slate-100 rounded-xl" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {courses.map(course => (
              <div key={course.id}>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={16} className="text-green-600" />
                  <h2 className="font-semibold text-slate-700">{course.name}</h2>
                  <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">{course.code}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {course.units.map(unit => (
                    <div key={unit.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                          <BookOpen size={18} className="text-green-600" />
                        </div>
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{unit.code}</span>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm mb-3">{unit.name}</h3>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{unit.students_count} students</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash size={12} />
                          <span>{unit.sessions_count} sessions</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
