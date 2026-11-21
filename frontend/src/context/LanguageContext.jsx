import { createContext, useContext, useEffect, useState } from 'react'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en')

  useEffect(() => {
    document.documentElement.lang = language === 'ur' ? 'ur' : 'en'
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
    return () => {
      document.documentElement.lang = 'en'
      document.documentElement.dir = 'ltr'
    }
  }, [language])

  const toggleLanguage = () => {
    setLanguage(current => {
      const next = current === 'en' ? 'ur' : 'en'
      localStorage.setItem('language', next)
      return next
    })
  }

  return <LanguageContext.Provider value={{ language, isUrdu: language === 'ur', toggleLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}