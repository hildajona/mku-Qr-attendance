import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Plus, BookOpen, ChevronDown, ChevronRight, Users, Hash } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function Courses() {
  const [courses, setCourses]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState({})
  const [courseModal, setCourseModal] = useState(false)
  const [unitModal, setUnitModal] = useState(null) // course object
  const [courseForm, setCourseForm] = useState({ name: '', code: '' })
  const [unitForm, setUnitForm]   = useState({ name: '', code: '' })
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/courses')
      setCourses(data.courses || data || [])
    } catch {
      setCourses([
        {
          id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSC-CS', students_count: 320,
          units: [
            { id: 1, name: 'Data Structures & Algorithms', code: 'SCS 201', students_count: 80 },
            { id: 2, name: 'Database Systems', code: 'SCS 202', students_count: 80 },
            { id: 3, name: 'Operating Systems', code: 'SCS 203', students_count: 80 },
          ]
        },
        {
          id: 2, name: 'Bachelor of Science in Information Technology', code: 'BSC-IT', students_count: 280,
          units: [
            { id: 4, name: 'Web Development', code: 'SIT 201', students_count: 70 },
            { id: 5, name: 'Network Administration', code: 'SIT 202', students_count: 70 },
          ]
        },
        {
          id: 3, name: 'Bachelor of Science in Mathematics', code: 'BSC-MATH', students_count: 180,
          units: [
            { id: 6, name: 'Calculus II', code: 'SMA 201', students_count: 60 },
            { id: 7, name: 'Linear Algebra', code: 'SMA 202', students_count: 60 },
          ]
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const handleAddCourse = async () => {
    if (!courseForm.name || !courseForm.code) { toast.error('Name and code required'); return }
    setSaving(true)
    try {
      await api.post('/courses', courseForm)
      toast.success('Course created')
      setCourseModal(false)
      setCourseForm({ name: '', code: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  const handleAddUnit = async () => {
    if (!unitForm.name || !unitForm.code) { toast.error('Unit name and code required'); return }
    setSaving(true)
    try {
      await api.post(`/courses/${unitModal.id}/units`, unitForm)
      toast.success('Unit added')
      setUnitModal(null)
      setUnitForm({ name: '', code: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add unit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageWrapper title="Courses & Units">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Courses & Units</h1>
            <p className="text-sm text-slate-500">{courses.length} courses</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCourseModal(true)}>
            Add Course
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-64 mb-2" />
                <div className="h-4 bg-slate-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Course header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(course.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                      <BookOpen size={18} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{course.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1"><Hash size={11} />{course.code}</span>
                        <span className="flex items-center gap-1"><Users size={11} />{course.students_count} students</span>
                        <span>{course.units?.length || 0} units</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus size={12} />}
                      onClick={e => { e.stopPropagation(); setUnitModal(course); setUnitForm({ name: '', code: '' }) }}
                    >
                      Add Unit
                    </Button>
                    {expanded[course.id]
                      ? <ChevronDown size={18} className="text-slate-400" />
                      : <ChevronRight size={18} className="text-slate-400" />
                    }
                  </div>
                </div>

                {/* Units list */}
                {expanded[course.id] && (
                  <div className="border-t border-slate-100">
                    {!course.units?.length ? (
                      <p className="px-5 py-4 text-sm text-slate-400">No units yet. Add the first unit.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Unit Name</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Students</th>
                          </tr>
                        </thead>
                        <tbody>
                          {course.units.map(unit => (
                            <tr key={unit.id} className="border-t border-slate-50 table-row-hover">
                              <td className="px-5 py-3 font-medium text-slate-700">{unit.name}</td>
                              <td className="px-5 py-3 text-slate-500 font-mono text-xs">{unit.code}</td>
                              <td className="px-5 py-3 text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Users size={13} className="text-slate-400" />
                                  {unit.students_count ?? 0}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      <Modal
        isOpen={courseModal}
        onClose={() => setCourseModal(false)}
        title="Create Course"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCourseModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleAddCourse}>Create Course</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Course Name" value={courseForm.name} onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))} placeholder="Bachelor of Science in Computer Science" required />
          <Input label="Course Code" value={courseForm.code} onChange={e => setCourseForm(f => ({ ...f, code: e.target.value }))} placeholder="BSC-CS" required />
        </div>
      </Modal>

      {/* Add Unit Modal */}
      <Modal
        isOpen={!!unitModal}
        onClose={() => setUnitModal(null)}
        title={`Add Unit to ${unitModal?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUnitModal(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleAddUnit}>Add Unit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Unit Name" value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} placeholder="Data Structures & Algorithms" required />
          <Input label="Unit Code" value={unitForm.code} onChange={e => setUnitForm(f => ({ ...f, code: e.target.value }))} placeholder="SCS 201" required />
        </div>
      </Modal>
    </PageWrapper>
  )
}
