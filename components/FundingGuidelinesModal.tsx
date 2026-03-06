'use client'

import { useState, useEffect } from 'react'

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
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-3 rounded-full border border-coral dark:border-coral-light text-sm font-medium text-coral dark:text-coral-light hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors whitespace-nowrap"
        aria-label="Οδηγίες χρηματοδότησης"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Οδηγίες Χρηματοδότησης</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Οδηγίες χρηματοδότησης"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl px-8 py-6 flex items-center justify-between z-10">
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
                    className="group block bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 hover:shadow-lg hover:bg-white dark:hover:bg-gray-600 transition-all duration-300 border border-transparent hover:border-coral/30"
                    aria-label={`${resource.title} (ανοίγει σε νέα καρτέλα)`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-charcoal dark:text-gray-100 group-hover:text-coral dark:group-hover:text-coral-light transition-colors mb-1 flex items-center gap-2">
                          <span className="truncate">{resource.title}</span>
                          <svg className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{resource.description}</p>
                      </div>
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
