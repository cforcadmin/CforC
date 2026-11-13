'use client'

import { useState } from 'react'
import OcRenewalsPopup from '@/components/oc/OcRenewalsPopup'

/**
 * Συνδρομές στην κορυφή των Οικονομικών: μετρητές πληρωμένων ανά έτος +
 * bubbles «Προς ειδοποίηση» / «Προς διαγραφή» με ενέργειες υπενθύμισης —
 * κλικ σε όνομα → ατομική υπενθύμιση, «Σε όλους» → μαζική (διαδοχικά).
 * Οι ενέργειες επιτρέπονται ΜΟΝΟ σε Financer/Community — για τους
 * υπόλοιπους εμφανίζονται απενεργοποιημένες (όχι κρυφές, για να τις
 * ανακαλύπτει ο επόμενος Financer χωρίς προφορική παράδοση).
 */

export interface SubMemberRow {
  docId: string
  name: string
  am: number
  payments: Record<string, 0 | 1 | null>
  status: string
  renewalClaimedAt: string | null
  reminderSentAt: string | null
  reminderLog?: string[]
}

type SendState = 'idle' | 'sending' | 'sent' | 'error' | 'issuing' | 'issued' | 'issue-error'

/** Αποτέλεσμα μίας αποστολής — ό,τι χρειάζεται το popup της μαζικής */
interface SendResult {
  docId: string
  name: string
  ok: boolean
  /** Το μήνυμα λάθους του server (ή του δικτύου) — μόνο όταν ok === false */
  error?: string
}

/**
 * Οι κουκκίδες των υπενθυμίσεων: μία ανά αποστολή, με χρώμα που εντείνεται.
 *
 *   1 → κεχριμπάρι · 2 → πορτοκαλί · 3+ → κόκκινο
 *
 * Το χρώμα λέει «πόσο έχουμε πιέσει» με μια ματιά, χωρίς να διαβάσεις
 * αριθμό· πάνω από τρεις κρατάμε τρεις κουκκίδες και το ακριβές πλήθος
 * πάει στο tooltip, αλλιώς το chip γίνεται σειρά από τελείες.
 */
function ReminderDots({ log }: { log: string[] }) {
  const n = log.length
  if (n === 0) return null
  const tone = n === 1
    ? 'text-amber-500 dark:text-amber-400'
    : n === 2
      ? 'text-orange-500 dark:text-orange-400'
      : 'text-red-600 dark:text-red-400'
  return (
    <span className={`ml-1.5 tracking-tight ${tone}`} aria-hidden="true">
      {'•'.repeat(Math.min(n, 3))}
    </span>
  )
}

/** «3 υπενθυμίσεις · 2/9, 12/9, 24/9 — κλικ για νέα» */
function reminderTitle(log: string[]): string {
  const dates = log.map(d => new Date(d).toLocaleDateString('el-GR', { day: 'numeric', month: 'numeric' }))
  const count = log.length === 1 ? '1 υπενθύμιση' : `${log.length} υπενθυμίσεις`
  return `${count} · ${dates.join(', ')} — κλικ για νέα`
}

/**
 * Απολογισμός μαζικής αποστολής: «Στάλθηκαν 11 από 12» + ποιοι απέτυχαν
 * και γιατί. Οι αποτυχίες πρώτες· όταν δεν υπάρχουν, η λίστα των
 * επιτυχιών μένει πτυσσόμενη για να μη γεμίζει την οθόνη με 50 ✓.
 */
function BulkResultPopup({ results, onClose }: { results: SendResult[]; onClose: () => void }) {
  const failed = results.filter(r => !r.ok)
  const sent = results.filter(r => r.ok)
  const allOk = failed.length === 0
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-result-title"
      onClick={onClose}
    >
      <div
        className="menu-glass rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 id="bulk-result-title" className="font-bold text-lg text-charcoal dark:text-gray-100">
            Υπενθυμίσεις συνδρομής — απολογισμός
          </h3>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-200 text-xl leading-none" aria-label="Κλείσιμο">
            ✕
          </button>
        </div>
        <p className={`text-sm font-medium mb-4 notranslate ${allOk ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`} role="status">
          {allOk
            ? `✉✓ Στάλθηκαν και οι ${results.length} υπενθυμίσεις.`
            : `Στάλθηκαν ${sent.length} από ${results.length} · ${failed.length} ${failed.length === 1 ? 'απέτυχε' : 'απέτυχαν'}.`}
        </p>

        {failed.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-1.5">Δεν στάλθηκαν</p>
            <ul className="space-y-1">
              {failed.map(r => (
                <li key={r.docId} className="text-sm text-charcoal dark:text-gray-100 flex items-baseline gap-2">
                  <span className="text-red-600 dark:text-red-400" aria-hidden="true">✗</span>
                  <span>{r.name}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{r.error || 'Αποτυχία αποστολής'}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Κλικ στο όνομα στη λίστα για να ξαναστείλεις μόνο σε αυτούς.
            </p>
          </div>
        )}

        {sent.length > 0 && (
          <details open={!allOk && sent.length <= 5}>
            <summary className="text-xs font-bold text-green-700 dark:text-green-300 cursor-pointer select-none">
              Στάλθηκαν ({sent.length})
            </summary>
            <ul className="mt-1.5 space-y-0.5">
              {sent.map(r => (
                <li key={r.docId} className="text-sm text-charcoal dark:text-gray-100 flex items-baseline gap-2">
                  <span className="text-green-700 dark:text-green-300" aria-hidden="true">✓</span>{r.name}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#6A994E] text-white text-xs font-bold hover:opacity-90">
            ΟΚ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OcSubscriptions({ members, canRemind, canIssue, onIssued }: {
  members: SubMemberRow[]
  canRemind: boolean
  canIssue: boolean
  onIssued: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [sendState, setSendState] = useState<Record<string, SendState>>({})
  const [confirmFor, setConfirmFor] = useState<string | null>(null)   // docId ή 'all:notify' / 'all:delete'
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState('')
  /** Το popup απολογισμού μετά το «Σε όλους» — null = κλειστό */
  const [bulkResult, setBulkResult] = useState<SendResult[] | null>(null)
  /** Αιτία αποτυχίας ανά μέλος (tooltip στο ✗ του chip) */
  const [sendError, setSendError] = useState<Record<string, string>>({})

  const year = new Date().getFullYear()
  const paidCurrent = members.filter(m => m.payments[String(year)] === 1).length
  const paidPrev = members.filter(m => m.payments[String(year - 1)] === 1).length
  const notifyList = members.filter(m => m.status === 'owes-1' || m.status === 'new-unpaid')
  const deleteList = members.filter(m => m.status === 'owes-2')
  const claimsCount = [...notifyList, ...deleteList].filter(m => m.renewalClaimedAt).length

  /**
   * Μία υπενθύμιση. Επιστρέφει ΚΑΙ την αιτία αποτυχίας: ένα σκέτο «✗» στο
   * chip έστελνε τον Financer να ψάχνει στον server κάτι που ο server είχε
   * ήδη πει (π.χ. «Το μέλος δεν έχει email», «Αποτυχία αποστολής email»).
   */
  async function sendOne(docId: string): Promise<{ ok: boolean; error?: string }> {
    setSendState(s => ({ ...s, [docId]: 'sending' }))
    try {
      const res = await fetch('/api/oc/subscription-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberDocId: docId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `Σφάλμα ${res.status}`)
      }
      setSendState(s => ({ ...s, [docId]: 'sent' }))
      return { ok: true }
    } catch (err: any) {
      const error = err?.message || 'Χωρίς απάντηση από τον server'
      setSendState(s => ({ ...s, [docId]: 'error' }))
      setSendError(e => ({ ...e, [docId]: error }))
      return { ok: false, error }
    }
  }

  /** Ποια έτη οφείλει (ίδια σημασιολογία με την Επισκόπηση) */
  function owedYears(m: SubMemberRow): number[] {
    const owed: number[] = []
    const prev = m.payments[String(year - 1)]
    if (m.status === 'owes-2') owed.push(year - 1)
    else if (prev !== 1 && prev !== 0 && m.status !== 'new-unpaid') owed.push(year - 1)
    const cur = m.payments[String(year)]
    if (cur !== 1 && cur !== 0) owed.push(year)
    return owed.length ? owed : [year]
  }

  /** Έκδοση αποδείξεων για δηλωμένη πληρωμή — μία ανά οφειλόμενο έτος */
  async function issueFor(m: SubMemberRow) {
    setConfirmFor(null)
    setSendState(s => ({ ...s, [m.docId]: 'issuing' }))
    const years = owedYears(m)
    try {
      for (const y of years) {
        const res = await fetch('/api/oc/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'issue', type: 'subscription', amount: 35, year: y,
            memberDocId: m.docId, memberName: m.name, sendEmail: true,
            paymentMethod: 'bank',
            notes: 'Από δήλωση πληρωμής συνδρομής (renewal claim)',
          }),
        })
        if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      }
      setSendState(s => ({ ...s, [m.docId]: 'issued' }))
      onIssued()
    } catch {
      setSendState(s => ({ ...s, [m.docId]: 'issue-error' }))
    }
  }

  async function sendAll(list: SubMemberRow[]) {
    setConfirmFor(null)
    setBulkRunning(true)
    const results: SendResult[] = []
    for (let i = 0; i < list.length; i++) {
      setBulkProgress(`${i + 1}/${list.length}…`)
      const r = await sendOne(list[i].docId)
      results.push({ docId: list[i].docId, name: list[i].name, ok: r.ok, error: r.error })
    }
    const ok = results.filter(r => r.ok).length
    setBulkProgress(`${ok}/${list.length} στάλθηκαν`)
    setBulkRunning(false)
    // Ο απολογισμός ανοίγει ΠΑΝΤΑ — η γραμμή προόδου πάνω από τις λίστες
    // περνούσε απαρατήρητη και τα 12 «✉✓» δεν λένε αν κάποιο λείπει.
    setBulkResult(results)
  }

  function chip(m: SubMemberRow, tone: 'orange' | 'red') {
    const st = sendState[m.docId] || 'idle'
    const claimed = !!m.renewalClaimedAt && st !== 'issued'
    // Παλιές εγγραφές έχουν μόνο ReminderSentAt — μετρούν ως μία υπενθύμιση
    const remLog = (m.reminderLog && m.reminderLog.length)
      ? m.reminderLog
      : (m.reminderSentAt ? [m.reminderSentAt] : [])
    const toneCls = claimed
      ? 'border-teal-400 bg-teal-50 text-teal-900 dark:bg-teal-900/30 dark:border-teal-500/60 dark:text-teal-200'
      : st === 'issued'
        ? 'border-green-400 bg-green-50 text-green-900 dark:bg-green-900/30 dark:border-green-500/60 dark:text-green-200'
        : (m.reminderSentAt || st === 'sent')
          // Υπενθύμιση εστάλη → sky περίγραμμα, μόνιμο (ReminderSentAt)
          ? tone === 'orange'
            ? 'border-sky-400 dark:border-sky-500 text-orange-900 dark:text-orange-200'
            : 'border-sky-400 dark:border-sky-500 text-red-900 dark:text-red-200'
          : tone === 'orange'
            ? 'border-orange-300 text-orange-900 dark:border-orange-500/60 dark:text-orange-200'
            : 'border-red-300 text-red-900 dark:border-red-500/60 dark:text-red-200'
    const clickable = canRemind && st !== 'sending' && st !== 'issuing' && st !== 'issued'
    return (
      <span key={m.docId} className="relative inline-block">
        <button type="button"
          onClick={() => clickable && setConfirmFor(confirmFor === m.docId ? null : m.docId)}
          disabled={!canRemind || bulkRunning}
          title={!canRemind
            ? 'Ενέργειες: μόνο Financer ή Community'
            : claimed ? 'Δήλωσε πληρωμή — κλικ για ενέργειες'
              : remLog.length ? reminderTitle(remLog)
                : 'Κλικ για υπενθύμιση συνδρομής'}
          className={`px-3.5 py-1.5 rounded-full border text-sm ${toneCls} ${
            clickable ? 'hover:ring-2 hover:ring-coral/40 cursor-pointer' : 'cursor-default opacity-90'
          } disabled:opacity-50`}>
          {claimed && <span className="mr-1" aria-hidden="true">💶</span>}
          {m.name}
          <ReminderDots log={remLog} />
          {st === 'sending' && <span className="ml-1.5 text-xs">…</span>}
          {st === 'sent' && <span className="ml-1.5 text-xs" aria-label="Η υπενθύμιση στάλθηκε">✉✓</span>}
          {st === 'error' && (
            <span className="ml-1.5 text-xs text-red-600 dark:text-red-400" title={sendError[m.docId] || 'Αποτυχία αποστολής'}>✗</span>
          )}
          {st === 'issuing' && <span className="ml-1.5 text-xs">έκδοση…</span>}
          {st === 'issued' && <span className="ml-1.5 text-xs" aria-label="Η απόδειξη εκδόθηκε">🧾✓</span>}
          {st === 'issue-error' && <span className="ml-1.5 text-xs text-red-600 dark:text-red-400">αποτυχία έκδοσης</span>}
        </button>
        {confirmFor === m.docId && (
          <span className="absolute left-0 top-full mt-1 z-20 flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg px-3 py-2 whitespace-nowrap">
            {claimed ? (
              <>
                <span className="text-xs text-charcoal dark:text-gray-200">
                  Δήλωσε πληρωμή {new Date(m.renewalClaimedAt!).toLocaleDateString('el-GR')} · οφείλει {owedYears(m).join('+')}
                </span>
                {canIssue ? (
                  <button type="button" onClick={() => issueFor(m)}
                    className="px-2.5 py-1 rounded-lg bg-[#6A994E] text-white text-xs font-bold">
                    Έκδοση απόδειξης ({owedYears(m).length * 35} €)
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">έκδοση: μόνο Financer</span>
                )}
                <button type="button" onClick={() => { setConfirmFor(null); sendOne(m.docId) }}
                  className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-500 text-xs text-charcoal dark:text-gray-200">Υπενθύμιση</button>
                <button type="button" onClick={() => setConfirmFor(null)}
                  className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-500 text-xs text-charcoal dark:text-gray-200">✕</button>
              </>
            ) : (
              <>
                <span className="text-xs text-charcoal dark:text-gray-200">Υπενθύμιση σε {m.name.split(' ')[0]};</span>
                <button type="button" onClick={() => { setConfirmFor(null); sendOne(m.docId) }}
                  className="px-2.5 py-1 rounded-lg bg-[#6A994E] text-white text-xs font-bold">Ναι</button>
                <button type="button" onClick={() => setConfirmFor(null)}
                  className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-500 text-xs text-charcoal dark:text-gray-200">Άκυρο</button>
              </>
            )}
          </span>
        )}
      </span>
    )
  }

  function bulkButton(key: 'all:notify' | 'all:delete', list: SubMemberRow[]) {
    return confirmFor === key ? (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs font-medium text-charcoal dark:text-gray-200">Υπενθύμιση σε {list.length} μέλη;</span>
        <button type="button" onClick={() => sendAll(list)}
          className="px-3 py-1 rounded-full bg-[#6A994E] text-white text-xs font-bold">Ναι, αποστολή</button>
        <button type="button" onClick={() => setConfirmFor(null)}
          className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-xs text-charcoal dark:text-gray-200">Άκυρο</button>
      </span>
    ) : (
      <button type="button" onClick={() => setConfirmFor(key)}
        disabled={!canRemind || bulkRunning || list.length === 0}
        title={canRemind ? undefined : 'Υπενθυμίσεις: μόνο Financer ή Community'}
        className="px-3.5 py-1 rounded-full bg-coral/15 text-coral dark:text-coral-light text-xs font-bold hover:bg-coral/25 disabled:opacity-40">
        ✉ Σε όλους ({list.length})
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
      <div className="w-full flex items-center gap-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex-1 flex items-center text-left"
          aria-expanded={open}>
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Συνδρομές</h2>
        </button>
        <button type="button" onClick={() => setShowPopup(true)} aria-haspopup="dialog"
          title="Ανεξόφλητες συνδρομές — λίστα με έκδοση/υπενθύμιση"
          className={`notranslate px-4 py-1.5 rounded-full text-sm font-bold hover:ring-2 hover:ring-coral/40 ${
            claimsCount > 0
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200'
              : 'bg-[#E9A13B]/15 text-[#a8701f] dark:text-[#E9A13B]'
          }`}>
          {paidCurrent}/{members.length} Πληρωμένο {year}{claimsCount > 0 ? ` · ${claimsCount} 💶` : ' →'}
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          aria-label={open ? 'Σύμπτυξη ενότητας Συνδρομές' : 'Ανάπτυξη ενότητας Συνδρομές'}>
          <span className={`text-coral transition-transform inline-block ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
        </button>
      </div>

      {bulkResult && (
        <BulkResultPopup results={bulkResult} onClose={() => setBulkResult(null)} />
      )}

      {showPopup && (
        <OcRenewalsPopup
          members={members}
          canIssue={canIssue}
          canRemind={canRemind}
          onClose={() => setShowPopup(false)}
          onChanged={onIssued}
        />
      )}

      {open && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <p className="text-2xl font-bold text-charcoal dark:text-gray-100 notranslate">
                {paidPrev}<span className="text-base font-normal text-gray-400">/{members.length}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Πληρωμένο {year - 1}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal dark:text-gray-100 notranslate">
                {paidCurrent}<span className="text-base font-normal text-gray-400">/{members.length}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Πληρωμένο {year}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5">
            💡 <strong>Υπενθυμίσεις συνδρομής:</strong> κλικ σε οποιοδήποτε όνομα για ατομική υπενθύμιση, ή «✉ Σε όλους»
            για μαζική αποστολή στη λίστα. Το email φεύγει από το finance@ με τα στοιχεία πληρωμής, τα έτη που
            εκκρεμούν ανά μέλος και το κουμπί «Έκανα την κατάθεση». Όταν μέλος δηλώσει πληρωμή, το όνομά του γίνεται
            <span className="text-teal-600 dark:text-teal-300 font-bold"> 💶 teal</span> — κλικ πάνω του → «Έκδοση απόδειξης»
            (απόδειξη + email + ενημέρωση πληρωμών αυτόματα). Υπενθυμίσεις: Financer &amp; Community · Έκδοση: μόνο Financer.
          </p>
          {bulkProgress && (
            <p className="text-sm font-medium text-charcoal dark:text-gray-200" role="status">Μαζική αποστολή: {bulkProgress}</p>
          )}

          <div>
            <p className="text-sm font-bold text-charcoal dark:text-gray-200 mb-2 flex items-center gap-3 flex-wrap">
              Προς ειδοποίηση <span className="font-normal text-gray-400">({notifyList.length})</span>
              {bulkButton('all:notify', notifyList)}
            </p>
            <div className="flex flex-wrap gap-2">
              {notifyList.length === 0
                ? <span className="text-sm text-gray-400">Κανένα μέλος — όλα τακτοποιημένα 🎉</span>
                : notifyList.map(m => chip(m, 'orange'))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-charcoal dark:text-gray-200 mb-2 flex items-center gap-3 flex-wrap">
              Προς διαγραφή — 2 έτη ανεξόφλητα <span className="font-normal text-gray-400">({deleteList.length})</span>
              {bulkButton('all:delete', deleteList)}
            </p>
            <div className="flex flex-wrap gap-2">
              {deleteList.length === 0
                ? <span className="text-sm text-gray-400">Κανένα μέλος.</span>
                : deleteList.map(m => chip(m, 'red'))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
