'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface TranslationContextType {
  isTranslated: boolean  // any non-Greek language active
  isEnglish: boolean     // specifically English
  lang: string           // ενεργός κωδικός γλώσσας ('el' όταν δεν μεταφράζεται)
}

const TranslationContext = createContext<TranslationContextType>({
  isTranslated: false,
  isEnglish: false,
  lang: 'el',
})

export function useTranslation() {
  return useContext(TranslationContext)
}

export default function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [isTranslated, setIsTranslated] = useState(false)
  const [isEnglish, setIsEnglish] = useState(false)
  const [lang, setLang] = useState('el')

  // Check once on mount — language switch triggers a full page reload,
  // so the value is always fresh without polling
  useEffect(() => {
    const cookie = document.cookie.split('; ').find(r => r.startsWith('googtrans='))
    if (cookie) {
      setIsTranslated(!cookie.endsWith('/el'))
      setIsEnglish(cookie.endsWith('/en'))
      const code = cookie.split('/')[2]
      if (code) setLang(code)
    }
  }, [])

  return (
    <TranslationContext.Provider value={{ isTranslated, isEnglish, lang }}>
      {children}
    </TranslationContext.Provider>
  )
}
