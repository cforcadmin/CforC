'use client'

import { useState } from 'react'

interface MembershipRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
}

export default function MembershipRegistrationModal({
  isOpen,
  onClose,
  onProceed
}: MembershipRegistrationModalProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  if (!isOpen) return null

  const handleProceed = () => {
    if (agreedToTerms) {
      onProceed()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-coral dark:bg-gray-700 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Εγγραφή στο Culture for Change
                </h2>
                <p className="text-sm text-white/80">
                  Καλώς ήρθες στην κοινότητά μας!
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Greeting */}
          <div className="text-gray-700 dark:text-gray-300">
            <p className="text-lg mb-4">
              Αγαπητή/Αγαπητέ καλησπέρα/καλημέρα,
            </p>
            <p className="mb-4">
              Ευχαριστούμε πολύ για την εκδήλωση ενδιαφέροντος συμμετοχής στο Δίκτυο Culture for Change!
            </p>
          </div>

          {/* Documents Info */}
          <div className="bg-orange-50 dark:bg-gray-700/50 rounded-2xl p-5">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Όπως ορίζεται από το{' '}
              <a
                href="https://drive.google.com/file/d/1ZoV1-IPNDgQppqWqlNKqML8-hGUhPZ7K/view?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral dark:text-coral-light font-medium hover:underline"
              >
                Καταστατικό
              </a>
              {' '}(Άρθρο 5: Α) και τον{' '}
              <a
                href="https://drive.google.com/file/d/1m5LtXNM8PomuBn4_ZfvpeQguTruoy3wd/view?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral dark:text-coral-light font-medium hover:underline"
              >
                Εσωτερικό Κανονισμό
              </a>
              {' '}(Κεφάλαιο Γ΄), κάθε άτομο που επιθυμεί να εγγραφεί στο CforC ως νέο τακτικό μέλος πρέπει να συμπληρώσει μια ειδικά διαμορφωμένη αίτηση εγγραφής.
            </p>
          </div>

          {/* Evaluation Info */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Οι Αιτήσεις νέων μελών αξιολογούνται από την Ομάδα Συντονισμού του δικτύου στην επόμενη τακτική συνέλευση και κατόπιν θα λάβεις ενημέρωση σχετικά με την έκβαση του αιτήματός σου, αν μέχρι τότε έχεις συμπληρώσει την παραπάνω φόρμα.
            </p>
          </div>

          {/* Key Information */}
          <div>
            <h3 className="font-bold text-charcoal dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Βασικές πληροφορίες πριν την εγγραφή:
            </h3>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-coral dark:bg-coral-light rounded-full mt-2 flex-shrink-0"></span>
                <span>Το ετήσιο κόστος συμμετοχής στο CforC είναι <strong>35€</strong>, η εγγραφή είναι <strong>10€</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-coral dark:bg-coral-light rounded-full mt-2 flex-shrink-0"></span>
                <span>Η Γενική Συνέλευση λαμβάνει χώρα μία φορά το χρόνο κατά το πρώτο τρίμηνο του έτους και το ΔΣ έχει διετή θητεία.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-coral dark:bg-coral-light rounded-full mt-2 flex-shrink-0"></span>
                <span>Τα μέλη έχουν πρόσβαση σε προνόμια όπως: Συμμετοχή, Δικτύωση, Ανάπτυξη Ικανοτήτων, Συνηγορία, Υποστήριξη, και ευκαιρίες Απασχόλησης.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-coral dark:bg-coral-light rounded-full mt-2 flex-shrink-0"></span>
                <span>Τα μέλη έχουν πρόσβαση στην πλατφόρμα του Robert Bosch Alumni Network με τη δυνατότητα να σύνδεσης με μια διεθνή κοινότητα επαγγελματιών του κοινωνικού πολιτισμού και πρόσβαση σε mini grants.</span>
              </li>
            </ul>
          </div>

          {/* Additional Resources */}
          <div className="bg-orange-50 dark:bg-gray-700/50 rounded-2xl p-5">
            <p className="text-gray-700 dark:text-gray-300">
              Σε{' '}
              <a
                href="https://drive.google.com/file/d/15W7MDuTKvdgRo-TjPUn8ZDOS4mrDtbpf/view?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral dark:text-coral-light font-medium hover:underline"
              >
                αυτό το αρχείο
              </a>
              {' '}θα βρεις βασικές πληροφορίες για τα χαρακτηριστικά του δικτύου και τρόπους συμμετοχής.
            </p>
          </div>

          {/* Social Media */}
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Σε προσκαλούμε να ακολουθήσεις τα κοινωνικά μέσα του CforC για να ενημερώνεσαι για τη δραστηριότητα μας:
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.facebook.com/cultureforchange"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
              <a
                href="https://www.instagram.com/culture_for_change"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
              <a
                href="https://www.linkedin.com/company/culture-for-change-gr/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a
                href="https://www.youtube.com/channel/UCKFq7TQlenx36UPc3F63Opw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </a>
            </div>
          </div>

          {/* Closing */}
          <div className="text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600 pt-6">
            <p>Ευχαριστούμε πολύ και για οτιδήποτε είμαστε στη διάθεσή σου!</p>
          </div>
        </div>

        {/* Footer with Checkbox and Button */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 p-6 border-t border-gray-200 dark:border-gray-600 rounded-b-3xl">
          {/* Checkbox */}
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="membership-terms-checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-5 h-5 mt-0.5 text-coral bg-white border-gray-300 rounded focus:ring-coral focus:ring-2 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="membership-terms-checkbox" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Διάβασα και συμφωνώ με το{' '}
              <a
                href="https://drive.google.com/file/d/1ZoV1-IPNDgQppqWqlNKqML8-hGUhPZ7K/view?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral dark:text-coral-light font-medium hover:underline"
              >
                καταστατικό
              </a>
              {' '}και τον{' '}
              <a
                href="https://drive.google.com/file/d/1m5LtXNM8PomuBn4_ZfvpeQguTruoy3wd/view?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral dark:text-coral-light font-medium hover:underline"
              >
                εσωτερικό κανονισμό
              </a>
              {' '}του CforC.
            </label>
          </div>

          {/* Button */}
          <button
            onClick={handleProceed}
            disabled={!agreedToTerms}
            className="w-full bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white dark:text-gray-900 px-6 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            ΣΥΜΠΛΗΡΩΣΕ ΤΗ ΦΟΡΜΑ ΕΓΓΡΑΦΗΣ
          </button>
        </div>
      </div>
    </div>
  )
}
