'use client'

import { useState } from 'react'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/**
 * Το επιβεβαιωτικό βήμα της δήλωσης πληρωμής (προστασία από mail scanners),
 * με προαιρετικό ανέβασμα του αποδεικτικού κατάθεσης (PDF/εικόνα).
 */
export default function ClaimConfirm({ token, firstName }: { token: string; firstName: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadedReceipt, setUploadedReceipt] = useState(false)

  function onFile(f: File | null) {
    setFileError(null)
    if (!f) {
      setFile(null)
      return
    }
    if (!ALLOWED.includes(f.type)) {
      setFileError('Επιτρέπονται PDF ή εικόνες (JPG/PNG/WebP)')
      return
    }
    if (f.size > MAX_BYTES) {
      setFileError('Το αρχείο ξεπερνά τα 10MB')
      return
    }
    setFile(f)
  }

  async function confirm() {
    setState('busy')
    try {
      const fd = new FormData()
      fd.append('token', token)
      if (file) fd.append('receipt', file)
      const res = await fetch('/api/payment-claim', { method: 'POST', body: fd })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.ok) {
        setUploadedReceipt(!!json.receiptStored)
        setState('done')
      } else {
        setState('error')
      }
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
          Λάβαμε την ενημέρωση ότι ολοκλήρωσες την πληρωμή
          {uploadedReceipt ? ' μαζί με το αποδεικτικό της κατάθεσης' : ''}. Η ομάδα οικονομικών
          θα την επιβεβαιώσει σύντομα και θα ολοκληρώσουμε την εγγραφή σου — θα λάβεις email
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
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Πάτησε το κουμπί για να ενημερώσεις την ομάδα οικονομικών του Culture For Change
        ότι ολοκλήρωσες την καταβολή της συνδρομής εγγραφής.
      </p>

      <div className="text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600 p-5 mb-6">
        <label htmlFor="receipt" className="block font-bold text-sm text-charcoal dark:text-gray-100 mb-1">
          Αποδεικτικό κατάθεσης
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Ανέβασε το αποδεικτικό της τράπεζας (PDF ή φωτογραφία, έως 10MB) — επιταχύνει την
          επιβεβαίωση της πληρωμής σου.
        </p>
        <input
          id="receipt"
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          onChange={e => onFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-coral/10 file:text-coral file:font-bold file:cursor-pointer hover:file:bg-coral/20"
        />
        {file && (
          <p className="text-xs text-green-700 dark:text-green-400 mt-2 notranslate">✓ {file.name}</p>
        )}
        {fileError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{fileError}</p>}
      </div>

      <button
        type="button"
        disabled={state === 'busy'}
        onClick={confirm}
        className="bg-coral text-white font-bold rounded-full px-8 py-3 hover:bg-coral/90 transition-colors disabled:opacity-50"
      >
        {state === 'busy' ? 'Αποστολή…' : 'Έκανα την κατάθεση ✓'}
      </button>
      {!file && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Μπορείς να επιβεβαιώσεις και χωρίς αποδεικτικό — θα το ελέγξουμε απευθείας στην τράπεζα.
        </p>
      )}
      {state === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-4">
          Κάτι πήγε στραβά — δοκίμασε ξανά ή γράψε μας στο finance@cultureforchange.net.
        </p>
      )}
    </>
  )
}
