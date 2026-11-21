import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api'

export default function SignIn() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const { email, password } = formData
  const onChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateField = (name, value) => {
    if (!value.trim()) return 'This field is required.'
    if (name === 'email') {
      const re = /^\S+@\S+\.\S+$/
      if (!re.test(value)) return 'Enter a valid email address.'
    }
    return ''
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
  }

  const validateForm = () => {
    const newErrors = {
      email: validateField('email', email),
      password: validateField('password', password),
    }
    setErrors(newErrors)
    return !newErrors.email && !newErrors.password
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setError('')
    try {
      const res = await API.post('/auth/login', { email, password })
      // Save token AND user info
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      localStorage.setItem('userId', res.data.id)

      // Redirect based on role
      if (res.data.role === 'doctor') {
        navigate('/dashboard')
      } else if (res.data.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/patient-dashboard')
      }
    } catch (err) {
      const serverMsg = err.response?.data?.msg;
      const fallback = err.message || 'Login failed';
      setError(serverMsg || fallback);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md flex flex-col md:flex-row medical-mesh">
      <section className="hidden  relative overflow-hidden items-center justify-center p-10">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs uppercase tracking-[0.15em] mb-6">
            <span className="material-symbols-outlined text-base">verified_user</span>
            Clinical Grade Intelligence
          </span>
          <h1 className="text-5xl font-bold text-primary leading-tight mb-5">Empowering Recovery Through Precision.</h1>
          <p className="text-lg text-slate-700 max-w-xl">HealPath combines advanced analytics with empathetic care to streamline patient recovery journeys for modern clinics.</p>
          <div className="grid grid-cols-2 gap-4 mt-10">
            <div className="p-5 rounded-3xl bg-white/80 border border-slate-200 shadow-sm">
              <span className="material-symbols-outlined text-primary text-3xl mb-3">monitoring</span>
              <h3 className="font-semibold text-slate-900">Smart Analytics</h3>
              <p className="text-sm text-slate-500 mt-1">Real-time progress tracking for every patient.</p>
            </div>
            <div className="p-5 rounded-3xl bg-white/80 border border-slate-200 shadow-sm">
              <span className="material-symbols-outlined text-secondary text-3xl mb-3">fitness_center</span>
              <h3 className="font-semibold text-slate-900">Dynamic Exercises</h3>
              <p className="text-sm text-slate-500 mt-1">AI-driven routines adapted to recovery speed.</p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white/40 backdrop-blur-sm md:bg-transparent">
        <div className="w-full max-w-xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500">Please enter your credentials to access the Clinical Portal.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-5 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                <input id="email" name="email" type="email" value={email} onChange={onChange} onBlur={handleBlur} placeholder="doctor@healpath.com" className={`w-full h-12 pl-12 pr-4 rounded-xl border ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                <input 
                  id="password" 
                  name="password" 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={onChange} 
                  onBlur={handleBlur} 
                  placeholder="••••••••" 
                  className={`w-full h-12 pl-12 pr-12 rounded-xl border ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none cursor-pointer"
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-primary font-medium">Forgot password?</Link>
            </div>
            <button disabled={loading} className="w-full h-12 rounded-xl bg-teal-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-teal-700 transition disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign In'} <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
          <div className="mt-8 text-center text-sm text-slate-500">
            New to the platform? <Link to="/sign-up" className="text-primary font-medium hover:underline">Create an account</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
