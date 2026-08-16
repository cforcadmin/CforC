'use client'

import { useState } from 'react'

/** Επιβεβαιωτικό κλικ της δήλωσης πληρωμής συνδρομής (ανανέωση μέλους). */
export default function RenewalClaimConfirm({ token, firstName }: { token: string; firstName: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit() {
    setState('sending')
    try {
      const res = await fetch('/api/renewal-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <>
        <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
          Ευχαριστούμε{firstName ? `, ${firstName}` : ''}! 🎉
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Η δήλωση πληρωμής σου καταχωρήθηκε και η ομάδα οικονομικών ειδοποιήθηκε.
          Μόλις επιβεβαιωθεί η κατάθεση θα λάβεις την απόδειξή σου με email.
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
        Επιβεβαίωση πληρωμής συνδρομής
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        {firstName ? `${firstName}, πάτησε` : 'Πάτησε'} το κουμπί για να μας ενημερώσεις
        ότι έκανες την κατάθεση της συνδρομής σου — έτσι η ομάδα οικονομικών θα την
        αναζητήσει στον λογαριασμό και θα λάβεις την απόδειξή σου συντομότερα.
      </p>
      <button type="button" onClick={submit} disabled={state === 'sending'}
        className="px-8 py-4 rounded-full bg-charcoal dark:bg-coral text-white font-bold text-lg hover:opacity-90 disabled:opacity-50">
        {state === 'sending' ? 'Καταχώρηση…' : 'Έκανα την κατάθεση ✓'}
      </button>
      {state === 'error' && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Κάτι πήγε στραβά — δοκίμασε ξανά ή γράψε μας στο finance@cultureforchange.net.
        </p>
      )}
    </>
  )
}
