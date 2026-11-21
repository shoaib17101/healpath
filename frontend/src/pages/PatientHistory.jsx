import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import API from '../api'
import DashboardShell from '../components/DashboardShell'
import html2pdf from 'html2pdf.js'
import { 
  Plus, 
  History, 
  Pill, 
  Dumbbell, 
  FileText, 
  Calendar, 
  ArrowLeft,
  Search,
  MoreVertical,
  ChevronRight
} from 'lucide-react'

export default function PatientHistory() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [appointments, setAppointments] = useState([])
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL')
  const [newRecord, setNewRecord] = useState({ 
    type: 'PRESCRIPTION', 
    title: '', 
    description: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    exerciseName: '',
    sets: '',
    reps: '',
    symptoms: '',
    diagnosis: '',
    vitals: { bp: '', temp: '', weight: '', heartRate: '' }
  })
  const [editRecord, setEditRecord] = useState({ 
    type: 'PRESCRIPTION', 
    title: '', 
    description: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    exerciseName: '',
    sets: '',
    reps: '',
    symptoms: '',
    diagnosis: '',
    vitals: { bp: '', temp: '', weight: '', heartRate: '' }
  })
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingSubmitting, setEditingSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const userRole = localStorage.getItem('role')

  const escapeHtml = (value) => {
    if (value === undefined || value === null) return ''
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // Safe date/time formatter that tolerates a few input shapes and avoids showing "Invalid Date"
  const formatDateTime = (dateInput, dateOptions = { month: 'short', day: 'numeric', year: 'numeric' }, timeOptions = { hour: '2-digit', minute: '2-digit' }) => {
    if (!dateInput) return { date: '', time: '' }
    // try to create a Date directly, and fallback to appending a midnight time for yyyy-mm-dd strings
    let d = new Date(dateInput)
    if (isNaN(d)) {
      try {
        d = new Date(String(dateInput).trim() + 'T00:00:00')
      } catch (err) {
        return { date: '', time: '' }
      }
    }
    if (isNaN(d)) return { date: '', time: '' }
    return {
      date: d.toLocaleDateString('en-US', dateOptions),
      time: d.toLocaleTimeString([], timeOptions)
    }
  }

  useEffect(() => {
    fetchData()
  }, [patientId])

  const fetchData = async () => {
    try {
      const [historyRes, appointmentsRes, patientsRes] = await Promise.all([
        API.get(`/history/${patientId}`),
        API.get('/appointments'),
        API.get('/patients')
      ])

      setHistory(historyRes.data)
      const currentPatient = patientsRes.data.find(p => p._id === patientId)
      setPatient(currentPatient)

      const filteredAppointments = appointmentsRes.data.filter(
        apt => apt.patient?._id === patientId || apt.patient === patientId
      )
      setAppointments(filteredAppointments)
    } catch (err) {
      console.error(err)
      setMessage('Error fetching history')
    } finally {
      setLoading(false)
    }
  }

  const [previewHtml, setPreviewHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const downloadHistory = () => {
    if (!history || history.length === 0) return

    const prescriptions = history.filter(item => item.type === 'PRESCRIPTION')
    const itemsToExport = prescriptions.length > 0 ? prescriptions : history
    const filename = `${patient?.name?.replace(/\s+/g, '_') || 'patient'}_prescription.pdf`

    const escapedPatientName = escapeHtml(patient?.name || 'Unknown Patient')
    const escapedPatientEmail = escapeHtml(patient?.email || '')
    const escapedPatientId = escapeHtml(patient?._id || patientId)
    const escapedDoctorSignature = escapeHtml(patient?.assignedDoctor?.name || 'Dr. HealPath')
    const escapedPrescriptionLabel = escapeHtml(prescriptions.length > 0 ? 'Pharmacy Prescription' : 'Medical History Export')

    const html = `
      <div style="max-width: 740px; margin: 0 auto; padding: 28px; background: #ffffff; color: #0f172a; font-family: Inter, sans-serif; line-height: 1.5; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px;">
          <div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800;">HealPath Prescription</h1>
            <p style="margin: 8px 0 0; font-size: 14px; color: #475569;">Please present this prescription at your pharmacy to get the prescribed medicines.</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #475569;">
            <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div style="margin-top: 8px;"><strong>Patient ID:</strong> ${escapedPatientId}</div>
          </div>
        </div>

        <section style="border: 1px solid #e2e8f0; border-radius: 24px; padding: 20px; margin-bottom: 24px; background: #f8fafc;">
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
            <div>
              <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Patient</div>
              <div style="font-size: 16px; font-weight: 700;">${escapedPatientName}</div>
              <div style="font-size: 13px; color: #475569; margin-top: 4px;">${escapedPatientEmail}</div>
            </div>
            <div>
              <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Prescription type</div>
              <div style="font-size: 16px; font-weight: 700;">${escapedPrescriptionLabel}</div>
            </div>
          </div>
        </section>

        <section style="margin-bottom: 24px;">
          <h2 style="margin: 0 0 14px; font-size: 18px; font-weight: 700; color: #0f172a;">Prescribed Medicines</h2>
          ${itemsToExport.map((item, index) => {
            const title = escapeHtml(item.title || item.medication || 'Medication')
            const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
            const doctor = item.doctor?.name ? `Dr. ${escapeHtml(item.doctor.name)}` : ''
            const itemType = escapeHtml(item.type || '')
            const medName = item.medication || item.title || ''
            const medication = medName ? `<div><strong>Medicine:</strong> ${escapeHtml(medName)}</div>` : ''
            const dosage = item.dosage ? `<div><strong>Dosage:</strong> ${escapeHtml(item.dosage)}</div>` : ''
            const frequency = item.frequency ? `<div><strong>Frequency:</strong> ${escapeHtml(item.frequency)}</div>` : ''
            const duration = item.duration ? `<div><strong>Duration:</strong> ${escapeHtml(item.duration)}</div>` : ''
            const description = item.description ? `<p style="font-size: 13px; color: #334155; margin: 0;">${escapeHtml(item.description)}</p>` : '<p style="font-size: 13px; color: #94a3b8; margin: 0;">No additional instructions provided.</p>'

            return `
              <div style="border-radius: 18px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 14px; background: #ffffff;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px;">
                  <div>
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${title}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${date}</div>
                  </div>
                  <div style="text-align: right; font-size: 12px; color: #475569;">
                    <div>${doctor}</div>
                    <div style="margin-top: 4px; font-weight: 700;">${itemType}</div>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; font-size: 13px; color: #475569; margin-bottom: 10px;">
                  ${medication}
                  ${dosage}
                  ${frequency}
                  ${duration}
                </div>
                ${description}
              </div>
            `
          }).join('')}
        </section>

        <footer style="border-top: 1px solid #e2e8f0; padding-top: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: 12px; color: #64748b;">
          <div>
            <div style="font-weight: 700; color: #0f172a;">HealPath Clinic</div>
            <div>Website: healpath.example.com</div>
            <div style="margin-top: 6px;">This prescription is generated by HealPath and should be presented at the pharmacy when collecting medicines.</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: #0f172a;">Doctor Signature</div>
            <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 6px;">${escapedDoctorSignature}</div>
          </div>
        </footer>
      </div>
    `

    // open a preview window and write HTML so browser renders external styles
    const w = window.open('', '_blank')
    if (!w) {
      // fallback to in-app preview
      setPreviewHtml(html)
      setShowPreview(true)
      return
    }

    w.document.open()
    // include current app css by cloning link tags so the preview has the same styling
    const headLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.outerHTML).join('\n')
    const headStyles = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('\n')
    w.document.write(`<html><head>${headLinks}${headStyles}<meta charset="utf-8"></head><body>${html}</body></html>`)
    w.document.close()

    // allow the new window to render, then call html2pdf against its body
    setTimeout(() => {
      try {
        // prefer using the preview window's document body to let html2canvas use computed styles
        html2pdf().set({
          margin: [16, 12, 16, 12],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        }).from(w.document.body).save().then(() => {
          try { w.close() } catch (e) {}
        }).catch((err) => {
          console.error('PDF generation failed', err)
          // fallback to in-app preview
          try { w.close() } catch (e) {}
          setPreviewHtml(html)
          setShowPreview(true)
        })
      } catch (err) {
        console.error('PDF generation failed', err)
        try { w.close() } catch (e) {}
        setPreviewHtml(html)
        setShowPreview(true)
      }
    }, 800)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newRecord.title || !newRecord.description) {
      setMessage('Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      await API.post('/history', {
        patientId,
        ...newRecord
      })
      setMessage('Record added successfully')
      setShowAddModal(false)
      setNewRecord({ 
        type: 'PRESCRIPTION', 
        title: '', 
        description: '',
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        exerciseName: '',
        sets: '',
        reps: '',
        symptoms: '',
        diagnosis: '',
        vitals: { bp: '', temp: '', weight: '', heartRate: '' }
      })
      fetchData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setMessage('Error adding record')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (item) => {
    setEditingId(item._id)
    setEditRecord({
      type: item.type || 'PRESCRIPTION',
      title: item.title || '',
      description: item.description || '',
      medication: item.medication || '',
      dosage: item.dosage || '',
      frequency: item.frequency || '',
      duration: item.duration || '',
      exerciseName: item.exerciseName || '',
      sets: item.sets || '',
      reps: item.reps || '',
      symptoms: item.symptoms || '',
      diagnosis: item.diagnosis || '',
      vitals: item.vitals || { bp: '', temp: '', weight: '', heartRate: '' }
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingId) return
    setEditingSubmitting(true)
    try {
      await API.put(`/history/${editingId}`, editRecord)
      setMessage('Record updated successfully')
      setShowEditModal(false)
      setEditingId(null)
      await fetchData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setMessage('Failed to update record')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setEditingSubmitting(false)
    }
  }

  const filteredHistory = activeTab === 'ALL' 
    ? history 
    : history.filter(item => item.type === activeTab)

  const tabs = [
    { id: 'ALL', label: 'Complete History', icon: History },
    { id: 'PRESCRIPTION', label: 'Prescriptions', icon: Pill },
    { id: 'EXERCISE', label: 'Exercises', icon: Dumbbell },
    { id: 'NOTE', label: 'Clinical Notes', icon: FileText },
    { id: 'APPOINTMENTS', label: 'Appointments', icon: Calendar },
  ]

  const RecordTable = ({ data, type }) => (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Date</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Title / Subject</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Details</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Clinician</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? data.map((item) => (
              <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-slate-900">
                    {(() => {
                      const f = formatDateTime(item.date || item.createdAt)
                      return f.date || '—'
                    })()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {(() => {
                      // prefer explicit time stored on the item, otherwise derive from date
                      if (item.time) return item.time
                      const f = formatDateTime(item.date || item.createdAt)
                      return f.time || ''
                    })()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.type === 'PRESCRIPTION' ? 'bg-green-100 text-green-600' :
                      item.type === 'EXERCISE' ? 'bg-purple-100 text-purple-600' :
                      'bg-teal-100 text-teal-600'
                    }`}>
                      {item.type === 'PRESCRIPTION' ? <Pill size={16} /> :
                       item.type === 'EXERCISE' ? <Dumbbell size={16} /> :
                       <FileText size={16} />}
                    </div>
                    <span className="text-sm font-bold text-slate-900">{item.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 line-clamp-2 min-w-[200px]">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.type === 'PRESCRIPTION' && item.medication && (
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Medicine: {item.medication}</span>
                    )}
                    {item.type === 'PRESCRIPTION' && item.dosage && (
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Dosage: {item.dosage}</span>
                    )}
                    {item.type === 'PRESCRIPTION' && item.frequency && (
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Frequency: {item.frequency}</span>
                    )}
                    {item.type === 'PRESCRIPTION' && item.duration && (
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Duration: {item.duration}</span>
                    )}
                    {item.type === 'EXERCISE' && item.exerciseName && (
                      <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">Exercise: {item.exerciseName}</span>
                    )}
                    {item.type === 'EXERCISE' && (item.sets || item.reps) && (
                      <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">{item.sets || '—'} Sets × {item.reps || '—'} Reps</span>
                    )}
                    {item.type === 'NOTE' && item.symptoms && (
                      <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">Symptoms: {item.symptoms}</span>
                    )}
                    {item.type === 'NOTE' && item.diagnosis && (
                      <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">Diagnosis: {item.diagnosis}</span>
                    )}
                    {item.type === 'NOTE' && item.vitals?.bp && (
                      <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-bold">BP: {item.vitals.bp}</span>
                    )}
                    {item.type === 'NOTE' && item.vitals?.temp && (
                      <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-bold">Temp: {item.vitals.temp}</span>
                    )}
                    {item.type === 'NOTE' && item.vitals?.weight && (
                      <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-bold">Weight: {item.vitals.weight}</span>
                    )}
                    {item.type === 'NOTE' && item.vitals?.heartRate && (
                      <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-bold">Heart rate: {item.vitals.heartRate}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs font-medium text-slate-500">Dr. {item.doctor?.name || patient?.assignedDoctor?.name || 'Unknown'}</span>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                      {(item.doctor?.name || patient?.assignedDoctor?.name || 'U')[0]}
                    </div>
                    {(userRole === 'admin' || (userRole === 'doctor' && String(item.doctor?._id) === String(localStorage.getItem('userId')))) && (
                      <button
                        onClick={() => openEditModal(item)}
                        title="Edit record"
                        className="ml-2 inline-flex items-center justify-center rounded-lg p-2 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                  No records found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const AppointmentTable = ({ data }) => (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Scheduled Date</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Time</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Session Type</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? data.map((apt) => (
              <tr key={apt._id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                  {(() => {
                    const source = apt.appointmentDate || apt.date || apt.scheduledAt || apt.createdAt
                    const f = formatDateTime(source, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    return f.date || '—'
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                  {apt.time || formatDateTime(apt.date || apt.appointmentDate).time || '—'}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {apt.type}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-teal-100 text-teal-700'
                  }`}>
                    {apt.status || 'Scheduled'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                  No appointments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (loading) {
    return (
      <DashboardShell title="Patient History" subtitle="Loading history...">
        <div className="flex items-center justify-center h-64 text-slate-400">Loading history...</div>
      </DashboardShell>
    )
  }
 
  const downloadFromPreview = async (fileName) => {
    const previewEl = document.getElementById('prescription-print-preview')
    if (!previewEl) return

    const options = {
      margin: [16, 12, 16, 12],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }

    try {
      const task = html2pdf().set(options).from(previewEl).save()
      if (task && task.then) {
        await task
      }
      setShowPreview(false)
    } catch (err) {
      console.error('PDF generation failed', err)
      setShowPreview(false)
    }
  }

  const closePreview = () => {
    setShowPreview(false)
    setPreviewHtml('')
  }

  return (
    <DashboardShell 
      title="Medical History" 
      subtitle={patient ? `Complete record for ${patient.name}` : 'Patient record'}
    >      <div className="space-y-8">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadHistory}
              disabled={!patient || history.length === 0}
              className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-3.5 rounded-2xl font-bold shadow-sm hover:bg-slate-200 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText size={18} />
              Download Prescription PDF
            </button>

            {userRole === 'doctor' && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all active:scale-95"
              >
                <Plus size={20} />
                Add Medical Entry
              </button>
            )}

          </div>
        </div>

        {message && (
          <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100 flex items-center gap-3 animate-in slide-in-from-top-4">
            <FileText size={20} />
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] w-fit overflow-x-auto no-scrollbar max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              {tabs.find(t => t.id === activeTab)?.label}
              <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {activeTab === 'APPOINTMENTS' ? appointments.length : filteredHistory.length} items
              </span>
            </h2>
          </div>

          {activeTab === 'APPOINTMENTS' ? (
            <AppointmentTable data={appointments} />
          ) : (
            <RecordTable data={filteredHistory} type={activeTab} />
          )}
        </div>
      </div>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Medical Entry</h2>
                <p className="text-sm text-slate-500 mt-1">Add a new record to patient history</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-3">Entry Category</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'PRESCRIPTION', label: 'Rx', icon: Pill },
                    { id: 'EXERCISE', label: 'Ex', icon: Dumbbell },
                    { id: 'NOTE', label: 'Note', icon: FileText }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewRecord({ ...newRecord, type: type.id })}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-all border ${
                        newRecord.type === type.id 
                        ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-200'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-primary/30'
                      }`}
                    >
                      <type.icon size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">
                    {newRecord.type === 'PRESCRIPTION' ? 'Medication Name' : 
                     newRecord.type === 'EXERCISE' ? 'Exercise Routine' : 'Note Title'}
                  </label>
                  <input
                    type="text"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                    placeholder={newRecord.type === 'PRESCRIPTION' ? 'e.g., Amoxicillin 500mg' : 'e.g., Knee Extension (3 sets)'}
                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium"
                    required
                  />
                </div>

                {newRecord.type === 'PRESCRIPTION' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Medication (optional)</label>
                      <input
                        type="text"
                        value={newRecord.medication}
                        onChange={(e) => setNewRecord({ ...newRecord, medication: e.target.value })}
                        placeholder="e.g. Amoxicillin"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Dosage</label>
                      <input
                        type="text"
                        value={newRecord.dosage}
                        onChange={(e) => setNewRecord({ ...newRecord, dosage: e.target.value })}
                        placeholder="e.g. 500mg"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Frequency</label>
                      <input
                        type="text"
                        value={newRecord.frequency}
                        onChange={(e) => setNewRecord({ ...newRecord, frequency: e.target.value })}
                        placeholder="e.g. twice daily"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Duration</label>
                      <input
                        type="text"
                        value={newRecord.duration}
                        onChange={(e) => setNewRecord({ ...newRecord, duration: e.target.value })}
                        placeholder="e.g. 7 days"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                )}

                {newRecord.type === 'EXERCISE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Sets</label>
                      <input
                        type="text"
                        value={newRecord.sets}
                        onChange={(e) => setNewRecord({ ...newRecord, sets: e.target.value })}
                        placeholder="e.g. 3"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Reps</label>
                      <input
                        type="text"
                        value={newRecord.reps}
                        onChange={(e) => setNewRecord({ ...newRecord, reps: e.target.value })}
                        placeholder="e.g. 10-12"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                )}

                {newRecord.type === 'NOTE' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Blood Pressure</label>
                        <input
                          type="text"
                          value={newRecord.vitals.bp}
                          onChange={(e) => setNewRecord({ ...newRecord, vitals: { ...newRecord.vitals, bp: e.target.value } })}
                          placeholder="120/80"
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Temp (°F)</label>
                        <input
                          type="text"
                          value={newRecord.vitals.temp}
                          onChange={(e) => setNewRecord({ ...newRecord, vitals: { ...newRecord.vitals, temp: e.target.value } })}
                          placeholder="98.6"
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Symptoms</label>
                      <input
                        type="text"
                        value={newRecord.symptoms}
                        onChange={(e) => setNewRecord({ ...newRecord, symptoms: e.target.value })}
                        placeholder="e.g. persistent back pain"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Diagnosis</label>
                      <input
                        type="text"
                        value={newRecord.diagnosis}
                        onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                        placeholder="e.g. Lumbar strain"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Instructions & Notes</label>
                  <textarea
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    placeholder="Provide specific dosage, duration, or step-by-step instructions..."
                    className="w-full h-40 p-5 rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium resize-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-14 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-14 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all font-bold shadow-xl shadow-teal-200 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add to Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Edit Medical Entry</h2>
                <p className="text-sm text-slate-500 mt-1">Update the selected record</p>
              </div>
              <button
                onClick={() => { setShowEditModal(false); setEditingId(null) }}
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-3">Entry Category</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'PRESCRIPTION', label: 'Rx', icon: Pill },
                    { id: 'EXERCISE', label: 'Ex', icon: Dumbbell },
                    { id: 'NOTE', label: 'Note', icon: FileText }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEditRecord({ ...editRecord, type: type.id })}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-all border ${
                        editRecord.type === type.id 
                        ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-200'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-primary/30'
                      }`}
                    >
                      <type.icon size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">
                    {editRecord.type === 'PRESCRIPTION' ? 'Medication Name' : 
                     editRecord.type === 'EXERCISE' ? 'Exercise Routine' : 'Note Title'}
                  </label>
                  <input
                    type="text"
                    value={editRecord.title}
                    onChange={(e) => setEditRecord({ ...editRecord, title: e.target.value })}
                    placeholder={editRecord.type === 'PRESCRIPTION' ? 'e.g., Amoxicillin 500mg' : 'e.g., Knee Extension (3 sets)'}
                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium"
                    required
                  />
                </div>

                {editRecord.type === 'PRESCRIPTION' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Medication (optional)</label>
                      <input
                        type="text"
                        value={editRecord.medication}
                        onChange={(e) => setEditRecord({ ...editRecord, medication: e.target.value })}
                        placeholder="e.g. Amoxicillin"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Dosage</label>
                      <input
                        type="text"
                        value={editRecord.dosage}
                        onChange={(e) => setEditRecord({ ...editRecord, dosage: e.target.value })}
                        placeholder="e.g. 500mg"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Frequency</label>
                      <input
                        type="text"
                        value={editRecord.frequency}
                        onChange={(e) => setEditRecord({ ...editRecord, frequency: e.target.value })}
                        placeholder="e.g. twice daily"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Duration</label>
                      <input
                        type="text"
                        value={editRecord.duration}
                        onChange={(e) => setEditRecord({ ...editRecord, duration: e.target.value })}
                        placeholder="e.g. 7 days"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                )}

                {editRecord.type === 'EXERCISE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Sets</label>
                      <input
                        type="text"
                        value={editRecord.sets}
                        onChange={(e) => setEditRecord({ ...editRecord, sets: e.target.value })}
                        placeholder="e.g. 3"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Reps</label>
                      <input
                        type="text"
                        value={editRecord.reps}
                        onChange={(e) => setEditRecord({ ...editRecord, reps: e.target.value })}
                        placeholder="e.g. 10-12"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                )}

                {editRecord.type === 'NOTE' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Blood Pressure</label>
                        <input
                          type="text"
                          value={editRecord.vitals.bp}
                          onChange={(e) => setEditRecord({ ...editRecord, vitals: { ...editRecord.vitals, bp: e.target.value } })}
                          placeholder="120/80"
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Temp (°F)</label>
                        <input
                          type="text"
                          value={editRecord.vitals.temp}
                          onChange={(e) => setEditRecord({ ...editRecord, vitals: { ...editRecord.vitals, temp: e.target.value } })}
                          placeholder="98.6"
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Symptoms</label>
                      <input
                        type="text"
                        value={editRecord.symptoms}
                        onChange={(e) => setEditRecord({ ...editRecord, symptoms: e.target.value })}
                        placeholder="e.g. persistent back pain"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Diagnosis</label>
                      <input
                        type="text"
                        value={editRecord.diagnosis}
                        onChange={(e) => setEditRecord({ ...editRecord, diagnosis: e.target.value })}
                        placeholder="e.g. Lumbar strain"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Instructions & Notes</label>
                  <textarea
                    value={editRecord.description}
                    onChange={(e) => setEditRecord({ ...editRecord, description: e.target.value })}
                    placeholder="Provide specific dosage, duration, or step-by-step instructions..."
                    className="w-full h-40 p-5 rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium resize-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingId(null) }}
                  className="flex-1 h-14 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingSubmitting}
                  className="flex-1 h-14 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all font-bold shadow-xl shadow-teal-200 disabled:opacity-50"
                >
                  {editingSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardShell>
  )
}
