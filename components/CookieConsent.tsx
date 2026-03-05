'use client'

import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent')
    if (!consent) {
      setShowConsent(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    setShowConsent(false)
    window.dispatchEvent(new Event('cookie-consent-dismissed'))
  }

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined')
    setShowConsent(false)
    window.dispatchEvent(new Event('cookie-consent-dismissed'))
  }

  if (!showConsent) return null

  return (
    <div className="fixed bottom-8 right-8 max-w-md bg-coral dark:bg-gray-800 text-white p-6 rounded-lg shadow-2xl dark:shadow-gray-900 z-50 animate-slide-up">
      <p className="text-sm mb-4 leading-relaxed dark:text-gray-200">
        Κάνοντας κλικ στο "Αποδοχή", συμφωνείτε με την αποθήκευση cookies στη συσκευή σας για τη
        βελτίωση της πλοήγησης στον ιστότοπο, την ανάλυση της χρήσης του ιστότοπου και τη
        βοήθεια στις προσπάθειες μάρκετινγκ μας. Δείτε την Πολιτική Απορρήτου μας, για
        περισσότερες πληροφορίες.
      </p>
      <div className="flex gap-3">
        <button
          onClick={acceptCookies}
          className="flex-1 bg-white dark:bg-gray-600 text-charcoal dark:text-gray-100 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
        >
          ΑΠΟΔΟΧΗ
        </button>
        <button
          onClick={declineCookies}
          className="flex-1 bg-transparent border-2 border-white dark:border-gray-400 px-4 py-2 rounded-full text-sm font-medium hover:bg-white hover:text-charcoal dark:hover:bg-gray-600 dark:hover:border-gray-600 transition-colors"
        >
          ΑΠΟΡΡΙΨΗ
        </button>
      </div>
    </div>
  )
}
