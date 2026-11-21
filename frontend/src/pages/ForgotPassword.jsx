import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import API from '../api'

export default function ForgotPassword() {
  const { token: routeToken } = useParams()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(routeToken ? 2 : 1) // 1: Email, 2: Token + New Password
  const [token, setToken] = useState(routeToken || '')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleRequestToken = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await API.post('/auth/forgot-password', { email })
      setMessage('A reset token has been sent to your email.')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (routeToken) {
      setToken(routeToken)
      setStep(2)
    }
  }, [routeToken])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const resetToken = routeToken || token
      await API.post(`/auth/reset-password/${resetToken}`, { newPassword })
      setMessage('Password reset successfully! Redirecting to login...')
      setTimeout(() => navigate('/sign-in'), 2000)
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid token or request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <Link to="/" className="inline-flex h-16 w-16 items-center justify-center rounded-[2rem] bg-teal-600 text-white shadow-xl shadow-teal-200 mb-6">
            <span className="material-symbols-outlined text-3xl">health_and_safety</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reset Password</h1>
          <p className="mt-2 text-slate-500 font-medium">
            {step === 1 
              ? "Enter your email to receive a secure reset token." 
              : "Enter the token sent to your email and your new password."}
          </p>
        </div>

        <div className="rounded-[2.5rem] bg-white p-8 md:p-10 border border-slate-200 shadow-2xl shadow-teal-900/5">
          {message && <div className="mb-6 p-4 bg-teal-50 border border-teal-100 text-teal-700 text-sm font-bold rounded-2xl animate-fade-in">{message}</div>}
          {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-2xl animate-fade-in">{error}</div>}

          {step === 1 ? (
            <form onSubmit={handleRequestToken} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black ml-1">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@clinic.com" 
                    className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" 
                    required 
                  />
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-teal-600 text-white font-black text-lg hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-200 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Token'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {!routeToken && (
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black ml-1">Reset Token</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">key</span>
                    <input 
                      type="text" 
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter the token sent to your email" 
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" 
                      required 
                    />
                  </div>
                </div>
              )}
              {routeToken && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                  Reset token loaded from your password reset link.
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black ml-1">New Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full h-14 pl-12 pr-12 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none cursor-pointer"
                  >
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-teal-600 text-white font-black text-lg hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-200 transition-all disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link to="/sign-in" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-teal-700 transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
