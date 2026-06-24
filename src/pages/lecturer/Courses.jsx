import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import { BookOpen, Users, Hash, UserPlus, Search, Loader2 } from 'lucide-react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

export default function LecturerCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  // Add Student Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState({ full_name: '', student_reg_no: '', phone: '', year: '1' })

  const loadCourses = () => {
    setLoading(true)
    api.get('/lecturer/courses')
      .then(({ data }) => setCourses(data.courses || data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCourses() }, [])

  // Debounced Search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      setShowQuickAdd(false)
      return
    }
    const delay = setTimeout(() => {
      setIsSearching(true)
      api.get(`/students/search?q=${searchQuery}`)
        .then(({ data }) => {
          setSearchResults(data.students || [])
          setShowQuickAdd(data.students.length === 0)
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false))
    }, 300)

    return () => clearTimeout(delay)
  }, [searchQuery])

  const openAddStudent = (unit) => {
    setSelectedUnit(unit)
    setSearchQuery('')
    setSearchResults([])
    setShowQuickAdd(false)
    setAddModalOpen(true)
  }

  const handleEnroll = async (studentId, studentName) => {
    if (!window.confirm(`Add ${studentName} to ${selectedUnit.code}?`)) return
    setEnrolling(true)
    try {
      await api.post(`/courses/${selectedUnit.course_id}/enroll`, { student_id: studentId })
      toast.success(`${studentName} enrolled successfully!`)
      setAddModalOpen(false)
      loadCourses()
    } catch (err) {
      toast.error('Failed to enroll student')
    } finally {
      setEnrolling(false)
    }
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    setEnrolling(true)
    try {
      // API call to create pending user then enroll. We'll simulate this by calling auth register then enroll.
      // In a real app, there would be a dedicated quick-add endpoint.
      await api.post('/auth/register/student', { ...quickAddForm, password: 'walkinpassword', department: 'Unknown', programme: 'Unknown', semester: '1', photo_base64: 'placeholder' })
      toast.success('Pending account created! Awaiting admin approval.')
      setAddModalOpen(false)
    } catch (err) {
      toast.error('Failed to quick-add student')
    } finally {
      setEnrolling(false)
    }
  }

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
                    <div key={unit.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow relative">
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
                        <button 
                          onClick={() => openAddStudent(unit)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          <UserPlus size={14} /> Add Student
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={selectedUnit ? `Add Student to ${selectedUnit.code}` : 'Add Student'}
      >
        <div className="space-y-4">
          {!showQuickAdd ? (
            <>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or reg number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                {isSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              </div>

              {searchQuery.length >= 2 && searchResults.length > 0 && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                  {searchResults.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 hover:bg-white transition-colors cursor-pointer" onClick={() => handleEnroll(student.id, student.name)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                          {student.photo_url ? <img src={student.photo_url} alt="Profile" className="w-full h-full object-cover" /> : <Users className="w-6 h-6 m-2 text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.reg_number}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" loading={enrolling}>Add</Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 space-y-4">
              <div className="text-center">
                <p className="text-orange-800 font-medium">Student not found in system</p>
                <p className="text-sm text-orange-600">Quick-add a walk-in student. An admin must approve.</p>
              </div>
              <form onSubmit={handleQuickAdd} className="space-y-3">
                <Input label="Full Name" value={quickAddForm.full_name} onChange={e => setQuickAddForm({...quickAddForm, full_name: e.target.value})} required />
                <Input label="Reg Number" value={quickAddForm.student_reg_no} onChange={e => setQuickAddForm({...quickAddForm, student_reg_no: e.target.value})} required />
                <Input label="Phone" value={quickAddForm.phone} onChange={e => setQuickAddForm({...quickAddForm, phone: e.target.value})} required />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowQuickAdd(false)}>Back to Search</Button>
                  <Button type="submit" variant="primary" className="flex-1" loading={enrolling}>Quick Add</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Modal>
    </PageWrapper>
  )
}
