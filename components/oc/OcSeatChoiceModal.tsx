'use client'

import { OC_SEAT_LABELS } from '@/components/oc/ocPrefs'

interface OcSeatChoiceModalProps {
  seats: string[]
  onChoose: (seat: string) => void
  onDismiss: () => void
}

/**
 * TEMPORARY chooser while one person holds several OC seats: asks which
 * seat to enter the OC as (e.g. IT vs Οικονομικά). Shown on every OC entry
 * for multi-seat members — the choice is deliberately not remembered.
 */
export default function OcSeatChoiceModal({ seats, onChoose, onDismiss }: OcSeatChoiceModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oc-seat-title"
      onClick={onDismiss}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-flyIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="oc-seat-title" className="text-lg font-bold text-charcoal dark:text-gray-100">
            Με ποιον ρόλο θα συνδεθείς;
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-200 transition-colors -mt-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {seats.map(seat => (
            <button
              key={seat}
              type="button"
              onClick={() => onChoose(seat)}
              className="w-full bg-white dark:bg-gray-700 border-2 border-charcoal dark:border-gray-400 text-charcoal dark:text-gray-100 font-medium rounded-2xl px-4 py-3 hover:border-coral hover:text-coral dark:hover:border-coral-light dark:hover:text-coral-light transition-colors text-left"
            >
              {OC_SEAT_LABELS[seat] || seat}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Κατέχεις περισσότερους από έναν ρόλους — επίλεξε με ποιον θα εργαστείς τώρα.
        </p>
      </div>
    </div>
  )
}
