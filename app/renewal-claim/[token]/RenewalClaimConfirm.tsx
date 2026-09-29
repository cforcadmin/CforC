'use client'

import { useState } from 'react'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/**
 * Επιβεβαιωτικό κλικ της δήλωσης πληρωμής συνδρομής (ανανέωση μέλους),
 * με ΥΠΟΧΡΕΩΤΙΚΟ αποδεικτικό κατάθεσης.
 *
 * Το σκέτο κουμπί δεν απέδειξε ποτέ τίποτα: μέλη το πάτησαν καλόπιστα ενώ η
 * τράπεζα είχε γυρίσει πίσω τα χρήματα, και η συνδρομή έμοιαζε πληρωμένη.
 * Η διατύπωση επιμένει στο ΠΑΡΑΣΤΑΤΙΚΟ και όχι στο στιγμιότυπο οθόνης: ένα
 * στιγμιότυπο δείχνει μια οθόνη «η πληρωμή στάλθηκε», που μπορεί να μην
 * ολοκληρώθηκε ποτέ.
 */
export default function RenewalClaimConfirm({ token, firstName }: { token: string; firstName: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  function onFile(f: File | null) {
    setFileError(null)
    if (!f) { setFile(null); return }
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

  async function submit() {
    if (!file) { setFileError('Πρόσθεσε πρώτα το αποδεικτικό'); return }
    setState('sending'); setServerError(null)
    try {
      const fd = new FormData()
      fd.append('token', token)
      fd.append('receipt', file)
      const res = await fetch('/api/renewal-claim', { method: 'POST', body: fd })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.ok) { setState('done'); return }
      setServerError(json?.message || 'Κάτι πήγε στραβά')
      setState('error')
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
          Η δήλωση πληρωμής σου καταχωρήθηκε μαζί με το αποδεικτικό, και η ομάδα οικονομικών
          ειδοποιήθηκε. Μόλις η κατάθεση φανεί στον λογαριασμό θα λάβεις την απόδειξή σου με email.
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
        Επιβεβαίωση πληρωμής συνδρομής
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {firstName ? `${firstName}, ανέβασε` : 'Ανέβασε'} το αποδεικτικό της κατάθεσης και πάτησε
        το κουμπί — έτσι η ομάδα οικονομικών μπορεί να αντιπαραβάλει την πληρωμή σου με την
        κίνηση του λογαριασμού.
      </p>

      {/* Η διάκριση παραστατικό / στιγμιότυπο είναι ΟΛΟ το νόημα αυτής της
          αλλαγής, γι' αυτό στέκεται μόνη της σε κουτί και δεν κρύβεται σε
          παρένθεση μέσα σε παράγραφο. */}
      <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 text-left">
        <p className="font-bold text-charcoal dark:text-amber-100 mb-1">
          Το παραστατικό της τράπεζας — όχι στιγμιότυπο οθόνης
        </p>
        <p className="text-sm text-gray-700 dark:text-amber-100/90">
          Από το e-banking, «Αποδεικτικό συναλλαγής» ή «Απόδειξη πληρωμής» σε <strong>PDF</strong>.
          Ένα στιγμιότυπο δείχνει μόνο ότι η εντολή στάλθηκε· έχει συμβεί η τράπεζα να γυρίσει
          πίσω τα χρήματα και η συνδρομή να μείνει απλήρωτη χωρίς να το ξέρει κανείς.
        </p>
        <p className="text-sm text-gray-700 dark:text-amber-100/90 mt-2">
          Αν πλήρωσες σε κατάστημα, φωτογράφισε το χάρτινο παραστατικό — αυτό είναι μια χαρά.
        </p>
      </div>

      <label className="block text-left mb-2 text-sm font-semibold text-charcoal dark:text-gray-200">
        Αποδεικτικό κατάθεσης <span className="text-red-600">*</span>
      </label>
      <input type="file" accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
        onChange={e => onFile(e.target.files?.[0] || null)}
        className="block w-full text-sm mb-1 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-coral/15 file:text-charcoal dark:file:text-coral-light hover:file:bg-coral/25" />
      <p className="text-xs text-gray-500 mb-2">PDF κατά προτίμηση · έως 10MB</p>
      {file && !fileError && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">Επιλέχθηκε: {file.name}</p>
      )}
      {fileError && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{fileError}</p>}

      <button type="button" onClick={submit} disabled={state === 'sending' || !file}
        className="mt-4 px-8 py-4 rounded-full bg-charcoal dark:bg-coral text-white font-bold text-lg hover:opacity-90 disabled:opacity-40">
        {state === 'sending' ? 'Καταχώρηση…' : 'Έκανα την κατάθεση ✓'}
      </button>

      {state === 'error' && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {serverError || 'Κάτι πήγε στραβά'} — δοκίμασε ξανά ή γράψε μας στο finance@cultureforchange.net.
        </p>
      )}
    </>
  )
}
