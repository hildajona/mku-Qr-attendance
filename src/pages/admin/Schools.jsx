import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Building2, BookOpen, Users, Plus, Edit2, Trash2,
  ChevronRight, ChevronDown, GraduationCap, Search, RefreshCw
} from 'lucide-react'

export default function AdminSchools() {
  const [schools, setSchools]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState({})
  const [depts, setDepts]           = useState({})          // schoolId → departments[]
  const [courses, setCourses]       = useState({})          // deptId → courses[]
  const [units, setUnits]           = useState({})          // courseId → units[]
  const [search, setSearch]         = useState('')

  // Modal state
  const [modal, setModal]           = useState(null)
  // modal: { type: 'school'|'dept'|'course'|'unit', mode: 'add'|'edit', parent: {}, data: {} }
  const [form, setForm]             = useState({})
  const [saving, setSaving]         = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)

  // ── Load schools ────────────────────────────────────────────────────────
  const loadSchools = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/schools')
      setSchools(data.schools || [])
    } catch {
      setSchools([
        { id: 1, name: 'School of Computing and Informatics',    code: 'SCI',  dept_count: 3, course_count: 3 },
        { id: 2, name: 'School of Business and Economics',        code: 'SBE',  dept_count: 3, course_count: 3 },
        { id: 4, name: 'School of Pure and Applied Sciences',     code: 'SPAS', dept_count: 3, course_count: 3 },
        { id: 7, name: 'School of Nursing',                       code: 'SON',  dept_count: 1, course_count: 1 },
        { id: 8, name: 'School of Public Health',                 code: 'SPH',  dept_count: 1, course_count: 1 },
        { id: 6, name: 'School of Law',                           code: 'SOL',  dept_count: 1, course_count: 1 },
        { id: 3, name: 'School of Education',                     code: 'SOE',  dept_count: 1, course_count: 1 },
        { id: 5, name: 'School of Engineering, Energy and Built Environment', code: 'SEEBE', dept_count: 2, course_count: 0 },
        { id: 9, name: 'School of Social Sciences',               code: 'SSS',  dept_count: 2, course_count: 0 },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSchools() }, [])

  // ── Toggle expand school ─────────────────────────────────────────────────
  const toggleSchool = async (schoolId) => {
    const isOpen = expanded[schoolId]
    setExpanded(e => ({ ...e, [schoolId]: !isOpen }))
    if (!isOpen && !depts[schoolId]) {
      try {
        const { data } = await api.get(`/schools/${schoolId}/departments`)
        setDepts(d => ({ ...d, [schoolId]: data.departments || [] }))
      } catch {
        setDepts(d => ({ ...d, [schoolId]: [] }))
      }
    }
  }

  // ── Toggle expand department ──────────────────────────────────────────────
  const toggleDept = async (deptId) => {
    const isOpen = expanded[`d${deptId}`]
    setExpanded(e => ({ ...e, [`d${deptId}`]: !isOpen }))
    if (!isOpen && !courses[deptId]) {
      try {
        const { data } = await api.get(`/schools/departments/${deptId}/courses`)
        setCourses(c => ({ ...c, [deptId]: data.courses || [] }))
      } catch {
        setCourses(c => ({ ...c, [deptId]: [] }))
      }
    }
  }

  // ── Toggle expand course ──────────────────────────────────────────────────
  const toggleCourse = async (courseId) => {
    const isOpen = expanded[`c${courseId}`]
    setExpanded(e => ({ ...e, [`c${courseId}`]: !isOpen }))
    if (!isOpen && !units[courseId]) {
      try {
        const { data } = await api.get(`/courses/${courseId}/units`)
        setUnits(u => ({ ...u, [courseId]: data.units || [] }))
      } catch {
        setUnits(u => ({ ...u, [courseId]: [] }))
      }
    }
  }

  // ── Open add/edit modal ───────────────────────────────────────────────────
  const openAdd = (type, parent = {}) => {
    setForm({})
    setModal({ type, mode: 'add', parent })
  }
  const openEdit = (type, data, parent = {}) => {
    setForm({ name: data.name, code: data.code, credit_hours: data.credit_hours, year: data.year, semester: data.semester })
    setModal({ type, mode: 'edit', parent, data })
  }

  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name?.trim() || !form.code?.trim()) {
      toast.error('Name and code are required')
      return
    }
    setSaving(true)
    try {
      const { type, mode, parent, data } = modal
      if (type === 'school') {
        if (mode === 'add') await api.post('/schools', form)
        else await api.put(`/schools/${data.id}`, form)
        await loadSchools()
      } else if (type === 'dept') {
        if (mode === 'add') await api.post(`/schools/${parent.id}/departments`, form)
        else await api.put(`/schools/departments/${data.id}`, form)
        // Refresh this school's depts
        const { data: d } = await api.get(`/schools/${parent.school_id || parent.id}/departments`)
        setDepts(prev => ({ ...prev, [parent.school_id || parent.id]: d.departments || [] }))
        await loadSchools()
      } else if (type === 'course') {
        if (mode === 'add') await api.post('/courses', { ...form, department_id: parent.id })
        else await api.put(`/courses/${data.id}`, form)
        const { data: c } = await api.get(`/schools/departments/${parent.id}/courses`)
        setCourses(prev => ({ ...prev, [parent.id]: c.courses || [] }))
      } else if (type === 'unit') {
        if (mode === 'add') await api.post(`/courses/${parent.id}/units`, form)
        else await api.put(`/courses/units/${data.id}`, form)
        const { data: u } = await api.get(`/courses/${parent.id}/units`)
        setUnits(prev => ({ ...prev, [parent.id]: u.units || [] }))
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${mode === 'add' ? 'created' : 'updated'}`)
      setModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const { type, id, parentId, parentKey } = delConfirm
    try {
      if (type === 'school')  await api.delete(`/schools/${id}`)
      if (type === 'dept')    await api.delete(`/schools/departments/${id}`)
      if (type === 'course')  await api.delete(`/courses/${id}`)
      if (type === 'unit')    await api.delete(`/courses/units/${id}`)

      if (type === 'school')  await loadSchools()
      if (type === 'dept') {
        const { data } = await api.get(`/schools/${parentId}/departments`)
        setDepts(d => ({ ...d, [parentId]: data.departments || [] }))
        await loadSchools()
      }
      if (type === 'course') {
        const { data } = await api.get(`/schools/departments/${parentId}/courses`)
        setCourses(c => ({ ...c, [parentId]: data.courses || [] }))
      }
      if (type === 'unit') {
        const { data } = await api.get(`/courses/${parentId}/units`)
        setUnits(u => ({ ...u, [parentId]: data.units || [] }))
      }
      toast.success('Deleted successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setDelConfirm(null)
    }
  }

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  )

  const typeLabel = { school: 'School', dept: 'Department', course: 'Course', unit: 'Unit' }

  return (
    <PageWrapper title="Schools & Departments">
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Schools & Academic Structure</h1>
            <p className="text-sm text-slate-500">Manage MKU schools, departments, courses and units</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" placeholder="Search schools…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-500 w-48"
              />
            </div>
            <button onClick={loadSchools} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
              <RefreshCw size={15} />
            </button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => openAdd('school')}>
              Add School
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Schools',     value: schools.length,                               color: 'bg-blue-50 border-blue-100 text-blue-700' },
            { label: 'Departments', value: schools.reduce((a, s) => a + (s.dept_count || 0), 0), color: 'bg-purple-50 border-purple-100 text-purple-700' },
            { label: 'Courses',     value: schools.reduce((a, s) => a + (s.course_count || 0), 0), color: 'bg-green-50 border-green-100 text-green-700' },
            { label: 'Units',       value: Object.values(units).flat().length,            color: 'bg-amber-50 border-amber-100 text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl border p-4 text-center ${color}`}>
              <p className="text-2xl font-black">{loading ? '…' : value}</p>
              <p className="text-xs font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tree */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <Building2 size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No schools found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(school => (
              <div key={school.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* School row */}
                <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <button onClick={() => toggleSchool(school.id)} className="text-slate-400 hover:text-slate-700">
                    {expanded[school.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{school.name}</p>
                    <p className="text-xs text-slate-400">
                      Code: <span className="font-mono font-semibold">{school.code}</span>
                      <span className="mx-2">·</span>{school.dept_count || 0} depts
                      <span className="mx-2">·</span>{school.course_count || 0} courses
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openAdd('dept', school)} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold">
                      <Plus size={11} /> Dept
                    </button>
                    <button onClick={() => openEdit('school', school)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDelConfirm({ type: 'school', id: school.id, name: school.name })} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Departments */}
                {expanded[school.id] && (
                  <div className="border-t border-slate-100 pl-14">
                    {(depts[school.id] || []).length === 0 ? (
                      <p className="py-3 px-4 text-sm text-slate-400 italic">No departments yet — add one above</p>
                    ) : (depts[school.id] || []).map(dept => (
                      <div key={dept.id} className="border-b border-slate-50 last:border-0">
                        {/* Dept row */}
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          <button onClick={() => toggleDept(dept.id)} className="text-slate-400 hover:text-slate-700">
                            {expanded[`d${dept.id}`] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Users size={14} className="text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-700 text-sm">{dept.name}</p>
                            <p className="text-xs text-slate-400">
                              Code: <span className="font-mono">{dept.code}</span>
                              <span className="mx-1">·</span>{dept.course_count || 0} courses
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openAdd('course', { ...dept, school_id: school.id })} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-semibold">
                              <Plus size={11} /> Course
                            </button>
                            <button onClick={() => openEdit('dept', dept, { school_id: school.id, id: school.id })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => setDelConfirm({ type: 'dept', id: dept.id, name: dept.name, parentId: school.id })} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Courses */}
                        {expanded[`d${dept.id}`] && (
                          <div className="pl-12 border-t border-slate-50">
                            {(courses[dept.id] || []).length === 0 ? (
                              <p className="py-2 px-4 text-xs text-slate-400 italic">No courses yet</p>
                            ) : (courses[dept.id] || []).map(course => (
                              <div key={course.id} className="border-b border-slate-50 last:border-0">
                                {/* Course row */}
                                <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                  <button onClick={() => toggleCourse(course.id)} className="text-slate-400 hover:text-slate-700">
                                    {expanded[`c${course.id}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <BookOpen size={12} className="text-green-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-700 text-xs">{course.name}</p>
                                    <p className="text-xs text-slate-400">
                                      <span className="font-mono">{course.code}</span>
                                      <span className="mx-1">·</span>{course.unit_count || 0} units
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => openAdd('unit', course)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 font-semibold">
                                      <Plus size={10} /> Unit
                                    </button>
                                    <button onClick={() => openEdit('course', course, dept)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                                      <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => setDelConfirm({ type: 'course', id: course.id, name: course.name, parentId: dept.id })} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Units */}
                                {expanded[`c${course.id}`] && (
                                  <div className="pl-12 border-t border-slate-50">
                                    {(units[course.id] || []).length === 0 ? (
                                      <p className="py-2 px-4 text-xs text-slate-400 italic">No units yet</p>
                                    ) : (units[course.id] || []).map(unit => (
                                      <div key={unit.id} className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                        <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                                          <GraduationCap size={11} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                          <span className="text-xs font-semibold text-slate-700">{unit.name}</span>
                                          <span className="text-xs text-slate-400 ml-2 font-mono">{unit.code}</span>
                                          {unit.year && <span className="text-xs text-slate-400 ml-2">Yr {unit.year} Sem {unit.semester}</span>}
                                          {unit.credit_hours && <span className="text-xs text-slate-400 ml-2">{unit.credit_hours} CR</span>}
                                        </div>
                                        <div className="flex gap-1">
                                          <button onClick={() => openEdit('unit', unit, course)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                                            <Edit2 size={11} />
                                          </button>
                                          <button onClick={() => setDelConfirm({ type: 'unit', id: unit.id, name: unit.name, parentId: course.id })} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={`${modal.mode === 'add' ? 'Add' : 'Edit'} ${typeLabel[modal.type]}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleSave}>
                {modal.mode === 'add' ? 'Create' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={modal.type === 'school' ? 'School of Computing and Informatics' : modal.type === 'dept' ? 'Computer Science' : modal.type === 'course' ? 'BSc Computer Science' : 'Data Structures & Algorithms'}
              required />
            <Input label="Code" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder={modal.type === 'school' ? 'SCI' : modal.type === 'dept' ? 'CS' : modal.type === 'course' ? 'BSC-CS' : 'SCS 201'}
              required />
            {modal.type === 'unit' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Year of Study</label>
                    <select className="input-base" value={form.year || 1} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}>
                      {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Semester</label>
                    <select className="input-base" value={form.semester || 1} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))}>
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </select>
                  </div>
                </div>
                <Input label="Credit Hours" type="number" min={1} max={6} value={form.credit_hours || 3}
                  onChange={e => setForm(f => ({ ...f, credit_hours: parseInt(e.target.value) }))} />
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {delConfirm && (
        <Modal isOpen onClose={() => setDelConfirm(null)} title={`Delete ${typeLabel[delConfirm.type]}`} size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDelConfirm(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            </>
          }
        >
          <p className="text-slate-600 text-sm">
            Delete <strong>{delConfirm.name}</strong>? This will also remove all nested records (departments, courses, units). This cannot be undone.
          </p>
        </Modal>
      )}
    </PageWrapper>
  )
}
