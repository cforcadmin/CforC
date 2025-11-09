'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && !isSubmitting) {
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
          // You could show an error message here
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
      <section className="py-24 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <p className="text-coral text-sm font-medium mb-4">ΟΛΑ TA NEA ΣTO EMAIL ΣΑΣ!</p>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
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
                    className="w-full px-6 py-4 pr-16 rounded-full border-2 border-gray-300 focus:border-coral focus:outline-none text-gray-700"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
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
                <p className="text-sm text-gray-600">
                  Με την υποβολή συμφωνείτε με τους{' '}
                  <Link href="/terms" className="text-charcoal font-medium hover:text-coral transition-colors underline">
                    όρους και τις προϋποθέσεις
                  </Link>{' '}
                  μας.
                </p>
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
          />

          {/* Popup */}
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full animate-scale-in">
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <h3 className="text-2xl font-bold text-charcoal mb-3">
                Καλώς ήρθες στην κοινότητα του CforC!
              </h3>
              <p className="text-gray-600 leading-relaxed">
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
