'use client'

import { useState } from 'react'

/**
 * Popup ανεξόφλητων συνδρομών — ανοίγει από το tile «Πληρωμένο {έτος}»
 * της Επισκόπησης ΚΑΙ από το badge της κάρτας Συνδρομών στα Οικονομικά.
 * Ίδια μηχανική με το popup «Εγκρίθηκαν — αναμονή πληρωμής»: όσοι δήλωσαν
 * πληρωμή (teal) πρώτοι, και ο/η Financer εκδίδει την απόδειξη επιτόπου —
 * μία ανά οφειλόμενο έτος, μέσα από το κανονικό μονοπάτι έκδοσης
 * (εγγραφή, PDF, email, ενημέρωση πληρωμών).
 */

export interface RenewalRow {
  docId: string
  name: string
  am: number
  payments: Record<string, 0 | 1 | null>
  status: string
  renewalClaimedAt: string | null
  reminderSentAt: string | null
}

type RowBusy = 'idle' | 'issuing' | 'issued' | 'reminding' | 'reminded' | 'error'

export default function OcRenewalsPopup({ members, canIssue, canRemind, onClose, onChanged }: {
  members: RenewalRow[]
  canIssue: boolean
  canRemind: boolean
  onClose: () => void
  onChanged?: () => void
}) {
  const [busy, setBusy] = useState<Record<string, RowBusy>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [confirmIssue, setConfirmIssue] = useState<string | null>(null)
  const year = new Date().getFullYear()

  const unpaid = members
    .filter(m => m.status === 'owes-1' || m.status === 'owes-2' || m.status === 'new-unpaid')
    .sort((a, b) => {
      const ca = a.renewalClaimedAt ? 0 : 1
      const cb = b.renewalClaimedAt ? 0 : 1
      if (ca !== cb) return ca - cb
      return a.name.localeCompare(b.name, 'el')
    })
  const claims = unpaid.filter(m => m.renewalClaimedAt).length

  function owedYears(m: RenewalRow): number[] {
    const owed: number[] = []
    const prev = m.payments[String(year - 1)]
    if (prev !== 1 && prev !== 0 && m.status !== 'new-unpaid') owed.push(year - 1)
    const cur = m.payments[String(year)]
    if (cur !== 1 && cur !== 0) owed.push(year)
    return owed.length ? owed : [year]
  }

  async function issue(m: RenewalRow) {
    setConfirmIssue(null)
    setBusy(s => ({ ...s, [m.docId]: 'issuing' }))
    const years = owedYears(m)
    const issued: number[] = []
    try {
      for (const y of years) {
        const res = await fetch('/api/oc/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'issue', type: 'subscription', amount: 35, year: y,
            memberDocId: m.docId, memberName: m.name, sendEmail: true,
            paymentMethod: 'bank',
            notes: 'Έκδοση από popup ανεξόφλητων συνδρομών',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
        issued.push(data.number)
      }
      setBusy(s => ({ ...s, [m.docId]: 'issued' }))
      setNotes(n => ({ ...n, [m.docId]: `ΑΠ. ΕΙΣ. ${issued.join(', ')} · email ✓` }))
      onChanged?.()
    } catch (err: any) {
      setBusy(s => ({ ...s, [m.docId]: 'error' }))
      setNotes(n => ({ ...n, [m.docId]: `${issued.length ? `Εκδόθηκαν: ${issued.join(', ')} · ` : ''}${err?.message || 'Αποτυχία'}` }))
    }
  }

  async function remind(m: RenewalRow) {
    setBusy(s => ({ ...s, [m.docId]: 'reminding' }))
    try {
      const res = await fetch('/api/oc/subscription-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberDocId: m.docId }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      setBusy(s => ({ ...s, [m.docId]: 'reminded' }))
      setNotes(n => ({ ...n, [m.docId]: 'Υπενθύμιση εστάλη ✉✓' }))
      onChanged?.()
    } catch (err: any) {
      setBusy(s => ({ ...s, [m.docId]: 'error' }))
      setNotes(n => ({ ...n, [m.docId]: err?.message || 'Αποτυχία υπενθύμισης' }))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Ανεξόφλητες συνδρομές"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="font-bold text-lg text-charcoal dark:text-gray-100">
            Ανεξόφλητες συνδρομές {year}
            <span className="ml-2 text-sm font-normal text-gray-400">({unpaid.length})</span>
          </h3>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-200 text-xl leading-none" aria-label="Κλείσιμο">
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {claims > 0 ? `${claims} δήλωσαν ότι πλήρωσαν (💶 πρώτοι στη λίστα). ` : ''}
          «Έκδοση απόδειξης» = εγγραφή, PDF με email στο μέλος και ενημέρωση πληρωμών, αυτόματα.
          {canIssue ? '' : ' Έκδοση: μόνο ο ενεργός ρόλος Financer.'}
        </p>

        {unpaid.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Καμία ανεξόφλητη συνδρομή. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {unpaid.map(m => {
              const st = busy[m.docId] || 'idle'
              const owed = owedYears(m)
              const claimed = !!m.renewalClaimedAt
              return (
                <li key={m.docId}
                  className={`rounded-2xl border p-3.5 ${
                    claimed
                      ? 'bg-teal-50 dark:bg-teal-900/25 border-teal-300 dark:border-teal-700'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-medium text-sm text-charcoal dark:text-gray-100">
                      {claimed && <span className="mr-1" aria-hidden="true">💶</span>}
                      {m.name} <span className="text-gray-400 text-xs notranslate">ΑΜ {m.am}</span>
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 notranslate">
                      οφείλει {owed.join('+')} · {owed.length * 35},00 €
                    </span>
                    {claimed && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-600 text-white font-bold notranslate">
                        δήλωσε πληρωμή {new Date(m.renewalClaimedAt!).toLocaleDateString('el-GR')}
                      </span>
                    )}
                    {m.reminderSentAt && st !== 'reminded' && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-sky-400 text-sky-700 dark:text-sky-300 notranslate">
                        ✉ υπενθύμιση {new Date(m.reminderSentAt).toLocaleDateString('el-GR')}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      {st === 'issued' || st === 'reminded' || st === 'error' ? (
                        <span className={`text-xs font-medium notranslate ${st === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-300'}`}>
                          {notes[m.docId]}
                        </span>
                      ) : confirmIssue === m.docId ? (
                        <>
                          <span className="text-xs text-charcoal dark:text-gray-200">
                            Έκδοση {owed.length > 1 ? `${owed.length} αποδείξεων` : 'απόδειξης'} ({owed.length * 35} €);
                          </span>
                          <button type="button" onClick={() => issue(m)}
                            className="px-3 py-1.5 rounded-full bg-[#6A994E] text-white text-xs font-bold hover:opacity-90">
                            Ναι, έκδοση
                          </button>
                          <button type="button" onClick={() => setConfirmIssue(null)}
                            className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-xs text-charcoal dark:text-gray-200">
                            Άκυρο
                          </button>
                        </>
                      ) : (
                        <>
                          {canIssue && (
                            <button type="button" onClick={() => setConfirmIssue(m.docId)}
                              disabled={st !== 'idle'}
                              className="px-3 py-1.5 rounded-full bg-[#6A994E] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40">
                              {st === 'issuing' ? 'Έκδοση…' : 'Έκδοση απόδειξης'}
                            </button>
                          )}
                          {canRemind && (
                            <button type="button" onClick={() => remind(m)}
                              disabled={st !== 'idle'}
                              className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-xs font-medium text-charcoal dark:text-gray-200 hover:border-coral disabled:opacity-40">
                              {st === 'reminding' ? 'Αποστολή…' : 'Υπενθύμιση'}
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
