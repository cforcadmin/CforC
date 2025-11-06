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
  }

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined')
    setShowConsent(false)
  }

  if (!showConsent) return null

  return (
    <div className="fixed bottom-8 right-8 max-w-md bg-coral text-white p-6 rounded-lg shadow-2xl z-50 animate-slide-up">
      <p className="text-sm mb-4 leading-relaxed">
        Κάνοντας κλικ στο "Αποδοχή", συμφωνείτε με την αποθήκευση cookies στη συσκευή σας για τη
        βελτίωση της πλοήγησης στον ιστότοπο, την ανάλυση της χρήσης του ιστότοπου και τη
        βοήθεια στις προσπάθειες μάρκετινγκ μας. Δείτε την Πολιτική Απορρήτου μας, για
        περισσότερες πληροφορίες.
      </p>
      <div className="flex gap-3">
        <button
          onClick={acceptCookies}
          className="flex-1 bg-white text-charcoal px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          ΑΠΟΔΟΧΗ
        </button>
        <button
          onClick={declineCookies}
          className="flex-1 bg-transparent border-2 border-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white hover:text-charcoal transition-colors"
        >
          ΑΠΟΡΡΙΨΗ
        </button>
      </div>
    </div>
  )
}
