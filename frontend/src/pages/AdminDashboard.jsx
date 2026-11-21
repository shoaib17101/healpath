import { useEffect, useState } from 'react'
import API from '../api'
import DashboardShell from '../components/DashboardShell'
import { doctorCategories, doctorCategoryTranslations } from '../constants/locationData'
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  UserPlus, 
  Ban, 
  RotateCcw, 
  Trash2, 
  CheckCircle2,
  Mail,
  Stethoscope,
  ChevronDown
} from 'lucide-react'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [pendingDoctors, setPendingDoctors] = useState([])
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [appointments, setAppointments] = useState([])
  const [payments, setPayments] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [markingPaymentId, setMarkingPaymentId] = useState(null)
  const [verifyingAppointmentId, setVerifyingAppointmentId] = useState(null)
  const [sendingReminderId, setSendingReminderId] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState(() => new Set())
  const [expandedDoctors, setExpandedDoctors] = useState(() => new Set())

  // Filters state
  const [aptStatusFilter, setAptStatusFilter] = useState('all')
  const [aptSearch, setAptSearch] = useState('')
  const [payStatusFilter, setPayStatusFilter] = useState('all')
  const [paySearch, setPaySearch] = useState('')

  useEffect(() => {
    if (activeTab === 'overview') setExpandedCategories(new Set())
    if (activeTab === 'doctors') setExpandedDoctors(new Set())
    fetchTabData(activeTab)
  }, [activeTab])

  const fetchTabData = async (tab) => {
    if (tab === 'overview') {
      const showFullLoader = !stats.totalDoctors;
      if (showFullLoader) setLoading(true);
      else setTabLoading(true);

      try {
        const [statsRes, pendingRes, usersRes] = await Promise.all([
          API.get('/admin/stats'),
          API.get('/admin/users/pending-doctors'),
          API.get('/admin/users')
        ])
        setStats(statsRes.data)
        setPendingDoctors(pendingRes.data)
        setUsers(usersRes.data)
      } catch (err) {
        console.error(err)
        setMessage(err.response?.data?.msg || 'Unable to load Overview data')
      } finally {
        setLoading(false)
        setTabLoading(false)
      }
    } else if (tab === 'doctors' || tab === 'patients') {
      setTabLoading(true)
      try {
        const res = await API.get('/admin/users')
        setUsers(res.data)
      } catch (err) {
        console.error(err)
        setMessage(err.response?.data?.msg || 'Unable to load accounts data')
      } finally {
        setTabLoading(false)
      }
    } else if (tab === 'appointments') {
      setTabLoading(true)
      try {
        const res = await API.get('/admin/appointments')
        setAppointments(res.data)
      } catch (err) {
        console.error(err)
        setMessage(err.response?.data?.msg || 'Unable to load appointments data')
      } finally {
        setTabLoading(false)
      }
    } else if (tab === 'billing') {
      setTabLoading(true)
      try {
        const res = await API.get('/admin/payments')
        setPayments(res.data)
      } catch (err) {
        console.error(err)
        setMessage(err.response?.data?.msg || 'Unable to load payments data')
      } finally {
        setTabLoading(false)
      }
    }
  }

  const updateDoctorStatus = async (doctorId, action) => {
    try {
      await API.patch(`/admin/users/${doctorId}/${action}`)
      setPendingDoctors((prev) => prev.filter((doctor) => doctor._id !== doctorId))
      setStats((prev) => ({
        ...prev,
        pendingDoctors: Math.max(0, (prev.pendingDoctors || 1) - 1),
      }))
      setMessage(`Doctor ${action === 'approve' ? 'approved' : 'rejected'} successfully.`)
      setTimeout(() => setMessage(''), 3500)
    } catch (err) {
      console.error(err)
      setMessage(err.response?.data?.msg || 'Failed to update doctor status')
    }
  }

  const handleUserAction = async (userId, action) => {
    const targetUser = users.find((user) => user._id === userId)

    try {
      if (action === 'delete') {
        await API.delete(`/admin/users/${userId}`)
        setUsers((prev) => prev.filter((user) => user._id !== userId))
        setStats((prev) => ({
          ...prev,
          totalDoctors: prev.totalDoctors > 0 ? prev.totalDoctors - (targetUser?.role === 'doctor' ? 1 : 0) : 0,
          totalPatients: prev.totalPatients > 0 ? prev.totalPatients - (targetUser?.role === 'patient' ? 1 : 0) : 0,
        }))
        setMessage('Account deleted successfully.')
      } else {
        await API.patch(`/admin/users/${userId}/${action}`)
        setUsers((prev) => prev.map((user) => user._id === userId ? { ...user, status: action === 'suspend' ? 'suspended' : 'approved' } : user))
        setMessage(action === 'suspend' ? 'Account suspended successfully.' : 'Account re-activated successfully.')
      }
      setTimeout(() => setMessage(''), 3500)
    } catch (err) {
      console.error(err)
      setMessage(err.response?.data?.msg || 'Failed to update account status')
    }
  }

  const handleMarkPaymentPaid = async (paymentId) => {
    try {
      setMarkingPaymentId(paymentId)
      await API.patch(`/admin/payments/${paymentId}/mark-paid`)
      setPayments((prev) => prev.map((payment) => payment._id === paymentId ? {
        ...payment,
        payoutStatus: 'paid',
        paidAt: new Date().toISOString(),
      } : payment))
      setMessage('Payout marked as paid successfully.')
      setTimeout(() => setMessage(''), 3500)
    } catch (err) {
      console.error(err)
      setMessage(err.response?.data?.msg || 'Failed to mark payout as paid')
    } finally {
      setMarkingPaymentId(null)
    }
  }

  const handleVerifyPayment = async (appointmentId) => {
    try {
      setVerifyingAppointmentId(appointmentId)
      await API.patch(`/admin/appointments/${appointmentId}/verify-payment`)
      setPayments((prev) => prev.map((payment) => payment.appointmentId?._id === appointmentId
        ? { ...payment, status: 'completed', appointmentId: { ...payment.appointmentId, status: 'scheduled' } }
        : payment))
      setMessage('Payment verified and appointment scheduled successfully.')
      setTimeout(() => setMessage(''), 3500)
    } catch (err) {
      console.error(err)
      setMessage(err.response?.data?.msg || 'Failed to verify payment')
    } finally {
      setVerifyingAppointmentId(null)
    }
  }

  const handleSendAppointmentReminder = async (appointmentId) => {
    try {
      setSendingReminderId(appointmentId)
      const res = await API.post(`/admin/appointments/${appointmentId}/send-reminder`)
      setAppointments((prev) => prev.map((appointment) => appointment._id === appointmentId
        ? { ...appointment, appointmentDateReminderSentAt: res.data.appointmentDateReminderSentAt }
        : appointment))
      setMessage('Appointment reminder sent to the patient and doctor.')
      setTimeout(() => setMessage(''), 3500)
    } catch (err) {
      console.error(err)
      setMessage(err.response?.data?.msg || 'Failed to send appointment reminder')
    } finally {
      setSendingReminderId(null)
    }
  }

  const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'doctors', label: 'Doctors', icon: Users },
    { id: 'patients', label: 'Patients', icon: UserPlus },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'billing', label: 'Billing', icon: DollarSign },
  ]

  const renderProfileDetails = (user, type = 'user') => {
    const doctorInfo = user.role === 'doctor'
    const availabilityDays = user.availability?.days?.length ? user.availability.days.join(', ') : null
    const paymentDetails = Array.isArray(user.paymentDetails) ? user.paymentDetails : user.paymentDetails || {}
    const displayEntries = [
      doctorInfo && user.category ? { label: 'Specialty', value: user.category } : null,
      doctorInfo && user.experience ? { label: 'Experience', value: `${user.experience} years` } : null,
      doctorInfo && user.fees ? { label: 'Consultation', value: formatCurrency(user.fees) } : null,
      doctorInfo && availabilityDays ? { label: 'Availability', value: availabilityDays } : null,
      doctorInfo && user.availability?.startTime && user.availability?.endTime ? {
        label: 'Hours',
        value: `${user.availability.startTime} - ${user.availability.endTime}${user.availability.startPeriod || 'AM'}/${user.availability.endPeriod || 'PM'}`,
      } : null,
      user.city || user.province ? { label: 'Location', value: `${user.city || 'Unknown city'}, ${user.province || 'Unknown province'}` } : null,
      user.workNumber ? { label: 'Phone', value: user.workNumber } : null,
      user.clinicAddress ? { label: 'Clinic', value: user.clinicAddress } : null,
      user.certifications ? { label: 'Certifications', value: user.certifications } : null,
      doctorInfo && user.proofOfCertification ? { label: 'Certification Proof', value: user.proofOfCertification, isProof: true } : null,
      user.bio ? { label: 'Bio', value: user.bio } : null,
      paymentDetails.jazzcashNumber || paymentDetails.easypaisaNumber ? { label: 'Payment', value: [paymentDetails.jazzcashNumber, paymentDetails.easypaisaNumber].filter(Boolean).join(' / ') } : null,
      user.date ? { label: 'Joined', value: new Date(user.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } : null,
      user.rating ? { label: 'Rating', value: `${Number(user.rating).toFixed(1)} (${user.ratingCount || 0} reviews)` } : null,
    ].filter(Boolean)

    if (displayEntries.length === 0) return null

    return (
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {displayEntries.map((entry) => (
          <div key={`${type}-${entry.label}-${user._id}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{entry.label}</div>
            {entry.isProof ? (
              entry.value.startsWith('data:image/') ? (
                <a href={entry.value} target="_blank" rel="noreferrer" className="mt-2 block">
                  <img src={entry.value} alt="Doctor certification proof" className="max-h-32 max-w-full rounded-lg border border-slate-200 object-contain" />
                </a>
              ) : (
                <a href={entry.value} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">
                  View certification proof
                </a>
              )
            ) : (
              <div className="mt-1 text-sm font-medium text-slate-700 break-words">{entry.value}</div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderOverview = () => {
    const doctorsByCategory = doctorCategories.map((category) => ({
      category,
      doctors: users.filter((user) => user.role === 'doctor' && user.category === category),
    }))

    return (
      <>
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          <button type="button" onClick={() => setActiveTab('doctors')} aria-label="View doctors" className="interactive-glow w-full rounded-[2rem] bg-white p-6 border border-slate-200 shadow-sm text-left cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400 font-semibold">Doctors</p>
                <h2 className="text-3xl font-black text-slate-900">{stats.totalDoctors ?? 0}</h2>
              </div>
              <div className="rounded-2xl bg-sky-50 text-sky-600 p-3">
                <Users size={22} />
              </div>
            </div>
            <p className="text-sm text-slate-500">Total approved doctors on the platform</p>
          </button>

          <button type="button" onClick={() => setActiveTab('patients')} aria-label="View patients" className="interactive-glow w-full rounded-[2rem] bg-white p-6 border border-slate-200 shadow-sm text-left cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400 font-semibold">Patients</p>
                <h2 className="text-3xl font-black text-slate-900">{stats.totalPatients ?? 0}</h2>
              </div>
              <div className="rounded-2xl bg-emerald-50 text-emerald-600 p-3">
                <UserPlus size={22} />
              </div>
            </div>
            <p className="text-sm text-slate-500">Registered patients across the network</p>
          </button>

          <button type="button" onClick={() => setActiveTab('appointments')} aria-label="View appointments" className="interactive-glow w-full rounded-[2rem] bg-white p-6 border border-slate-200 shadow-sm text-left cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400 font-semibold">Appointments</p>
                <h2 className="text-3xl font-black text-slate-900">{stats.totalAppointments ?? 0}</h2>
              </div>
              <div className="rounded-2xl bg-orange-50 text-orange-600 p-3">
                <Calendar size={22} />
              </div>
            </div>
            <p className="text-sm text-slate-500">Total appointments created</p>
          </button>

          <div className="rounded-[2rem] bg-white p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400 font-semibold">Pending Doctors</p>
                <h2 className="text-3xl font-black text-slate-900">{stats.pendingDoctors ?? 0}</h2>
              </div>
              <div className="rounded-2xl bg-yellow-50 text-yellow-600 p-3">
                <ShieldCheck size={22} />
              </div>
            </div>
            <p className="text-sm text-slate-500">Doctors awaiting approval</p>
          </div>

          <div className="rounded-[2rem] bg-white p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400 font-semibold">Revenue</p>
                <h2 className="text-3xl font-black text-slate-900">PKR {stats.totalRevenue ?? 0}</h2>
              </div>
              <div className="rounded-2xl bg-violet-50 text-violet-600 p-3">
                <DollarSign size={22} />
              </div>
            </div>
            <p className="text-sm text-slate-500">Total collected payment amount</p>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm p-6 w-full mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400 font-semibold">Doctor Directory</p>
              <h3 className="text-2xl font-black text-slate-900">Doctors by Category</h3>
            </div>
            <span className="text-sm text-slate-500">{users.filter((user) => user.role === 'doctor').length} doctors across {doctorsByCategory.filter(({ doctors }) => doctors.length > 0).length} categories</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctorsByCategory.map(({ category, doctors }) => (
              <div key={category} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedCategories((previous) => {
                    const next = new Set(previous)
                    if (next.has(category)) next.delete(category)
                    else next.add(category)
                    return next
                  })}
                  aria-expanded={expandedCategories.has(category)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-sky-100 text-sky-700 p-2.5">
                      <Stethoscope size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{category}</h4>
                      <p className="text-xs text-slate-500">{doctorCategoryTranslations[category]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-sky-700 border border-sky-100">{doctors.length}</span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${expandedCategories.has(category) ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {expandedCategories.has(category) && (
                  <div className="mt-4">
                    {doctors.length === 0 ? (
                      <p className="text-sm text-slate-400">No doctors registered</p>
                    ) : (
                      <div className="space-y-2">
                        {doctors.map((doctor) => (
                          <div key={doctor._id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 border border-slate-100">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{doctor.name}</p>
                              <p className="truncate text-xs text-slate-500">{doctor.city || 'Location not set'}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${doctor.status === 'suspended' ? 'bg-rose-100 text-rose-700' : doctor.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {doctor.status || 'unknown'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm p-6 w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400 font-semibold">Pending Approvals</p>
              <h3 className="text-2xl font-black text-slate-900">Doctor Applications</h3>
            </div>
            <span className="text-sm text-slate-500">{pendingDoctors.length} waiting</span>
          </div>

          {pendingDoctors.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
              No pending doctor approval requests at the moment.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDoctors.map((doctor) => (
                <div key={doctor._id} className="rounded-3xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-slate-500 uppercase tracking-[0.18em] font-semibold">{doctor.category ? `${doctor.category}${doctorCategoryTranslations[doctor.category] ? ` - ${doctorCategoryTranslations[doctor.category]}` : ''}` : 'Doctor'}</p>
                      <h4 className="text-lg font-bold text-slate-900">{doctor.name}</h4>
                      <p className="text-sm text-slate-500">{doctor.email}</p>
                      <p className="text-sm text-slate-500">{doctor.city || 'Unknown city'}, {doctor.province || 'Unknown province'}</p>
                      {renderProfileDetails(doctor, 'pending-doctor')}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => updateDoctorStatus(doctor._id, 'approve')}
                        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateDoctorStatus(doctor._id, 'reject')}
                        className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  const renderDoctors = () => {
    const term = searchTerm.trim().toLowerCase()
    const doctorsList = users
      .filter((user) => user.role === 'doctor')
      .filter((user) => {
        if (!term) return true
        return `${user.name} ${user.email}`.toLowerCase().includes(term)
      })

    return (
      <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm p-6 w-full max-h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400 font-semibold">Account Management</p>
              <h3 className="text-2xl font-black text-slate-900">Doctors</h3>
            </div>
            <span className="text-sm text-slate-500">{doctorsList.length} accounts found</span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search doctors by name or email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0 focus:border-sky-400 focus:bg-white transition-all"
          />
        </div>

        {doctorsList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
            No doctors matched your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
            {doctorsList.map((user) => (
              <div key={user._id} className="rounded-3xl border border-slate-200 p-4 hover:shadow-sm transition-all duration-200 bg-white">
                <div className="flex flex-col lg:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedDoctors((previous) => {
                      const next = new Set(previous)
                      if (next.has(user._id)) next.delete(user._id)
                      else next.add(user._id)
                      return next
                    })}
                    aria-expanded={expandedDoctors.has(user._id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <h5 className="text-base font-bold text-slate-900">{user.name}</h5>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${user.status === 'suspended' ? 'bg-rose-100 text-rose-700' : user.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {user.status || 'unknown'}
                      </span>
                      <ChevronDown size={18} className={`ml-auto text-slate-400 transition-transform ${expandedDoctors.has(user._id) ? 'rotate-180' : ''}`} />
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-sm text-slate-500">{user.city || 'Unknown city'}, {user.province || 'Unknown province'}</p>
                  </button>
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => handleUserAction(user._id, 'suspend')}
                      disabled={user.status === 'suspended'}
                      className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-amber-100 transition-colors"
                    >
                      <Ban size={16} /> Suspend
                    </button>
                    <button
                      onClick={() => handleUserAction(user._id, 'reactivate')}
                      disabled={user.status !== 'suspended'}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-emerald-100 transition-colors"
                    >
                      <RotateCcw size={16} /> Re-activate
                    </button>
                    <button
                      onClick={() => handleUserAction(user._id, 'delete')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
                {expandedDoctors.has(user._id) && renderProfileDetails(user, 'doctor')}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderPatients = () => {
    const term = searchTerm.trim().toLowerCase()
    const patientsList = users
      .filter((user) => user.role === 'patient')
      .filter((user) => {
        if (!term) return true
        return `${user.name} ${user.email}`.toLowerCase().includes(term)
      })

    return (
      <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm p-6 w-full">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400 font-semibold">Account Management</p>
              <h3 className="text-2xl font-black text-slate-900">Patients</h3>
            </div>
            <span className="text-sm text-slate-500">{patientsList.length} accounts found</span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patients by name or email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0 focus:border-sky-400 focus:bg-white transition-all"
          />
        </div>

        {patientsList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
            No patients matched your search.
          </div>
        ) : (
          <div className="space-y-3">
            {patientsList.map((user) => (
              <div key={user._id} className="rounded-3xl border border-slate-200 p-4 hover:shadow-sm transition-all duration-200 bg-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-base font-bold text-slate-900">{user.name}</h5>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${user.status === 'suspended' ? 'bg-rose-100 text-rose-700' : user.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {user.status || 'unknown'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-sm text-slate-500">{user.city || 'Unknown city'}, {user.province || 'Unknown province'}</p>
                    {renderProfileDetails(user, 'patient')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUserAction(user._id, 'suspend')}
                      disabled={user.status === 'suspended'}
                      className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-amber-100 transition-colors"
                    >
                      <Ban size={16} /> Suspend
                    </button>
                    <button
                      onClick={() => handleUserAction(user._id, 'reactivate')}
                      disabled={user.status !== 'suspended'}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-emerald-100 transition-colors"
                    >
                      <RotateCcw size={16} /> Re-activate
                    </button>
                    <button
                      onClick={() => handleUserAction(user._id, 'delete')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderAppointments = () => {
    const term = aptSearch.trim().toLowerCase()
    const filteredApts = appointments.filter((apt) => {
      if (aptStatusFilter !== 'all' && apt.status?.toLowerCase() !== aptStatusFilter) return false
      if (!term) return true
      const patientName = apt.patient?.name || ''
      const doctorName = apt.doctor?.name || ''
      return patientName.toLowerCase().includes(term) || doctorName.toLowerCase().includes(term)
    })

    return (
      <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm p-6 w-full">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400 font-semibold">Scheduling Activity</p>
              <h3 className="text-2xl font-black text-slate-900">Appointments</h3>
            </div>
            <span className="text-sm text-slate-500">{filteredApts.length} records found</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={aptSearch}
              onChange={(e) => setAptSearch(e.target.value)}
              placeholder="Search by patient or doctor name"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:bg-white transition-all"
            />
            <select
              value={aptStatusFilter}
              onChange={(e) => setAptStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Patient</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Doctor</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Time</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApts.length > 0 ? (
                  filteredApts.map((apt) => (
                    <tr key={apt._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{apt.patient?.name || 'Patient'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{apt.doctor?.name || 'Doctor'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-600">
                          {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                        {apt.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          apt.status === 'Completed' || apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                          apt.status === 'Cancelled' || apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          apt.status === 'Approved' || apt.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-teal-100 text-teal-700'
                        }`}>
                          {apt.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {apt.appointmentDateReminderSentAt ? (
                          <span className="text-sm font-semibold text-green-700">Sent</span>
                        ) : apt.status === 'scheduled' && new Date(apt.date).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10) ? (
                          <button
                            type="button"
                            onClick={() => handleSendAppointmentReminder(apt._id)}
                            disabled={sendingReminderId === apt._id}
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                          >
                            <Mail size={16} />
                            {sendingReminderId === apt._id ? 'Sending...' : 'Send reminder'}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">Not available</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No appointments matched your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderBilling = () => {
    const term = paySearch.trim().toLowerCase()
    const filteredPayments = payments.filter((pay) => {
      if (payStatusFilter !== 'all' && pay.status?.toLowerCase() !== payStatusFilter) return false
      if (!term) return true
      const patientName = pay.patientId?.name || ''
      const doctorName = pay.doctorId?.name || ''
      return patientName.toLowerCase().includes(term) || doctorName.toLowerCase().includes(term)
    })

    return (
      <div className="rounded-[2rem] bg-white border border-slate-200 shadow-sm p-6 w-full max-h-[calc(100vh-12rem)] overflow-x-auto overflow-y-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400 font-semibold">Financial Overview</p>
              <h3 className="text-2xl font-black text-slate-900">Payments</h3>
            </div>
            <span className="text-sm text-slate-500">{filteredPayments.length} records found</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={paySearch}
              onChange={(e) => setPaySearch(e.target.value)}
              placeholder="Search by patient or doctor name"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:bg-white transition-all"
            />
            <select
              value={payStatusFilter}
              onChange={(e) => setPayStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Patient</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Doctor</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Transaction ID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Payment Proof</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Method</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Gross</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Commission</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Doctor Payout</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Payout</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((pay) => (
                    <tr key={pay._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{pay.patientId?.name || 'Patient'}</div>
                        <div className="text-xs text-slate-400">{pay.patientId?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{pay.doctorId?.name || 'Doctor'}</div>
                        <div className="text-xs text-slate-400">{pay.doctorId?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                        {pay.transactionId}
                      </td>
                      <td className="px-6 py-4 min-w-52 text-sm text-slate-600">
                        {pay.appointmentId?.paymentProof ? (
                          /^https?:\/\//i.test(pay.appointmentId.paymentProof) ? (
                            <a
                              href={pay.appointmentId.paymentProof}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-sky-700 hover:underline"
                            >
                              Open proof
                            </a>
                          ) : (
                            <span className="break-words">{pay.appointmentId.paymentProof}</span>
                          )
                        ) : (
                          <span className="text-amber-600">Not submitted</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                        {pay.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                        {new Date(pay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        <div>{formatCurrency(pay.commissionAmount || 0)}</div>
                        <div className="text-xs text-slate-400">{Number(pay.commissionPercent || 0)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-700">
                        {formatCurrency(pay.doctorPayoutAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            pay.status === 'completed' ? 'bg-green-100 text-green-700' :
                            pay.status === 'failed' ? 'bg-red-100 text-red-700' :
                            pay.status === 'cancelled' ? 'bg-slate-100 text-slate-700' :
                            'bg-teal-100 text-teal-700'
                          }`}>
                            {pay.status || 'pending'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            pay.payoutStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {pay.payoutStatus || 'pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2 items-start">
                          {pay.status === 'pending' && pay.appointmentId?._id && (
                            <button
                              onClick={() => handleVerifyPayment(pay.appointmentId._id)}
                              disabled={verifyingAppointmentId === pay.appointmentId._id}
                              className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-sky-100 transition-colors"
                            >
                              <CheckCircle2 size={16} />
                              {verifyingAppointmentId === pay.appointmentId._id ? 'Verifying...' : 'Verify Payment'}
                            </button>
                          )}
                          <button
                            onClick={() => handleMarkPaymentPaid(pay._id)}
                            disabled={markingPaymentId === pay._id || pay.payoutStatus === 'paid'}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 size={16} />
                            {markingPaymentId === pay._id ? 'Updating...' : pay.payoutStatus === 'paid' ? 'Paid' : 'Mark Paid'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="px-6 py-12 text-center text-slate-400">
                      No payments matched your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    if (tabLoading) {
      return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-12 text-center text-slate-500 w-full">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">Fetching tab data...</p>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'doctors':
        return renderDoctors()
      case 'patients':
        return renderPatients()
      case 'appointments':
        return renderAppointments()
      case 'billing':
        return renderBilling()
      default:
        return null
    }
  }

  if (loading) {
    return (
      <DashboardShell 
        title="Super Admin Panel" 
        subtitle="Loading admin dashboard..."
        sidebarItems={navTabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      >
        <div className="flex items-center justify-center h-64 text-slate-500">Loading admin data...</div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell 
      title="Super Admin Panel" 
      subtitle="Manage user access, doctor approvals, appointments, and revenue."
      sidebarItems={navTabs}
      activeTabId={activeTab}
      onTabChange={setActiveTab}
    >
      {message && (
        <div className="mb-6 rounded-3xl bg-emerald-50 border border-emerald-100 px-5 py-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="w-full min-w-0">
        {renderTabContent()}
      </div>
    </DashboardShell>
  )
}
