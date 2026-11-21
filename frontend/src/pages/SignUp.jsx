import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api'
import { locationData, doctorCategories, doctorCategoryTranslations } from '../constants/locationData'

export default function SignUp() {
  const [formData, setFormData] = useState({ 
    name: '', email: '', password: '', confirmPassword: '', role: 'patient',
    category: '', customCategory: '', availDays: [], availStart: '', availStartPeriod: 'AM', availEnd: '', availEndPeriod: 'PM', experience: '', fees: '', bio: '',
    province: '', city: '', workNumber: '', clinicAddress: '', certifications: '', proofOfCertification: '', jazzcashNumber: '', easypaisaNumber: ''
  })
  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [proofFileName, setProofFileName] = useState('')
  const navigate = useNavigate()

  const { name, email, password, confirmPassword, role, category, customCategory, availDays, availStart, availStartPeriod, availEnd, availEndPeriod, experience, fees, bio, province, city, workNumber, clinicAddress, certifications, proofOfCertification, jazzcashNumber, easypaisaNumber } = formData
  const onChange = (e) => {
    const { name, value } = e.target
    if (name === 'province') {
      setFormData({ ...formData, province: value, city: '' })
      setErrors(prev => ({ ...prev, province: '', city: '' }))
    } else if (name === 'workNumber') {
      const numericValue = value.replace(/\D/g, '').slice(0, 11)
      setFormData({ ...formData, workNumber: numericValue })
      setErrors(prev => ({ ...prev, workNumber: '' }))
    } else if (name === 'availStart' || name === 'availEnd') {
      let val = value.replace(/[^\d:]/g, '');
      if (val.length === 2 && !val.includes(':') && (!e.nativeEvent || e.nativeEvent.inputType !== 'deleteContentBackward')) {
        if (Number(val) > 12) val = '12';
        val += ':';
      }
      if (val.includes(':')) {
        const [hours = '', minutes = ''] = val.split(':');
        const cappedHours = hours && Number(hours) > 12 ? '12' : hours;
        const cappedMinutes = minutes.length >= 2 && Number(minutes) > 59 ? '59' : minutes;
        val = `${cappedHours}:${cappedMinutes}`.slice(0, 5);
      }
      setFormData({ ...formData, [name]: val })
      setErrors(prev => ({ ...prev, [name]: '' }))
    } else if (name === 'proofOfCertification') {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, proofOfCertification: 'File must be 5 MB or smaller.' }))
        e.target.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setFormData(prev => ({ ...prev, proofOfCertification: reader.result }))
        setProofFileName(file.name)
        setErrors(prev => ({ ...prev, proofOfCertification: '' }))
      }
      reader.readAsDataURL(file)
    } else {
      setFormData({ ...formData, [name]: value })
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateEmail = (value) => {
    const re = /^\S+@\S+\.\S+$/
    return re.test(value)
  }

  const validateField = (name, value) => {
    if (!value || (typeof value === 'string' && !value.trim())) return 'This field is required.'
    if (name === 'email' && !validateEmail(value)) return 'Enter a valid email address.'
    if (name === 'password' && value.length < 8) return 'Password must be at least 8 characters.'
    if (name === 'confirmPassword' && value !== password) return 'Passwords do not match.'
    if (name === 'workNumber' && !/^[0-9]{7,11}$/.test(value)) return 'Enter a valid phone number with digits only.'
    if (name === 'customCategory' && !value.trim()) return 'Enter a specialty.'
    if (name === 'customCategory' && value.trim().length > 60) return 'Specialty must be 60 characters or fewer.'
    if ((name === 'availStart' || name === 'availEnd') && !/^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(value)) return 'Enter a valid time in HH:MM format.'
    if ((name === 'experience' || name === 'fees') && Number(value) < 0) return 'Value must be zero or greater.'
    return ''
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
  }

  const validateForm = () => {
    const newErrors = {
      name: validateField('name', name),
      email: validateField('email', email),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
      province: validateField('province', province),
      city: validateField('city', city),
    }

    if (role === 'doctor') {
      newErrors.category = validateField('category', category)
      newErrors.customCategory = category === 'Other' ? validateField('customCategory', customCategory) : ''
      newErrors.availDays = availDays.length ? '' : 'Select at least one available day.'
      newErrors.availStart = validateField('availStart', availStart)
      newErrors.availEnd = validateField('availEnd', availEnd)
      if (!newErrors.availStart && !newErrors.availEnd) {
        const toMinutes = (time, period) => {
          const [hours, minutes] = time.split(':').map(Number)
          const hour24 = (hours % 12) + (period === 'PM' ? 12 : 0)
          return hour24 * 60 + minutes
        }
        const startMins = toMinutes(availStart, availStartPeriod)
        const endMins = toMinutes(availEnd, availEndPeriod)
        if (endMins <= startMins) {
          newErrors.availEnd = 'End time must be after start time.'
        }
      }
      newErrors.experience = validateField('experience', experience)
      newErrors.fees = validateField('fees', fees)
      newErrors.bio = validateField('bio', bio)
      newErrors.workNumber = validateField('workNumber', workNumber)
      newErrors.clinicAddress = validateField('clinicAddress', clinicAddress)
      newErrors.certifications = validateField('certifications', certifications)
    }

    setErrors(newErrors)
    return Object.values(newErrors).every(err => !err)
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


  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = { name, email, password, role, province, city }
      if (role === 'doctor') {
        payload.category = (category === 'Other' ? customCategory : category).trim().replace(/\s+/g, ' ')
        payload.availability = {
          days: availDays,
          startTime: availStart,
          startPeriod: availStartPeriod,
          endTime: availEnd,
          endPeriod: availEndPeriod
        }
        payload.experience = Number(experience)
        payload.fees = Number(fees)
        payload.bio = bio
        payload.workNumber = workNumber
        payload.clinicAddress = clinicAddress
        payload.certifications = certifications
        payload.proofOfCertification = proofOfCertification
        payload.paymentDetails = {
          jazzcashNumber,
          easypaisaNumber,
        }
      }
      const res = await API.post('/auth/register', payload)

      if (res.data.token) {
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('role', res.data.role)
        localStorage.setItem('name', res.data.name)
        localStorage.setItem('userId', res.data.id)

        if (res.data.role === 'doctor') {
          navigate('/dashboard')
        } else {
          navigate('/patient-dashboard')
        }
      } else {
        setSuccess(res.data.msg || 'Registration successful. Awaiting approval.')
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md flex flex-col lg:flex-row">
 
      <main className="w-full  flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-2xl">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-slate-900 mb-3">Create an account</h2>
            <p className="text-slate-500">Enter your details to start your clinical journey.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}
            {success && <div className="text-green-700 text-sm bg-green-50 p-3 rounded-xl">{success}</div>}
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer rounded-2xl border p-4 text-center transition ${role === 'patient' ? 'border-primary bg-teal-50' : 'border-slate-200 hover:border-primary'}`}>
                  <input type="radio" name="role" value="patient" onChange={onChange} className="sr-only" checked={role === 'patient'} readOnly />
                  <span className={`material-symbols-outlined text-3xl mb-2 ${role === 'patient' ? 'text-primary' : 'text-slate-500'}`}>person</span>
                  <div className="font-semibold">Patient</div>
                </label>
                <label className={`cursor-pointer rounded-2xl border p-4 text-center transition ${role === 'doctor' ? 'border-primary bg-teal-50' : 'border-slate-200 hover:border-primary'}`}>
                  <input type="radio" name="role" value="doctor" onChange={onChange} className="sr-only" checked={role === 'doctor'} readOnly />
                  <span className={`material-symbols-outlined text-3xl mb-2 ${role === 'doctor' ? 'text-primary' : 'text-slate-500'}`}>medical_services</span>
                  <div className="font-semibold">Doctor</div>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Full Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                <input name="name" type="text" value={name} onChange={onChange} onBlur={handleBlur} placeholder="John Doe" className={`w-full h-12 pl-12 rounded-xl border ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                <input name="email" type="email" value={email} onChange={onChange} onBlur={handleBlur} placeholder="name@example.com" className={`w-full h-12 pl-12 rounded-xl border ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={onChange} 
                    onBlur={handleBlur} 
                    placeholder="••••••••" 
                    className={`w-full h-12 pl-12 pr-12 rounded-xl border ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} 
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
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Confirm</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock_reset</span>
                  <input 
                    name="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={onChange} 
                    onBlur={handleBlur} 
                    placeholder="••••••••" 
                    className={`w-full h-12 pl-12 pr-12 rounded-xl border ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none cursor-pointer"
                  >
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Province</label>
                <select name="province" value={province} onChange={onChange} onBlur={handleBlur} className={`w-full h-12 px-4 rounded-xl border ${errors.province ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`} required>
                  <option value="">Select Province</option>
                  {Object.keys(locationData).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">City</label>
                <select name="city" value={city} onChange={onChange} onBlur={handleBlur} className={`w-full h-12 px-4 rounded-xl border ${errors.city ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`} required disabled={!province}>
                  <option value="">Select City</option>
                  {province && locationData[province].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
            </div>
            
            {role === 'doctor' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Category</label>
                  <select name="category" value={category} onChange={onChange} onBlur={handleBlur} className={`w-full h-12 px-4 rounded-xl border ${errors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none bg-white`} required>
                    <option value="">Select Category</option>
                    {doctorCategories.map(cat => (
                      <option key={cat} value={cat}>{cat} - {doctorCategoryTranslations[cat]}</option>
                    ))}
                    <option value="Other">Other (please specify)</option>
                  </select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  {category === 'Other' && (
                    <>
                      <input name="customCategory" type="text" value={customCategory} onChange={onChange} onBlur={handleBlur} maxLength={60} placeholder="Enter your specialty" className={`w-full h-12 px-4 rounded-xl border ${errors.customCategory ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                      {errors.customCategory && <p className="text-red-500 text-xs mt-1">{errors.customCategory}</p>}
                    </>
                  )}
                </div>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Available Days</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            availDays.includes(day)
                              ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-primary/30'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Start Time</label>
                      <div className="flex gap-2">
                        <input name="availStart" type="text" value={availStart} onChange={onChange} onBlur={handleBlur} placeholder="HH:MM" maxLength={5} pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$" title="Time must be in HH:MM format (12-hour)" className={`w-2/3 h-12 px-4 rounded-xl border ${errors.availStart ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                        <select name="availStartPeriod" value={availStartPeriod} onChange={onChange} className="w-1/3 h-12 px-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white" required>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                      {errors.availStart && <p className="text-red-500 text-xs mt-1">{errors.availStart}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">End Time</label>
                      <div className="flex gap-2">
                        <input name="availEnd" type="text" value={availEnd} onChange={onChange} onBlur={handleBlur} placeholder="HH:MM" maxLength={5} pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$" title="Time must be in HH:MM format (12-hour)" className={`w-2/3 h-12 px-4 rounded-xl border ${errors.availEnd ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                        <select name="availEndPeriod" value={availEndPeriod} onChange={onChange} className="w-1/3 h-12 px-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white" required>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                      {errors.availEnd && <p className="text-red-500 text-xs mt-1">{errors.availEnd}</p>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Experience (Years)</label>
                    <input name="experience" type="number" min="0" value={experience} onChange={onChange} onBlur={handleBlur} placeholder="e.g., 5" className={`w-full h-12 px-4 rounded-xl border ${errors.experience ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Consultation Fee</label>
                    <input name="fees" type="number" min="0" value={fees} onChange={onChange} onBlur={handleBlur} placeholder="e.g., 1000" className={`w-full h-12 px-4 rounded-xl border ${errors.fees ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Work Number</label>
                    <input name="workNumber" type="tel" value={workNumber} onChange={onChange} onBlur={handleBlur} placeholder="e.g., 03001234567" maxLength={11} pattern="^[0-9]{11}$" title="Phone number must be exactly 11 digits" className={`w-full h-12 px-4 rounded-xl border ${errors.workNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Clinic Address</label>
                    <input name="clinicAddress" type="text" value={clinicAddress} onChange={onChange} onBlur={handleBlur} placeholder="e.g., Suite 101, Medical Center" className={`w-full h-12 px-4 rounded-xl border ${errors.clinicAddress ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Certifications</label>
                  <input name="certifications" type="text" value={certifications} onChange={onChange} onBlur={handleBlur} placeholder="e.g., MBBS, FCPS, MD" className={`w-full h-12 px-4 rounded-xl border ${errors.certifications ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none`} required />
                  {errors.certifications && <p className="text-red-500 text-xs mt-1">{errors.certifications}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Proof of Certification</label>
                  <input name="proofOfCertification" type="file" accept="image/*,.pdf" onChange={onChange} className="w-full h-12 px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none bg-white text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-teal-700" />
                  <p className="text-xs text-slate-400">Upload an image or PDF, up to 5 MB. Optional.</p>
                  {proofFileName && <p className="text-xs text-emerald-600">Selected: {proofFileName}</p>}
                  {errors.proofOfCertification && <p className="text-red-500 text-xs mt-1">{errors.proofOfCertification}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">JazzCash Number</label>
                    <input name="jazzcashNumber" type="text" value={jazzcashNumber} onChange={onChange} placeholder="03001234567" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">EasyPaisa Number</label>
                    <input name="easypaisaNumber" type="text" value={easypaisaNumber} onChange={onChange} placeholder="03111234567" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Brief Bio</label>
                  <textarea name="bio" value={bio} onChange={onChange} onBlur={handleBlur} placeholder="Tell us about your practice..." className={`w-full p-4 rounded-xl border ${errors.bio ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'} outline-none min-h-[100px]`} required />
                  {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                </div>
              </>
            )}

            <button disabled={loading} className="w-full h-12 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition disabled:opacity-60">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <Link to="/" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
