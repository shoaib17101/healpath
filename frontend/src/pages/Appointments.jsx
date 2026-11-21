import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import JitsiCallModal from '../components/JitsiCallModal'
import API from '../api'
import toast from 'react-hot-toast'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const calendarHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const getCalendarRows = () => {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate()

  let rows = []
  let currentRow = []
  let day = 1

  for (let i = 0; i < 42; i++) {
    if (i < startOffset) {
      const pYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const pMonth = currentMonth === 0 ? 11 : currentMonth - 1
      currentRow.push({ day: (prevMonthDays - startOffset + i + 1).toString(), month: pMonth, year: pYear, isCurrentMonth: false })
    } else if (day <= daysInMonth) {
      currentRow.push({ day: day.toString(), month: currentMonth, year: currentYear, isCurrentMonth: true })
      day++
    } else {
      const nYear = currentMonth === 11 ? currentYear + 1 : currentYear
      const nMonth = currentMonth === 11 ? 0 : currentMonth + 1
      currentRow.push({ day: (day - daysInMonth).toString(), month: nMonth, year: nYear, isCurrentMonth: false })
      day++
    }
    if (currentRow.length === 7) {
      rows.push(currentRow)
      currentRow = []
    }
  }
  return rows
}

const toMinutes = (t) => {
  if (!t) return 0
  let [time, ampm] = t.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + m
}

const formatForTimeInput = (t) => {
  if (!t) return ''
  const [time, ampm] = t.split(' ')
  if (!ampm) return time
  let [h, m] = time.split(':').map(Number)
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

const generateSlots = (startTime, endTime) => {
  const slots = []
  let cur = toMinutes(startTime)
  const end = toMinutes(endTime)
  while (cur + 30 <= end) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    slots.push(`${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`)
    cur += 30
  }
  return slots
}

export default function Appointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ doctor: '', patient: '', time: '', description: '', type: 'TELE-HEALTH', appointmentDate: '' })
  const [patients, setPatients] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const role = localStorage.getItem('role')

  // Availability for selected doctor
  const [doctorAvail, setDoctorAvail] = useState(null)   // { days:[], startTime:'', endTime:'' }
  const [availLoading, setAvailLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const [timeSlots, setTimeSlots] = useState([])
  const [formErrors, setFormErrors] = useState({ doctor: '', patient: '', appointmentDate: '', time: '', description: '' })
  const [activeTab, setActiveTab] = useState('UPCOMING')
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null)
  const [rescheduleData, setRescheduleData] = useState({ appointmentDate: '', time: '', type: '' })
  const [rescheduleErrors, setRescheduleErrors] = useState({ appointmentDate: '', time: '' })
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')
  const [activeVideoCallRoom, setActiveVideoCallRoom] = useState(null)
  const [activeVideoCallUserName, setActiveVideoCallUserName] = useState('')
  const [creatingVideoCall, setCreatingVideoCall] = useState(false)

  // ── Payment-first booking flow ─────────────────────────────────────────────
  // selectedDoctorObj: the full doctor object chosen in the booking form
  const [selectedDoctorObj, setSelectedDoctorObj] = useState(null)
  // showPaymentGate: opens the payment modal BEFORE the appointment is created
  const [showPaymentGate, setShowPaymentGate] = useState(false)
  const [paymentGateData, setPaymentGateData] = useState({
    paymentMethod: 'JazzCash',
    transactionId: '',
    notes: '',
  })
  const [paymentGateErrors, setPaymentGateErrors] = useState({ transactionId: '' })
  const [submittingBookingPayment, setSubmittingBookingPayment] = useState(false)

  // payingAppointment: for paying an already-created pending appointment
  const [payingAppointment, setPayingAppointment] = useState(null)
  const [paymentFormData, setPaymentFormData] = useState({
    paymentMethod: 'JazzCash',
    transactionId: '',
    notes: '',
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)

  useEffect(() => {
    fetchAppointments()
    if (role === 'patient') fetchDoctors()
    if (role === 'doctor') fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const res = await API.get('/patients')
      setPatients(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/appointments')
      setAppointments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      const res = await API.get('/doctors')
      setDoctors(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  // Helper to find doctor object from doctors list
  const findDoctorById = (id) => doctors.find(d => d._id === id) || null

  const fetchDoctorAvailability = useCallback(async (doctorId) => {
    if (!doctorId) {
      setDoctorAvail(null)
      setTimeSlots([])
      setAvailabilityError('Unable to identify the doctor. Please sign in again.')
      return
    }
    setAvailLoading(true)
    setAvailabilityError('')
    try {
      const res = await API.get(`/doctors/${doctorId}/availability`)
      setDoctorAvail(res.data)
      setTimeSlots([])
      // Reset previously chosen date/time
      setFormData(prev => ({ ...prev, time: '', appointmentDate: '' }))
      setFormErrors(prev => ({ ...prev, appointmentDate: '', time: '' }))
    } catch (err) {
      console.error(err)
      setDoctorAvail(null)
      setAvailabilityError(err.response?.data?.msg || 'Unable to load doctor availability.')
    } finally {
      setAvailLoading(false)
    }
  }, [])

  const sanitizeJitsiRoomSegment = (value) => {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const buildJitsiRoomName = (otherUserId) => {
    if (!localStorage.getItem('userId') || !otherUserId) return ''
    const ids = [String(localStorage.getItem('userId')), String(otherUserId)]
      .map(sanitizeJitsiRoomSegment)
      .sort((a, b) => a.localeCompare(b))
    if (!ids[0] || !ids[1]) return ''
    return `healpath-${ids[0]}-${ids[1]}`
  }

  const validateBookingField = (field, value) => {
    switch (field) {
      case 'doctor':
        return value ? '' : 'Please select a doctor.'
      case 'patient':
        return value ? '' : 'Please select a patient.'
      case 'appointmentDate': {
        if (!value) return 'Please choose a date.'
        const selected = new Date(value + 'T00:00:00')
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (selected < today) return 'Date cannot be in the past.'
        if (doctorAvail?.days?.length) {
          const dayName = DAY_NAMES[selected.getDay()]
          if (!doctorAvail.days.includes(dayName)) {
            return `Dr. is not available on ${dayName}s. Available days: ${doctorAvail.days.join(', ')}`
          }
        }
        return ''
      }
      case 'time': {
        if (!value) return 'Please select a time slot.'
        if (doctorAvail?.startTime && doctorAvail?.endTime) {
          const slotMinutes = toMinutes(value)
          const startMinutes = toMinutes(`${doctorAvail.startTime} ${doctorAvail.startPeriod || 'AM'}`)
          const endMinutes = toMinutes(`${doctorAvail.endTime} ${doctorAvail.endPeriod || 'PM'}`)
          if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
            return 'Selected time is outside doctor availability.'
          }
        }
        return ''
      }
      case 'description':
        return ''
      default:
        return ''
    }
  }

  const validateBookingForm = () => {
    const errors = {
      doctor: role === 'patient' ? validateBookingField('doctor', formData.doctor) : '',
      patient: role === 'doctor' ? validateBookingField('patient', formData.patient) : '',
      appointmentDate: validateBookingField('appointmentDate', formData.appointmentDate),
      time: validateBookingField('time', formData.time),
      description: validateBookingField('description', formData.description),
    }

    setFormErrors(errors)
    return Object.values(errors).every(err => !err)
  }

  const handleDateChange = (dateStr) => {
    setFormErrors(prev => ({ ...prev, appointmentDate: '', time: '' }))
    setFormData(prev => ({ ...prev, appointmentDate: dateStr, time: '' }))

    if (!dateStr) { setTimeSlots([]); return }
    if (!doctorAvail) { setTimeSlots([]); return }

    const selectedDate = new Date(dateStr + 'T00:00:00')
    const dayName = DAY_NAMES[selectedDate.getDay()]
    const availDays = doctorAvail.days || []

    if (availDays.length > 0 && !availDays.includes(dayName)) {
      setFormErrors(prev => ({ ...prev, appointmentDate: `Dr. is not available on ${dayName}s. Available days: ${availDays.join(', ')}` }))
      setTimeSlots([])
      return
    }

    const slots = generateSlots(
      doctorAvail.startTime ? `${doctorAvail.startTime} ${doctorAvail.startPeriod || 'AM'}` : '', 
      doctorAvail.endTime ? `${doctorAvail.endTime} ${doctorAvail.endPeriod || 'PM'}` : ''
    )
    setTimeSlots(slots)
    if (slots.length === 0) {
      setFormErrors(prev => ({ ...prev, appointmentDate: 'Doctor has not set working hours yet. Please contact them directly.' }))
    }
  }

  // Step 1: reserve the slot; payment starts after doctor confirmation
  const handleBook = (e) => {
    e.preventDefault()
    if (!validateBookingForm()) return

    if (role === 'patient') {
      handleBookDirect()
      return
    }

    // Doctor suggesting appointment: book directly
    handleBookDirect()
  }

  // Book without payment (doctors only)
  const handleBookDirect = async () => {
    setSubmitting(true)
    try {
      await API.post('/appointments', { ...formData })
      toast.success('Appointment suggestion sent!')
      resetBookingForm()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.msg || err.response?.data || err.message || 'Failed to book appointment'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const resetBookingForm = () => {
    setShowForm(false)
    setShowPaymentGate(false)
    setFormData({ doctor: '', patient: '', time: '', description: '', type: 'TELE-HEALTH', appointmentDate: '' })
    setDoctorAvail(null)
    setTimeSlots([])
    setSelectedDoctorObj(null)
    setFormErrors({ doctor: '', patient: '', appointmentDate: '', time: '', description: '' })
    fetchAppointments()
  }

  // Step 2: patient submits payment details → create appointment + payment atomically
  const handleBookWithPayment = async (e) => {
    e.preventDefault()
    // Validate transaction ID
    if (!paymentGateData.transactionId.trim()) {
      setPaymentGateErrors({ transactionId: 'Transaction ID is required.' })
      return
    }
    setPaymentGateErrors({ transactionId: '' })
    setSubmittingBookingPayment(true)
    try {
      await API.post('/appointments/book-with-payment', {
        ...formData,
        paymentMethod: paymentGateData.paymentMethod,
        transactionId: paymentGateData.transactionId,
        paymentProof: paymentGateData.notes,
      })
      toast.success('🎉 Appointment booked & payment submitted successfully!')
      resetBookingForm()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.msg || err.response?.data || err.message || 'Failed to book appointment'
      toast.error(msg)
    } finally {
      setSubmittingBookingPayment(false)
    }
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    if (!payingAppointment) return
    
    setSubmittingPayment(true)
    try {
      await API.patch(`/appointments/${payingAppointment._id}/payment-proof`, {
        paymentMethod: paymentFormData.paymentMethod,
        transactionId: paymentFormData.transactionId,
        paymentProof: paymentFormData.notes
      })
      
      toast.success('Payment proof submitted successfully!')
      setPayingAppointment(null)
      setPaymentFormData({
        paymentMethod: 'JazzCash',
        transactionId: '',
        notes: '',
      })
      fetchAppointments()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.msg || 'Failed to submit payment proof'
      toast.error(msg)
    } finally {
      setSubmittingPayment(false)
    }
  }

  const openRescheduleModal = (appt) => {
    setRescheduleAppointment(appt)
    setRescheduleData({
      appointmentDate: new Date(appt.date).toISOString().split('T')[0],
      time: formatForTimeInput(appt.time || ''),
      type: appt.type || '',
    })
    setRescheduleError('')
  }

  const closeRescheduleModal = () => {
    setRescheduleAppointment(null)
    setRescheduleData({ appointmentDate: '', time: '', type: '' })
    setRescheduleError('')
  }

  const validateReschedule = () => {
    const errors = {
      appointmentDate: '',
      time: '',
    }
    if (!rescheduleData.appointmentDate) {
      errors.appointmentDate = 'Please choose a new date.'
    } else {
      const selected = new Date(rescheduleData.appointmentDate + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selected < today) {
        errors.appointmentDate = 'Date cannot be in the past.'
      }
    }
    if (!rescheduleData.time) {
      errors.time = 'Please select a time.'
    }
    setRescheduleErrors(errors)
    return !errors.appointmentDate && !errors.time
  }

  const handleReschedule = async (e) => {
    e.preventDefault()
    if (!rescheduleAppointment) return
    if (!validateReschedule()) {
      setRescheduleError('Please fix the highlighted fields before saving.')
      return
    }

    setRescheduleError('')
    setRescheduling(true)
    try {
      const res = await API.patch(`/appointments/${rescheduleAppointment._id}/reschedule`, {
        appointmentDate: rescheduleData.appointmentDate,
        time: rescheduleData.time,
      })
      const updated = res.data
      setAppointments(prev => prev.map(a => a._id === updated._id ? updated : a))
      closeRescheduleModal()
      toast.success('Appointment rescheduled successfully!')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.msg || err.response?.data || err.message || 'Failed to reschedule appointment'
      setRescheduleError(msg)
    } finally {
      setRescheduling(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return
    try {
      await API.delete(`/appointments/${id}`)
      setAppointments(appointments.filter(a => a._id !== id))
      toast.success('Appointment cancelled')
    } catch (err) {
      console.error(err)
      toast.error('Failed to cancel appointment')
    }
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      await API.patch(`/appointments/${id}/status`, { status })
      toast.success(status === 'scheduled' ? 'Appointment accepted!' : 'Appointment declined')
      fetchAppointments()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update appointment status')
    }
  }

  const today = new Date().getDate().toString()
  const todayDate = new Date().toISOString().split('T')[0]

  // Figure out which calendar days are available for the selected doctor
  const availableDayNamesSet = new Set(doctorAvail?.days || [])

  const isDateAvailable = (dateObj) => {
    if (!dateObj.isCurrentMonth) return false
    if (availableDayNamesSet.size === 0) return true  // no restriction if doctor hasn't set schedule
    const d = new Date(dateObj.year, dateObj.month, Number(dateObj.day))
    return availableDayNamesSet.has(DAY_NAMES[d.getDay()])
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const normalizeStatus = (status) => status?.toString().toLowerCase().replace(/\s+/g, '')
  const isUpcomingStatus = (status) => ['upcoming', 'scheduled', 'suggested', 'pending'].includes(normalizeStatus(status))
  const isHistoryStatus = (status) => ['completed', 'cancelled', 'cancelled', 'noshow', 'no show', 'missed', 'rejected'].includes(normalizeStatus(status))

  const upcomingAppointments = appointments.filter(a => {
    const d = new Date(a.date)
    d.setHours(0, 0, 0, 0)
    return d >= todayStart && isUpcomingStatus(a.status)
  }).sort((a, b) => new Date(a.date) - new Date(b.date))

  const historyAppointments = appointments.filter(a => {
    const d = new Date(a.date)
    d.setHours(0, 0, 0, 0)
    return d < todayStart || isHistoryStatus(a.status)
  }).sort((a, b) => new Date(b.date) - new Date(a.date))

  const renderAppt = (appt, isHistory = false) => (
    <div key={appt._id} className={`group p-5 hover:bg-slate-50 transition-colors flex items-start gap-4 ${isHistory ? 'opacity-70' : ''}`}>
      <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-[10px] font-bold uppercase leading-none ${isHistory ? 'bg-slate-100 text-slate-500' : 'bg-teal-100 text-teal-700'}`}>
        <span>{new Date(appt.date).toLocaleString('default', { month: 'short' })}</span>
        <span className="text-lg">{new Date(appt.date).getDate()}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isHistory ? 'text-slate-500' : 'text-primary'}`}>{appt.type}</span>
          <span className="text-[12px] text-slate-400">
            {(() => {
              if (!appt.time) return '';
              if (appt.time.includes('AM') || appt.time.includes('PM')) return appt.time;
              const [h, m] = appt.time.split(':');
              const hr = Number(h);
              return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
            })()}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-slate-900">
          {role === 'doctor' ? (appt.patient?.name || 'Unknown Patient') : (appt.doctor?.name || 'Unknown Doctor')}
        </h4>
        <p className="text-xs text-slate-500 mt-1">{appt.description}</p>
        {!isHistory && appt.status === 'suggested' && (
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full uppercase">Suggested</span>
            {role === 'patient' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(appt._id, 'scheduled')}
                  className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleStatusUpdate(appt._id, 'rejected')}
                  className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        )}
        {appt.status === 'rejected' && (
          <span className="mt-2 inline-block px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase">Declined</span>
        )}
        {appt.status === 'completed' && (
          <span className="mt-2 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Completed</span>
        )}
        {appt.status === 'missed' && (
          <span className="mt-2 inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">Missed</span>
        )}
        {appt.status === 'pending' && (
          <div className="mt-3">
            <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold rounded-full uppercase mb-2">
              {appt.paymentRequired ? 'Awaiting Payment' : role === 'doctor' ? 'Awaiting Confirmation' : 'Awaiting Doctor Confirmation'}
            </span>
            {role === 'doctor' && !appt.paymentRequired && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(appt._id, 'scheduled')}
                  className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition"
                >
                  Confirm
                </button>
                <button
                  onClick={() => handleStatusUpdate(appt._id, 'rejected')}
                  className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition"
                >
                  Reject
                </button>
              </div>
            )}
            {role === 'patient' && appt.paymentRequired && (
              <button
                onClick={() => {
                  setPayingAppointment(appt)
                  setPaymentFormData({ paymentMethod: 'JazzCash', transactionId: '', notes: '' })
                }}
                className="w-full max-w-[150px] flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] shadow-sm transition active:scale-95 uppercase tracking-wider"
              >
                Pay Now (PKR {appt.doctor?.fees || 0})
              </button>
            )}
          </div>
        )}
        {appt.status === 'scheduled' && appt.paymentRequired && role === 'patient' && (
          <div className="mt-3">
            <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold rounded-full uppercase mb-2">
              Confirmed - Payment Required
            </span>
            {
              <button
                onClick={() => {
                  setPayingAppointment(appt)
                  setPaymentFormData({
                    paymentMethod: 'JazzCash',
                    transactionId: '',
                    notes: '',
                  })
                }}
                className="w-full max-w-[150px] flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] shadow-sm transition active:scale-95 uppercase tracking-wider"
              >
                Pay Now (PKR {appt.doctor?.fees || 0})
              </button>
            }
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {!isHistory && appt.status !== 'pending' && appt.type?.toUpperCase() === 'TELE-HEALTH' && (
          <button
            onClick={async () => {
              if (creatingVideoCall) return
              try {
                setCreatingVideoCall(true)
                toast.loading('Opening Jitsi meeting...', { id: `appt-call-${appt._id}` })
                const targetUserId = role === 'doctor' ? appt.patient?._id : appt.doctor?._id
                const roomName = buildJitsiRoomName(targetUserId)
                if (targetUserId) {
                  await API.post('/messages', { receiver: targetUserId, content: `VIDEO_CALL_INVITE:${roomName}` })
                }
                setActiveVideoCallRoom(roomName)
                setActiveVideoCallUserName(localStorage.getItem('name') || 'Guest')
                toast.dismiss(`appt-call-${appt._id}`)
                toast.success('Jitsi meeting ready')
              } catch (err) {
                console.error('Failed to start Jitsi call', err)
                toast.dismiss(`appt-call-${appt._id}`)
                toast.error(err.response?.data?.msg || 'Failed to start video call')
              } finally {
                setCreatingVideoCall(false)
              }
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center gap-1 rounded-lg bg-teal-50 px-2 py-2 text-[11px] font-semibold text-primary hover:bg-teal-100"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">videocam</span>
            Call
          </button>
        )}
        {!isHistory && (
          <button
            onClick={() => openRescheduleModal(appt)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg"
            type="button"
            title="Reschedule"
          >
            <span className="material-symbols-outlined text-sm">event</span>
          </button>
        )}
        <button onClick={() => handleDelete(appt._id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-400 hover:text-red-600" type="button" title="Delete">
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
        {role === 'doctor' && appt.patient?._id && (
          <button
            onClick={() => navigate(`/patient-history/${appt.patient._id}`)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-purple-400 hover:text-purple-600"
            type="button"
            title="View History"
          >
            <span className="material-symbols-outlined text-sm">history</span>
          </button>
        )}
        {role === 'doctor' && !isHistory && appt.status === 'scheduled' && (
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => handleStatusUpdate(appt._id, 'completed')} className="p-1 text-green-500 hover:text-green-700 bg-green-50 rounded" type="button" title="Mark Completed">
              <span className="material-symbols-outlined text-xs">check_circle</span>
            </button>
            <button onClick={() => handleStatusUpdate(appt._id, 'missed')} className="p-1 text-slate-500 hover:text-slate-700 bg-slate-50 rounded" type="button" title="Mark Missed">
              <span className="material-symbols-outlined text-xs">cancel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <DashboardShell title="Appointments" subtitle="Manage your rehabilitation journey and specialist sessions.">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
              <p className="text-sm text-slate-500">Your scheduled appointments.</p>
            </div>
            {role === 'patient' ? (
              <button
                onClick={() => { setShowForm(!showForm) }}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-700 transition"
              >
                <span className="material-symbols-outlined">add</span>
                Book Appointment
              </button>
            ) : (
              <button
                onClick={() => {
                  const nextShowForm = !showForm
                  setShowForm(nextShowForm)
                  if (nextShowForm) fetchDoctorAvailability(localStorage.getItem('userId'))
                }}
                className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700 transition"
              >
                <span className="material-symbols-outlined">add</span>
                Suggest Appointment
              </button>
            )}
          </div>

          {/* ── Booking Form ── */}
          {showForm && (
            <form onSubmit={handleBook} className="mb-8 p-6 bg-teal-50 rounded-2xl border border-teal-100 space-y-5">
              <h4 className="font-semibold text-slate-900 text-lg">New Appointment</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor */}
                {role === 'patient' ? (
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Doctor</label>
                    <select
                      value={formData.doctor}
                      onChange={e => {
                        const docId = e.target.value
                        setFormData({ ...formData, doctor: docId, appointmentDate: '', time: '' })
                        fetchDoctorAvailability(docId)
                        setSelectedDoctorObj(findDoctorById(docId))
                      }}
                      className={`w-full h-11 px-4 rounded-xl border outline-none focus:border-primary bg-white ${formErrors.doctor ? 'border-red-400' : 'border-slate-200'}`}
                      required
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map(d => (
                        <option key={d._id} value={d._id}>
                          {d.name}{d.fees ? ` — PKR ${d.fees}` : ''}
                        </option>
                      ))}
                    </select>
                    {formErrors.doctor && <p className="mt-1 text-xs text-red-500">{formErrors.doctor}</p>}
                    {selectedDoctorObj && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                        <span className="material-symbols-outlined text-sm text-teal-500">payments</span>
                        Consultation fee: <strong>PKR {selectedDoctorObj.fees || 0}</strong> — payment required to confirm booking.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Patient</label>
                    <select
                      value={formData.patient}
                      onChange={e => setFormData({ ...formData, patient: e.target.value })}
                      className={`w-full h-11 px-4 rounded-xl border outline-none focus:border-primary bg-white ${formErrors.patient ? 'border-red-400' : 'border-slate-200'}`}
                      required
                    >
                      <option value="">Select a patient</option>
                      {patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}
                    </select>
                    {formErrors.patient && <p className="mt-1 text-xs text-red-500">{formErrors.patient}</p>}
                  </div>
                )}

                {/* Availability banner */}
                {availLoading && (
                  <div className="md:col-span-2 flex items-center gap-2 text-sm text-slate-500">
                    <span className="material-symbols-outlined animate-spin text-teal-500">progress_activity</span>
                    Loading availability...
                  </div>
                )}

                {availabilityError && !availLoading && (
                  <p className="md:col-span-2 text-sm text-red-500">{availabilityError}</p>
                )}

                {doctorAvail && !availLoading && (
                  <div className="md:col-span-2 rounded-xl bg-white border border-teal-200 p-4 flex flex-wrap items-center gap-3">
                    <span className="material-symbols-outlined text-teal-600">event_available</span>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Doctor's Available Schedule</p>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(doctorAvail.days || []).length > 0 ? (
                          doctorAvail.days.map(d => (
                            <span key={d} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">{d}</span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">No days configured</span>
                        )}
                      </div>
                      {doctorAvail.startTime && doctorAvail.endTime && (
                        <p className="text-xs text-slate-600 font-medium">
                          {doctorAvail.startTime} {doctorAvail.startPeriod || 'AM'} – {doctorAvail.endTime} {doctorAvail.endPeriod || 'PM'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Type */}
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-primary bg-white"
                  >
                    <option value="TELE-HEALTH">Tele-Health</option>
                    <option value="IN PERSON">In Person</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={e => handleDateChange(e.target.value)}
                    min={todayDate}
                    disabled={availLoading || (role === 'patient' ? !formData.doctor : !doctorAvail)}
                    className={`w-full h-11 px-4 rounded-xl border outline-none focus:border-primary ${formErrors.appointmentDate ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    required
                  />
                  {formErrors.appointmentDate && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      {formErrors.appointmentDate}
                    </p>
                  )}
                </div>

                {/* Time slot selector */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-2 block">Time Slot</label>
                  {timeSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, time: slot }))}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                            formData.time === slot
                              ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : formData.appointmentDate && !formErrors.appointmentDate ? (
                    <p className="text-slate-400 text-sm">Please select a doctor and valid date first.</p>
                  ) : !formData.appointmentDate ? (
                    <p className="text-slate-400 text-sm">Select a date to see available time slots.</p>
                  ) : null}
                  {/* Hidden required input that holds actual time value */}
                  <input type="hidden" value={formData.time} required />
                  {formData.appointmentDate && !formErrors.appointmentDate && timeSlots.length > 0 && !formData.time && (
                    <p className="mt-1.5 text-xs text-orange-500">Please select a time slot.</p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Reason / Description <span className="font-normal lowercase text-slate-400">(optional)</span></label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="e.g. Follow-up on knee rehab"
                    className={`w-full h-11 px-4 rounded-xl border outline-none focus:border-primary ${formErrors.description ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                  {formErrors.description && <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || !!formErrors.appointmentDate || !formData.time}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold transition disabled:opacity-60 ${
                    role === 'patient'
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-700 hover:to-teal-600 shadow-md shadow-teal-200'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {role === 'patient' && <span className="material-symbols-outlined text-sm">payments</span>}
                  {submitting ? (role === 'doctor' ? 'Suggesting...' : 'Processing...') : (role === 'doctor' ? 'Send Suggestion' : 'Proceed to Payment →')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setDoctorAvail(null); setTimeSlots([]); setSelectedDoctorObj(null); setFormErrors({ doctor: '', patient: '', appointmentDate: '', time: '', description: '' }) }}
                  className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

        </section>

        {/* ── Sidebar ── */}
        <aside className="lg:col-span-8 space-y-6">
          {role === 'patient' && appointments.some(a => a.status === 'suggested') && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3 text-orange-800 mb-1">
                <span className="material-symbols-outlined text-orange-500">notification_important</span>
                <p className="font-bold text-sm">New Appointment Suggestions</p>
              </div>
              <p className="text-xs text-orange-700">You have pending appointment suggestions from your doctor. Please review them below.</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b border-slate-100">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Appointments</h3>
                  <p className="text-sm text-slate-500">Filter your schedule by upcoming or past appointments.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] w-fit overflow-x-auto no-scrollbar max-w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('UPCOMING')}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'UPCOMING' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  Upcoming ({upcomingAppointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'HISTORY' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  History ({historyAppointments.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-slate-400">Loading appointments...</div>
              ) : activeTab === 'UPCOMING' ? (
                upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No upcoming appointments.</div>
                ) : (
                  upcomingAppointments.map(appt => renderAppt(appt, false))
                )
              ) : historyAppointments.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No history appointments.</div>
              ) : (
                historyAppointments.map(appt => renderAppt(appt, true))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Total</p>
              <p className="text-2xl font-black text-primary mt-2">{appointments.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">This Month</p>
              <p className="text-2xl font-black text-secondary mt-2">
                {appointments.filter(a => new Date(a.date).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 self-start">
          <h3 className="text-base font-semibold text-slate-900 mb-3">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <div className="grid grid-cols-7 gap-px bg-slate-100 overflow-hidden rounded-xl border border-slate-100">
            {calendarHeaders.map((day) => (
              <div key={day} className="bg-slate-50 py-2 text-center text-[9px] font-bold uppercase text-slate-500">{day}</div>
            ))}
            {getCalendarRows().flatMap((row) =>
              row.map((dateObj) => {
                const isToday = dateObj.day === today && dateObj.month === new Date().getMonth() && dateObj.year === new Date().getFullYear()
                const hasAppt = appointments.some(a => {
                  const d = new Date(a.date)
                  return d.getDate().toString() === dateObj.day && d.getMonth() === dateObj.month && d.getFullYear() === dateObj.year
                })
                const available = isDateAvailable(dateObj)
                return (
                  <div
                    key={`${dateObj.year}-${dateObj.month}-${dateObj.day}`}
                    className={`min-h-[52px] p-1.5 bg-white relative ${!dateObj.isCurrentMonth ? 'opacity-40 bg-slate-50' : ''} ${dateObj.isCurrentMonth && !available && doctorAvail ? 'bg-red-50/40' : ''}`}
                  >
                    <span className={`font-medium text-xs ${isToday ? 'text-primary font-bold' : 'text-slate-700'}`}>{dateObj.day}</span>
                    {dateObj.isCurrentMonth && !available && availableDayNamesSet.size > 0 && (
                      <div className="mt-1 rounded p-0.5 text-[8px] font-bold bg-slate-200 text-slate-500">Unavail.</div>
                    )}
                    {hasAppt && (
                      <div className="mt-1 rounded p-0.5 text-[8px] font-bold bg-teal-600 text-white">Appt.</div>
                    )}
                    {isToday && <div className="absolute inset-0 rounded-lg border-2 border-primary/70 pointer-events-none" />}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <JitsiCallModal
        isOpen={Boolean(activeVideoCallRoom)}
        roomName={activeVideoCallRoom}
        userName={activeVideoCallUserName}
        onClose={() => setActiveVideoCallRoom(null)}
      />

      {rescheduleAppointment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Reschedule Appointment</h2>
                <p className="text-sm text-slate-500 mt-1">Change the date and time for this upcoming appointment.</p>
              </div>
              <button
                type="button"
                onClick={closeRescheduleModal}
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {rescheduleError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3 mb-4">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleReschedule} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Type</label>
                  <input
                    type="text"
                    value={rescheduleData.type}
                    disabled
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={rescheduleData.appointmentDate}
                    onChange={e => {
                      setRescheduleData(prev => ({ ...prev, appointmentDate: e.target.value }))
                      setRescheduleErrors(prev => ({ ...prev, appointmentDate: '' }))
                    }}
                    className={`w-full h-11 px-4 rounded-xl border outline-none focus:border-primary ${rescheduleErrors.appointmentDate ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    required
                  />
                  {rescheduleErrors.appointmentDate && <p className="mt-1 text-xs text-red-500">{rescheduleErrors.appointmentDate}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={rescheduleData.time}
                    onChange={e => {
                      setRescheduleData(prev => ({ ...prev, time: e.target.value }))
                      setRescheduleErrors(prev => ({ ...prev, time: '' }))
                    }}
                    className={`w-full h-11 px-4 rounded-xl border outline-none focus:border-primary ${rescheduleErrors.time ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    required
                  />
                  {rescheduleErrors.time && <p className="mt-1 text-xs text-red-500">{rescheduleErrors.time}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="bg-teal-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-60"
                >
                  {rescheduling ? 'Rescheduling...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeRescheduleModal}
                  className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Payment Gate Modal (booking payment, before appointment is created) ── */}
      {showPaymentGate && role === 'patient' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-0 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header gradient */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-500 p-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-white/80 text-lg">lock</span>
                    <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Step 2 of 2</span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Complete Payment</h2>
                  <p className="text-teal-100 text-sm mt-1">Pay to confirm your appointment booking.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentGate(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl text-white/60 hover:bg-white/10 hover:text-white transition-colors mt-1"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Summary chip */}
              <div className="mt-4 bg-white/10 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">calendar_month</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">
                    {doctors.find(d => d._id === formData.doctor)?.name || 'Doctor'}
                  </p>
                  <p className="text-teal-100 text-[10px]">
                    {formData.appointmentDate} &nbsp;·&nbsp; {formData.time} &nbsp;·&nbsp; {formData.type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-lg leading-none">
                    PKR {selectedDoctorObj?.fees || doctors.find(d => d._id === formData.doctor)?.fees || 0}
                  </p>
                  <p className="text-teal-200 text-[10px]">fee</p>
                </div>
              </div>
            </div>

            <div className="p-7 pt-5 space-y-4">
              {/* Payment accounts */}
              {(() => {
                const doc = selectedDoctorObj || doctors.find(d => d._id === formData.doctor)
                const contactNumber = doc?.workNumber || ''
                const jazz = contactNumber || doc?.paymentDetails?.jazzcashNumber
                const easy = contactNumber || doc?.paymentDetails?.easypaisaNumber
                if (!jazz && !easy) return (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5">info</span>
                    <p className="text-xs text-amber-700">Payment details not set. Contact the doctor directly to obtain payment account info before entering your transaction ID.</p>
                  </div>
                )
                return (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Transfer Accounts</p>
                    {jazz && (
                      <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-[10px] font-black text-red-600">J</span>
                          <span className="text-xs text-slate-500 font-medium">JazzCash</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(jazz); toast.success('Copied!') }}
                          className="flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-teal-600 transition"
                        >
                          {jazz}
                          <span className="material-symbols-outlined text-sm text-slate-400">content_copy</span>
                        </button>
                      </div>
                    )}
                    {easy && (
                      <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-[10px] font-black text-green-700">E</span>
                          <span className="text-xs text-slate-500 font-medium">EasyPaisa</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(easy); toast.success('Copied!') }}
                          className="flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-teal-600 transition"
                        >
                          {easy}
                          <span className="material-symbols-outlined text-sm text-slate-400">content_copy</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              <form onSubmit={handleBookWithPayment} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Payment Method</label>
                  <select
                    value={paymentGateData.paymentMethod}
                    onChange={e => setPaymentGateData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-teal-500 bg-white text-sm font-medium"
                    required
                  >
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Transaction ID / Reference No. *</label>
                  <input
                    type="text"
                    value={paymentGateData.transactionId}
                    onChange={e => {
                      setPaymentGateData(prev => ({ ...prev, transactionId: e.target.value }))
                      if (e.target.value.trim()) setPaymentGateErrors({ transactionId: '' })
                    }}
                    placeholder="e.g. TXN-123456789"
                    className={`w-full h-11 px-4 rounded-xl border outline-none focus:border-teal-500 text-sm font-medium ${paymentGateErrors.transactionId ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    required
                  />
                  {paymentGateErrors.transactionId && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      {paymentGateErrors.transactionId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Notes (Optional)</label>
                  <textarea
                    value={paymentGateData.notes}
                    onChange={e => setPaymentGateData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any details to help verify your payment..."
                    className="w-full h-20 p-3 rounded-xl border border-slate-200 outline-none focus:border-teal-500 text-sm font-medium resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submittingBookingPayment}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white py-3.5 rounded-2xl font-bold transition disabled:opacity-60 text-sm shadow-lg shadow-teal-200"
                  >
                    {submittingBookingPayment ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Confirming Booking...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Confirm Booking & Pay
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentGate(false)}
                    className="px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {payingAppointment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Complete Payment</h2>
                <p className="text-sm text-slate-500 mt-1">Submit your transaction details to confirm appointment.</p>
              </div>
              <button
                type="button"
                onClick={() => setPayingAppointment(null)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-teal-50/50 rounded-3xl p-5 border border-teal-100 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultation Fee</span>
                <span className="text-xl font-black text-teal-600">PKR {payingAppointment.doctor?.fees || 0}</span>
              </div>
              
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transfer Accounts</p>
                {(payingAppointment.doctor?.workNumber || payingAppointment.doctor?.paymentDetails?.jazzcashNumber) ? (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>JazzCash:</span>
                    <span className="font-bold text-slate-900">{payingAppointment.doctor.workNumber || payingAppointment.doctor.paymentDetails.jazzcashNumber}</span>
                  </div>
                ) : null}
                {(payingAppointment.doctor?.workNumber || payingAppointment.doctor?.paymentDetails?.easypaisaNumber) ? (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>EasyPaisa:</span>
                    <span className="font-bold text-slate-900">{payingAppointment.doctor.workNumber || payingAppointment.doctor.paymentDetails.easypaisaNumber}</span>
                  </div>
                ) : null}
                {!payingAppointment.doctor?.workNumber && !payingAppointment.doctor?.paymentDetails?.jazzcashNumber && !payingAppointment.doctor?.paymentDetails?.easypaisaNumber ? (
                  <p className="text-xs text-slate-500 italic">Please contact Dr. {payingAppointment.doctor?.name} for payment details.</p>
                ) : null}
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Payment Method</label>
                <select
                  value={paymentFormData.paymentMethod}
                  onChange={e => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-primary bg-white text-sm"
                  required
                >
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Transaction ID / Reference No.</label>
                <input
                  type="text"
                  value={paymentFormData.transactionId}
                  onChange={e => setPaymentFormData({ ...paymentFormData, transactionId: e.target.value })}
                  placeholder="Enter transaction ID"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-primary text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Notes / Additional Info (Optional)</label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  placeholder="Any details to help verify your payment..."
                  className="w-full h-24 p-3 rounded-xl border border-slate-200 outline-none focus:border-primary text-sm font-medium resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingPayment}
                    className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-60 text-sm shadow-lg shadow-teal-200"
                >
                  {submittingPayment ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
                <button
                  type="button"
                  onClick={() => setPayingAppointment(null)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
