'use client'

import { useState, useEffect, useRef } from 'react'

interface Language {
  code: string
  name: string
  nativeName: string
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
]

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState<string>('el')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Detect current language from Google Translate
  useEffect(() => {
    const checkLanguage = () => {
      const langCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('googtrans='))

      if (langCookie) {
        const lang = langCookie.split('/')[2]
        if (lang && lang !== currentLang) {
          setCurrentLang(lang)
        }
      }
    }

    // Check periodically
    const interval = setInterval(checkLanguage, 1000)
    return () => clearInterval(interval)
  }, [currentLang])

  const changeLanguage = (langCode: string) => {
    // Clear any existing translation cookies first
    const domain = window.location.hostname
    const rootDomain = domain.split('.').slice(-2).join('.')

    // Clear all possible cookie variations
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=${rootDomain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=.${rootDomain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`

    // Set the new language cookie
    document.cookie = `googtrans=/el/${langCode}; path=/`
    document.cookie = `googtrans=/el/${langCode}; path=/; domain=${domain}`

    // Reload the page to apply translation
    window.location.reload()
  }

  const resetToGreek = () => {
    // Clear all possible cookie variations to ensure complete reset
    const domain = window.location.hostname
    const rootDomain = domain.split('.').slice(-2).join('.')

    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=${rootDomain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    document.cookie = `googtrans=; path=/; domain=.${rootDomain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`

    // Reload the page
    window.location.reload()
  }

  const getCurrentLanguageCode = () => {
    const lang = languages.find(l => l.code === currentLang)
    const code = lang ? lang.code : 'el'
    // Get first 2 characters, handle special case for zh-CN
    return code.startsWith('zh') ? 'ZH' : code.substring(0, 2).toUpperCase()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" style={{ display: 'none' }} aria-hidden="true"></div>

      {/* Globe Icon Button with Overlays */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:text-white dark:hover:text-coral-light transition-colors"
        aria-label={`Αλλαγή γλώσσας (${getCurrentLanguageCode()})`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Globe Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>

        {/* Language Code Overlay - Top Right */}
        <span className="absolute -top-1 -right-1 text-[11px] font-bold bg-charcoal dark:bg-gray-600 text-white px-1.5 py-0.5 rounded">
          {getCurrentLanguageCode()}
        </span>

        {/* Dropdown Arrow Overlay - Bottom */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Επιλογή γλώσσας"
          className="absolute left-0 md:left-auto md:right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50 max-h-96 overflow-y-auto"
        >
          {/* Reset to Greek option */}
          {currentLang !== 'el' && (
            <>
              <button
                type="button"
                role="option"
                aria-selected={currentLang === 'el'}
                onClick={resetToGreek}
                className="w-full text-left px-4 py-2 hover:text-coral dark:hover:text-coral-light transition-colors flex items-center gap-2"
              >
                <span className="text-sm font-medium text-coral dark:text-coral-light notranslate">← Back to Greek</span>
              </button>
              <div className="border-t border-gray-200 dark:border-gray-600 my-2" aria-hidden="true"></div>
            </>
          )}

          {/* Language options */}
          {languages
            .filter(lang => lang.code !== 'el') // Don't show Greek since it's the default
            .map((lang) => (
              <button
                type="button"
                role="option"
                aria-selected={currentLang === lang.code}
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 hover:text-coral dark:hover:text-coral-light dark:text-gray-200 transition-colors flex items-center justify-between ${
                  currentLang === lang.code ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
              >
                <span className="text-sm font-medium">{lang.nativeName}</span>
                {currentLang === lang.code && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4 text-coral"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
