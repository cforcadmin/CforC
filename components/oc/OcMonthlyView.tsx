'use client'

import { useEffect, useState } from 'react'

/**
 * «Μηνιαία εικόνα» εσόδων: αποδείξεις του μήνα κατά ημερομηνία πληρωμής,
 * σύνολα ανά κατηγορία, και το κλείσιμο «Εστάλη στο λογιστήριο ✓» (Financer).
 * Αποδείξεις που μπήκαν ΜΕΤΑ το κλείσιμο του μήνα τους σημαίνονται «δέλτα» —
 * ορατές, ώστε καμία αλλαγή να μη γλιστρά σιωπηλά σε απεσταλμένο μήνα.
 */

interface MonthReceipt {
  number: number
  typeLabel: string
  amount: number
  memberName: string | null
  payerName: string | null
  paymentDate: string | null
  issueDate: string | null
  method: string
  emailSent: boolean
  delta: boolean
}

interface MonthData {
  month: string
  receipts: MonthReceipt[]
  totals: Record<string, number>
  count: number
  deltaCount: number
  close: { readyAt: string | null; readyBy: string | null; sentAt: string | null; sentBy: string | null } | null
  status: 'pending' | 'ready' | 'sent'
  closes: Array<{ month: string; readyAt: string | null; sentAt: string | null }>
}

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`
const MONTH_NAMES = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος',
  'Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']

function monthLabel(m: string): string {
  const [y, mm] = m.split('-').map(Number)
  return `${MONTH_NAMES[mm - 1]} ${y}`
}

function defaultMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function OcMonthlyView({ mode, canReady = false, canDispatch = false }: {
  /** financer: Οικονομικά (έγκριση) · admin: Διαχείριση (αποστολή) */
  mode: 'financer' | 'admin'
  canReady?: boolean
  canDispatch?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(defaultMonth())
  const [data, setData] = useState<MonthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)

  async function load(m: string) {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/oc/monthly-close?month=${m}`)
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      setData(await res.json())
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία φόρτωσης')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { if (open) load(month) }, [open, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const [dispatchNote, setDispatchNote] = useState<string | null>(null)

  async function act(action: 'ready' | 'dispatch') {
    setConfirming(false); setClosing(true); setDispatchNote(null)
    try {
      const res = await fetch('/api/oc/monthly-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, action }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      if (action === 'dispatch') {
        setDispatchNote(d.viaFallback
          ? `Το αρχείο στάλθηκε στο finance@ για προώθηση (δεν έχει οριστεί email λογιστηρίου).`
          : `Το αρχείο στάλθηκε στο ${d.to}.`)
      }
      await load(month)
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία')
    } finally {
      setClosing(false)
    }
  }

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left"
        aria-expanded={open}>
        <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Μηνιαία εικόνα</h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">έσοδα ανά μήνα → λογιστήριο</span>
        <span className="ml-auto flex items-center gap-3">
          {data && open && data.status !== 'pending' && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold notranslate ${
              data.status === 'sent'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                : 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200'
            }`}>
              {data.status === 'sent' ? 'εστάλη ✓' : 'εγκρίθηκε ✓'}
            </span>
          )}
          <span className={`text-coral transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
        </span>
      </button>

      {open && (
        <div className="mt-6 space-y-5">
          {/* Επιλογή μήνα */}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Προηγούμενος μήνας"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral">←</button>
            <span className="font-bold text-charcoal dark:text-gray-100 min-w-40 text-center">{monthLabel(month)}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Επόμενος μήνας"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral">→</button>
            {data?.status === 'sent' ? (
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 text-xs font-bold">
                Εστάλη στο λογιστήριο {data.close?.sentAt ? new Date(data.close.sentAt).toLocaleDateString('el-GR') : ''} ✓
              </span>
            ) : data?.status === 'ready' ? (
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200 text-xs font-bold">
                Εγκρίθηκε ο μήνας από τον Financer ✓{data.close?.readyAt ? ` (${new Date(data.close.readyAt).toLocaleDateString('el-GR')})` : ''}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 text-xs font-bold">
                {mode === 'admin' ? 'Αναμονή για ενημέρωση από Financer' : 'δεν έχει εγκριθεί'}
              </span>
            )}
            {data && data.deltaCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 text-xs font-bold"
                title="Αποδείξεις που καταχωρήθηκαν ΜΕΤΑ την αποστολή του μήνα — ενημέρωσε το λογιστήριο">
                {data.deltaCount} δέλτα ⚠
              </span>
            )}
          </div>

          {loading && <p className="text-sm text-gray-400">Φόρτωση…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {data && !loading && (
            <>
              {/* Σύνολα */}
              <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4">
                {Object.entries(data.totals).sort(([a], [b]) => a === 'Σύνολο' ? -1 : b === 'Σύνολο' ? 1 : a.localeCompare(b, 'el')).map(([k, v]) => (
                  <span key={k} className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{k}:</span>{' '}
                    <span className={`notranslate ${k === 'Σύνολο' ? 'font-bold text-charcoal dark:text-gray-100' : 'text-charcoal dark:text-gray-200'}`}>{eur(v)}</span>
                  </span>
                ))}
                <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto notranslate">{data.count} αποδείξεις</span>
              </div>

              {/* Λίστα */}
              {data.receipts.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">Καμία είσπραξη τον {monthLabel(month).split(' ')[0]}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                        <th className="py-2 pr-4 font-medium">Αριθμός</th>
                        <th className="py-2 pr-4 font-medium">Προς</th>
                        <th className="py-2 pr-4 font-medium">Τύπος</th>
                        <th className="py-2 pr-4 font-medium">Ημ. πληρωμής</th>
                        <th className="py-2 pr-4 font-medium">Ημ. έκδοσης</th>
                        <th className="py-2 font-medium text-right">Ποσό</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.receipts.map(r => (
                        <tr key={r.number} className={`border-b border-gray-100 dark:border-gray-700 ${r.delta ? 'bg-red-50 dark:bg-red-900/15' : ''}`}>
                          <td className="py-2.5 pr-4 font-bold text-charcoal dark:text-gray-100 notranslate">
                            ΑΠ. ΕΙΣ. {r.number}
                            {r.delta && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold align-middle">δέλτα</span>}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">{r.memberName || '—'}</td>
                          <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400">{r.typeLabel}</td>
                          <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 notranslate">{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('el-GR') : '—'}</td>
                          <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 notranslate">{r.issueDate ? new Date(r.issueDate).toLocaleDateString('el-GR') : '—'}</td>
                          <td className="py-2.5 text-right text-charcoal dark:text-gray-200 notranslate">{eur(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.deltaCount > 0 && (
                <p className="text-xs text-red-700 dark:text-red-300 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-2.5">
                  ⚠ {data.deltaCount} απόδειξη/εις καταχωρήθηκαν ΜΕΤΑ την αποστολή αυτού του μήνα στο λογιστήριο —
                  ανάφερέ τες στην επόμενη επικοινωνία ώστε τα σύνολά τους να μην αποκλίνουν σιωπηλά.
                </p>
              )}

              {dispatchNote && (
                <p className="text-sm font-medium text-green-700 dark:text-green-300">{dispatchNote}</p>
              )}

              {/* Στάδιο 1 — Financer: έγκριση μήνα */}
              {mode === 'financer' && data.status === 'pending' && (
                <div className="flex items-center gap-4">
                  {!confirming ? (
                    <button type="button" onClick={() => setConfirming(true)}
                      disabled={!canReady || closing}
                      title={canReady ? undefined : 'Μόνο ο ενεργός ρόλος Financer'}
                      className="px-6 py-2.5 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                      Έτοιμο προς αποστολή στο λογιστήριο ✓
                    </button>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-charcoal dark:text-gray-200">
                        Έγκριση του {monthLabel(month)}; Η Διαχείριση θα μπορεί μετά να τον αποστείλει στο λογιστήριο.
                      </span>
                      <button type="button" onClick={() => act('ready')} disabled={closing}
                        className="px-5 py-2 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                        {closing ? 'Σήμανση…' : 'Ναι'}
                      </button>
                      <button type="button" onClick={() => setConfirming(false)} disabled={closing}
                        className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
                        Άκυρο
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Στάδιο 2 — Διαχείριση: αποστολή στο λογιστήριο */}
              {mode === 'admin' && data.status !== 'sent' && (
                <div className="flex items-center gap-4">
                  {!confirming ? (
                    <button type="button" onClick={() => setConfirming(true)}
                      disabled={!canDispatch || closing || data.status !== 'ready'}
                      title={data.status !== 'ready'
                        ? 'Ενεργοποιείται όταν ο/η Financer εγκρίνει τον μήνα'
                        : canDispatch ? undefined : 'Μόνο Διαχείριση (Γραμματεία/IT)'}
                      className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
                      Αποστολή στο λογιστήριο 📤
                    </button>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-charcoal dark:text-gray-200">
                        Αποστολή του αρχείου {monthLabel(month)} (έσοδα{data.count ? ` — ${data.count} παραστατικά` : ''}) στο λογιστήριο;
                      </span>
                      <button type="button" onClick={() => act('dispatch')} disabled={closing}
                        className="px-5 py-2 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
                        {closing ? 'Αποστολή…' : 'Ναι, αποστολή'}
                      </button>
                      <button type="button" onClick={() => setConfirming(false)} disabled={closing}
                        className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
                        Άκυρο
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
