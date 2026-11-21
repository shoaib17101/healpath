import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import { Star, User, Calendar, Clock, CheckCircle2, MapPin, Phone, Home, CreditCard } from 'lucide-react';
import { doctorCategoryTranslations } from '../constants/locationData';

export default function DoctorProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const [authRole, setAuthRole] = useState(role);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rating, setRating] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('JazzCash');
  const [transactionId, setTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [submittedBooking, setSubmittedBooking] = useState(null);

  const openAuthWindow = () => {
    const authWindow = window.open(
      '/sign-in?from=booking',
      'healpath-auth',
      'width=520,height=760,resizable=yes,scrollbars=yes'
    );

    if (!authWindow) {
      toast.error('Please allow pop-ups to continue with booking.');
      return;
    }

    const checkAuthentication = window.setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        setAuthRole(localStorage.getItem('role'));
        window.clearInterval(checkAuthentication);
        if (!authWindow.closed) authWindow.close();
        toast.success('You are signed in. Click Confirm Session to continue.');
      } else if (authWindow.closed) {
        window.clearInterval(checkAuthentication);
      }
    }, 500);
  };

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  useEffect(() => {
    if (!submittedBooking?._id || submittedBooking.status !== 'pending') return;

    let active = true;
    const refreshBookingStatus = async () => {
      try {
        const res = await API.get('/appointments');
        const appointment = res.data.find((item) => item._id === submittedBooking._id);
        if (active && appointment) {
          setSubmittedBooking((current) => current?._id === appointment._id
            ? { ...current, status: appointment.status, paymentRequired: appointment.paymentRequired }
            : current);
        }
      } catch (err) {
        console.error('Failed to refresh appointment status:', err);
      }
    };

    refreshBookingStatus();
    const interval = window.setInterval(refreshBookingStatus, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [submittedBooking?._id, submittedBooking?.status]);

  const fetchDoctor = async () => {
    try {
      const res = await API.get(`/doctors/${id}`);
      setDoctor(res.data);
    } catch (err) {
      console.error(err);
      navigate('/find-doctors');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (start, end) => {
    if (!start || !end) return ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    
    const parseTime = (timeStr) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
      if (!match) return "00:00";
      let [ , hours, minutes, period ] = match;
      hours = parseInt(hours, 10);
      if (period && period.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (period && period.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    };

    const slots = [];
    const parsedStart = parseTime(start);
    const parsedEnd = parseTime(end);
    let current = new Date(`2000-01-01T${parsedStart}:00`);
    const stop = new Date(`2000-01-01T${parsedEnd}:00`);
    
    if (isNaN(current.getTime()) || isNaN(stop.getTime())) {
      return ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    }

    while (current <= stop) {
      const timeStr = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const formattedTime = timeStr.replace(/^(\d):/, '0$1:');
      slots.push(formattedTime);
      current.setMinutes(current.getMinutes() + 30); // 30 min slots
    }
    return slots;
  };

  const availableSlots = doctor?.availability && typeof doctor.availability === 'object' 
    ? generateTimeSlots(
        doctor.availability.startTime ? `${doctor.availability.startTime} ${doctor.availability.startPeriod || 'AM'}` : null, 
        doctor.availability.endTime ? `${doctor.availability.endTime} ${doctor.availability.endPeriod || 'PM'}` : null
      )
    : ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

  const handleBook = async (e) => {
    e.preventDefault();
    
    if (!date || !time) {
      toast.error('Please pick a date and time.');
      return;
    }

    if (!localStorage.getItem('token')) {
      openAuthWindow();
      return;
    }

    if (doctor.availability && typeof doctor.availability === 'object' && doctor.availability.days) {
      const avail = doctor.availability;
      if (avail.days.length > 0) {
        const selectedDate = new Date(date + 'T00:00:00');
        const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = DAY_NAMES[selectedDate.getDay()];
        
        // Normalize days for comparison (handle both full names and abbreviations)
        const isAvailable = avail.days.some(d => {
          const storedDay = d.toLowerCase();
          const targetDay = dayName.toLowerCase();
          const targetShort = dayName.slice(0, 3).toLowerCase();
          // Check if stored day matches target full name, target short name, or if target short name is part of the stored string (e.g. "Mon-Fri")
          return storedDay === targetDay || storedDay === targetShort || storedDay.includes(targetShort);
        });
        
        if (!isAvailable) {
          alert(`This doctor is only available on: ${avail.days.join(', ')}`);
          return;
        }
      } else {
        alert('This doctor has not set their availability yet.');
        return;
      }
    } else if (typeof doctor.availability === 'string') {
      const [daysStr] = doctor.availability.split('|');
      if (daysStr) {
        const selectedDate = new Date(date);
        const dayIndex = selectedDate.getDay();
        const daysMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
        const daysList = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const str = daysStr.toLowerCase();
        
        let isAvailable = false;
        
        if (str.includes('everyday') || str.includes('daily')) isAvailable = true;
        else if (str.includes('weekday') && dayIndex >= 1 && dayIndex <= 5) isAvailable = true;
        else if (str.includes('weekend') && (dayIndex === 0 || dayIndex === 6)) isAvailable = true;
        else {
          const rangeMatch = str.match(/(sun|mon|tue|wed|thu|fri|sat)\s*(?:-|to)\s*(sun|mon|tue|wed|thu|fri|sat)/);
          if (rangeMatch) {
            const start = daysMap[rangeMatch[1]];
            let end = daysMap[rangeMatch[2]];
            if (end < start) end += 7;
            let current = dayIndex;
            if (current < start && end >= 7) current += 7;
            if (current >= start && current <= end) isAvailable = true;
          }
          if (str.includes(daysList[dayIndex])) isAvailable = true;
          
          if (!isAvailable) {
            const hasAnyDay = daysList.some(d => str.includes(d));
            if (!hasAnyDay && !rangeMatch) isAvailable = true; // Unrecognized format, be lenient
          }
        }
        
        if (!isAvailable) {
          alert(`This doctor is only available on: ${daysStr.trim()}`);
          return;
        }
      } else {
        alert('This doctor has not set their availability yet.');
        return;
      }
    } else {
      alert('This doctor has not set their availability yet.');
      return;
    }

    setBooking(true);
    try {
      const res = await API.post('/appointments', {
        doctor: doctor._id,
        appointmentDate: date,
        time,
        type: 'General Consultation',
        description: 'Booked from profile',
      });

      if (res?.data?._id) {
        setSubmittedBooking(res.data);
      }

      toast.success('Appointment request sent. Payment will be available after the doctor confirms.');
      setDate('');
      setTime('');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.msg || err.response?.data || err.message || 'Failed to book appointment';
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  };

  const submitPaymentProof = async (e) => {
    e.preventDefault();
    if (!submittedBooking?._id) {
      toast.error('No appointment request selected.');
      return;
    }
    if (!transactionId.trim() || !paymentProof.trim()) {
      toast.error('Please provide a transaction ID and a payment proof screenshot link or note.');
      return;
    }

    try {
      const res = await API.patch(`/appointments/${submittedBooking._id}/payment-proof`, {
        paymentMethod,
        transactionId,
        paymentProof,
      });
      toast.success('Payment proof submitted. The doctor and admin have been notified.');
      setTransactionId('');
      setPaymentProof('');
      setSubmittedBooking(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || 'Failed to submit payment proof');
    }
  };

  const handleRate = async () => {
    setRatingLoading(true);
    try {
      await API.post(`/doctors/${id}/rate`, { rating });
      toast.success('Rating submitted!');
      fetchDoctor(); // Refresh ratings
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit rating.');
    } finally {
      setRatingLoading(false);
    }
  };

  // Early returns: show loading or not-found before rendering content
  if (loading) {
    if (role) {
      return (
        <DashboardShell title="Doctor Profile" subtitle="Loading...">
          <div className="flex items-center justify-center h-64">Loading...</div>
        </DashboardShell>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Doctor Profile</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Loading...</p>
          </div>
          <div className="flex items-center justify-center h-64">Loading...</div>
        </main>
      </div>
    )
  }

  if (!doctor) {
    if (role) {
      return (
        <DashboardShell title="Doctor Profile" subtitle="Not found">
          <div className="flex items-center justify-center h-64">Doctor not found.</div>
        </DashboardShell>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Doctor not found</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">The requested doctor could not be found.</p>
          </div>
          <div className="flex items-center justify-center h-64">Doctor not found.</div>
        </main>
      </div>
    )
  }

  // Build the main content so it can be displayed inside DashboardShell for logged-in users
  // or inside a simple public layout for guests.
  const content = (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left Column: Doctor Info */}
      <div className={`space-y-4 md:space-y-6 overflow-hidden ${role === 'doctor' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
        <div
          className="bg-white rounded-[2rem] p-5 md:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left w-full overflow-hidden"
        >
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[3rem] bg-teal-50 overflow-hidden shrink-0 border-4 border-white shadow-lg shadow-teal-100/50 flex items-center justify-center relative">
            {doctor.profilePic ? (
              <img src={doctor.profilePic} alt={doctor.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 md:w-16 md:h-16 text-teal-300" />
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 md:w-10 md:h-10 bg-green-500 border-4 border-white rounded-full" />
          </div>

          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-3 md:gap-4">
              <div className="min-w-0 w-full">
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight truncate">{doctor.name}</h1>
                <p className="text-base md:text-lg text-primary font-bold mt-0.5 md:mt-1 uppercase tracking-wider">{doctor.category ? `${doctor.category}${doctorCategoryTranslations[doctor.category] ? ` - ${doctorCategoryTranslations[doctor.category]}` : ''}` : `General Physician - ${doctorCategoryTranslations['General Physician']}`}</p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-amber-200 shadow-sm shadow-amber-100 shrink-0">
                <Star className="w-4 h-4 md:w-6 md:h-6 text-amber-500 fill-current" />
                <span className="font-black text-lg md:text-xl text-amber-700">{doctor.rating ? doctor.rating.toFixed(1) : 'New'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{doctor.city}, {doctor.province}</span>
              </div>
              {doctor.workNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{doctor.workNumber}</span>
                </div>
              )}
              {doctor.clinicAddress && (
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  <span>{doctor.clinicAddress}</span>
                </div>
              )}
            </div>

            <div className="mt-6 md:mt-10 grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-slate-50 p-3 md:p-5 rounded-2xl border border-slate-100">
                <div className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-[0.15em] md:tracking-[0.2em] font-black mb-1">Experience</div>
                <div className="text-base md:text-xl font-bold text-slate-900">{doctor.experience} Yrs+</div>
              </div>
              <div className="bg-slate-50 p-3 md:p-5 rounded-2xl border border-slate-100">
                <div className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-[0.15em] md:tracking-[0.2em] font-black mb-1">Consultation</div>
                <div className="text-base md:text-xl font-bold text-slate-900">PKR {doctor.fees}</div>
              </div>
              <div className="bg-teal-50/50 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-teal-100 col-span-2">
                <div className="text-[9px] md:text-[10px] text-teal-400 uppercase tracking-[0.15em] md:tracking-[0.2em] font-black mb-1.5 flex items-center gap-1.5 md:gap-2">
                  <Clock size={12} />
                  Operating Hours
                </div>
                <div className="text-sm md:text-lg font-bold text-slate-900">
                  {(() => {
                    const avail = doctor.availability;
                    if (!avail) return 'Not specified';
                    if (typeof avail === 'string') return avail;
                    if (typeof avail === 'object' && avail.startTime) {
                      return (
                        <div className="flex flex-col gap-0.5">
                          <div className="text-teal-700 text-sm md:text-base">
                            { Array.isArray(avail.days) && avail.days.length > 0 ? avail.days.join(', ') : 'Daily' }
                          </div>
                          <div className="text-slate-600 font-medium text-xs md:text-base">{avail.startTime} {avail.startPeriod || 'AM'} – {avail.endTime} {avail.endPeriod || 'PM'}</div>
                        </div>
                      );
                    }
                    return 'Not specified';
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-200 shadow-sm">
          <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-3">
            <span className="w-1 md:w-1.5 h-5 md:h-6 bg-teal-600 rounded-full" />
            Professional Background
          </h3>
          <p className="text-slate-600 text-sm md:text-lg leading-relaxed whitespace-pre-wrap italic md:not-italic mb-8">{doctor.bio || 'No biography available.'}</p>

          {doctor.certifications && (
            <>
              <h3 className="text-base md:text-xl font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">workspace_premium</span>
                Certifications & Qualifications
              </h3>
              <div className="flex flex-wrap gap-2">
                {doctor.certifications.split(',').map((cert, i) => (
                  <span key={i} className="px-4 py-2 bg-teal-50 text-teal-700 text-sm font-bold rounded-xl border border-teal-100">
                    {cert.trim()}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Clinic Location Map */}
        {doctor.clinicAddress && (
          <div className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-200 shadow-sm">
            <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-3">
              <span className="w-1 md:w-1.5 h-5 md:h-6 bg-teal-600 rounded-full" />
              Clinic Location
            </h3>
            <div className="w-full h-80 rounded-3xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.google.com/maps?q=${encodeURIComponent(doctor.clinicAddress + ', ' + doctor.city + ', ' + doctor.province)}&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
            <p className="mt-4 text-slate-500 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {doctor.clinicAddress}, {doctor.city}
            </p>
          </div>
        )}

        {/* Rating Section */}
        <div className="bg-slate-900 rounded-[2rem] p-6 md:p-10 shadow-2xl shadow-teal-900/20 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Patient Satisfaction</h3>
            <p className="text-slate-400 font-medium text-sm md:text-base">Rate Dr. {doctor.name.split(' ').pop()}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full md:w-auto">
            <select 
              value={rating} 
              onChange={(e) => setRating(Number(e.target.value))} 
              className="w-full sm:w-32 h-12 md:h-14 px-4 rounded-xl md:rounded-2xl bg-white/10 border border-white/20 text-white font-bold focus:bg-white/20 outline-none transition-all text-sm md:text-base"
            >
              {[5,4,3,2,1].map(v => <option key={v} value={v} className="text-slate-900">{v} Stars</option>)}
            </select>
            <button 
              onClick={handleRate} 
              disabled={ratingLoading}
              className="w-full sm:w-auto px-8 md:px-10 h-12 md:h-14 rounded-xl md:rounded-2xl bg-white text-slate-900 font-black hover:bg-teal-50 transition-all active:scale-95 disabled:opacity-50 text-sm md:text-base"
            >
              {ratingLoading ? 'Sending...' : 'Rate Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Booking */}
      {authRole !== 'doctor' && (
        <div className="space-y-6 w-full max-w-full">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-24 w-full">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900">Book Session</h3>
          </div>

          <form onSubmit={handleBook} className="space-y-4 md:space-y-5 w-full">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-400 font-black pl-1">Preferred Date</label>
              <input 
                type="date" 
                value={date} 
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
                className="w-full h-12 md:h-14 px-4 md:px-5 rounded-xl md:rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-700 text-sm md:text-base" 
                required 
              />
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-400 font-black pl-1">Session Time</label>
              <select 
                value={time} 
                onChange={e => setTime(e.target.value)}
                className="w-full h-12 md:h-14 px-4 md:px-5 rounded-xl md:rounded-2xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none bg-white transition-all font-bold text-slate-700 appearance-none text-sm md:text-base" 
                required
              >
                <option value="">Choose your slot</option>
                {availableSlots.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={booking} 
              className="w-full h-14 md:h-16 mt-2 md:mt-4 rounded-xl md:rounded-2xl bg-teal-600 text-white font-black text-base md:text-lg hover:bg-teal-700 shadow-2xl shadow-teal-200 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {booking ? 'Reserving...' : 'Confirm Session'}
            </button>
          </form>

          {submittedBooking?.status === 'scheduled' && submittedBooking.paymentRequired ? (
            <>
              <div className="mt-6 md:mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <CreditCard size={16} />
                  Payment details for {doctor.name}
                </div>
                <div className="space-y-1">
                  {doctor.paymentDetails?.jazzcashNumber ? (
                    <p><span className="font-semibold">JazzCash:</span> {doctor.paymentDetails.jazzcashNumber}</p>
                  ) : null}
                  {doctor.paymentDetails?.easypaisaNumber ? (
                    <p><span className="font-semibold">EasyPaisa:</span> {doctor.paymentDetails.easypaisaNumber}</p>
                  ) : null}
                  {!doctor.paymentDetails?.jazzcashNumber && !doctor.paymentDetails?.easypaisaNumber && doctor.workNumber ? (
                    <p><span className="font-semibold">Payment number:</span> {doctor.workNumber}</p>
                  ) : null}
                  {!doctor.paymentDetails?.jazzcashNumber && !doctor.paymentDetails?.easypaisaNumber && !doctor.workNumber ? (
                    <p>No payment numbers added yet.</p>
                  ) : null}
                </div>
              </div>

              <form onSubmit={submitPaymentProof} className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <CreditCard size={16} />
                  Submit payment proof
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black pl-1">Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700">
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black pl-1">Transaction ID</label>
                  <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700" placeholder="e.g. 123456789" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black pl-1">Payment Proof / Screenshot Link</label>
                  <input value={paymentProof} onChange={(e) => setPaymentProof(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700" placeholder="Upload link or note" required />
                </div>
                <button type="submit" className="w-full h-12 rounded-xl bg-slate-900 text-white font-semibold">Submit Payment Proof</button>
              </form>
            </>
          ) : submittedBooking?.status === 'pending' ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Your appointment request is awaiting doctor approval. Payment details will appear here after the doctor confirms.
            </div>
          ) : submittedBooking?.status === 'pending_verification' ? (
            <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
              Payment proof submitted. Your appointment is awaiting payment verification.
            </div>
          ) : submittedBooking?.status === 'rejected' ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              The doctor declined this appointment request.
            </div>
          ) : null}

          <div className="mt-6 md:mt-8 pt-5 md:pt-6 border-t border-slate-50 flex items-center gap-3 text-slate-400">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-teal-600 animate-pulse" />
            <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest">Available for Instant Booking</p>
          </div>
        </div>
      </div>
    )}
  </div>)

  // If still loading, show a simpler loading view for guests or wrapped in shell for logged-in users
  if(loading) {
    if (role) {
      return (
        <DashboardShell title="Doctor Profile" subtitle="Loading...">
          <div className="flex items-center justify-center h-64">Loading...</div>
        </DashboardShell>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Doctor Profile</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Loading...</p>
          </div>
          <div className="flex items-center justify-center h-64">Loading...</div>
        </main>
      </div>
    )
  }

  // Render final view — wrap with DashboardShell for logged-in users, otherwise use public layout
  if (role) {
    return (
      <DashboardShell title="Doctor Profile" subtitle="View details and book an appointment">
        {content}
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Doctor Profile</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">View details and book an appointment</p>
        </div>
        {content}
      </main>
    </div>
  );
}
