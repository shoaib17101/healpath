import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import DashboardShell from '../components/DashboardShell'
import { Calendar, CheckCircle, Clock, Activity, MessageSquare, FileText, ArrowRight, MessageCircle, Stethoscope, Clipboard } from 'lucide-react'

// Lazy load the chatbot widget — it's not needed until the user opens it
const AIHealthChatbot = lazy(() => import('../components/AIHealthChatbot'))

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [history, setHistory] = useState([])
  const [conversations, setConversations] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const userName = localStorage.getItem('name') || 'Patient'

  useEffect(() => {
    fetchPatientData()
  }, [])

  const fetchPatientData = async () => {
    try {
      const [patientRes, appointmentsRes, conversationsRes, unreadRes] = await Promise.all([
        API.get('/patients'),
        API.get('/appointments'),
        API.get('/messages/conversations').catch(() => ({ data: [] })),
        API.get('/messages/unread-count').catch(() => ({ data: { count: 0 } }))
      ])
      
      const patientData = patientRes.data[0];
      if (patientData) {
        setPatient(patientData)
        try {
          const historyRes = await API.get(`/history/${patientData._id}`)
          setHistory(historyRes.data)
        } catch (e) {}
      }
      setAppointments(appointmentsRes.data)
      setConversations(conversationsRes.data || [])
      setUnreadCount(unreadRes.data?.count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Patient Dashboard" subtitle="Loading your personalized dashboard...">
        <div className="flex items-center justify-center h-64 text-slate-400">Loading dashboard data...</div>
      </DashboardShell>
    )
  }

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingAppointments = appointments.filter(a => {
    const d = new Date(a.date);
    d.setHours(0,0,0,0);
    return d >= now && !['completed', 'missed', 'rejected'].includes(a.status);
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastAppointments = appointments.filter(a => {
    const d = new Date(a.date);
    d.setHours(0,0,0,0);
    return d < now || ['completed', 'missed', 'rejected'].includes(a.status);
  });

  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  let daysAwayText = '';
  if (nextAppointment) {
    const nextDate = new Date(nextAppointment.date);
    nextDate.setHours(0,0,0,0);
    const diffTime = Math.abs(nextDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) daysAwayText = 'Today';
    else if (diffDays === 1) daysAwayText = 'Tomorrow';
    else daysAwayText = `In ${diffDays} days`;
  }

  const hasDoctor = Boolean(patient?.doctor)
  const hasRecoveryPlan = Boolean(patient?.plan?.trim())
  const hasMessages = conversations.length > 0

  // Combine and sort activities for the feed
  // Store iconType string — NOT JSX — to avoid the anti-pattern of storing
  // React elements in state, which bypasses reconciliation and causes stale closures
  const activities = [
    ...appointments.map(a => ({
      type: 'appointment',
      iconType: 'calendar',
      date: new Date(a.date),
      text: `Appointment booked with  ${a.doctor?.name || 'Physician'}`,
    })),
    ...history.map(h => ({
      type: 'history',
      iconType: 'file',
      date: new Date(h.date),
      text: `Medical record added: ${h.title}`,
    })),
    ...conversations.map(c => ({
      type: 'message',
      iconType: 'message',
      date: new Date(c.lastTime),
      text: `New message from ${c.contact?.name || 'Doctor'}`,
    }))
  ].sort((a, b) => b.date - a.date).slice(0, 4);

  const ActivityIcon = ({ iconType }) => {
    if (iconType === 'calendar') return <Calendar size={16} />;
    if (iconType === 'file') return <FileText size={16} />;
    return <MessageSquare size={16} />;
  };

  const getRelativeTime = (d) => {
    const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <DashboardShell>
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-[2rem] p-8 md:p-10 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2">Welcome back, {userName}!</h1>
          <p className="text-teal-50 text-lg font-medium opacity-90">{todayStr}</p>
        </div>
      </div>

      {!hasDoctor && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-teal-50 p-4 text-teal-600">
              <Stethoscope size={28} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400 font-bold">No doctor assigned yet</p>
              <h2 className="text-2xl font-black text-slate-900 mt-3">Find a specialist to get started</h2>
              <p className="text-sm text-slate-500 mt-2">Search our network of doctors and connect with the right care provider.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/find-doctors')}
            className="rounded-2xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition"
          >
            Find Doctors
          </button>
        </div>
      )}

      {/* 2. Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
            <h3 className="text-3xl font-black text-slate-900">{appointments.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Upcoming</p>
            <h3 className="text-3xl font-black text-slate-900">{upcomingAppointments.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition">
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
            <h3 className="text-3xl font-black text-slate-900">{pastAppointments.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Activity size={28} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Status</p>
            <h3 className="text-2xl font-black text-slate-900 capitalize truncate">{patient?.status || 'Active'}</h3>
          </div>
        </div>
      </div>

      {/* 3. Next Appointment Countdown Card */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 left-0 w-64 h-64 bg-teal-50/50 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex-1">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Next Appointment</h2>
          {nextAppointment ? (
            <div>
              <p className="text-2xl md:text-3xl font-black text-slate-900 mb-2">{nextAppointment.doctor?.name || 'Physician'}</p>
              <div className="flex flex-wrap items-center gap-3 text-slate-600 font-medium">
                <span className="bg-slate-100 px-3 py-1 rounded-lg">{new Date(nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="bg-slate-100 px-3 py-1 rounded-lg">{nextAppointment.time}</span>
                <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-lg">{nextAppointment.type}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
              <div className="rounded-full bg-teal-50 p-5 text-teal-600">
                <Calendar size={36} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">No upcoming appointments</p>
                <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">Book your next appointment to keep your recovery plan moving forward.</p>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 w-full md:w-auto shrink-0 flex justify-center">
          {nextAppointment ? (
            <div className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-xl shadow-xl shadow-teal-200">
              {daysAwayText}
            </div>
          ) : (
            <button onClick={() => navigate('/appointments')} className="w-full md:w-auto bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-teal-200 hover:bg-teal-700 transition active:scale-[0.98]">
              Book your first appointment
            </button>
          )}
        </div>
      </div>

      {/* 4. Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <h3 className="text-xl font-black text-slate-900 mb-8">Recent Activity</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {activities.length > 0 ? activities.map((act, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors group-hover:bg-teal-50 group-hover:text-teal-600">
                    <ActivityIcon iconType={act.iconType} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm transition-all group-hover:shadow-md group-hover:border-teal-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        act.type === 'appointment' ? 'bg-teal-100 text-teal-700' :
                        act.type === 'message' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {act.type}
                      </span>
                      <time className="text-xs font-medium text-slate-400">{getRelativeTime(act.date)}</time>
                    </div>
                    <p className="text-slate-900 font-semibold">{act.text}</p>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-center py-8 relative z-10 bg-white">No recent activity.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recovery Plan & Quick Actions */}
        <div className="space-y-8">
          {/* Recovery Plan Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                <Activity size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Recovery Plan</h3>
            </div>
            {hasRecoveryPlan ? (
              <p className="text-sm leading-relaxed mb-8 font-medium text-slate-700">
                {patient?.plan}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="rounded-full bg-slate-100 p-4 text-slate-500">
                  <Clipboard size={32} />
                </div>
                <p className="text-lg font-semibold text-slate-900">No recovery plan yet</p>
                <p className="text-sm text-slate-500 max-w-sm">
                  Your doctor will assign a recovery plan once they review your profile and goals.
                </p>
              </div>
            )}
            {hasRecoveryPlan && Number(patient?.progress) > 0 && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  <span>Overall Progress</span>
                  <span className="text-teal-600">{patient?.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full" style={{ width: `${patient?.progress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {!hasMessages && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center py-10">
                <div className="rounded-full bg-teal-50 p-4 text-teal-600">
                  <MessageCircle size={28} />
                </div>
                <p className="text-xl font-semibold text-slate-900">No messages yet</p>
                <p className="text-sm text-slate-500 max-w-md">
                  Once you connect with your doctor, messages will appear here.
                </p>
                <button
                  onClick={() => navigate('/messages')}
                  className="rounded-2xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition"
                >
                  Message Doctor
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <h3 className="text-xl font-black text-slate-900 mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button onClick={() => navigate('/appointments')} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-teal-200 hover:bg-teal-50 transition-all group">
                <div className="flex items-center gap-4 text-slate-700 group-hover:text-teal-700">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-teal-600 transition-colors">
                    <Calendar size={20} />
                  </div>
                  <span className="font-bold">Book Appointment</span>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
              </button>
              
              <button onClick={() => navigate('/messages')} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-teal-200 hover:bg-teal-50 transition-all group">
                <div className="flex items-center gap-4 text-slate-700 group-hover:text-teal-700 relative">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-teal-600 transition-colors relative">
                    <MessageSquare size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <span className="font-bold">Message Doctor</span>
                </div>
                {unreadCount > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">{unreadCount} New</span>
                ) : (
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
                )}
              </button>

              <button onClick={() => patient && navigate(`/patient-history/${patient._id}`)} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-teal-200 hover:bg-teal-50 transition-all group">
                <div className="flex items-center gap-4 text-slate-700 group-hover:text-teal-700">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-teal-600 transition-colors">
                    <FileText size={20} />
                  </div>
                  <span className="font-bold">View History</span>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <AIHealthChatbot />
      </Suspense>
    </DashboardShell>
  )
}
