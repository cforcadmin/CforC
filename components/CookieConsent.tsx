'use client'

import { useState, useEffect } from 'react'
import { readFlag, writeFlag } from '@/lib/clientFlags'

/* Το banner ζει μέσα σε κάθε σελίδα (15 σελίδες το καλούν), όχι στο layout:
   κάθε πλοήγηση το ξαναστήνει. Όταν ο browser δεν κρατά site data, η
   απάντηση δεν θυμόταν και το ερώτημα επανερχόταν σε κάθε κλικ του μενού.
   Η σημαία του module κόβει την επανάληψη μέσα στην ίδια περιήγηση· η
   απάντηση («accepted»/«declined») μένει η μόνη πηγή αλήθειας για το τι
   επιτρέπεται. */
const CONSENT_KEY = 'cookieConsent'
/* Σημειώνεται ΜΟΝΟ όταν υπάρχει απάντηση — ποτέ επειδή «το δείξαμε».
   Αλλιώς ένα mount που η React πετά (StrictMode στο dev, Suspense) θα
   έσβηνε οριστικά το ερώτημα χωρίς ο χρήστης να απαντήσει ποτέ. */
let answeredThisVisit = false

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false)

  useEffect(() => {
    if (answeredThisVisit) return
    if (readFlag(CONSENT_KEY)) answeredThisVisit = true
    else setShowConsent(true)
  }, [])

  const answer = (value: 'accepted' | 'declined') => {
    answeredThisVisit = true
    writeFlag(CONSENT_KEY, value)
    setShowConsent(false)
    window.dispatchEvent(new Event('cookie-consent-dismissed'))
  }

  const acceptCookies = () => answer('accepted')
  const declineCookies = () => answer('declined')

  if (!showConsent) return null

  return (
    <div className="fixed bottom-8 right-8 max-w-md menu-glass glass-rim text-charcoal dark:text-gray-100 p-6 rounded-2xl z-50 animate-slide-up">
      <p className="text-sm mb-4 leading-relaxed">
        Κάνοντας κλικ στο "Αποδοχή", συμφωνείτε με την αποθήκευση cookies στη συσκευή σας για τη
        βελτίωση της πλοήγησης στον ιστότοπο, την ανάλυση της χρήσης του ιστότοπου και τη
        βοήθεια στις προσπάθειες μάρκετινγκ μας. Δείτε την Πολιτική Απορρήτου μας, για
        περισσότερες πληροφορίες.
      </p>
      <div className="flex gap-3">
        <button
          onClick={acceptCookies}
          className="flex-1 bg-coral text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#F07551] transition-colors"
        >
          ΑΠΟΔΟΧΗ
        </button>
        <button
          onClick={declineCookies}
          className="flex-1 bg-transparent border-2 border-charcoal/30 dark:border-white/30 text-charcoal dark:text-gray-100 px-4 py-2 rounded-full text-sm font-medium hover:bg-charcoal/10 dark:hover:bg-white/10 transition-colors"
        >
          ΑΠΟΡΡΙΨΗ
        </button>
      </div>
    </div>
  )
}
