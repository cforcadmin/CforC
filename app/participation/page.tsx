'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollToTop from '@/components/ScrollToTop'
import MembershipRegistrationModal from '@/components/MembershipRegistrationModal'
import ThankYouModal from '@/components/ThankYouModal'
import Link from 'next/link'

// Google Form configuration
const GOOGLE_FORM_BASE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfZt1bKl2vOOnztzSozcd1C0SCLEifXlvzUQgsG6gnQESbgMw/viewform'
const TRACKING_ID_ENTRY = 'entry.2144891364'

function ParticipationContent() {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Generate a unique tracking ID
  const generateTrackingId = useCallback(() => {
    return `cforc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }, [])

  // Check if form was submitted
  const checkSubmission = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/membership/check-submission?trackingId=${encodeURIComponent(id)}`)
      const data = await response.json()
      return data.submitted === true
    } catch (error) {
      console.error('Error checking submission:', error)
      return false
    }
  }, [])

  // Start polling for submission
  const startPolling = useCallback((id: string) => {
    setIsPolling(true)

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      const submitted = await checkSubmission(id)
      if (submitted) {
        // Stop polling and show thank you modal
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        setIsPolling(false)
        setTrackingId(null)
        setShowRegistrationModal(false)
        setShowThankYouModal(true)
      }
    }, 3000)
  }, [checkSubmission])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Check for submitted query parameter on mount (fallback for redirect method)
  useEffect(() => {
    if (searchParams.get('submitted') === 'true') {
      setShowThankYouModal(true)
      router.replace('/participation', { scroll: false })
    }
  }, [searchParams, router])

  const handleOpenForm = () => {
    // Generate tracking ID and open form with pre-filled parameter
    const newTrackingId = generateTrackingId()
    setTrackingId(newTrackingId)

    const formUrl = `${GOOGLE_FORM_BASE_URL}?${TRACKING_ID_ENTRY}=${encodeURIComponent(newTrackingId)}`
    window.open(formUrl, '_blank')

    // Start polling for submission
    startPolling(newTrackingId)
  }

  const handleModalClose = () => {
    setShowRegistrationModal(false)
    // Keep polling active even if modal is closed - user might still submit
  }

  const handleManualConfirm = () => {
    // User manually confirms they submitted - stop polling and show thank you
    stopPolling()
    setTrackingId(null)
    setShowThankYouModal(true)
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative -bottom-20">
        <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
              ΘΕΛΩ ΝΑ ΓΙΝΩ ΜΕΛΟΣ
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="pt-32 pb-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section 1: Two-column layout with text */}
          <div className="mb-20">
            <h2 className="sr-only">Πληροφορίες Εγγραφής</h2>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Θέλεις να συμμετέχεις στο πιο ενεργό δίκτυο με στόχο την πολιτιστική αλλαγή; Γίνε μέλος στο Σωματείο Culture for Change!
                </p>
                {/* Οικονομικές υποχρεώσεις */}
                <div className="bg-orange-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-coral dark:text-coral-light mb-2">Οικονομικές υποχρεώσεις μελών</h3>
                  <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                    <li>• Κόστος εγγραφής (άπαξ): <span className="font-semibold">10€</span></li>
                    <li>• Ετήσια συνδρομή μέλους: <span className="font-semibold">35€</span></li>
                  </ul>
                </div>

                {/* Λειτουργία Δικτύου */}
                <div className="bg-orange-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-coral dark:text-coral-light mb-2">Λειτουργία Δικτύου</h3>
                  <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                    <li>• Το Δίκτυο διοικείται από 5μελές ΔΣ με υποστήριξη από ομάδες εργασίας στις οποίες έχουν την ευκαιρία να συμμετέχουν όλα τα μέλη</li>
                    <li>• Ετήσια Γενική Συνέλευση στην Αθήνα (και υβριδικά)</li>
                    <li>• Ετήσια Συνάντηση Midterm σε πόλη εκτός Αττικής με συνεργασία με μέλη του δικτύου</li>
                  </ul>
                </div>

                {/* Προνόμια μελών */}
                <div className="bg-orange-50 dark:bg-gray-700 rounded-xl p-4">
                  <h3 className="font-bold text-coral dark:text-coral-light mb-2">Προνόμια μελών</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm">Συμμετοχή</span>
                    <span className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm">Δικτύωση</span>
                    <span className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm">Ανάπτυξη Ικανοτήτων</span>
                    <span className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm">Συνηγορία</span>
                    <span className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm">Υποστήριξη</span>
                    <span className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm">Ευκαιρίες</span>
                  </div>
                </div>
                <Link
                  href="/OdigosTsepis2025.pdf"
                  target="_blank"
                  className="inline-block text-charcoal dark:text-coral-light hover:underline font-bold mt-4"
                >
                  Οδηγός Τσέπης (χρήσιμες πληροφορίες για τη συμμετοχή των μελών)
                </Link>
              </div>

              {/* Right Column */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-6 dark:text-gray-100">
                  Γιατί να εγγραφώ στο CforC;
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Το CforC έχει ως στόχο την ενίσχυση ατόμων και οργανισμών που επιδιώκουν την πολιτιστική αλλαγή σε μεγάλη κλίμακα που θέτουν την κοινωνικοπολιτιστική καινοτομία στο επίκεντρο όλων των δράσεων τους. Αυτές οι κατευθυντήριες γραμμές δημιουργήθηκαν για να μας βοηθήσουν να συνεργαστούμε καλύτερα ώστε να επιτύχουμε ουσιαστικό αντίκτυπο.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Feature boxes with icons/visuals */}
          <div className="mb-20">
            <h2 className="sr-only">Ποιος μπορεί να γίνει μέλος</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-orange-50 dark:bg-gray-700 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral dark:bg-coral-light rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3 dark:text-gray-100">Πιστεύεις στη δύναμη του συλλογικού αντίκτυπου.</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  Θέλεις να συνεργάζεσαι με ανθρώπους από διάφορες κοινότητες, κλάδους και υπόβαθρα και να δημιουργείς ουσιαστικές συνδέσεις μαζί τους. Γνωρίζεις πόσο σημαντικές είναι οι αξιόπιστες συνεργασίες για την επιτυχία των έργων κοινωνικής και πολιτιστικής καινοτομίας.
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-gray-700 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral dark:bg-coral-light rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3 dark:text-gray-100">Αναγνωρίζεις την εμπειρία και εξειδίκευση της κοινότητας.</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  Κατανοείς ότι ο κοινωνικοπολιτιστικός μετασχηματισμός είναι μια διαδικασία και όχι ένα τελικό προϊόν. Βάζεις πάντα την κοινότητα σε προτεραιότητα όταν συμμετέχεις και συνηγορείς υπέρ ενός δικτύου.
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-gray-700 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral dark:bg-coral-light rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3 dark:text-gray-100">Προσεγγίζεις την κοινωνικοπολιτιστική καινοτομία ολιστικά.</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  Έχεις ένα δημιουργικό τρόπο να βλέπεις πώς στοιχεία διαφορετικά (και ίσως ιδιαίτερα) μπορούν να συνδυαστούν για να δημιουργήσουν ένα εξαιρετικό αποτέλεσμα.
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-gray-700 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral dark:bg-coral-light rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3 dark:text-gray-100">Δείχνεις σεβασμό.</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  Εκτιμάς τις απόψεις και τις κουλτούρες των άλλων ανθρώπων. Στις συζητήσεις σου, πρώτα ακούς και επικοινωνείς από την οπτική γωνία του "εγώ".
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Call-to-action with button */}
          <div className="bg-gradient-to-br from-coral to-orange-400 dark:from-gray-700 dark:to-gray-800 rounded-3xl p-12 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 dark:text-gray-100">
              Έτοιμος να γίνεις μέλος;
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto dark:text-gray-200">
              Συμπλήρωσε τη φόρμα εγγραφής και θα επικοινωνήσουμε μαζί σου σύντομα για τα επόμενα βήματα!
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <input
                type="checkbox"
                id="participation-terms-checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 text-coral bg-white border-gray-300 rounded focus:ring-coral focus:ring-2 cursor-pointer"
              />
              <label htmlFor="participation-terms-checkbox" className="text-sm dark:text-gray-200 cursor-pointer">
                Συμφωνώ με τους{' '}
                <Link href="/terms" className="underline hover:no-underline dark:text-coral-light">
                  όρους/προϋποθέσεις
                </Link>
                {' '}και την{' '}
                <Link href="/privacy" className="underline hover:no-underline dark:text-coral-light">
                  πολιτική απορρήτου
                </Link>
              </label>
            </div>
            <button
              onClick={() => setShowRegistrationModal(true)}
              disabled={!agreedToTerms}
              className="bg-charcoal dark:bg-gray-600 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-8 py-4 rounded-full text-lg font-bold hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              ΘΕΛΩ ΝΑ ΕΓΓΡΑΦΩ!
            </button>
          </div>
        </div>
      </section>

      <NewsletterSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />

      {/* Membership Registration Modal */}
      <MembershipRegistrationModal
        isOpen={showRegistrationModal}
        onClose={handleModalClose}
        onProceed={handleOpenForm}
        onFormSubmitted={handleManualConfirm}
        isPolling={isPolling}
      />

      {/* Thank You Modal - shown after form submission */}
      <ThankYouModal
        isOpen={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
      />
    </div>
  )
}

export default function ParticipationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-gray-900" />}>
      <ParticipationContent />
    </Suspense>
  )
}
