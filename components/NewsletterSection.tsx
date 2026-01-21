'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NewsletterSectionProps {
  variant?: 'default' | 'members'
}

export default function NewsletterSection({ variant = 'default' }: NewsletterSectionProps) {
  const [email, setEmail] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const bgColor = variant === 'members' ? 'bg-[#F5F0EB] dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && agreedToTerms && !isSubmitting) {
      setIsSubmitting(true)

      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        if (response.ok) {
          setShowPopup(true)
          setEmail('')
          // Hide popup after 4 seconds
          setTimeout(() => {
            setShowPopup(false)
          }, 4000)
        } else {
          console.error('Failed to subscribe')
        }
      } catch (error) {
        console.error('Subscription error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <>
      <section className={`py-24 ${bgColor}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <span className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium mb-4 shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]">ΟΛΑ TA NEA ΣTO EMAIL ΣΑΣ!</span>
              <h2 className="text-xl md:text-2xl font-bold leading-tight mb-6 dark:text-gray-100">
                Γραφτείτε στο newsletter μας, για να<br />
                λαμβάνετε τις δράσεις του Δικτύου,<br />
                ευκαιρίες για επαγγελματίες και νέα από<br />
                το ελληνικό και παγκόσμιο πολιτιστικό<br />
                περιβάλλον.
              </h2>
            </div>

            {/* Right - Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Το email σας: *"
                    required
                    className="w-full px-6 py-4 pr-16 rounded-full border-2 border-gray-300 dark:border-gray-600 focus:border-coral focus:outline-none text-gray-700 dark:text-gray-200 dark:bg-gray-700"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !agreedToTerms}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-coral hover:bg-coral/90 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <svg
                        className="w-5 h-5 text-white animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-coral bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-coral focus:ring-2 cursor-pointer"
                  />
                  <label htmlFor="terms-checkbox" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPopup(false)}
            aria-hidden="true"
          />

          {/* Popup */}
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full animate-scale-in">
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-coral/10 dark:bg-coral/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-coral"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Message */}
              <h3 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-3">
                Καλώς ήρθες στην κοινότητα του CforC!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Ευχαριστούμε για το ενδιαφέρον στην κοινότητά μας :-)
              </p>

              {/* Close button */}
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

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
