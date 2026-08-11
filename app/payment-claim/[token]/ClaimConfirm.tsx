'use client'

import { useState } from 'react'

/** Το επιβεβαιωτικό κλικ της δήλωσης πληρωμής (προστασία από mail scanners). */
export default function ClaimConfirm({ token, firstName }: { token: string; firstName: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  async function confirm() {
    setState('busy')
    try {
      const res = await fetch('/api/payment-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json().catch(() => null)
      setState(res.ok && json?.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <>
        <div className="w-20 h-20 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
          Σε ευχαριστούμε{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Λάβαμε την ενημέρωση ότι ολοκλήρωσες την πληρωμή. Η ομάδα οικονομικών θα την
          επιβεβαιώσει σύντομα και θα ολοκληρώσουμε την εγγραφή σου — θα λάβεις email
          με τις οδηγίες πρώτης σύνδεσης. Καλώς όρισες! 💛
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
        Επιβεβαίωση πληρωμής{firstName ? ` — ${firstName}` : ''}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        Πάτησε το κουμπί για να ενημερώσεις την ομάδα οικονομικών του Culture For Change
        ότι ολοκλήρωσες την καταβολή της συνδρομής εγγραφής.
      </p>
      <button
        type="button"
        disabled={state === 'busy'}
        onClick={confirm}
        className="bg-coral text-white font-bold rounded-full px-8 py-3 hover:bg-coral/90 transition-colors disabled:opacity-50"
      >
        {state === 'busy' ? 'Αποστολή…' : 'Έκανα την κατάθεση ✓'}
      </button>
      {state === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-4">
          Κάτι πήγε στραβά — δοκίμασε ξανά ή γράψε μας στο finance@cultureforchange.net.
        </p>
      )}
    </>
  )
}
