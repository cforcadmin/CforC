'use client'

import { useColumnWidths } from '@/components/oc/useColumnWidths'
import { useCallback, useEffect, useState } from 'react'
import { FINANCE_CHANGED } from '@/lib/ocFinanceEvents'

/**
 * «Μηνιαία εικόνα» εσόδων ΚΑΙ εξόδων — ό,τι θα δει το λογιστήριο:
 *   Α. έσοδα  — αποδείξεις κατά ημερομηνία πληρωμής + έσοδα χωρίς απόδειξη
 *   Β. έξοδα  — εγκεκριμένα παραστατικά του μπλοκ του μήνα
 * με σύνολα ανά κατηγορία, ισοζύγιο, και το διπλό κλείσιμο (Financer εγκρίνει,
 * Διαχείριση αποστέλλει). Αποδείξεις που μπήκαν ΜΕΤΑ το κλείσιμο του μήνα τους
 * σημαίνονται «δέλτα» — ορατές, ώστε καμία αλλαγή να μη γλιστρά σιωπηλά.
 */

interface MonthReceipt {
  number: number
  aa: string | null
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

interface MonthIncomeRecord {
  aa: string
  docRef: string | null
  payerName: string | null
  description: string | null
  categoryLabel: string
  amount: number
  paymentDate: string | null
  method: string
}

interface MonthExpense {
  aa: string
  issueDate: string | null
  docNumber: string | null
  mark: string | null
  supplierName: string | null
  supplierTaxId: string | null
  categoryLabel: string | null
  withholding: number
  amount: number
  method: string
  methodLabel: string
  paymentDate: string | null
  fileName: string | null
}

interface MonthData {
  month: string
  receipts: MonthReceipt[]
  incomeRecords: MonthIncomeRecord[]
  expenses: MonthExpense[]
  totals: Record<string, number>
  expenseTotals: Record<string, number>
  summary: { income: number; expenses: number; balance: number }
  count: number
  receiptCount: number
  incomeRecordCount: number
  expenseCount: number
  unpaidCount: number
  uncategorised: number
  late: Array<{
    documentId: string; month: string; aa: string | null; supplierName: string | null; docNumber: string | null
    issueDate: string | null; amount: number; kind: 'settlement' | 'addition'; paymentMethod: string; paymentDate: string | null
    fileName: string | null; fileId: string | null
  }>
  deltaCount: number
  close: { readyAt: string | null; readyBy: string | null; sentAt: string | null; sentBy: string | null } | null
  status: 'pending' | 'ready' | 'sent'
  backfilled: boolean
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
  const cwIn = useColumnWidths('monthly-income')
  const cwEx = useColumnWidths('monthly-expenses')
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(defaultMonth())
  const [data, setData] = useState<MonthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  /** άλλαξε ΑΛΛΟΣ μήνας από άλλη κάρτα — το λέμε αντί να αλλάξουμε επιλογή */
  const [staleMonth, setStaleMonth] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  const load = useCallback(async (m: string) => {
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
  }, [])
  useEffect(() => { if (open) load(month) }, [open, month, load])

  // Έγκριση εξόδων ή έκδοση απόδειξης σε άλλη κάρτα: ξαναδιαβάζουμε, αλλιώς
  // η εικόνα δείχνει την κατάσταση ΠΡΙΝ την ενέργεια και μοιάζει με απώλεια.
  useEffect(() => {
    function onChanged(e: Event) {
      const changed = (e as CustomEvent)?.detail?.month
      if (!open) return
      if (changed && changed !== month) {
        setStaleMonth(changed)
        return
      }
      load(month)
    }
    window.addEventListener(FINANCE_CHANGED, onChanged)
    return () => window.removeEventListener(FINANCE_CHANGED, onChanged)
  }, [open, month, load])

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

  function goToMonth(m: string) { setStaleMonth(null); setMonth(m) }

  function shiftMonth(delta: number) {
    setStaleMonth(null)
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left"
        aria-expanded={open}>
        <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">
          {mode === 'admin' ? 'Μηνιαία οικονομική εικόνα' : 'Μηνιαία εικόνα'}
        </h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">έσοδα &amp; έξοδα ανά μήνα → λογιστήριο</span>
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
            <span className="font-bold text-charcoal dark:text-gray-100 min-w-[10rem] text-center">{monthLabel(month)}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Επόμενος μήνας"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral">→</button>
            <button type="button" onClick={() => load(month)} disabled={loading} aria-label="Ανανέωση"
              title="Ανανέωση από το Strapi"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral disabled:opacity-40">↻</button>
            {data?.status === 'sent' ? (
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 text-xs font-bold">
                Εστάλη στο λογιστήριο {data.close?.sentAt ? new Date(data.close.sentAt).toLocaleDateString('el-GR') : ''} ✓
                {data.backfilled && <span className="font-normal opacity-80"> · εκτός συστήματος</span>}
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

          {staleMonth && (
            <p className="text-sm rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200 px-4 py-2.5">
              Καταχωρήθηκε κίνηση στον <strong>{monthLabel(staleMonth)}</strong>.{' '}
              <button type="button" onClick={() => goToMonth(staleMonth)} className="underline font-bold">Δες τον</button>
            </p>
          )}

          {loading && <p className="text-sm text-gray-400">Φόρτωση…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {data && !loading && (
            <>
              {/* Σύνολα: έσοδα − έξοδα = ισοζύγιο */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Έσοδα</p>
                  <p className="text-xl font-bold text-charcoal dark:text-gray-100 notranslate">{eur(data.summary.income)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 notranslate">
                    {data.receiptCount} αποδείξεις{data.incomeRecordCount > 0 && ` + ${data.incomeRecordCount} χωρίς απόδειξη`}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Έξοδα</p>
                  <p className="text-xl font-bold text-charcoal dark:text-gray-100 notranslate">{eur(data.summary.expenses)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 notranslate">{data.expenseCount} παραστατικά</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Ισοζύγιο μήνα</p>
                  <p className={`text-xl font-bold notranslate ${data.summary.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-[#6A994E]'}`}>
                    {eur(data.summary.balance)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">έσοδα − έξοδα</p>
                </div>
              </div>

              {/* ---- Α. ΕΣΟΔΑ ---- */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal dark:text-gray-100">Α. Έσοδα</h3>
                  {Object.entries(data.totals)
                    .filter(([k]) => k !== 'Σύνολο')
                    .sort(([a], [b]) => a.localeCompare(b, 'el'))
                    .map(([k, v]) => (
                      <span key={k} className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">{k}:</span>{' '}
                        <span className="text-charcoal dark:text-gray-200 notranslate">{eur(v)}</span>
                      </span>
                    ))}
                </div>

                {data.receipts.length === 0 && data.incomeRecords.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Καμία είσπραξη τον {monthLabel(month).split(' ')[0]}.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ tableLayout: cwIn.hasCustom ? 'fixed' : 'auto', minWidth: '100%' }}>
                      <colgroup>{['aa', 'doc', 'to', 'type', 'paid', 'issued', 'amount'].map(k => <col key={k} style={cwIn.width(k) ? { width: `${cwIn.width(k)}px` } : undefined} />)}</colgroup>
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                          <th className="relative py-2 pr-4 font-medium">Α/Α<cwIn.ResizeHandle colKey="aa" /></th>
                          <th className="relative py-2 pr-4 font-medium">Παραστατικό<cwIn.ResizeHandle colKey="doc" /></th>
                          <th className="relative py-2 pr-4 font-medium">Προς<cwIn.ResizeHandle colKey="to" /></th>
                          <th className="relative py-2 pr-4 font-medium">Τύπος<cwIn.ResizeHandle colKey="type" /></th>
                          <th className="relative py-2 pr-4 font-medium">Ημ. πληρωμής<cwIn.ResizeHandle colKey="paid" /></th>
                          <th className="relative py-2 pr-4 font-medium">Ημ. έκδοσης<cwIn.ResizeHandle colKey="issued" /></th>
                          <th className="relative py-2 font-medium text-right">Ποσό<cwIn.ResizeHandle colKey="amount" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.receipts.map(r => (
                          <tr key={`r-${r.number}`} className={`border-b border-gray-100 dark:border-gray-700 ${r.delta ? 'bg-red-50 dark:bg-red-900/15' : ''}`}>
                            <td className="py-2.5 pr-4 font-bold text-charcoal dark:text-gray-100 notranslate">
                              {r.aa || <span className="text-gray-300 dark:text-gray-600" title="Δεν έχει καταγραφεί Α/Α φύλλου">—</span>}
                            </td>
                            <td className="py-2.5 pr-4 text-charcoal dark:text-gray-100 notranslate">
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
                        {data.incomeRecords.map(g => (
                          <tr key={`g-${g.aa}`} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2.5 pr-4 font-bold text-charcoal dark:text-gray-100 notranslate">{g.aa}</td>
                            <td className="py-2.5 pr-4 notranslate">
                              <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-[10px] font-bold">
                                χωρίς απόδειξη
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">{g.payerName || g.description || '—'}</td>
                            <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400">{g.categoryLabel}</td>
                            <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 notranslate">{g.paymentDate ? new Date(g.paymentDate).toLocaleDateString('el-GR') : '—'}</td>
                            <td className="py-2.5 pr-4 text-gray-400 dark:text-gray-500 notranslate" title={g.docRef || undefined}>{g.docRef || '—'}</td>
                            <td className="py-2.5 text-right text-charcoal dark:text-gray-200 notranslate">{eur(g.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ---- Β. ΕΞΟΔΑ ---- */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal dark:text-gray-100">Β. Έξοδα</h3>
                  {Object.entries(data.expenseTotals)
                    .filter(([k]) => k !== 'Σύνολο')
                    .sort(([a], [b]) => a.localeCompare(b, 'el'))
                    .map(([k, v]) => (
                      <span key={k} className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">{k}:</span>{' '}
                        <span className="text-charcoal dark:text-gray-200 notranslate">{eur(v)}</span>
                      </span>
                    ))}
                </div>

                {data.expenses.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Καμία εγκεκριμένη δαπάνη τον {monthLabel(month).split(' ')[0]}. Τα παραστατικά μπαίνουν εδώ μόλις εγκριθούν στα Οικονομικά → Έξοδα.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ tableLayout: cwEx.hasCustom ? 'fixed' : 'auto', minWidth: '100%' }}>
                      <colgroup>{['aa', 'supplier', 'category', 'doc', 'issued', 'withholding', 'amount', 'method', 'file'].map(k => <col key={k} style={cwEx.width(k) ? { width: `${cwEx.width(k)}px` } : undefined} />)}</colgroup>
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                          <th className="relative py-2 pr-4 font-medium">Α/Α<cwEx.ResizeHandle colKey="aa" /></th>
                          <th className="relative py-2 pr-4 font-medium">Προμηθευτής<cwEx.ResizeHandle colKey="supplier" /></th>
                          <th className="relative py-2 pr-4 font-medium">Κατηγορία<cwEx.ResizeHandle colKey="category" /></th>
                          <th className="relative py-2 pr-4 font-medium">Παραστατικό<cwEx.ResizeHandle colKey="doc" /></th>
                          <th className="relative py-2 pr-4 font-medium">Ημ. έκδοσης<cwEx.ResizeHandle colKey="issued" /></th>
                          <th className="relative py-2 pr-4 font-medium">Πληρωμή<cwEx.ResizeHandle colKey="withholding" /></th>
                          <th className="relative py-2 font-medium text-right">Ποσό<cwEx.ResizeHandle colKey="amount" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expenses.map((e, i) => (
                          <tr key={`x-${e.aa}-${i}`} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2.5 pr-4 font-bold text-charcoal dark:text-gray-100 notranslate">{e.aa}</td>
                            <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">
                              {e.supplierName || '—'}
                              {e.supplierTaxId && <span className="block text-xs text-gray-400 dark:text-gray-500 notranslate">ΑΦΜ {e.supplierTaxId}</span>}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400">
                              {e.categoryLabel || <span className="text-orange-600 dark:text-orange-400">λείπει ⚠</span>}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 notranslate">{e.docNumber || '—'}</td>
                            <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 notranslate">{e.issueDate ? new Date(e.issueDate).toLocaleDateString('el-GR') : '—'}</td>
                            <td className="py-2.5 pr-4 notranslate">
                              {e.method === 'unpaid' ? (
                                <span className="text-orange-600 dark:text-orange-400">ανεξόφλητο</span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {e.methodLabel}{e.paymentDate ? ` · ${new Date(e.paymentDate).toLocaleDateString('el-GR')}` : ''}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-right text-charcoal dark:text-gray-200 notranslate">
                              {eur(e.amount)}
                              {e.withholding > 0 && <span className="block text-xs text-gray-400 dark:text-gray-500">κρατήσεις {eur(e.withholding)}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {(data.unpaidCount > 0 || data.uncategorised > 0) && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 rounded-xl bg-orange-50 dark:bg-orange-900/20 px-4 py-2.5">
                    {data.unpaidCount > 0 && `${data.unpaidCount} δαπάνη/ες χωρίς εξόφληση — μπαίνουν στο αρχείο του μήνα αλλά δεν έχουν φύγει από το ταμείο. `}
                    {data.uncategorised > 0 && `${data.uncategorised} χωρίς κατηγορία — συμπλήρωσέ την στα Οικονομικά → Έξοδα ώστε να μπει σωστά στο ΕΞΟΔΑ.`}
                  </p>
                )}
              </div>

              {/* ---- Γ. ΕΚ ΤΩΝ ΥΣΤΕΡΩΝ (μήνες που έχουν ήδη σταλεί) ---- */}
              {(data.late || []).length > 0 && (
                <div className="rounded-2xl border border-coral/40 bg-coral/5 dark:bg-coral/10 p-4">
                  <p className="text-xs font-bold tracking-widest text-coral mb-1">Γ. ΕΚ ΤΩΝ ΥΣΤΕΡΩΝ — ΓΙΑ ΜΗΝΕΣ ΠΟΥ ΕΧΟΥΝ ΗΔΗ ΣΤΑΛΕΙ</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                    Μένουν καταχωρημένα στον μήνα έκδοσής τους (τελευταία γραμμή του) — φεύγουν προς το λογιστήριο με την αποστολή ΑΥΤΟΥ του μήνα, μία φορά.
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {data.late.map(l => (
                      <li key={l.documentId} className="flex flex-wrap items-baseline gap-x-2 text-charcoal dark:text-gray-100">
                        <span className="font-bold notranslate">{monthLabel(l.month)} · {l.aa || '—'}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-coral/15 text-coral">
                          {l.kind === 'addition' ? 'νέα καταχώρηση' : 'εξόφληση'}
                        </span>
                        <span>{l.supplierName}{l.docNumber ? ` · ${l.docNumber}` : ''}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {l.paymentDate ? `πληρωμή ${new Date(l.paymentDate).toLocaleDateString('el-GR')}` : 'ανεξόφλητο'}
                        </span>
                        <span className="ml-auto font-bold notranslate">{eur(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
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
                        Αποστολή του αρχείου {monthLabel(month)} στο λογιστήριο; Περιλαμβάνει {data.count} έσοδα ({eur(data.summary.income)})
                        και {data.expenseCount} έξοδα ({eur(data.summary.expenses)}).
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
