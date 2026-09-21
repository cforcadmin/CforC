'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * «Τα εξοδολόγιά μου» στον χώρο του μέλους.
 *
 * Δείχνει την κατάσταση κάθε υποβολής — γιατί το πρώτο πράγμα που θέλει να
 * ξέρει κάποιος που έβαλε χρήματα από την τσέπη του είναι αν πληρώθηκε.
 */

interface MyClaim {
  claimNumber: string
  submittedAt: string
  eventLabel: string
  eventStart: string
  eventEnd: string
  total: number
  advance: number
  payable: number
  state: 'submitted' | 'paid' | 'cancelled'
  paidAt: string | null
  lines: number
  pdfUrl: string | null
  folderUrl: string | null
}

const money = (n: number) => n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const grDate = (iso: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

const STATE: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Σε αναμονή πληρωμής', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  paid: { label: 'Πληρώθηκε', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  cancelled: { label: 'Ακυρώθηκε', className: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

export default function MyExpenseClaims() {
  const [claims, setClaims] = useState<MyClaim[] | null>(null)

  useEffect(() => {
    fetch('/api/expenses/mine')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setClaims(d?.claims || []))
      .catch(() => setClaims([]))
  }, [])

  const pending = (claims || []).filter(c => c.state === 'submitted')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Τα εξοδολόγιά μου</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Κάλυψη εξόδων για δράσεις του δικτύου — μετακίνηση, διαμονή, διατροφή.
          </p>
        </div>
        <Link href="/expenses"
          className="bg-coral text-white font-bold rounded-full px-6 py-3 hover:bg-coral/90 transition-colors whitespace-nowrap">
          + Νέο εξοδολόγιο
        </Link>
      </div>

      {claims === null && <p className="text-gray-500 dark:text-gray-400">Φόρτωση…</p>}

      {claims?.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Δεν έχεις υποβάλει εξοδολόγιο ακόμη.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Αν κάλυψες έξοδα για δράση επιλέξιμη για κάλυψή τους από το δίκτυο, υπόβαλε εξοδολόγιο και θα σου επιστραφούν.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
          {pending.length === 1 ? 'Ένα εξοδολόγιο περιμένει' : `${pending.length} εξοδολόγια περιμένουν`} πληρωμή —
          συνολικά <span className="font-bold notranslate">{money(pending.reduce((s, c) => s + c.payable, 0))} €</span>.
        </p>
      )}

      <div className="space-y-4">
        {(claims || []).map(c => {
          const state = STATE[c.state] || STATE.submitted
          return (
            <div key={c.claimNumber}
              className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <span className="font-bold text-charcoal dark:text-gray-100">{c.eventLabel}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 notranslate">{c.claimNumber}</span>
                </div>
                <span className="text-xl font-bold text-charcoal dark:text-gray-100 notranslate">{money(c.payable)} €</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${state.className}`}>
                  {state.label}{c.state === 'paid' && c.paidAt ? ` · ${grDate(c.paidAt)}` : ''}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {grDate(c.eventStart)} – {grDate(c.eventEnd)} · {c.lines}{' '}
                  {c.lines === 1 ? 'έξοδο' : 'έξοδα'}
                  {c.advance > 0 && ` · σύνολο ${money(c.total)} € μείον προκαταβολή ${money(c.advance)} €`}
                </span>
                <span className="flex items-center gap-4 ml-auto">
                  {c.pdfUrl && (
                    <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-bold text-coral dark:text-coral-light hover:underline">
                      Το εξοδολόγιο ↗
                    </a>
                  )}
                  {c.folderUrl && (
                    <a href={c.folderUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-bold text-coral dark:text-coral-light hover:underline">
                      Τα παραστατικά ↗
                    </a>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
