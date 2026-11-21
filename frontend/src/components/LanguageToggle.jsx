import { Languages } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function LanguageToggle() {
  const { isUrdu, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={isUrdu ? 'Switch to English' : 'Switch to Urdu'}
      title={isUrdu ? 'Switch to English' : 'Switch to Urdu'}
      className="inline-flex items-center gap-2 rounded-xl border border-surface-variant bg-white px-3 py-2 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-50"
    >
      <Languages className="h-4 w-4" />
      <span>{isUrdu ? 'En' : 'Ur'}</span>
    </button>
  )
}