import React, { useState, useEffect, useCallback } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import { sheetsService } from '../../services/sheets.service'
import {
  FileSpreadsheet, Database, RefreshCw, Search, Filter,
  CheckCircle2, AlertTriangle, AlertCircle, Loader2, Play,
  Users, BookOpen, CalendarCheck, ShieldCheck, ClipboardCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function GoogleSheetsSync() {
  // Sync Status Settings
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Connection Form
  const [sheetUrl, setSheetUrl] = useState('')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Preview Data
  const [previewData, setPreviewData] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [activeTab, setActiveTab] = useState('students') // 'students' | 'units'

  // Search & Filtering
  const [studentSearch, setStudentSearch] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  // Syncing Progress
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)

  // Fetch status of synchronization
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const data = await sheetsService.getSyncStatus()
      setStatus(data)
      if (data.google_sheets_url) {
        setSheetUrl(data.google_sheets_url)
        setIsConnected(true)
        if (data.google_sheets_url === 'DEMO_SHEET_URL') {
          setIsDemoMode(true)
        }
      }
    } catch (err) {
      toast.error('Failed to load synchronization status')
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleConnect = useCallback(async (e) => {
    if (e) e.preventDefault()
    if (!sheetUrl && !isDemoMode) {
      toast.error('Please enter a Google Sheet URL or ID')
      return
    }

    setConnecting(true)
    setIsConnected(false)
    setPreviewData(null)

    try {
      const result = await sheetsService.connectSheet(sheetUrl, isDemoMode)
      if (result.success) {
        setIsConnected(true)
        toast.success(result.message)
        // Automatically trigger preview fetch
        handleFetchPreview(isDemoMode ? 'DEMO_SHEET_URL' : sheetUrl)
        fetchStatus()
      }
    } catch (err) {
      toast.error(err.message || 'Failed to connect sheet')
    } finally {
      setConnecting(false)
    }
  }, [sheetUrl, isDemoMode, fetchStatus])

  // Fetch Sheet Preview Data
  const handleFetchPreview = async (targetUrl = sheetUrl) => {
    setLoadingPreview(true)
    try {
      const data = await sheetsService.previewSheet(targetUrl, isDemoMode)
      setPreviewData(data)
      toast.success('Spreadsheet preview loaded successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to fetch spreadsheet preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  // Trigger Sheet Data Sync to DB/Mock data
  const handleSync = async () => {
    if (!previewData) {
      toast.error('Please load the sheet preview data first')
      return
    }

    setSyncing(true)
    setSyncProgress(10)

    // Simulate progress updates for premium UI feel
    const interval = setInterval(() => {
      setSyncProgress(p => {
        if (p >= 85) {
          clearInterval(interval)
          return p
        }
        return p + Math.floor(Math.random() * 15 + 5)
      })
    }, 250)

    try {
      const result = await sheetsService.syncSheet(
        isDemoMode ? 'DEMO_SHEET_URL' : sheetUrl,
        previewData.students,
        previewData.units,
        isDemoMode
      )
      setSyncProgress(100)
      setTimeout(() => {
        toast.success(`Sync Complete! Imported ${result.importedStudents} Students, ${result.importedUnits} Units.`)
        setSyncing(false)
        fetchStatus()
      }, 400)
    } catch (err) {
      clearInterval(interval)
      toast.error(err.message || 'Sync failed')
      setSyncing(false)
    }
  }

  // Render Stats Grid Section
  const renderStats = () => {
    const items = [
      { label: 'Students Imported', value: status?.total_students_imported ?? '—', sub: `Total students: ${status?.total_students ?? 0}`, icon: Users, clr: 'var(--mku-success)', bg: 'rgba(22, 163, 74, 0.1)' },
      { label: 'Units Imported', value: status?.total_units_imported ?? '—', sub: `Total units: ${status?.total_units ?? 0}`, icon: BookOpen, clr: 'var(--mku-info)', bg: 'rgba(2, 132, 199, 0.1)' },
      { label: 'Sessions Run', value: status?.total_sessions ?? '—', sub: 'In-person / QR classes', icon: CalendarCheck, clr: 'var(--mku-warning)', bg: 'rgba(217, 119, 6, 0.1)' },
      { label: 'Attendance Records', value: status?.total_records ?? '—', sub: 'Scans & SMS checkins', icon: ClipboardCheck, clr: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)' },
    ]

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((it, idx) => (
          <div key={idx} className="mku-card flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-[#112240] shadow-sm border border-slate-100 dark:border-slate-800 fade-in">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: it.bg }}>
              <it.icon size={22} style={{ color: it.clr }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-slate-800 dark:text-slate-100">{it.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{it.label}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{it.sub}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Get departments present in preview data
  const getPreviewDepts = () => {
    if (!previewData) return []
    const depts = new Set()
    previewData.students.forEach(s => s.department && depts.add(s.department.trim()))
    previewData.units.forEach(u => u.department && depts.add(u.department.trim()))
    return Array.from(depts)
  }

  // Filter students based on search and dept filter
  const filteredStudents = () => {
    if (!previewData) return []
    return previewData.students.filter(s => {
      const matchSearch = s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.reg_number.toLowerCase().includes(studentSearch.toLowerCase())
      const matchDept = !deptFilter || s.department === deptFilter
      return matchSearch && matchDept
    })
  }

  // Filter units based on search and dept filter
  const filteredUnits = () => {
    if (!previewData) return []
    return previewData.units.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
                          u.code.toLowerCase().includes(unitSearch.toLowerCase()) ||
                          u.lecturer.toLowerCase().includes(unitSearch.toLowerCase())
      const matchDept = !deptFilter || u.department === deptFilter
      return matchSearch && matchDept
    })
  }

  // Find duplicates in students preview list by reg_number
  const checkDuplicateStudent = (regNo, currentIndex) => {
    if (!previewData) return false
    return previewData.students.some((s, idx) => s.reg_number === regNo && idx !== currentIndex)
  }

  // Find duplicates in units preview list by unit code
  const checkDuplicateUnit = (code, currentIndex) => {
    if (!previewData) return false
    return previewData.units.some((u, idx) => u.code === code && idx !== currentIndex)
  }

  return (
    <PageWrapper title="Google Sheets Sync">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Sync Status Header Bar */}
        <div className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#112240] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Sync Status & Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Last synchronised: <span className="font-semibold">{status?.last_sync_date ? new Date(status.last_sync_date).toLocaleString('en-KE') : 'Never'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5
              ${status?.sync_status === 'Synced' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 
                status?.sync_status === 'Connected' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                status?.sync_status === 'Demo Connected' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${
                status?.sync_status === 'Synced' ? 'bg-green-600' :
                status?.sync_status === 'Connected' ? 'bg-blue-600' :
                status?.sync_status === 'Demo Connected' ? 'bg-purple-600' : 'bg-slate-400'
              }`}></span>
              {status?.sync_status || 'Not Connected'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        {renderStats()}

        {/* Sheet Connection Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Connection Panel */}
          <div className="lg:col-span-1 mku-card p-6 bg-white dark:bg-[#112240] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
              <Database size={18} className="text-blue-600" />
              Configure Connection
            </h3>

            {/* Warn user if in live DB mode */}
            {!loadingStatus && !status?.total_students_imported && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs flex gap-2 leading-normal">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>Syncing overwrite duplicate users/units dynamically matching their identifiers. Use Google Sheets shared to view.</span>
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Google Sheet URL or ID
                </label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  disabled={connecting || isDemoMode}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-slate-800 dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              {/* Demo Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Presentation Demo Mode</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Use sample data (no Google Sheets required)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDemoMode}
                    onChange={(e) => {
                      setIsDemoMode(e.target.checked)
                      if (e.target.checked) {
                        setSheetUrl('DEMO_SHEET_URL')
                      } else {
                        setSheetUrl(status?.google_sheets_url !== 'DEMO_SHEET_URL' ? (status?.google_sheets_url || '') : '')
                      }
                    }}
                    disabled={connecting}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <button
                type="submit"
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm
                  bg-[#0057A8] hover:bg-[#003D7A] text-white disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Validating Sheets...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Connect & Validate
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sync Progress & Instruction Information */}
          <div className="lg:col-span-2 mku-card p-6 bg-white dark:bg-[#112240] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                <Play size={16} className="text-blue-600" />
                Sync Operations Panel
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Google Sheet Tab Format:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Sheet name: <span className="font-semibold text-blue-600 dark:text-blue-400">Students</span></li>
                    <li>Sheet name: <span className="font-semibold text-blue-600 dark:text-blue-400">Units</span></li>
                    <li>Share options: Anyone with link can view.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Relational Sync Actions:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Auto-registers course & departments.</li>
                    <li>Auto-registers lecturers & assign units.</li>
                    <li>Auto-enrolls students to class unit.</li>
                  </ul>
                </div>
              </div>

              {/* Progress Bar */}
              {syncing && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-blue-600">Importing sheets data...</span>
                    <span>{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-300 rounded-full" style={{ width: `${syncProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Controls */}
            <div className="flex flex-wrap items-center gap-3 mt-6 border-t pt-4 border-slate-100 dark:border-slate-800">
              <button
                onClick={handleSync}
                disabled={!previewData || syncing}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Sync Database Data
              </button>

              <button
                onClick={() => handleFetchPreview()}
                disabled={!isConnected || loadingPreview || syncing}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all disabled:opacity-50"
              >
                {loadingPreview ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Refresh Preview
              </button>
            </div>
          </div>
        </div>

        {/* Preview Tables Section */}
        {previewData ? (
          <div className="mku-card bg-white dark:bg-[#112240] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            
            {/* Tab Controls and Searching Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button
                  onClick={() => setActiveTab('students')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'students' ? 'bg-white dark:bg-[#112240] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Students Sheet ({previewData.students.length})
                </button>
                <button
                  onClick={() => setActiveTab('units')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'units' ? 'bg-white dark:bg-[#112240] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Units Sheet ({previewData.units.length})
                </button>
              </div>

              {/* Filtering Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Department Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-transparent focus:outline-none text-slate-600 dark:text-slate-300 font-medium"
                  >
                    <option value="">All Departments</option>
                    {getPreviewDepts().map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Text Search */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-48 sm:w-60">
                  <Search size={14} className="text-slate-400" />
                  {activeTab === 'students' ? (
                    <input
                      type="text"
                      placeholder="Search name or reg no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="bg-transparent focus:outline-none w-full text-slate-700 dark:text-slate-200"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Search code or unit name..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      className="bg-transparent focus:outline-none w-full text-slate-700 dark:text-slate-200"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Students Preview Table */}
            {activeTab === 'students' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold text-center w-12">#</th>
                      <th className="py-3 px-4">Registration Number</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Course / Department</th>
                      <th className="py-3 px-4 text-center">Yr/Class</th>
                      <th className="py-3 px-4 text-center">Gender</th>
                      <th className="py-3 px-4 text-center">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {filteredStudents().length > 0 ? (
                      filteredStudents().map((row, idx) => {
                        const isDup = checkDuplicateStudent(row.reg_number, row.row_index - 1)
                        return (
                          <tr key={row.row_index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors">
                            <td className="py-3.5 px-4 text-center text-slate-400">{row.row_index}</td>
                            <td className="py-3.5 px-4 font-mono font-medium">{row.reg_number}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{row.full_name}</td>
                            <td className="py-3.5 px-4">{row.email || '—'}</td>
                            <td className="py-3.5 px-4">{row.phone || '—'}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-blue-600 dark:text-blue-400">{row.course}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{row.department}</p>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">Yr {row.year_of_study}</span>
                              <p className="text-[10px] mt-1 text-slate-400">{row.class || '—'}</p>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.gender === 'Female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                              }`}>{row.gender}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isDup ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 flex items-center gap-1 justify-center">
                                  <AlertTriangle size={11} /> Duplicate Reg
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 flex items-center gap-1 justify-center">
                                  <CheckCircle2 size={11} /> Valid Row
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="py-10 text-center text-slate-400">
                          <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                          No students preview matches search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Units Preview Table */}
            {activeTab === 'units' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold text-center w-12">#</th>
                      <th className="py-3 px-4">Unit Code</th>
                      <th className="py-3 px-4">Unit Name</th>
                      <th className="py-3 px-4">Lecturer Assignee</th>
                      <th className="py-3 px-4">Department Category</th>
                      <th className="py-3 px-4 text-center">Semester</th>
                      <th className="py-3 px-4 text-center">Academic Year</th>
                      <th className="py-3 px-4 text-center">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {filteredUnits().length > 0 ? (
                      filteredUnits().map((row, idx) => {
                        const isDup = checkDuplicateUnit(row.code, row.row_index - 1)
                        return (
                          <tr key={row.row_index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors">
                            <td className="py-3.5 px-4 text-center text-slate-400">{row.row_index}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{row.code}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{row.name}</td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-purple-700 dark:text-purple-400">{row.lecturer || 'Unassigned'}</span>
                            </td>
                            <td className="py-3.5 px-4">{row.department || '—'}</td>
                            <td className="py-3.5 px-4 text-center font-bold">Sem {row.semester}</td>
                            <td className="py-3.5 px-4 text-center font-medium">{row.academic_year}</td>
                            <td className="py-3.5 px-4 text-center">
                              {isDup ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 flex items-center gap-1 justify-center">
                                  <AlertTriangle size={11} /> Duplicate Code
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 flex items-center gap-1 justify-center">
                                  <CheckCircle2 size={11} /> Valid Row
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-10 text-center text-slate-400">
                          <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                          No units preview matches search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        ) : (
          /* Preview Placeholder Card */
          <div className="p-12 text-center bg-white dark:bg-[#112240] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
            <h3 className="text-md font-bold text-slate-600 dark:text-slate-400">No Sheet Preview Active</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
              Connect a valid spreadsheet or toggle Presentation Demo Mode and click "Connect & Validate" to load the interactive data tables.
            </p>
          </div>
        )}

      </div>
    </PageWrapper>
  )
}
