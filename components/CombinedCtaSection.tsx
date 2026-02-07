'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface CombinedCtaSectionProps {
  variant?: 'default' | 'members'
}

export default function CombinedCtaSection({ variant = 'default' }: CombinedCtaSectionProps) {
  const [email, setEmail] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [honeypot, setHoneypot] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && agreedToTerms && !isSubmitting) {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, website: honeypot }),
        })
        if (response.ok) {
          setShowPopup(true)
          setEmail('')
          setTimeout(() => setShowPopup(false), 4000)
        }
      } catch (error) {
        console.error('Subscription error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const showBackgroundImage = variant === 'default'

  return (
    <>
      <section className={`relative w-full overflow-hidden ${showBackgroundImage ? 'min-h-[400px]' : 'pb-12'}`}>
        {/* Background Image (about page variant) */}
        {showBackgroundImage && (
          <div className="absolute inset-0 z-0">
            <Image
              src="/becomeamember.webp"
              alt="Διακοσμητικό στοιχείο"
              fill
              className="object-cover"
              priority={false}
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

        {/* Content */}
        <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${showBackgroundImage ? 'py-16 flex items-center justify-center min-h-[400px]' : ''}`}>
          <div className={`rounded-3xl overflow-hidden grid md:grid-cols-2 w-full ${showBackgroundImage ? 'max-w-5xl shadow-2xl' : ''}`}>
            {/* Left: Become a Member */}
            <div className="bg-coral/95 dark:bg-gradient-to-br dark:from-gray-700/95 dark:to-gray-800/95 p-10 md:p-12 flex flex-col justify-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-charcoal dark:text-gray-100 mb-4">
                ΓΙΝΕ ΜΕΛΟΣ ΤΟΥ{'\n'}ΔΙΚΤΥΟΥ ΜΑΣ
              </h2>
              <p className="text-charcoal/90 dark:text-gray-200 text-sm md:text-base mb-8 max-w-xl">
                Γίνε τώρα μέλος του πρώτου Δικτύου για την κοινωνική και πολιτιστική καινοτομία στην Ελλάδα.
              </p>
              <div>
                <Link
                  href="/participation"
                  className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-8 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-all duration-300"
                >
                  ΓΙΝΕ ΜΕΛΟΣ ΤΩΡΑ
                </Link>
              </div>
            </div>

            {/* Right: Newsletter */}
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-10 md:p-12 flex flex-col justify-center">
              <span className="inline-block self-start bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-xs font-medium mb-4">
                ΟΛΑ TA NEA ΣTO EMAIL ΣΑΣ!
              </span>
              <h3 className="text-xl font-bold mb-6 dark:text-gray-100 leading-tight">
                Γραφτείτε στο newsletter μας για δράσεις, ευκαιρίες και νέα.
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Honeypot */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Το email σας: *"
                    required
                    className="w-full px-5 py-3 pr-14 rounded-full border-2 border-gray-300 dark:border-gray-600 focus:border-coral focus:outline-none text-gray-700 dark:text-gray-200 dark:bg-gray-700 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !agreedToTerms}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-coral hover:bg-coral/90 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Εγγραφή στο newsletter"
                  >
                    {isSubmitting ? (
                      <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`terms-checkbox-${variant}`}
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-coral bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-coral focus:ring-2 cursor-pointer"
                  />
                  <label htmlFor={`terms-checkbox-${variant}`} className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                    Συμφωνώ με τους{' '}
                    <Link href="/terms" className="text-charcoal dark:text-gray-200 font-medium hover:text-coral transition-colors underline">
                      όρους και τις προϋποθέσεις
                    </Link>
                  </label>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPopup(false)} aria-hidden="true" />
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full animate-[scale-in_0.3s_ease-out]">
            <div className="text-center">
              <div className="w-16 h-16 bg-coral/10 dark:bg-coral/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-3">
                Καλώς ήρθες στην κοινότητα του CforC!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Ευχαριστούμε για το ενδιαφέρον στην κοινότητά μας :-)
              </p>
              <button
                onClick={() => setShowPopup(false)}
                className="mt-6 px-8 py-3 bg-coral hover:bg-coral/90 text-white font-medium rounded-full transition-colors"
              >
                Εντάξει
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
