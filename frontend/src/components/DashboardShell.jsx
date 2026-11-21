import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import API from '../api'
import { io } from 'socket.io-client'
import { 
  LayoutDashboard, 
  Search, 
  Calendar, 
  MessageSquare, 
  User, 
  Activity, 
  ShieldCheck,
  LogOut,
  Menu,
  ChevronRight,
  HeartPulse,
  ArrowLeft,
  DollarSign
} from 'lucide-react'

const getNavItems = (role) => {
  const items = [
    { path: '/dashboard', label: 'Doctor Dashboard', icon: LayoutDashboard, roles: ['doctor'] },
    { path: '/patient-dashboard', label: 'Patient Dashboard', icon: LayoutDashboard, roles: ['patient'] },
    { path: '/find-doctors', label: 'Find Doctors', icon: Search, roles: ['doctor', 'patient'] },
    { path: '/appointments', label: 'Appointments', icon: Calendar, roles: ['doctor', 'patient'] },
    { path: '/doctor-revenue', label: 'Revenue', icon: DollarSign, roles: ['doctor'] },
    { path: '/messages', label: 'Messages', icon: MessageSquare, roles: ['doctor', 'patient'] },
    { path: '/profile', label: 'Profile', icon: User, roles: ['doctor', 'patient'] },
    { path: '/feedback', label: 'AI Feedback', icon: Activity, roles: ['doctor', 'patient'] },
    { path: '/admin', label: 'Admin Panel', icon: ShieldCheck, roles: ['admin'] },
    { path: '/', label: 'Website Home', icon: HeartPulse, roles: ['doctor', 'patient', 'admin'] },
  ];
  return items.filter(item => !role || item.roles.includes(role));
}

export default function DashboardShell({ title, subtitle, children, sidebarItems, activeTabId, onTabChange }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = (e) => {
    e.preventDefault()
    localStorage.clear()
    navigate('/')
  }

  const role = localStorage.getItem('role')
  const navItems = getNavItems(role)

  const [unreadCount, setUnreadCount] = useState(0)
  const [appointmentUnreadCount, setAppointmentUnreadCount] = useState(0)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!role) return

    if (location.pathname === '/messages') {
      API.patch('/messages/read-all')
        .then(() => setUnreadCount(0))
        .catch(err => console.error(err));
    } else {
      API.get('/messages/unread-count')
        .then(res => setUnreadCount(res.data.count))
        .catch(err => console.error(err));
    }

    if (role === 'doctor') {
      if (location.pathname === '/appointments') {
        API.patch('/appointments/read-all')
          .then(() => setAppointmentUnreadCount(0))
          .catch(err => console.error(err));
      } else {
        API.get('/appointments/unread-count')
          .then(res => setAppointmentUnreadCount(res.data.count))
          .catch(err => console.error(err));
      }
    }

    // Establish a Socket.io connection and register presence once per mounting
    const userId = localStorage.getItem('userId')
    if (userId && !socketRef.current) {
      // Derive socket server origin from API baseURL
      const apiBase = API.defaults?.baseURL || ''
      const socketServer = apiBase.replace(/\/api\/?$/, '') || window.location.origin
      try {
        const socket = io(socketServer, {
          transports: ['websocket', 'polling'],
          auth: { token: localStorage.getItem('token') },
        })
        socketRef.current = socket
        socket.on('connect', () => {
          socket.emit('register', userId)
          // console.log('[socket] connected and registered', socket.id)
        })
        socket.on('disconnect', () => {
          // console.log('[socket] disconnected')
        })
      } catch (err) {
        console.error('Socket.io init failed', err)
      }
    }

    return () => {
      // cleanup not removing other listeners: persistent while app mounted
      if (socketRef.current) {
        socketRef.current.off()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [role, location.pathname])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar / Drawer */}
      <aside className={`
        fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-200 z-[60]
        transition-transform duration-300 ease-in-out md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <Link to="/" className="interactive-glow p-8 block hover:opacity-80 transition-opacity rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-200">
                <HeartPulse size={24} />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">HealPath</h1>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 pl-1">Professional Care</p>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
            {sidebarItems ? (
              sidebarItems.map((item) => {
                const active = activeTabId === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (onTabChange) onTabChange(item.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`interactive-glow w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group text-left ${
                      active
                        ? 'bg-teal-600 text-white shadow-xl shadow-teal-200 font-bold'
                        : 'text-slate-500 hover:text-teal-700 hover:bg-teal-50'
                    }`}
                  >
                    <item.icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-teal-700'} />
                    <span className="text-sm">{item.label}</span>
                    {active && <ChevronRight size={16} className="ml-auto opacity-60" />}
                  </button>
                )
              })
            ) : (
              navItems.map((item) => {
                const active = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`interactive-glow flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                      active
                        ? 'bg-teal-600 text-white shadow-xl shadow-teal-200 font-bold'
                        : 'text-slate-500 hover:text-teal-700 hover:bg-teal-50'
                    }`}
                  >
                    <item.icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-teal-700'} />
                    <span className="text-sm">{item.label}</span>
                    {item.path === '/messages' && unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                    {item.path === '/appointments' && appointmentUnreadCount > 0 && (
                      <span className="ml-auto bg-teal-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        {appointmentUnreadCount}
                      </span>
                    )}
                    {active && item.path !== '/messages' && <ChevronRight size={16} className="ml-auto opacity-60" />}
                  </Link>
                )
              })
            )}
          </nav>

          {/* Bottom Actions */}
          <div className="p-6 border-t border-slate-100 space-y-4">
            {sidebarItems && (
              <Link
                to="/"
                className="interactive-glow w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all font-bold text-sm"
              >
                <ArrowLeft size={20} />
                Exit Admin Panel
              </Link>
            )}
            <button 
              onClick={handleSignOut}
              className="interactive-glow w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:ml-72 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="interactive-glow p-2.5 rounded-xl bg-slate-50 text-slate-600 md:hidden hover:bg-slate-100 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Systems Operational
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div ref={userMenuRef} className="relative">
              <button onClick={() => setIsUserMenuOpen(v => !v)} className="interactive-glow flex items-center gap-2 sm:gap-3 bg-slate-50 p-1.5 pr-3 sm:pr-4 rounded-2xl border border-slate-100 transition-all hover:border-primary/30 focus:outline-none min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold shrink-0">
                  {localStorage.getItem('name')?.[0] || 'U'}
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-wider truncate max-w-[110px]">{localStorage.getItem('name') || 'User'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{role || 'Member'}</p>
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-lg shadow-lg z-50 overflow-hidden">
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <User size={16} />
                    Profile
                  </Link>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
          {(title || subtitle) && (
            <div className="mb-6 sm:mb-8 md:mb-10">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight break-words">{title}</h1>
              {subtitle && <p className="text-slate-500 mt-2 font-medium text-base sm:text-lg">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
