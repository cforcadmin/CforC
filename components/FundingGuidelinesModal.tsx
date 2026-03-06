'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

const FUNDING_RESOURCES = [
  {
    title: 'On The Move – Funding Resources',
    description: 'Συγκεντρωμένοι πόροι χρηματοδότησης για τη διεθνή κινητικότητα καλλιτεχνών και πολιτιστικών επαγγελματιών.',
    url: 'https://on-the-move.org/resources/funding',
    image: '/funding/on-the-move.png'
  },
  {
    title: 'CulturEU Funding Guide',
    description: 'Οδηγός χρηματοδοτικών ευκαιριών της ΕΕ για τους πολιτιστικούς και δημιουργικούς τομείς 2021-2027.',
    url: 'https://culture.ec.europa.eu/funding/cultureu-funding-guide',
    image: '/funding/cultureu.png'
  },
  {
    title: 'EU Funding & Tenders Portal',
    description: 'Η κεντρική πύλη της Ευρωπαϊκής Επιτροπής για ευκαιρίες χρηματοδότησης και προσκλήσεις υποβολής προτάσεων.',
    url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home',
    image: '/funding/eu-portal.png'
  },
  {
    title: 'European Funding Guide',
    description: 'Πλατφόρμα αναζήτησης ευρωπαϊκών υποτροφιών και χρηματοδοτήσεων για φοιτητές, ερευνητές και οργανισμούς.',
    url: 'https://www.european-funding-guide.eu',
    image: '/funding/eu-funding-guide.png'
  },
  {
    title: 'EU Calls – Complete Guide',
    description: 'Πλήρης οδηγός για τις ευρωπαϊκές χρηματοδοτήσεις με αναλυτικές πληροφορίες και συμβουλές υποβολής.',
    url: 'https://eucalls.net/blog/eu-funding-complete-guide',
    image: '/funding/eucalls.png'
  },
  {
    title: 'EU Funding Explained (Video)',
    description: 'Βίντεο-οδηγός για την κατανόηση των μηχανισμών χρηματοδότησης της Ευρωπαϊκής Ένωσης.',
    url: 'https://www.facebook.com/watch/?v=1398833545173816',
    image: '/funding/video-guide.png'
  }
]

export default function FundingGuidelinesModal() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)

  useEffect(() => {
    if (isOpen || showMemberModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, showMemberModal])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setShowMemberModal(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleClick = () => {
    if (user) {
      setIsOpen(true)
    } else {
      setShowMemberModal(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-3 rounded-full border border-charcoal dark:border-gray-400 text-sm font-medium text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
        aria-label="Οδηγίες χρηματοδότησης"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Οδηγίες Χρηματοδότησης</span>
      </button>

      {/* Members-Only Modal (logged out) */}
      {showMemberModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMemberModal(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Περιεχόμενο μελών"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 relative">
            <button
              type="button"
              onClick={() => setShowMemberModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Κλείσιμο"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-coral dark:text-coral-light mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 dark:text-gray-100">Περιεχόμενο Μελών</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Οι οδηγίες χρηματοδότησης είναι διαθέσιμες μόνο για εγγεγραμμένα μέλη. Εγγραφείτε για πρόσβαση.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/participation"
                  className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
                  onClick={() => setShowMemberModal(false)}
                >
                  Εγγραφή
                </Link>
                <Link
                  href="/login"
                  className="bg-white dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-white transition-colors"
                  onClick={() => setShowMemberModal(false)}
                >
                  Σύνδεση
                </Link>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Funding Guidelines Modal (logged in) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Οδηγίες χρηματοδότησης"
        >
          <div className="bg-[#F5F0EB] dark:bg-gray-900 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-[#F5F0EB] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl px-8 py-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Οδηγίες Χρηματοδότησης</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Χρήσιμοι πόροι για ευκαιρίες χρηματοδότησης</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Κλείσιμο"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {FUNDING_RESOURCES.map((resource) => (
                  <a
                    key={resource.url}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light p-5 flex flex-col"
                    aria-label={`${resource.title} (ανοίγει σε νέα καρτέλα)`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full">
                        Χρηματοδότηση
                      </span>
                    </div>

                    <h3 className="text-lg font-bold mb-2 text-charcoal dark:text-gray-100 group-hover:text-coral dark:group-hover:text-coral-light transition-colors line-clamp-2">
                      {resource.title}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3 leading-relaxed">
                      {resource.description}
                    </p>

                    <div className="flex-1" />
                    <div className="flex items-center justify-end pt-2">
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
