import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../api';
import DashboardShell from '../components/DashboardShell';
import { Search, Star, User, MapPin, Stethoscope } from 'lucide-react';
import { locationData, doctorCategoryTranslations, symptomToCategory, symptomTranslations } from '../constants/locationData';

export default function SearchDoctors() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // allow guests to view — determine role from localStorage
  const role = localStorage.getItem('role');

  useEffect(() => {
    fetchDoctors();
  }, [search, province, city]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await API.get('/doctors', {
        params: { search, province, city }
      });
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProblemSearch = (p) => {
    setProblem(p);
    const category = symptomToCategory[p.toLowerCase()];
    if (category) {
      setSearch(category);
    }
    setShowSuggestions(false);
  };

  // Extract the page content so it can be used both inside DashboardShell (for logged-in users)
  // and inside a simple public layout for guests
  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Search by name or category..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">medical_information</span>
          <input 
            type="text" 
            placeholder="Search by symptom..." 
            value={problem}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setProblem(e.target.value);
              setShowSuggestions(true);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
          {showSuggestions && problem && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-48 overflow-y-auto">
              {Object.keys(symptomToCategory)
                .filter(s => {
                  const query = problem.toLowerCase();
                  return s.toLowerCase().startsWith(query)
                    || symptomTranslations[s].toLowerCase().startsWith(query);
                })
                .map(s => (
                  <button
                    key={s}
                    onClick={() => handleProblemSearch(s)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                  >
                    {s} - {symptomTranslations[s]} → <span className="text-primary font-medium">{symptomToCategory[s]} - {doctorCategoryTranslations[symptomToCategory[s]]}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>

        <div className="relative">
          <select 
            value={province} 
            onChange={(e) => { setProvince(e.target.value); setCity(''); }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white appearance-none"
          >
            <option value="">All Provinces</option>
            {Object.keys(locationData).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
        </div>

        <div className="relative">
          <select 
            value={city} 
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white appearance-none disabled:bg-slate-50 disabled:text-slate-400"
            disabled={!province}
          >
            <option value="">All Cities</option>
            {province && locationData[province].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-10 text-slate-500 bg-white rounded-2xl border border-slate-200">
          No doctors found matching your criteria.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map(doctor => (
            <Link
              to={`/doctor/${doctor._id}`}
              key={doctor._id}
              className="block relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
            >
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-teal-100 shrink-0 overflow-hidden border border-slate-200">
                  {doctor.profilePic ? (
                    <img src={doctor.profilePic} alt={doctor.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{doctor.name || 'Doctor'}</h3>
                  <p className="text-sm text-primary font-bold mt-0.5 uppercase tracking-wider">{typeof doctor.category === 'string' ? `${doctor.category}${doctorCategoryTranslations[doctor.category] ? ` - ${doctorCategoryTranslations[doctor.category]}` : ''}` : `General Physician - ${doctorCategoryTranslations['General Physician']}`}</p>
                  {doctor.certifications && (
                    <p className="text-[10px] text-slate-500 font-bold mt-1 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                      {doctor.certifications}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-sm text-amber-500 font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{doctor.rating ? (typeof doctor.rating === 'number' ? doctor.rating.toFixed(1) : '5.0') : 'New'}</span>
                    <span className="text-slate-400">({doctor.ratingCount || 0})</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Experience:</span> {(typeof doctor.experience === 'number' || typeof doctor.experience === 'string') ? doctor.experience : '0'} years
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Fee:</span> PKR {doctor.fees || 0}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{doctor.city && doctor.province ? `${doctor.city}, ${doctor.province}` : 'Location N/A'}</span>
                </div>
                {doctor.clinicAddress && (
                  <div className="text-[11px] text-slate-500 italic pl-5">
                    at {doctor.clinicAddress}
                  </div>
                )}
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Availability:</span> {
                    (() => {
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
                    })()
                  }
                </div>
                <div className="text-sm text-slate-500 line-clamp-2">
                  {doctor.bio || 'No bio provided.'}
                </div>
              </div>
              <span className="block w-full text-center py-2.5 rounded-xl bg-teal-50 text-teal-700 font-semibold transition">
                View Profile
              </span>
            </Link>
          ))}
        </div>
      )}
      </div>
  );

  // Wrap for logged-in users with DashboardShell, otherwise render a public layout
  if (role) {
    return (
      <DashboardShell title="Find a Doctor" subtitle="Search and book appointments with top specialists.">
        {content}
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Find a Doctor</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Search and book appointments with top specialists.</p>
        </div>
        {content}
      </main>
    </div>
  );
}
