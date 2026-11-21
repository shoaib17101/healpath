import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import { 
  HeartPulse, Activity, ShieldCheck, Clock, Users, CheckCircle2, ChevronRight,
  Stethoscope, Brain, MapPin, Star, Thermometer, Baby, MessageSquareText,
  CalendarCheck2, UserRound, BookOpenText, Sparkles
} from 'lucide-react';
import { doctorCategories, doctorCategoryTranslations, symptomToCategory, symptomTranslations } from '../constants/locationData';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

const matchesWordPrefix = (text, query) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return text.toLocaleLowerCase().split(/\s+/).some(word => word.startsWith(normalizedQuery));
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isUrdu } = useLanguage();
  const copy = isUrdu ? {
    login: 'لاگ اِن', signUp: 'سائن اَپ', trusted: 'روزمرہ صحت کے لیے قابل اعتماد ڈیجیٹل نگہداشت',
    hero: 'بہتر نگہداشت کا آغاز ایک فوری اور پُراعتماد قدم سے ہوتا ہے۔',
    heroText: 'صحیح ڈاکٹر تلاش کریں، ماہرین کی مدد حاصل کریں اور طویل انتظار یا پیچیدہ کاغذی کارروائی کے بغیر اپنی نگہداشت سنبھالیں۔',
    findDoctor: 'ڈاکٹر تلاش کریں', browse: 'ماہرین دیکھیں', secure: 'قابل اعتماد اور محفوظ', support: '24/7 مدد',
    unwell: 'طبیعت ناساز ہے؟', tellUs: 'اپنی تکلیف کے بارے میں بتائیں۔', placeholder: 'بخار، مہاسے، کمر درد، حمل آزمائیں...', search: 'ڈاکٹر تلاش کریں',
    noSymptoms: 'آپ کی تلاش سے ملتی کوئی علامت نہیں ملی', meet: 'ہمارے طبی ماہرین سے ملیں', meetText: 'HealPath پر  37 قابل اعتماد ماہرین موجود ہیں۔', allCategories: 'تمام شعبے', allDoctors: 'تمام ڈاکٹر دیکھیں', retry: 'دوبارہ کوشش کریں', showAllSymptoms: 'تمام علامات دیکھیں', hideAllSymptoms: 'علامات چھپائیں'
  } : {
    login: 'Log in', signUp: 'Sign up', trusted: 'Trusted digital care for everyday health',
    hero: 'Better care starts with a quick, confident first step.',
    heroText: 'Find the right doctor, get expert support, and manage your care without the stress of long waits or confusing paperwork.',
    findDoctor: 'Find a doctor', browse: 'Browse specialists', secure: 'Trusted & secure', support: '24/7 support', specialists: 'Verified specialists',
    unwell: 'Feeling unwell?', tellUs: 'Tell us what’s bothering you.', placeholder: 'Try fever, acne, back pain, pregnancy...', search: 'Search Doctors',
    noSymptoms: 'No symptoms found matching', meet: 'Meet our Healthcare professionals', meetText: 'HealPath homes 37 credible professionals whom you can trust.', allCategories: 'All Categories', allDoctors: 'View all doctors', retry: 'Retry', showAllSymptoms: 'Show all symptoms', hideAllSymptoms: 'Hide symptoms'
  };
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [typedSymptom, setTypedSymptom] = useState('');
  const [showSymptomSuggestions, setShowSymptomSuggestions] = useState(false);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('name') || '')
  const [profilePic, setProfilePic] = useState('')
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'))

  const handleSearchProtected = (path) => {
    // Allow guests to view doctor listings and profiles. Navigation to booking or other
    // authenticated actions will still be blocked by the respective pages/components.
    navigate(path);
  };

  useEffect(() => {
    fetchDoctors();
    if (loggedIn) {
      fetchUserProfile();
    }

    const handleClickOutside = () => setShowSymptomSuggestions(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [loggedIn]);

  const fetchUserProfile = async () => {
    try {
      const res = await API.get('/auth/me');
      setProfilePic(res.data.profilePic || '');
      setUserName(res.data.name || '');
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const LANDING_PAGE_DOCTOR_LIMIT = 4;

  const fetchDoctors = async (category = '') => {
    try {
      setLoadingDoctors(true);
      setDoctorsError('');
      const res = await API.get('/doctors', {
        params: { search: category, limit: LANDING_PAGE_DOCTOR_LIMIT }
      });
      // Normalize response to an array and show only a few doctors for faster load
      const payload = res && res.data ? res.data : [];
      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload.doctors) ? payload.doctors : []);
      setDoctors(list.slice(0, LANDING_PAGE_DOCTOR_LIMIT));
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setDoctors([]);
      setDoctorsError(err.response?.data?.msg || err.message || 'Failed to load doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface overflow-x-hidden">
      {/* Navbar */}
      <nav  className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-surface-variant transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-teal-600 p-2 rounded-xl">
                <HeartPulse className="text-on-primary h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-primary"><a href="#navbar">HealPath</a></span>
            </div>
            
         

            <div className="flex items-center gap-4">
              <LanguageToggle />
              {loggedIn ? (
                <Link to="/profile" className="flex items-center gap-3 rounded-full border border-surface-variant px-3 py-2 hover:bg-surface/80 transition">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                    {profilePic ? (
                      <img src={profilePic} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-600 font-semibold">{userName?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <span className="text-slate-900 font-medium truncate max-w-[120px]">{userName}</span>
                </Link>
              ) : (
                <>
                  <Link to="/sign-in" className="interactive-glow text-primary font-medium hover:text-primary-container transition-colors outline outline-1 outline-primary/20 px-5 py-2.5 rounded-xl hover:outline-primary-container">
                    {copy.login}
                  </Link>
                  <Link to="/sign-up" className="interactive-glow bg-teal-600 text-on-primary px-5 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-soft">
                    {copy.signUp}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20" id='navbar'>
        {/* Hero Section */}
        <section className="relative isolate min-h-[620px] overflow-hidden py-16 lg:min-h-[680px] lg:py-24">
          <img
            src="https://static.vecteezy.com/system/resources/previews/060/844/210/non_2x/young-female-doctor-engaged-in-a-telehealth-consultation-dr-typing-on-a-sleek-laptop-in-a-contemporary-medical-office-free-photo.jpg"
            alt="Doctor using a laptop during a telehealth consultation"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[68%_28%] brightness-75 contrast-125 saturate-75"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(12,57,55,0.94)_0%,rgba(12,57,55,0.78)_42%,rgba(12,57,55,0.28)_100%)]" aria-hidden="true" />
          <div className="absolute inset-0 -z-10 bg-teal-50/40 mix-blend-multiply" aria-hidden="true" />
          <a
            href="https://www.vecteezy.com/photo/60844210-young-female-doctor-engaged-in-a-telehealth-consultation-dr-typing-on-a-sleek-laptop-in-a-contemporary-medical-office"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-4 z-10 text-[10px] text-white/60 underline-offset-2 hover:text-white hover:underline"
          >
            Photo by Vecteezy
          </a>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
            <div>
            <div className="hero-rise inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white mb-6 shadow-sm backdrop-blur-md">
              <HeartPulse className="w-4 h-4" />
              {copy.trusted}
            </div>
            <h1 className="hero-rise hero-rise-delay-1 text-4xl md:text-6xl font-black leading-[1.06] text-white mb-6 max-w-3xl">
              {copy.hero}
            </h1>
            <p className="hero-rise hero-rise-delay-2 text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed mb-8">
              {copy.heroText}
            </p>
            <div className="hero-rise hero-rise-delay-3 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleSearchProtected('/find-doctors')}
                className="interactive-glow bg-teal-600 text-on-primary px-8 py-4 rounded-xl font-medium hover:bg-teal-700 transition-all shadow-soft flex items-center justify-center gap-2 group"
              >
                {copy.findDoctor}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => handleSearchProtected('/find-doctors')}
                className="interactive-glow bg-white/10 text-white border border-white/25 px-8 py-4 rounded-xl font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                {copy.browse}
              </button>
            </div>
            <div className="hero-rise hero-rise-delay-3 mt-10 flex flex-wrap items-center gap-6 text-sm text-white/80 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-secondary-fixed" />
                {copy.secure}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-secondary-fixed" />
                {copy.support}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary-fixed" />
                {copy.specialists}
              </div>
            </div>
            </div>

            <div className="hero-rise hero-rise-delay-2 relative mx-auto w-full max-w-md">
              <div className="rounded-[2rem] border border-white/25 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Care that feels personal</p>
                    <p className="text-xs text-white/70">Trusted doctors, one simple path</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-white">
                  <div className="rounded-2xl bg-black/15 p-4">
                    <p className="text-2xl font-black">24/7</p>
                    <p className="mt-1 text-xs text-white/70">Support when you need it</p>
                  </div>
                  <div className="rounded-2xl bg-black/15 p-4">
                    <p className="text-2xl font-black">1:1</p>
                    <p className="mt-1 text-xs text-white/70">Focused consultations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Search by Symptom */}
        <section className="relative z-30 px-4 max-w-6xl mx-auto pb-8">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-primary/10 border border-slate-100 p-6 md:p-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 mb-3">
                <HeartPulse className="w-4 h-4" />
                {copy.unwell}
              </div>
              <h3 className="text-2xl md:text-4xl font-bold text-slate-900">{copy.tellUs}</h3>
            </div>

            <div className="grid md:grid-cols-1 gap-8 items-center mb-8">
              <div className="relative">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                      type="text"
                      placeholder={copy.placeholder}
                      className="interactive-glow w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-900 font-medium"
                      value={typedSymptom}
                      onFocus={(e) => {
                        e.stopPropagation();
                        setShowSymptomSuggestions(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTypedSymptom(val);
                        const lowerVal = val.toLowerCase();
                        if (lowerVal.length > 1) {
                          const match = Object.keys(symptomToCategory).find(s =>
                            matchesWordPrefix(s, lowerVal) || matchesWordPrefix(symptomTranslations[s], val)
                          );
                          if (match) {
                            setSearchCategory(symptomToCategory[match]);
                          }
                        } else {
                          setSearchCategory('');
                        }
                      }}
                    />
                    {showSymptomSuggestions && typedSymptom.length > 1 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 max-h-64 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        {Object.keys(symptomToCategory)
                          .filter(s =>
                            matchesWordPrefix(s, typedSymptom) || matchesWordPrefix(symptomTranslations[s], typedSymptom)
                          )
                          .map(s => (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTypedSymptom(s);
                                setSearchCategory(symptomToCategory[s]);
                                setShowSymptomSuggestions(false);
                                handleSearchProtected(`/find-doctors?search=${encodeURIComponent(symptomToCategory[s])}`);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-teal-50 rounded-2xl transition-all flex justify-between items-center group mb-1 last:mb-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                  <span className="material-symbols-outlined text-sm">search</span>
                                </div>
                                <span className="text-slate-700 capitalize font-bold group-hover:text-slate-900">{s} - {symptomTranslations[s]}</span>
                              </div>
                              <span className="text-teal-600 text-[10px] font-black tracking-wider bg-teal-50 px-2.5 py-1 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-all">{symptomToCategory[s]} - {doctorCategoryTranslations[symptomToCategory[s]]}</span>
                            </button>
                          ))
                        }
                        {Object.keys(symptomToCategory).filter(s =>
                          matchesWordPrefix(s, typedSymptom) || matchesWordPrefix(symptomTranslations[s], typedSymptom)
                        ).length === 0 && (
                          <div className="px-6 py-8 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                              <span className="material-symbols-outlined">search_off</span>
                            </div>
                            <p className="text-slate-400 text-sm font-medium">{copy.noSymptoms} "{typedSymptom}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (searchCategory) {
                        handleSearchProtected(`/find-doctors?search=${encodeURIComponent(searchCategory)}`);
                      } else {
                        handleSearchProtected('/find-doctors');
                      }
                    }}
                    className="interactive-glow h-14 px-8 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 shrink-0"
                  >
                    {copy.search}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Fever', icon: Thermometer },
                  { label: 'Acne', icon: Sparkles },
                  { label: 'Back Pain', icon: Activity },
                  { label: 'Pregnancy', icon: Baby },
                  { label: 'Headache', icon: Brain },
                  { label: 'Cold', icon: ShieldCheck },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const category = symptomToCategory[label.toLowerCase()] || label;
                      handleSearchProtected(`/find-doctors?search=${encodeURIComponent(category)}`);
                    }}
                    className={`interactive-glow group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:border-teal-400 hover:bg-teal-50 hover:-translate-y-0.5 ${searchCategory === (symptomToCategory[label.toLowerCase()] || label) ? 'interactive-glow-selected' : ''}`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm border border-slate-200 group-hover:bg-teal-600 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary">{label} - {symptomTranslations[label.toLowerCase()]}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllSymptoms(current => !current)}
                  className="text-sm font-bold text-teal-700 hover:text-teal-900 hover:underline underline-offset-4 transition-colors"
                >
                  {showAllSymptoms ? copy.hideAllSymptoms : copy.showAllSymptoms}
                </button>
              </div>

              {showAllSymptoms && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.keys(symptomToCategory).map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => {
                        setTypedSymptom(symptom);
                        setSearchCategory(symptomToCategory[symptom]);
                        handleSearchProtected(`/find-doctors?search=${encodeURIComponent(symptomToCategory[symptom])}`);
                      }}
                      className="text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 transition-colors"
                    >
                      <span className="block capitalize">{symptom}</span>
                      <span className="block mt-0.5 text-xs font-medium text-slate-400">{symptomTranslations[symptom]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      <section id="doctors" className="py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-on-surface mb-4">{copy.meet}</h2>
                <p className="text-lg text-on-surface-variant">{copy.meetText}</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <select 
                  value={searchCategory} 
                  onChange={(e) => {
                    setSearchCategory(e.target.value);
                    fetchDoctors(e.target.value);
                  }}
                    className="interactive-glow px-4 py-2 rounded-xl border border-surface-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 flex-1 md:w-64 text-on-surface font-medium"
                >
                  <option value="">{copy.allCategories}</option>
                  {doctorCategories.map(cat => (
                    <option key={cat} value={cat}>{cat} - {doctorCategoryTranslations[cat]}</option>
                  ))}
                </select>
                <button 
                  onClick={() => handleSearchProtected('/find-doctors')}
                  className="hidden sm:flex text-teal-700 font-medium items-center gap-2 hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors shrink-0"
                >
                  {copy.allDoctors} <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loadingDoctors ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="bg-surface rounded-2xl p-6 shadow-sm border border-surface-variant">
                    <div className="w-20 h-20 rounded-full bg-surface-variant mb-4 animate-pulse"></div>
                    <div className="h-5 bg-surface-variant rounded mb-2 animate-pulse"></div>
                    <div className="h-4 bg-surface-variant rounded mb-1 animate-pulse"></div>
                    <div className="h-4 bg-surface-variant rounded mb-4 animate-pulse"></div>
                    <div className="h-4 bg-surface-variant rounded animate-pulse"></div>
                  </div>
                ))
              ) : doctorsError ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-red-500 mb-4">{doctorsError}</p>
                  <button onClick={() => fetchDoctors(searchCategory)} className="bg-teal-600 text-on-primary px-4 py-2 rounded-lg">{copy.retry}</button>
                </div>
              ) : doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <div 
                    onClick={() => handleSearchProtected(`/doctor/${doctor._id}`)} 
                    key={doctor._id} 
                    className="interactive-glow bg-surface rounded-2xl p-6 shadow-sm border border-surface-variant hover:shadow-md transition-shadow block cursor-pointer"
                  >
                    <div className="w-20 h-20 rounded-full bg-teal-100 mb-4 overflow-hidden border-2 border-surface flex items-center justify-center">
                      {doctor.profilePic ? (
                        <img src={doctor.profilePic} alt={doctor.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary text-2xl font-bold">{doctor.name ? doctor.name.charAt(0) : 'D'}</span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-on-surface mb-1 truncate">{doctor.name || 'Doctor'}</h4>
                    <p className="text-sm text-primary font-medium mb-1 uppercase tracking-wider">{typeof doctor.category === 'string' ? `${doctor.category}${doctorCategoryTranslations[doctor.category] ? ` - ${doctorCategoryTranslations[doctor.category]}` : ''}` : `General Physician - ${doctorCategoryTranslations['General Physician']}`}</p>
                    {doctor.certifications && (
                      <p className="text-[10px] text-on-surface-variant font-bold mb-2 bg-surface-variant/30 px-2 py-0.5 rounded-md inline-block">
                        {doctor.certifications}
                      </p>
                    )}
                    <p className="text-sm text-on-surface-variant mb-1">{(typeof doctor.experience === 'number' || typeof doctor.experience === 'string') ? doctor.experience : '0'} years experience</p>
                    <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {doctor.city}, {doctor.province} {doctor.clinicAddress ? ` • ${doctor.clinicAddress}` : ''}
                    </p>
                    <div className="text-sm text-on-surface-variant mb-4">
                      <Clock className="inline w-4 h-4 mr-1 mb-0.5"/> 
                      {(() => {
                        const avail = doctor.availability;
                        if (!avail) return 'Contact for details';
                        if (typeof avail === 'string') return avail;
                        if (typeof avail === 'object' && avail.startTime) {
                          const days = Array.isArray(avail.days) && avail.days.length > 0 
                            ? avail.days.map(d => d.slice(0, 3)).join(', ') + ': ' 
                            : '';
                          return `${days}${avail.startTime} ${avail.startPeriod || 'AM'} – ${avail.endTime} ${avail.endPeriod || 'PM'}`;
                        }
                        return 'Contact for details';
                      })()}
                    </div>
                    
                    <div className="flex items-center gap-2 pt-4 border-t border-surface-variant">
                      <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
                      <span className="font-bold text-on-surface">{doctor.rating ? doctor.rating.toFixed(1) : 'New'}</span>
                      <span className="text-sm text-on-surface-variant ml-auto">Patient Reviews</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-on-surface-variant">No doctors available at the moment.</p>
                </div>
              )}
            </div>

            {/* View all CTA */}
            <div className="mt-10 text-center">
              <button
                onClick={() => handleSearchProtected('/find-doctors')}
                className="interactive-glow inline-flex items-center gap-2 bg-teal-600 text-on-primary px-8 py-3 rounded-xl font-medium hover:bg-teal-700 transition-all shadow-soft"
              >
                View all doctors <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
        <section className="py-20 bg-surface-container-low">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-on-surface mb-4">What you can access after login</h2>
              <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">Your health dashboard brings the essentials together in one place.</p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                { icon: CalendarCheck2, title: 'Book appointments', desc: 'Schedule visits with the right specialist on your preferred date and time.' },
                { icon: MessageSquareText, title: 'Message doctors', desc: 'Ask follow-up questions and stay connected before and after your consultations.' },
                { icon: BookOpenText, title: 'Track medical history', desc: 'Keep records, prescriptions, and past visits organized in one secure place.' },
                { icon: UserRound, title: 'Manage your profile', desc: 'Update your details, preferences, and personal care information anytime.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="interactive-glow group bg-surface rounded-3xl border border-surface-variant p-6 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:border-teal-300 hover:bg-teal-50">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-on-surface mb-3 group-hover:text-primary transition-colors">{title}</h3>
                  <p className="text-on-surface-variant leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Doctors Section */}
  

      </main>

      {/* Contact Section */}
      <section id="contact" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-teal-700 z-0">
          <div className="absolute top-0 right-0 w-[50%] h-full bg-teal-500 rounded-l-[100%] opacity-30 -mr-20"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[3rem] p-8 md:p-16 text-center text-white">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black mb-6">Experience the future of <br/>healthcare, today.</h2>
              <p className="text-primary-fixed text-lg md:text-xl mb-10 leading-relaxed">
                Join the platform that is empowering millions to live healthier, 
                more connected lives with expert medical care at their fingertips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => handleSearchProtected('/find-doctors')}
                  className="interactive-glow bg-white text-teal-700 px-8 py-4 rounded-2xl font-bold hover:bg-teal-100 transition-all shadow-xl shadow-slate-900/20"
                >
                  Join HealPath Now
                </button>
                <Link to="/contact" className="interactive-glow bg-teal-700 text-white border border-white/30 px-8 py-4 rounded-2xl font-bold hover:bg-teal-800 transition-all">
                  Contact Sales & Support
                </Link>
              </div>
              <div className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm text-primary-fixed font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-secondary-fixed" />
                  HIPAA Compliant
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-secondary-fixed" />
                  24/7 Availability
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-secondary-fixed" />
                  Real-time Support
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-on-surface text-surface py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6 text-surface">
                <HeartPulse className="h-8 w-8" />
                <span className="text-2xl font-bold">HealPath</span>
              </div>
              <p className="text-surface-variant text-sm leading-relaxed mb-6">
                HealPath's one window digital healthcare platform connects a network of globally recognised and highly qualified online doctors to patients.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6">Quick Links</h4>
              <ul className="space-y-3 text-sm text-surface-variant">
                <li><a href="#" className="hover:text-surface transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-surface transition-colors">Solutions</a></li>
                <li><a href="#" className="hover:text-surface transition-colors">Careers</a></li>
                <li><Link to="/contact" className="hover:text-surface transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6">Legal</h4>
              <ul className="space-y-3 text-sm text-surface-variant">
                <li><a href="#" className="hover:text-surface transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-surface transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-surface transition-colors">FAQs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6">Contact</h4>
              <ul className="space-y-4 text-sm text-surface-variant">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 shrink-0" />
                  <span>Office # 401/402, 4th Floor, Plot # 43-C, Lane # 10, Bukhari Commercial Area - Karachi</span>
                </li>
                <li className="flex items-center gap-3">
                  <Activity className="w-5 h-5 shrink-0" />
                  <a href="mailto:support@healpath.com" className="hover:text-surface transition-colors">support@healpath.com</a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-surface-variant/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-surface-variant">
            <p>© HealPath 2026. All rights reserved.</p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-surface-variant/40 cursor-pointer transition-colors">
                 f
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-surface-variant/40 cursor-pointer transition-colors">
                 in
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
