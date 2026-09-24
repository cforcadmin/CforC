'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Εξοδολόγια που περιμένουν πληρωμή — πλακίδιο δίπλα στο Ταμείο.
 *
 * Δείχνει ΤΟ ΠΟΣΟ πρώτα: αυτό είναι που πρέπει να φύγει από τον λογαριασμό.
 * Μέσα στο popup υπάρχουν τα στοιχεία κατάθεσης (δικαιούχος, IBAN) ώστε ο/η
 * Financer να ανοίξει το e-banking χωρίς να ψάξει πουθενά αλλού, και το
 * κουμπί «Πληρώθηκε» που σταματά τις υπενθυμίσεις.
 */

interface PaidClaim {
  id: string
  claimNumber: string
  memberName: string
  payable: number
  paidAt: string
  paidBy: string | null
  pdfUrl: string | null
  folderUrl: string | null
}

/** Σύντομη μορφή για τις λίστες μήνα (υποβλήθηκαν / πληρώθηκαν) */
interface BriefClaim {
  id: string
  claimNumber: string
  memberName: string
  payable: number
  submittedAt: string
  paidAt: string | null
  state: 'submitted' | 'paid' | 'cancelled'
  pdfUrl: string | null
  folderUrl: string | null
}

interface PendingClaim {
  id: string
  claimNumber: string
  memberName: string
  memberEmail: string | null
  payable: number
  submittedAt: string
  waitingDays: number | null
  eventLabel: string
  accountHolder: string
  bankName: string | null
  iban: string
  folderUrl: string | null
  pdfUrl: string | null
  remindersSent: number
}

const money = (n: number) => n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const age = (d: number | null) => (d === null ? '—' : d === 0 ? 'σήμερα' : d === 1 ? 'χθες' : `${d} ημέρες`)
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })
const MONTHS = ['Ιανουάριο', 'Φεβρουάριο', 'Μάρτιο', 'Απρίλιο', 'Μάιο', 'Ιούνιο',
  'Ιούλιο', 'Αύγουστο', 'Σεπτέμβριο', 'Οκτώβριο', 'Νοέμβριο', 'Δεκέμβριο']
const monthName = (m: string) => MONTHS[Number(String(m).slice(5, 7)) - 1] || ''

/**
 * Τιμή που αντιγράφεται με ένα κλικ — δικαιούχος και IBAN.
 *
 * Ο/η Financer έχει ανοιχτό το e-banking δίπλα: η αντιγραφή με το χέρι από
 * ένα IBAN 27 χαρακτήρων είναι ακριβώς το σημείο όπου γίνονται τα λάθη.
 * Αντιγράφουμε ΧΩΡΙΣ κενά, όπως το θέλει η τράπεζα.
 */
function CopyValue({ value, label, mono, display, valueClass }: {
  value: string; label: string; mono?: boolean; display?: string; valueClass?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Σε browser χωρίς δικαίωμα clipboard το κείμενο μένει επιλέξιμο με το χέρι
    }
  }
  return (
    <button type="button" onClick={copy}
      title={`Αντιγραφή — ${label}`}
      aria-label={`Αντιγραφή ${label}: ${value}`}
      className={`group inline-flex items-center gap-1.5 text-left rounded-lg px-1.5 -mx-1.5 py-0.5 hover:bg-coral/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral transition-colors ${
        mono ? 'font-mono break-all' : ''
      }`}>
      <span className={`notranslate ${valueClass || 'text-charcoal dark:text-gray-100'}`}>{display || value}</span>
      <span className={`text-xs whitespace-nowrap ${copied ? 'text-green-700 dark:text-green-300 font-bold' : 'text-coral dark:text-coral-light opacity-0 group-hover:opacity-100 group-focus:opacity-100'}`}>
        {copied ? '✓ αντιγράφηκε' : 'αντιγραφή'}
      </span>
    </button>
  )
}

export default function OcExpenseClaims() {
  const [data, setData] = useState<{
    pending: PendingClaim[]; total: number; canPay: boolean
    paidThisMonth: PaidClaim[]; paidThisMonthTotal: number; month: string
    thisMonthSubmitted: BriefClaim[]; lastMonth: string; lastMonthSubmitted: BriefClaim[]
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/oc/expense-claims')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setData({
          pending: d.pending || [], total: d.total || 0, canPay: !!d.canPay,
          paidThisMonth: d.paidThisMonth || [], paidThisMonthTotal: d.paidThisMonthTotal || 0,
          month: d.month || '',
          thisMonthSubmitted: d.thisMonthSubmitted || [],
          lastMonth: d.lastMonth || '', lastMonthSubmitted: d.lastMonthSubmitted || [],
        })
      })
      .catch(() => { /* σιωπηλά — το πλακίδιο απλώς δεν εμφανίζεται */ })
  }, [])
  useEffect(() => { load() }, [load])

  async function markPaid(claim: PendingClaim) {
    setBusy(claim.id)
    setError(null)
    try {
      const res = await fetch('/api/oc/expense-claims', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: claim.id, action: 'paid' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Αποτυχία')
      load()
    } catch (err: any) {
      setError(err?.message || 'Κάτι πήγε στραβά')
    } finally {
      setBusy(null)
    }
  }

  // Το πλακίδιο μένει πάντα στη θέση του: το «κανένα αυτόν τον μήνα» είναι
  // κι αυτό απάντηση, και ο/η Financer δεν χρειάζεται να αναρωτιέται αν
  // χάθηκε κάτι. Μόνο όσο φορτώνει δεν υπάρχει.
  if (!data) return null
  const oldest = data.pending[0]
  const quiet = data.pending.length === 0
  const emptyMonth = data.thisMonthSubmitted.length === 0 && data.paidThisMonth.length === 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-2xl w-full sm:w-60"
        aria-haspopup="dialog"
      >
        <div className={`relative rounded-2xl shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow border ${
          quiet
            ? 'bg-white dark:bg-gray-800 border-transparent hover:border-coral/40'
            : 'bg-amber-50 dark:bg-amber-900/25 border-amber-300 dark:border-amber-700'
        }`}>
          {!quiet && (
            <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow">
              {data.pending.length}
            </span>
          )}
          <span className="text-3xl font-bold text-charcoal dark:text-gray-100 notranslate">
            {emptyMonth ? '—' : `${money(quiet ? data.paidThisMonthTotal : data.total)} €`}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">
            {emptyMonth
              ? 'Εξοδολόγια'
              : quiet
                ? 'Εξοδολόγια που πληρώθηκαν'
                : data.pending.length === 1 ? 'Εξοδολόγιο προς πληρωμή' : 'Εξοδολόγια προς πληρωμή'}
          </span>
          <span className={`text-xs mt-0.5 font-medium ${quiet ? 'text-coral dark:text-coral-light' : 'text-amber-700 dark:text-amber-300'}`}>
            {emptyMonth
              ? `κανένα τον ${monthName(data.month)} →`
              : quiet
                ? `τον ${monthName(data.month)} · ${data.paidThisMonth.length} →`
                : `⚠ ${oldest.memberName.split(' ')[0]} περιμένει ${age(oldest.waitingDays)} →`}
          </span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="menu-glass rounded-3xl p-6 sm:p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-flyIn">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-charcoal dark:text-gray-100">Εξοδολόγια προς πληρωμή</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {data.pending.length > 0
                    ? <>Σύνολο <span className="font-bold notranslate">{money(data.total)} €</span> σε {data.pending.length}{' '}
                       {data.pending.length === 1 ? 'εξοδολόγιο' : 'εξοδολόγια'}.</>
                    : <>Κανένα εξοδολόγιο δεν περιμένει πληρωμή.</>}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)}
                className="text-sm font-bold text-charcoal dark:text-gray-200 hover:text-coral">Κλείσιμο</button>
            </div>

            {error && (
              <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 mb-5">
                <p className="text-sm font-bold text-charcoal dark:text-gray-100">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {data.pending.map(c => (
                <div key={c.id} className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-800/60 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="font-bold text-charcoal dark:text-gray-100">{c.memberName}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 notranslate">{c.claimNumber}</span>
                    </div>
                    {/* Φαίνεται «1.234,56 €», αντιγράφεται «1234,56»: χωρίς
                        σύμβολο και χωρίς διαχωριστικό χιλιάδων, όπως το
                        δέχεται η φόρμα του e-banking */}
                    <CopyValue
                      value={c.payable.toFixed(2).replace('.', ',')}
                      display={`${money(c.payable)} €`}
                      label="ποσό"
                      valueClass="text-xl font-bold text-charcoal dark:text-gray-100"
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{c.eventLabel}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Περιμένει {age(c.waitingDays)}
                    {c.remindersSent > 0 && ` · ${c.remindersSent} ${c.remindersSent === 1 ? 'υπενθύμιση' : 'υπενθυμίσεις'}`}
                  </p>

                  <div className="mt-3 rounded-xl bg-[#F5F0EB] dark:bg-gray-700 p-3">
                    <p className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400">ΓΙΑ ΤΗΝ ΚΑΤΑΘΕΣΗ</p>
                    <div className="text-sm mt-1 flex flex-wrap items-center gap-x-2">
                      <CopyValue value={c.accountHolder} label="δικαιούχος" />
                      {c.bankName && <span className="text-gray-500 dark:text-gray-400">· {c.bankName}</span>}
                    </div>
                    <div className="text-sm">
                      {/* Διαβάζεται σε τετράδες, αντιγράφεται χωρίς κενά */}
                      <CopyValue value={c.iban} display={c.iban.replace(/(.{4})/g, '$1 ').trim()} label="IBAN" mono />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {c.pdfUrl && (
                      <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-bold text-coral dark:text-coral-light hover:underline">Το εξοδολόγιο ↗</a>
                    )}
                    {c.folderUrl && (
                      <a href={c.folderUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-bold text-coral dark:text-coral-light hover:underline">Παραστατικά ↗</a>
                    )}
                    {c.memberEmail && (
                      <a href={`mailto:${c.memberEmail}`}
                        className="text-sm text-gray-600 dark:text-gray-300 hover:underline">{c.memberEmail}</a>
                    )}
                    {data.canPay && (
                      <button type="button" onClick={() => markPaid(c)} disabled={busy === c.id}
                        className="ml-auto bg-coral text-white font-bold rounded-full px-5 py-2 text-sm hover:bg-coral/90 transition-colors disabled:opacity-50">
                        {busy === c.id ? 'Καταχώρηση…' : 'Πληρώθηκε ✓'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Άδειος μήνας: το λέμε καθαρά και δείχνουμε τον προηγούμενο,
                που είναι συνήθως αυτός που μόλις έκλεισε */}
            {emptyMonth && (
              <div className="rounded-2xl bg-[#F5F0EB] dark:bg-gray-700 p-5">
                <p className="text-sm text-charcoal dark:text-gray-200">
                  Δεν υποβλήθηκε κανένα εξοδολόγιο τον {monthName(data.month)}.
                </p>
                {data.lastMonthSubmitted.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                      Τα εξοδολόγια του {monthName(data.lastMonth)}:
                    </p>
                    <ul className="space-y-2">
                      {data.lastMonthSubmitted.map(c => (
                        <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm rounded-xl bg-white/60 dark:bg-gray-800/60 px-4 py-2.5">
                          <span className="text-gray-500 dark:text-gray-400 notranslate">{dayOf(c.submittedAt)}</span>
                          <span className="text-charcoal dark:text-gray-200">{c.memberName}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 notranslate">{c.claimNumber}</span>
                          <span className={`text-xs font-bold ${c.state === 'paid' ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                            {c.state === 'paid' ? 'πληρώθηκε' : c.state === 'cancelled' ? 'ακυρώθηκε' : 'εκκρεμεί'}
                          </span>
                          <span className="ml-auto font-bold text-charcoal dark:text-gray-100 notranslate">{money(c.payable)} €</span>
                          {c.pdfUrl && (
                            <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                              className="text-coral dark:text-coral-light font-bold hover:underline">↗</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ούτε τον {monthName(data.lastMonth)}.
                  </p>
                )}
              </div>
            )}

            {/* Πληρωμένα του μήνα: αυτά θα βρεθούν στις χρεώσεις της τράπεζας
                όταν κλείσει ο μήνας — η λίστα λέει τι να ψάξει ο/η Financer */}
            {data.paidThisMonth.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h4 className="font-bold text-charcoal dark:text-gray-100">
                    Πληρώθηκαν τον {monthName(data.month)}
                  </h4>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {data.paidThisMonth.length}{' '}
                    {data.paidThisMonth.length === 1 ? 'εξοδολόγιο' : 'εξοδολόγια'} ·{' '}
                    <span className="font-bold notranslate">{money(data.paidThisMonthTotal)} €</span>
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Αυτά θα εμφανιστούν ως χρεώσεις στο κλείσιμο του μήνα — κάθε ένα με το δικό του παραστατικό.
                </p>
                <ul className="space-y-2">
                  {data.paidThisMonth.map(c => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm rounded-xl bg-white/50 dark:bg-gray-800/50 px-4 py-2.5">
                      <span className="text-gray-500 dark:text-gray-400 notranslate">{dayOf(c.paidAt)}</span>
                      <span className="text-charcoal dark:text-gray-200">{c.memberName}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 notranslate">{c.claimNumber}</span>
                      <span className="ml-auto font-bold text-charcoal dark:text-gray-100 notranslate">{money(c.payable)} €</span>
                      {c.pdfUrl && (
                        <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="text-coral dark:text-coral-light font-bold hover:underline">↗</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!data.canPay && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-5">
                Η σήμανση πληρωμής γίνεται από τη θέση Οικονομικών.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
