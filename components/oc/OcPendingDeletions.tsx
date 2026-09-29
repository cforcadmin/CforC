'use client'

/**
 * Εκκρεμείς χειροκίνητες διαγραφές.
 *
 * Το σύστημα ΔΕΝ σβήνει υποψήφια μέλη (απόφαση ΟΣ, 29/9/2026). Όταν λήξει
 * άπρακτη η προθεσμία των 30 ημερών, φεύγει αίτημα στην community@ και η
 * εκκρεμότητα εμφανίζεται εδώ ώσπου κάποιος να τη σβήσει και να το δηλώσει.
 *
 * Το κουμπί «Έγινε» ΔΕΝ σβήνει τίποτα — σφραγίζει την απόδειξη. Και ο server
 * ελέγχει πρώτα ότι η αίτηση όντως δεν υπάρχει πια: μια σφραγίδα «έγινε» πάνω
 * σε αίτηση που στέκει ακόμη είναι ψέμα σε αρχείο δεκαετίας.
 *
 * Δεν εμφανίζεται τίποτα όταν δεν υπάρχουν εκκρεμότητες — η οθόνη δεν κερδίζει
 * από ένα μόνιμο άδειο κουτί.
 */

import { useCallback, useEffect, useState } from 'react'

interface Item {
  ref: string
  outcome: 'no-payment-30d' | 'rejected-by-vote'
  decisionDate: string | null
  deadlineExpiredAt: string | null
  daysElapsed: number | null
  stillInStrapi: boolean
}

const grDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function OcPendingDeletions() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/oc/applications/pending-deletions', { cache: 'no-store' })
      if (!res.ok) return setItems([])
      const j = await res.json()
      setItems(j.items || [])
    } catch { setItems([]) }
  }, [])
  useEffect(() => { load() }, [load])

  async function confirm(ref: string) {
    setBusy(ref); setError(null)
    try {
      const res = await fetch('/api/oc/applications/pending-deletions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Αποτυχία')
      await load()
    } catch (err: any) {
      setError(err?.message || 'Κάτι πήγε στραβά')
    } finally { setBusy(null) }
  }

  if (!items || items.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-amber-300 dark:border-amber-700">
      <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-1">
        ΕΚΚΡΕΜΕΙ ΧΕΙΡΟΚΙΝΗΤΗ ΔΙΑΓΡΑΦΗ
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Η προθεσμία πέρασε άπρακτη. Το σύστημα <strong>δεν σβήνει μόνο του</strong> — σβήνει άνθρωπος,
        και μετά το δηλώνει εδώ. Πρέπει να φύγουν <strong>και τα τρία</strong>: η αίτηση στο Strapi,
        η φωτογραφία στη Βιβλιοθήκη Πολυμέσων, η γραμμή στα ΕΓΚΕΚΡΙΜΕΝΑ του φύλλου.
      </p>

      {error && <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>}

      <div className="grid gap-2">
        {items.map(it => (
          <div key={it.ref}
            className="rounded-2xl border border-gray-200 dark:border-gray-600 px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-xs text-gray-500">{it.ref}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              έγκριση {grDate(it.decisionDate)}
              {it.daysElapsed !== null && ` · ${it.daysElapsed} ημέρες`}
            </span>
            {it.stillInStrapi ? (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-200">
                υπάρχει ακόμη στο Strapi
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                σβήστηκε — λείπει μόνο η δήλωση
              </span>
            )}
            <button type="button" onClick={() => confirm(it.ref)} disabled={busy === it.ref}
              title={it.stillInStrapi
                ? 'Σβήσε πρώτα την αίτηση — ο έλεγχος θα το απορρίψει'
                : 'Σφραγίζει την απόδειξη ότι η διαγραφή έγινε'}
              className="ml-auto px-4 min-h-11 rounded-full bg-coral text-white text-sm font-bold disabled:opacity-50">
              {busy === it.ref ? '…' : 'Έγινε'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
