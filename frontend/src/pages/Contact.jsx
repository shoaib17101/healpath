import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header/Nav */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-3xl font-bold">medical_services</span>
              <span className="text-2xl font-black tracking-tight text-slate-900">HealPath</span>
            </Link>
            <Link to="/" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          {/* Left: Contact Info */}
          <div className="space-y-12 animate-fade-in-up">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
                </span>
                Get in Touch
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-6">
                We're here to help you <span className="text-primary text-glow-teal">recover better.</span>
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed max-w-md">
                Have questions about our platform or need technical assistance? Our team is available 24/7 to support your healthcare journey.
              </p>
            </div>

            <div className="grid gap-6">
              {[
                { icon: Mail, title: 'Email Support', detail: 'support@healpath.pk', sub: 'Expect a reply within 2 hours' },
                { icon: Phone, title: '24/7 Helpline', detail: '+92 300 1234567', sub: 'Available for urgent queries' },
                { icon: MapPin, title: 'Head Office', detail: 'Tech Park, Floor 4, Lahore, Pakistan', sub: 'Visit us for partnerships' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-5 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="text-lg font-medium text-primary mt-1">{item.detail}</p>
                    <p className="text-sm text-slate-400 mt-1">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 flex items-center gap-8">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Support Team" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-slate-500">
                <span className="text-slate-900 font-bold">50+ Support Experts</span> <br />
                Ready to assist you right now.
              </p>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-200 shadow-2xl shadow-teal-900/5 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="relative">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a Message</h2>
              <p className="text-slate-500 mb-8">Fill out the form below and we'll get back to you shortly.</p>

              {submitted ? (
                <div className="bg-green-50 border border-green-100 rounded-[2rem] p-10 text-center animate-scale-in">
                  <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">Message Sent!</h3>
                  <p className="text-green-700">Thank you for reaching out. Our team will contact you very soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="John Doe"
                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        placeholder="john@example.com"
                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                    <input 
                      type="text" 
                      required
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      placeholder="How can we help?"
                      className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Message</label>
                    <textarea 
                      required
                      rows="5"
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      placeholder="Describe your query in detail..."
                      className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full h-16 bg-teal-600 text-white rounded-2xl font-bold text-lg hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-200 transition-all flex items-center justify-center gap-3 group"
                  >
                    Send Message
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Trust Section */}
      <section className="bg-white py-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-teal-50 text-primary rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900">Live Chat</h4>
              <p className="text-sm text-slate-500">Average response time: 2 mins</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-teal-50 text-primary rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900">24/7 Availability</h4>
              <p className="text-sm text-slate-500">We never sleep, so you can rest easy</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-teal-50 text-primary rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900">Data Privacy</h4>
              <p className="text-sm text-slate-500">Your messages are encrypted & secure</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-10 text-center text-slate-500 text-sm font-medium">
        <p>© {new Date().getFullYear()} HealPath Healthcare. All rights reserved.</p>
      </footer>
    </div>
  );
}
