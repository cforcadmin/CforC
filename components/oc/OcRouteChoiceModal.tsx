'use client'

import { useState } from 'react'

export type OcDestination = 'members' | 'oc'

interface OcRouteChoiceModalProps {
  onChoose: (dest: OcDestination) => void
  onDismiss: () => void
}

/**
 * Small dismissible popup shown to board members right after login:
 * «Περιοχή μελών» / «Operational Center», with an optional "remember my
 * choice" that makes future logins route automatically.
 *
 * The preference is persisted SERVER-SIDE (/api/oc/prefs, httpOnly cookie)
 * because client storage is unreliable under content blockers.
 * Seat selection for multi-seat members happens inside the OC shell.
 * Dismissing (X or backdrop) falls back to the members area.
 */
export default function OcRouteChoiceModal({ onChoose, onDismiss }: OcRouteChoiceModalProps) {
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)

  async function chooseDest(dest: OcDestination) {
    if (busy) return
    if (remember) {
      setBusy(true)
      try {
        await fetch('/api/oc/prefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landing: dest }),
          keepalive: true,
        })
      } catch {
        // Non-fatal — preference will be asked again next login
      }
    }
    onChoose(dest)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oc-choice-title"
      onClick={onDismiss}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-flyIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="oc-choice-title" className="text-lg font-bold text-charcoal dark:text-gray-100">
            Πού θέλεις να μεταβείς;
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

        <div className="space-y-3 mb-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => chooseDest('members')}
            className="w-full bg-white dark:bg-gray-700 border-2 border-charcoal dark:border-gray-400 text-charcoal dark:text-gray-100 font-medium rounded-2xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left disabled:opacity-60"
          >
            Περιοχή μελών
            <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
              Το προφίλ σου και ό,τι βλέπει κάθε μέλος
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => chooseDest('oc')}
            className="w-full bg-coral text-white font-medium rounded-2xl px-4 py-3 hover:bg-coral/90 transition-colors text-left disabled:opacity-60"
          >
            Operational Center
            <span className="block text-xs text-white/80 font-normal mt-0.5">
              Ο χώρος εργασίας της Συντονιστικής Ομάδας
            </span>
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            className="accent-[#FF8B6A]"
          />
          Να θυμάσαι την επιλογή μου
        </label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Αλλάζει από OC → Ρυθμίσεις.
        </p>
      </div>
    </div>
  )
}
