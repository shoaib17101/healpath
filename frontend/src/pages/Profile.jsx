import { useState, useEffect } from 'react'
import DashboardShell from '../components/DashboardShell'
import API from '../api'
import { locationData, doctorCategories, doctorCategoryTranslations } from '../constants/locationData'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Profile() {
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({ 
    name: '', email: '', 
    category: '', customCategory: '', experience: '', fees: '', bio: '', profilePic: '',
    availDays: [], availStart: '', availStartPeriod: 'AM', availEnd: '', availEndPeriod: 'PM',
    province: '', city: '', workNumber: '', clinicAddress: '', certifications: '', jazzcashNumber: '', easypaisaNumber: ''
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // Password update states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwdFormData, setPwdFormData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [pwdErrors, setPwdErrors] = useState({})
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')
    
    // validate
    const errors = {}
    if (!pwdFormData.currentPassword) errors.currentPassword = 'Current password is required.'
    if (!pwdFormData.newPassword) {
      errors.newPassword = 'New password is required.'
    } else if (pwdFormData.newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.'
    }
    if (pwdFormData.newPassword !== pwdFormData.confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match.'
    }

    if (Object.keys(errors).length > 0) {
      setPwdErrors(errors)
      return
    }

    setPwdSaving(true)
    try {
      const res = await API.put('/auth/change-password', {
        currentPassword: pwdFormData.currentPassword,
        newPassword: pwdFormData.newPassword
      })
      setPwdSuccess(res.data.msg || 'Password updated successfully!')
      setPwdFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setPwdErrors({})
      setTimeout(() => {
        setShowPasswordModal(false)
        setPwdSuccess('')
      }, 2000)
    } catch (err) {
      console.error(err)
      setPwdError(err.response?.data?.msg || 'Failed to update password')
    } finally {
      setPwdSaving(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await API.get('/auth/me')
      setUser(res.data)
      const avail = res.data.availability || {}
      const normalizedDays = (Array.isArray(avail.days) ? avail.days : []).map(d => {
        const dayMap = {
          'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday',
          'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'
        }
        return dayMap[d] || d
      })
      
      setFormData({ 
        name: res.data.name || '', 
        email: res.data.email || '',
        category: doctorCategories.includes(res.data.category) ? res.data.category : (res.data.category ? 'Other' : ''),
        customCategory: doctorCategories.includes(res.data.category) ? '' : (res.data.category || ''),
        experience: res.data.experience || '',
        fees: res.data.fees || '',
        bio: res.data.bio || '',
        profilePic: res.data.profilePic || '',
        availDays:  normalizedDays,
        availStart: avail.startTime || '',
        availStartPeriod: avail.startPeriod || 'AM',
        availEnd:   avail.endTime   || '',
        availEndPeriod: avail.endPeriod || 'PM',
        province: res.data.province || '',
        city: res.data.city || '',
        workNumber: res.data.workNumber || '',
        clinicAddress: res.data.clinicAddress || '',
        certifications: res.data.certifications || '',
        jazzcashNumber: res.data.paymentDetails?.jazzcashNumber || '',
        easypaisaNumber: res.data.paymentDetails?.easypaisaNumber || '',
      })
    } catch (err) {
      console.error(err)
    }
  }

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      availDays: prev.availDays.includes(day)
        ? prev.availDays.filter(d => d !== day)
        : [...prev.availDays, day]
    }))
    setErrors(prev => ({ ...prev, availDays: '' }))
  }

  const validateEmail = (value) => {
    return /^\S+@\S+\.\S+$/.test(value)
  }

  const validateField = (name, value) => {
    if (!value || (typeof value === 'string' && !value.trim())) return 'This field is required.'
    if (name === 'email' && !validateEmail(value)) return 'Enter a valid email address.'
    if (name === 'customCategory' && !value.trim()) return 'Enter a specialty.'
    if (name === 'customCategory' && value.trim().length > 60) return 'Specialty must be 60 characters or fewer.'
    if (name === 'workNumber' && !/^[0-9]+$/.test(value)) return 'Phone number must contain digits only.'
    if (name === 'experience' && Number(value) < 0) return 'Experience must be zero or greater.'
    if (name === 'fees' && Number(value) < 0) return 'Fees must be zero or greater.'
    return ''
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
  }

  const validateForm = () => {
    const newErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      province: validateField('province', formData.province),
      city: validateField('city', formData.city),
    }

    if (user?.role === 'doctor') {
      newErrors.category = validateField('category', formData.category)
      newErrors.customCategory = formData.category === 'Other' ? validateField('customCategory', formData.customCategory) : ''
      newErrors.experience = validateField('experience', formData.experience)
      newErrors.fees = validateField('fees', formData.fees)
      newErrors.bio = validateField('bio', formData.bio)
      newErrors.workNumber = validateField('workNumber', formData.workNumber)
      newErrors.clinicAddress = validateField('clinicAddress', formData.clinicAddress)
      newErrors.certifications = validateField('certifications', formData.certifications)
      newErrors.availDays = formData.availDays.length ? '' : 'Select at least one available day.'
      newErrors.availStart = validateField('availStart', formData.availStart)
      newErrors.availEnd = validateField('availEnd', formData.availEnd)
      if (!newErrors.availStart && !newErrors.availEnd) {
        const [startH, startM] = formData.availStart.split(':').map(Number)
        const [endH, endM] = formData.availEnd.split(':').map(Number)
        if (startH * 60 + startM >= endH * 60 + endM) {
          newErrors.availEnd = 'End time must be after start time.'
        }
      }
    }

    setErrors(newErrors)
    return Object.values(newErrors).every(msg => !msg)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      setSaving(false)
      return
    }
    setSaving(true)
    try {
      const payload = { ...formData }
      if (user.role === 'doctor') {
        payload.category = (formData.category === 'Other' ? formData.customCategory : formData.category).trim().replace(/\s+/g, ' ')
        payload.availability = {
          days:      formData.availDays,
          startTime: formData.availStart,
          startPeriod: formData.availStartPeriod,
          endTime:   formData.availEnd,
          endPeriod: formData.availEndPeriod,
        }
      }
      delete payload.availDays
      delete payload.availStart
      delete payload.availStartPeriod
      delete payload.availEnd
      delete payload.availEndPeriod

      if (user.role === 'doctor') {
        payload.paymentDetails = {
          jazzcashNumber: formData.jazzcashNumber || '',
          easypaisaNumber: formData.easypaisaNumber || '',
        }
      }

      const res = await API.put('/auth/me', payload)
      setUser(res.data)
      localStorage.setItem('name', res.data.name)
      setEditing(false)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to update profile: ' + (err.response?.data?.msg || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setFormData({ ...formData, profilePic: reader.result })
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    const avail = user.availability || {}
    const normalizedDays = (Array.isArray(avail.days) ? avail.days : []).map(d => {
      const dayMap = {
        'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday',
        'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'
      }
      return dayMap[d] || d
    })

    setFormData({
      name: user.name, email: user.email,
      category: user.category || '',
      experience: user.experience || '', fees: user.fees || '', bio: user.bio || '',
      profilePic: user.profilePic || '',
      availDays:  normalizedDays,
      availStart: avail.startTime || '',
      availStartPeriod: avail.startPeriod || 'AM',
      availEnd:   avail.endTime   || '',
      availEndPeriod: avail.endPeriod || 'PM',
      province: user.province || '',
      city: user.city || '',
      workNumber: user.workNumber || '',
      clinicAddress: user.clinicAddress || '',
      certifications: user.certifications || '',
      jazzcashNumber: user.paymentDetails?.jazzcashNumber || '',
      easypaisaNumber: user.paymentDetails?.easypaisaNumber || '',
    })
    setEditing(false)
  }

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/'
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to completely delete your account? This action cannot be undone.')) return
    try {
      await API.delete('/auth/me')
      localStorage.clear()
      window.location.href = '/'
    } catch (err) {
      console.error(err)
      alert('Failed to delete account: ' + (err.response?.data?.msg || err.message))
    }
  }

  if (!user) return (
    <DashboardShell title="Profile" subtitle="Loading your profile...">
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    </DashboardShell>
  )

  const avail = user.availability || {}

  return (
    <DashboardShell title="User Profile" subtitle="Manage your personal information and account preferences.">
      <div className="space-y-8">
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl">{success}</div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">{user.name}</h1>
            <p className="mt-2 text-base text-slate-500 capitalize">{user.role} • Member since {new Date(user.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
            {user.role}
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="rounded-[2rem] bg-white/90 border border-white/70 shadow-sm backdrop-blur-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Personal Information</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition">
                  <span className="material-symbols-outlined">edit</span>
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onBlur={handleBlur}
                    className={`w-full h-12 px-4 rounded-xl border ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} onBlur={handleBlur}
                    className={`w-full h-12 px-4 rounded-xl border ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Province</label>
                    <select name="province" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value, city: ''})} onBlur={handleBlur}
                      className={`w-full h-12 px-4 rounded-xl border ${errors.province ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`} required>
                      <option value="">Select Province</option>
                      {Object.keys(locationData).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">City</label>
                    <select name="city" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} onBlur={handleBlur}
                      className={`w-full h-12 px-4 rounded-xl border ${errors.city ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`} required disabled={!formData.province}>
                      <option value="">Select City</option>
                      {formData.province && locationData[formData.province].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                </div>
                
                {user.role === 'doctor' && (
                  <>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Category</label>
                      <select name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} onBlur={handleBlur}
                        className={`w-full h-12 px-4 rounded-xl border ${errors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`}>
                        <option value="">Select Category</option>
                        {doctorCategories.map(cat => (
                          <option key={cat} value={cat}>{cat} - {doctorCategoryTranslations[cat]}</option>
                        ))}
                        <option value="Other">Other (please specify)</option>
                      </select>
                      {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                      {formData.category === 'Other' && (
                        <>
                          <input name="customCategory" type="text" value={formData.customCategory} onChange={e => setFormData({...formData, customCategory: e.target.value})} onBlur={handleBlur} maxLength={60} placeholder="Enter your specialty" className={`w-full h-12 px-4 rounded-xl border ${errors.customCategory ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                          {errors.customCategory && <p className="text-red-500 text-xs mt-1">{errors.customCategory}</p>}
                        </>
                      )}
                    </div>

                    {/* ── Availability ── */}
                    <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 space-y-5">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600">event_available</span>
                        Availability Schedule
                      </h3>

                      <div>
                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-3">Available Days</label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map(day => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                formData.availDays.includes(day)
                                  ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                        {errors.availDays && <p className="text-red-500 text-xs mt-1">{errors.availDays}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Start Time</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="HH:MM"
                              maxLength={5}
                              pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                              title="Time must be in HH:MM format (12-hour)"
                              value={formData.availStart}
                              onChange={e => {
                                let val = e.target.value.replace(/[^\d:]/g, '');
                                if (val.length === 2 && !val.includes(':') && (!e.nativeEvent || e.nativeEvent.inputType !== 'deleteContentBackward')) {
                                  val += ':';
                                }
                                setFormData({...formData, availStart: val})
                              }}
                              onBlur={handleBlur}
                              className={`w-2/3 h-12 px-4 rounded-xl border ${errors.availStart ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`}
                            />
                            <select
                              value={formData.availStartPeriod}
                              onChange={e => setFormData({...formData, availStartPeriod: e.target.value})}
                              className="w-1/3 h-12 px-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          {errors.availStart && <p className="text-red-500 text-xs mt-1">{errors.availStart}</p>}
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">End Time</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="HH:MM"
                              maxLength={5}
                              pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                              title="Time must be in HH:MM format (12-hour)"
                              value={formData.availEnd}
                              onChange={e => {
                                let val = e.target.value.replace(/[^\d:]/g, '');
                                if (val.length === 2 && !val.includes(':') && (!e.nativeEvent || e.nativeEvent.inputType !== 'deleteContentBackward')) {
                                  val += ':';
                                }
                                setFormData({...formData, availEnd: val})
                              }}
                              onBlur={handleBlur}
                              className={`w-2/3 h-12 px-4 rounded-xl border ${errors.availEnd ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`}
                            />
                            <select
                              value={formData.availEndPeriod}
                              onChange={e => setFormData({...formData, availEndPeriod: e.target.value})}
                              className="w-1/3 h-12 px-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          {errors.availEnd && <p className="text-red-500 text-xs mt-1">{errors.availEnd}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Work Number</label>
                        <input 
                          type="tel" 
                          name="workNumber"
                          value={formData.workNumber} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                            setFormData({...formData, workNumber: val})
                          }}
                          onBlur={handleBlur}
                          placeholder="e.g., 03001234567"
                          maxLength={11}
                          pattern="^[0-9]{11}$"
                          title="Phone number must be exactly 11 digits"
                          className={`w-full h-12 px-4 rounded-xl border ${errors.workNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} 
                        />
                        {errors.workNumber && <p className="text-red-500 text-xs mt-1">{errors.workNumber}</p>}
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Clinic Address</label>
                        <input type="text" name="clinicAddress" value={formData.clinicAddress} onChange={e => setFormData({...formData, clinicAddress: e.target.value})} onBlur={handleBlur}
                          className={`w-full h-12 px-4 rounded-xl border ${errors.clinicAddress ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} />
                        {errors.clinicAddress && <p className="text-red-500 text-xs mt-1">{errors.clinicAddress}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Certifications</label>
                      <input type="text" name="certifications" value={formData.certifications} onChange={e => setFormData({...formData, certifications: e.target.value})} onBlur={handleBlur}
                        className={`w-full h-12 px-4 rounded-xl border ${errors.certifications ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} placeholder="e.g., MBBS, FCPS, MD" />
                      {errors.certifications && <p className="text-red-500 text-xs mt-1">{errors.certifications}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">JazzCash Number</label>
                        <input type="text" value={formData.jazzcashNumber} onChange={e => setFormData({...formData, jazzcashNumber: e.target.value})}
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="03001234567" />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">EasyPaisa Number</label>
                        <input type="text" value={formData.easypaisaNumber} onChange={e => setFormData({...formData, easypaisaNumber: e.target.value})}
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="03111234567" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Experience (Years)</label>
                        <input type="number" name="experience" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} onBlur={handleBlur}
                          className={`w-full h-12 px-4 rounded-xl border ${errors.experience ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} />
                        {errors.experience && <p className="text-red-500 text-xs mt-1">{errors.experience}</p>}
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Consultation Fee</label>
                        <input type="number" name="fees" value={formData.fees} onChange={e => setFormData({...formData, fees: e.target.value})} onBlur={handleBlur}
                          className={`w-full h-12 px-4 rounded-xl border ${errors.fees ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} />
                        {errors.fees && <p className="text-red-500 text-xs mt-1">{errors.fees}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Brief Bio</label>
                      <textarea name="bio" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} onBlur={handleBlur}
                        className={`w-full p-4 rounded-xl border ${errors.bio ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none min-h-[100px]`} />
                      {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400 block mb-2">Profile Picture</label>
                      <div className="flex items-center gap-4">
                        {formData.profilePic && <img src={formData.profilePic} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-slate-200" />}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition cursor-pointer" />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={saving} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={resetForm} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Full Name</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{user.name}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Email Address</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Location</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{user.city}, {user.province}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Role</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Member Since</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{new Date(user.date).toLocaleDateString()}</p>
                </div>
                
                {user.role === 'doctor' && (
                  <>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Category</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{user.category ? `${user.category}${doctorCategoryTranslations[user.category] ? ` - ${doctorCategoryTranslations[user.category]}` : ''}` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Experience</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{user.experience ? `${user.experience} Years` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Consultation Fee</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{user.fees ? `PKR ${user.fees}` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Work Number</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{user.workNumber || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Clinic Address</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{user.clinicAddress || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Certifications</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{user.certifications || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">JazzCash</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{user.paymentDetails?.jazzcashNumber || 'N/A'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">EasyPaisa</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{user.paymentDetails?.easypaisaNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 rounded-2xl bg-teal-50 border border-teal-100 p-5">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-teal-500 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">event_available</span>
                        Availability Schedule
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Array.isArray(avail.days) && avail.days.length > 0 ? (
                          avail.days.map(d => (
                            <span key={d} className="px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">{d}</span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-sm">No days set</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {avail.startTime && avail.endTime ? `${avail.startTime} ${avail.startPeriod || 'AM'} – ${avail.endTime} ${avail.endPeriod || 'PM'}` : 'No hours set'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Brief Bio</p>
                      <p className="mt-2 text-base text-slate-700 whitespace-pre-wrap">{user.bio || 'No bio provided.'}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] bg-teal-700 text-white p-8 shadow-md">
            <h3 className="text-2xl font-semibold text-white mb-6">Account</h3>
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/10 p-4 border border-white/20">
                <p className="text-sm text-white/80 mb-1">Account Type</p>
                <p className="font-bold text-white capitalize text-lg">{user.role}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 border border-white/20">
                <p className="text-sm text-white/80 mb-1">Status</p>
                <p className="font-bold text-white">Active ✓</p>
              </div>
              <button onClick={handleLogout} className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/20 transition flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">logout</span>
                Sign Out
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] bg-white/90 border border-white/70 p-8 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">manage_accounts</span>
              Account Settings
            </h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="font-semibold text-slate-900">Push Notifications</p>
                <p className="text-sm text-slate-500">Reminders for exercises and appointments</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-teal-600 peer-focus:ring-2 peer-focus:ring-teal-200"></div>
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5"></div>
              </label>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="font-semibold text-slate-900">Password &amp; Security</p>
                <p className="text-sm text-slate-500">Keep your account secure</p>
              </div>
              <button 
                onClick={() => setShowPasswordModal(true)} 
                className="text-primary font-semibold text-sm hover:underline"
              >
                Update
              </button>
            </div>
            <div className="pt-2 space-y-4">
              <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
                <span className="material-symbols-outlined">logout</span>
                Sign Out of Account
              </button>
              <div className="border-t border-red-100 pt-4 mt-2">
                <button onClick={handleDeleteAccount} className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-700 transition">
                  <span className="material-symbols-outlined">delete_forever</span>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Update Password</h2>
                <p className="text-teal-100 text-sm mt-0.5">Keep your clinical account secure</p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPwdFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                  setPwdErrors({});
                  setPwdError('');
                  setPwdSuccess('');
                }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Form content */}
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              {pwdSuccess && <div className="p-3 bg-green-50 border border-green-100 text-green-700 text-sm font-bold rounded-xl">{pwdSuccess}</div>}
              {pwdError && <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-xl">{pwdError}</div>}

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold ml-1">Current Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={pwdFormData.currentPassword}
                    onChange={e => {
                      setPwdFormData({ ...pwdFormData, currentPassword: e.target.value });
                      setPwdErrors({ ...pwdErrors, currentPassword: '' });
                    }}
                    placeholder="••••••••"
                    className={`w-full h-12 pl-12 pr-12 rounded-xl border ${pwdErrors.currentPassword ? 'border-red-500' : 'border-slate-200'} outline-none focus:border-primary focus:ring-2 focus:ring-primary/20`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none cursor-pointer"
                  >
                    {showCurrentPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
                {pwdErrors.currentPassword && <p className="text-red-500 text-xs mt-0.5 ml-1">{pwdErrors.currentPassword}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold ml-1">New Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock_open</span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={pwdFormData.newPassword}
                    onChange={e => {
                      setPwdFormData({ ...pwdFormData, newPassword: e.target.value });
                      setPwdErrors({ ...pwdErrors, newPassword: '' });
                    }}
                    placeholder="••••••••"
                    className={`w-full h-12 pl-12 pr-12 rounded-xl border ${pwdErrors.newPassword ? 'border-red-500' : 'border-slate-200'} outline-none focus:border-primary focus:ring-2 focus:ring-primary/20`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none cursor-pointer"
                  >
                    {showNewPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
                {pwdErrors.newPassword && <p className="text-red-500 text-xs mt-0.5 ml-1">{pwdErrors.newPassword}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold ml-1">Confirm New Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock_reset</span>
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    value={pwdFormData.confirmNewPassword}
                    onChange={e => {
                      setPwdFormData({ ...pwdFormData, confirmNewPassword: e.target.value });
                      setPwdErrors({ ...pwdErrors, confirmNewPassword: '' });
                    }}
                    placeholder="••••••••"
                    className={`w-full h-12 pl-12 pr-12 rounded-xl border ${pwdErrors.confirmNewPassword ? 'border-red-500' : 'border-slate-200'} outline-none focus:border-primary focus:ring-2 focus:ring-primary/20`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none cursor-pointer"
                  >
                    {showConfirmNewPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
                {pwdErrors.confirmNewPassword && <p className="text-red-500 text-xs mt-0.5 ml-1">{pwdErrors.confirmNewPassword}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="flex-1 h-12 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {pwdSaving ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPwdFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                    setPwdErrors({});
                    setPwdError('');
                    setPwdSuccess('');
                  }}
                  className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
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
