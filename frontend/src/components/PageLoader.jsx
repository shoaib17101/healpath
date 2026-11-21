import React from 'react'
import { HeartPulse } from 'lucide-react'

export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center z-[100] animate-fade-in">
      <div className="relative flex flex-col items-center">
        {/* Soft background glow */}
        <div className="absolute w-24 h-24 bg-teal-50 rounded-full blur-2xl animate-pulse-slow"></div>
        
        {/* Logo with scaling animation */}
        <div className="relative w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-200 animate-bounce">
          <HeartPulse size={32} className="animate-pulse" />
        </div>
        
        {/* Text */}
        <h2 className="mt-6 text-lg font-black text-slate-800 tracking-tight">HealPath</h2>
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Loading your space</p>
        
        {/* Micro progress line */}
        <div className="mt-4 w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full w-1/2 animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
      </div>
      
      {/* Dynamic Keyframe Injection for the custom micro progress line */}
      <style>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  )
}
