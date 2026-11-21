import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import DashboardShell from '../components/DashboardShell'
import { CalendarDays, Users } from 'lucide-react'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [scheduleForm, setScheduleForm] = useState({ appointmentDate: new Date().toISOString().split('T')[0], time: '10:00', type: 'TELE-HEALTH', description: '' })
  const [planForm, setPlanForm] = useState({ plan: '' })
  const [doctorProfile, setDoctorProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [patientsRes, appointmentsRes, profileRes] = await Promise.all([
        API.get('/patients'),
        API.get('/appointments'),
        API.get('/auth/me')
      ])
      setPatients(patientsRes.data)
      setAppointments(appointmentsRes.data)
      setDoctorProfile(profileRes.data)
    } catch (err) {
      console.error(err)
      setMessage('Error fetching data')
    }
  }

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const res = await API.patch(`/appointments/${appointmentId}/status`, { status: newStatus })
      setAppointments(prev => prev.map(a => a._id === appointmentId ? { ...a, status: res.data.status } : a))
    } catch (err) {
      console.error(err)
      setMessage('Failed to update appointment status')
    }
  }

  const handleAddFeedback = (patient) => {
    setSelectedPatient(patient)
    setFeedbackContent('')
    setShowFeedbackModal(true)
  }

  const handleScheduleAppointment = (patient) => {
    setSelectedPatient(patient)
    setScheduleForm({ appointmentDate: new Date().toISOString().split('T')[0], time: '10:00', type: 'TELE-HEALTH', description: '' })
    setShowScheduleModal(true)
  }

  const handleUpdatePlan = (patient) => {
    setSelectedPatient(patient)
    setPlanForm({ plan: patient.plan })
    setShowPlanModal(true)
  }

  const submitFeedback = async () => {
    if (!feedbackContent.trim()) {
      setMessage('Please enter feedback')
      return
    }
    setLoading(true)
    try {
      await API.post('/messages', {
        receiver: selectedPatient._id,
        content: `Feedback: ${feedbackContent}`,
      })
      setMessage('Feedback sent successfully!')
      setShowFeedbackModal(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error sending feedback')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const submitScheduleAppointment = async () => {
    if (!scheduleForm.description.trim()) {
      setMessage('Please enter description')
      return
    }
    if (!scheduleForm.appointmentDate) {
      setMessage('Please select a date')
      return
    }

    // Availability Validation
    if (doctorProfile && doctorProfile.availability) {
      const { days, startTime, endTime } = doctorProfile.availability;
      
      // 1. Check Day
      const selectedDate = new Date(scheduleForm.appointmentDate + 'T00:00:00');
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      const isAvailable = Array.isArray(days) && days.length > 0 ? days.some(d => {
        const storedDay = d.toLowerCase();
        const targetDay = dayName.toLowerCase();
        const targetShort = dayName.slice(0, 3).toLowerCase();
        return storedDay === targetDay || storedDay === targetShort || storedDay.includes(targetShort);
      }) : true;

      if (!isAvailable) {
        setMessage(`You are not available on ${dayName}s. Please choose another date.`);
        return;
      }

      // 2. Check Time
      if (startTime && endTime) {
        const to24h = (timeStr, period) => {
          let [h, m] = timeStr.split(':');
          h = Number(h);
          if (period === 'PM' && h < 12) h += 12;
          if (period === 'AM' && h === 12) h = 0;
          return `${String(h).padStart(2, '0')}:${m}`;
        };
        const start24 = to24h(startTime, doctorProfile.availability.startPeriod || 'AM');
        const end24 = to24h(endTime, doctorProfile.availability.endPeriod || 'PM');
        const selectedTime = scheduleForm.time; // e.g. "14:30"
        if (selectedTime < start24 || selectedTime > end24) {
          setMessage(`Please choose a time between ${startTime} ${doctorProfile.availability.startPeriod || 'AM'} and ${endTime} ${doctorProfile.availability.endPeriod || 'PM'}.`);
          return;
        }
      }
    }

    setLoading(true)
    try {
      const appointmentDate = `${scheduleForm.appointmentDate}T${scheduleForm.time}`
      await API.post('/appointments', {
        patient: selectedPatient._id,
        time: scheduleForm.time,
        type: scheduleForm.type,
        description: scheduleForm.description,
        appointmentDate,
      })
      setMessage('Appointment scheduled successfully!')
      setShowScheduleModal(false)
      fetchData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Error scheduling appointment')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const submitPlanUpdate = async () => {
    if (!planForm.plan.trim()) {
      setMessage('Please enter a recovery plan')
      return
    }
    setLoading(true)
    try {
      await API.put(`/patients/${selectedPatient._id}`, {
        plan: planForm.plan,
      })
      setMessage('Recovery plan updated successfully!')
      setShowPlanModal(false)
      fetchData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error updating plan')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { icon: 'rate_review', label: 'Add Feedback', action: () => {
      if (patients.length > 0) handleAddFeedback(patients[0])
      else setMessage('No patients assigned')
    }},
    { icon: 'event_available', label: 'Schedule Appointment', action: () => {
      if (patients.length > 0) handleScheduleAppointment(patients[0])
      else setMessage('No patients assigned')
    }},
    { icon: 'assignment', label: 'Update Plan', action: () => {
      if (patients.length > 0) handleUpdatePlan(patients[0])
      else setMessage('No patients assigned')
    }},
  ]

  const scheduledPatients = appointments
    .map((apt) => {
      const dateObj = apt.date ? new Date(apt.date) : new Date()
      const [hour] = (apt.time || '10:00').split(':')
      const hourNum = Number(hour)
      return {
        id: apt._id,
        time: apt.time || '10:00',
        ampm: hourNum < 12 ? 'AM' : 'PM',
        name: apt.patient?.name || 'Unknown',
        description: apt.description,
        status: apt.status || 'scheduled',
        badge: { label: apt.type, color: apt.type === 'IN PERSON' ? 'bg-green-50 text-green-700' : 'bg-teal-50 text-teal-700' },
        dateObj,
      }
    })
    .sort((a, b) => a.dateObj - b.dateObj)

  const today = new Date()
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todaysAppointments = scheduledPatients.filter((apt) => apt.dateObj.toDateString() === today.toDateString())
  const activePatientCount = patients.length
  const hasAppointments = appointments.length > 0

  return (
    <DashboardShell>
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-[2rem] p-8 md:p-10 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2">Welcome back, {doctorProfile?.name || 'Doctor'}!</h1>
          <p className="text-teal-50 text-lg font-medium opacity-90">{todayStr}</p>
        </div>
      </div>
      <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Active Patients</p>
            <p className="text-5xl font-black text-slate-900 mt-3">{activePatientCount}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Total patients</span>
        </div>
        <p className="mt-4 text-sm text-slate-500">This count is derived from the patients already loaded on your dashboard.</p>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-900 mb-4">Quick Insights</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl bg-teal-50 p-5">
                <p className="text-3xl font-bold text-teal-700">{activePatientCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700/70 mt-1">Active Patients</p>
              </div>
              <div className="rounded-3xl bg-secondary-container/20 p-5">
                <p className="text-3xl font-bold text-secondary">92%</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/70 mt-1">Recovery Rate</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="w-full flex items-center justify-between rounded-2xl bg-slate-50 p-4 hover:bg-teal-50 hover:text-teal-700 transition-all"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">{action.icon}</span>
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">Today's Schedule</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <span className="material-symbols-outlined text-lg">today</span>
                <span>{today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {hasAppointments ? (
              todaysAppointments.length > 0 ? (
                todaysAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-6">
                    <div className="text-center w-16">
                      <p className="text-sm font-bold text-slate-900">{appointment.time}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-400">{appointment.ampm}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">{appointment.name.split(' ').map((part) => part[0]).join('')}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{appointment.name}</p>
                        <p className="text-xs text-slate-500">{appointment.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        appointment.status === 'completed' ? 'bg-green-50 text-green-700' :
                        appointment.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        appointment.status === 'no-show' ? 'bg-slate-100 text-slate-500' :
                        appointment.status === 'missed' ? 'bg-slate-100 text-slate-500' :
                        'bg-teal-50 text-teal-700'
                      }`}>
                        {appointment.status === 'no-show' ? 'No Show' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                      <select
                        value={appointment.status}
                        onChange={e => handleStatusChange(appointment.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-teal-400 cursor-pointer"
                      >
                        <option value="scheduled">Upcoming</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no-show">No Show</option>
                      </select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500">
                  <p>No appointments scheduled for today</p>
                </div>
              )
            ) : (
              <div className="p-10 text-center text-slate-500">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <CalendarDays size={28} />
                </div>
                <p className="text-lg font-semibold text-slate-900">No appointments scheduled</p>
                <p className="mt-2 text-sm text-slate-500">Your schedule is empty. Create a new appointment to get started.</p>
              </div>
            )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Assigned Patients</h3>
              <button className="text-teal-600 text-sm font-bold hover:underline" type="button">View All</button>
            </div>
            <div className="overflow-x-auto">
              {patients.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <Users size={32} />
                  </div>
                  <p className="text-lg font-semibold text-slate-900">No patients yet</p>
                  <p className="mt-2 text-sm text-slate-500">Once patients are assigned, they will show up here.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Patient Name</th>
                      <th className="px-6 py-4">Recovery Plan</th>
                      <th className="px-6 py-4">Progress</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {patients.map((patient) => (
                      <tr key={patient._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">{patient.name.split(' ').map(n => n[0]).join('')}</div>
                            <span className="text-sm font-semibold text-slate-900">{patient.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-medium">{patient.plan}</td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-teal-600 h-full" style={{ width: `${patient.progress}%` }} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${patient.status === 'Active' ? 'bg-green-50 text-green-700' : patient.status === 'Review' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${patient.status === 'Active' ? 'bg-green-500' : patient.status === 'Review' ? 'bg-orange-500' : 'bg-slate-400'}`} />
                            {patient.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleUpdatePlan(patient)}
                              className="text-teal-600 hover:bg-teal-50 p-2 rounded-lg transition-colors" 
                              type="button"
                              title="Update plan"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button 
                              onClick={() => handleScheduleAppointment(patient)}
                              className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" 
                              type="button"
                              title="Schedule appointment"
                            >
                              <span className="material-symbols-outlined text-lg">event</span>
                            </button>
                            <button 
                              onClick={() => navigate(`/patient-history/${patient._id}`)}
                              className="text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors" 
                              type="button"
                              title="View patient history"
                            >
                              <span className="material-symbols-outlined text-lg">history</span>
                            </button>
                            <button 
                              onClick={() => handleAddFeedback(patient)}
                              className="text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-colors" 
                              type="button"
                              title="Add feedback"
                            >
                              <span className="material-symbols-outlined text-lg">comment</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="fixed top-4 right-4 bg-teal-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {message}
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Add Feedback</h2>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {selectedPatient && (
              <p className="text-sm text-slate-600 mb-4">For patient: <span className="font-semibold">{selectedPatient.name}</span></p>
            )}
            <textarea
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder="Enter your feedback..."
              className="w-full border border-slate-200 rounded-xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-32"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Appointment Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Schedule Appointment</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {selectedPatient && (
              <p className="text-sm text-slate-600 mb-4">For patient: <span className="font-semibold">{selectedPatient.name}</span></p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  value={scheduleForm.appointmentDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, appointmentDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                <input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <select
                  value={scheduleForm.type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option>IN PERSON</option>
                  <option>TELE-HEALTH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <input
                  type="text"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  placeholder="e.g., Knee rehab session"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitScheduleAppointment}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Update Recovery Plan</h2>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {selectedPatient && (
              <p className="text-sm text-slate-600 mb-4">For patient: <span className="font-semibold">{selectedPatient.name}</span></p>
            )}
            <textarea
              value={planForm.plan}
              onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
              placeholder="Enter recovery plan..."
              className="w-full border border-slate-200 rounded-xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-32"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitPlanUpdate}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardShell>
  )
}
