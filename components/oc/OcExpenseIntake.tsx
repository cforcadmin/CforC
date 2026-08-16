'use client'

import { useState } from 'react'

/**
 * Β. ΕΞΟΔΑ — παραστατικά του μήνα από το Drive → λίστα ελέγχου.
 *
 * Καμία εγγραφή εδώ: ο parser διαβάζει ΜΟΝΟ το όνομα του αρχείου, το
 * μητρώο προμηθευτών συμπληρώνει επωνυμία/ΑΦΜ/κατηγορία, και οι χρεώσεις
 * της τράπεζας (από την κοινή επικόλληση) δίνουν ποσό και ημ. πληρωμής.
 * Όλα τα πεδία με τιμή είναι ΕΠΕΞΕΡΓΑΣΙΜΑ — εκτός από Α/Α και ημ. έκδοσης.
 */

const CATEGORIES = ['Office Expenses', 'Services', 'Travel and Accommodation', 'Others'] as const

interface IntakeRow {
  fileId: string
  fileName: string
  fileUrl: string
  parsed: {
    mark: string | null
    docNumber: string | null
    issueDate: string | null
    amount: number | null
    supplierHint: string
  }
  suggestion: {
    docRef: string
    supplierName: string | null
    supplierTaxId: string | null
    category: string | null
    fromRegistry: boolean
    confirmations: number
  }
  existing: { aa: string; state: string; amount: number | null } | null
}

interface RowState {
  include: boolean
  aa: string
  issueDate: string
  docRef: string
  supplierName: string
  supplierTaxId: string
  category: string
  netAmount: string
  vatAmount: string
  withholding: string
  payable: string
  paymentMethod: 'bank' | 'cash' | 'offset' | 'unpaid'
  paymentDate: string
  txnId: string
  notes: string
  showAll: boolean
}

const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const lockedCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-not-allowed'
const labelCls = 'block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5'

export default function OcExpenseIntake({ canIssue, month, kiniseis }: {
  canIssue: boolean
  month: string
  kiniseis: string
}) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [rows, setRows] = useState<IntakeRow[]>([])
  const [state, setState] = useState<Record<string, RowState>>({})
  const [stats, setStats] = useState<any>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [folderUrl, setFolderUrl] = useState<string | null>(null)

  async function analyze() {
    setAnalyzing(true); setError(null); setRows([]); setWarnings([])
    try {
      const res = await fetch('/api/oc/expense-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, kiniseis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία ανάλυσης')
      setRows(data.rows)
      setWarnings(data.warnings || [])
      setStats(data.stats)
      setFolderUrl(data.folderUrl)
      if (data.folderMissing) {
        setWarnings(w => [...w, `Δεν βρέθηκε φάκελος εξόδων για τον μήνα ${month} στο Drive.`])
      }

      const init: Record<string, RowState> = {}
      let seq = data.nextSeq || 1
      const monthIdx = Number(month.split('-')[1])
      for (const r of data.rows as IntakeRow[]) {
        const bank = data.matched?.[r.fileId]
        const amount = r.parsed.amount ?? bank?.amount ?? null
        init[r.fileId] = {
          include: !r.existing,
          aa: r.existing?.aa || `${monthIdx}.${r.existing ? '' : seq++}`,
          issueDate: r.parsed.issueDate || '',
          docRef: r.suggestion.docRef,
          supplierName: r.suggestion.supplierName || '',
          supplierTaxId: r.suggestion.supplierTaxId || '',
          category: r.suggestion.category || '',
          netAmount: '',
          vatAmount: '',
          withholding: '',
          payable: amount !== null ? String(amount) : '',
          paymentMethod: bank ? 'bank' : 'unpaid',
          paymentDate: bank?.date || '',
          txnId: bank?.txnId || '',
          notes: '',
          showAll: false,
        }
      }
      setState(init)
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία ανάλυσης')
    } finally {
      setAnalyzing(false)
    }
  }

  function patch(id: string, p: Partial<RowState>) {
    setState(s => ({ ...s, [id]: { ...s[id], ...p } }))
  }

  const selected = rows.filter(r => state[r.fileId]?.include)

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h3 className="text-lg font-bold text-charcoal dark:text-gray-100">Β. Έξοδα</h3>
        <span className="text-sm text-gray-400 dark:text-gray-500">παραστατικά του μήνα από το Drive</span>
        <button type="button" onClick={() => setShowHelp(!showHelp)}
          onMouseEnter={() => setShowHelp(true)}
          aria-expanded={showHelp}
          title="Κανόνες ονομασίας αρχείων"
          className="w-6 h-6 rounded-full border border-coral text-coral text-xs font-bold hover:bg-coral hover:text-white transition-colors">
          i
        </button>
        {folderUrl && (
          <a href={folderUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-coral dark:text-coral-light hover:underline">άνοιγμα φακέλου ↗</a>
        )}
      </div>

      {showHelp && (
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4 mb-4 text-xs text-gray-600 dark:text-gray-300 space-y-2"
          onMouseLeave={() => setShowHelp(false)}>
          <p className="font-bold text-charcoal dark:text-gray-100">Πώς ονομάζω τα αρχεία που ρίχνω στον φάκελο</p>
          <p>
            Ρίξε τα παραστατικά στον φάκελο <strong>Παραστατικά → {month.split('-')[0]} → Έξοδα {month.split('-')[0]} → μήνας</strong>,
            με βάση την <strong>ημερομηνία έκδοσης</strong> (ακόμη κι αν πληρώθηκαν άλλον μήνα).
          </p>
          <p>
            Στο όνομα αρκεί: <strong>προμηθευτής</strong> + <strong>αριθμός παραστατικού</strong> (ή ID-ΜΑΡΚ) + <strong>ημερομηνία</strong>.
            Π.χ. <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">Strapi_72152_01-03-2026.pdf</code> ή σκέτο{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">2450-400012345678901.pdf</code>.
            Αν γράψεις και το ποσό (π.χ. <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">36,26</code>) συμπληρώνεται κι αυτό.
          </p>
          <p>
            Μετά την έγκριση τα αρχεία <strong>μετονομάζονται αυτόματα</strong> σε{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">Α/Α_όνομα που έδωσες_ΗΗ-ΜΜ-ΕΕΕΕ.pdf</code> — ώστε η γραμμή
            του ΕΞΟΔΑ και το αρχείο να βρίσκονται πάντα μεταξύ τους.
          </p>
          <p>
            Η <strong>επωνυμία, το ΑΦΜ και η κατηγορία</strong> συμπληρώνονται από το μητρώο προμηθευτών: το δηλώνεις μία φορά
            και θυμάται. Το <strong>ποσό και η ημερομηνία πληρωμής</strong> έρχονται από τις χρεώσεις της τράπεζας (κοινή επικόλληση πάνω).
          </p>
        </div>
      )}

      <button type="button" onClick={analyze} disabled={!canIssue || analyzing}
        className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
        {analyzing ? 'Έλεγχος…' : 'Έλεγχος τιμολογίων'}
      </button>
      {!canIssue && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Μόνο ο ενεργός ρόλος Financer.</p>}

      {error && <div className="mt-4 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-5 py-3 text-sm">{error}</div>}
      {warnings.length > 0 && (
        <div className="mt-4 rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-5 py-3 text-sm space-y-1">
          {warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
        </div>
      )}

      {stats && rows.length > 0 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {stats.files} αρχεία · {stats.fromRegistry} από μητρώο προμηθευτών · {stats.withDate} με ημερομηνία ·{' '}
          {stats.bankMatched} ταιριάχτηκαν με χρεώσεις τράπεζας
          {stats.alreadyRecorded > 0 && ` · ${stats.alreadyRecorded} ήδη καταχωρημένα`}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-3">
          {rows.map(r => {
            const st = state[r.fileId]
            if (!st) return null
            const locked = !!r.existing
            return (
              <div key={r.fileId}
                className={`rounded-2xl border p-4 ${
                  locked
                    ? 'border-green-300 bg-green-50/60 dark:border-green-700 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600'
                }`}>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {!locked && (
                    <input type="checkbox" className="w-4 h-4 accent-coral" checked={st.include}
                      onChange={e => patch(r.fileId, { include: e.target.checked })}
                      aria-label={`Επιλογή ${r.fileName}`} />
                  )}
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-charcoal dark:text-gray-100 hover:text-coral notranslate truncate max-w-md">
                    📄 {r.fileName}
                  </a>
                  {locked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 notranslate">
                      ✓ καταχωρημένο ({r.existing!.aa})
                    </span>
                  )}
                  {r.suggestion.fromRegistry && !locked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                      γνωστός προμηθευτής ×{r.suggestion.confirmations}
                    </span>
                  )}
                  {st.txnId && !locked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                      βρέθηκε στην τράπεζα
                    </span>
                  )}
                </div>

                {!locked && (
                  <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>Α/Α (κλειδωμένο)</label>
                      <input type="text" className={lockedCls} value={st.aa} readOnly tabIndex={-1} />
                    </div>
                    <div>
                      <label className={labelCls}>Ημ. έκδοσης (κλειδωμένη)</label>
                      <input type="text" className={lockedCls}
                        value={st.issueDate || '— λείπει από το όνομα —'} readOnly tabIndex={-1} />
                    </div>
                    <div className="lg:col-span-2">
                      <label className={labelCls}>Παραστατικό</label>
                      <input type="text" className={inputCls} value={st.docRef}
                        onChange={e => patch(r.fileId, { docRef: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Επωνυμία</label>
                      <input type="text" className={inputCls} value={st.supplierName}
                        onChange={e => patch(r.fileId, { supplierName: e.target.value })}
                        placeholder={r.parsed.supplierHint || 'επωνυμία προμηθευτή'} />
                    </div>
                    <div>
                      <label className={labelCls}>ΑΦΜ</label>
                      <input type="text" className={inputCls} value={st.supplierTaxId}
                        onChange={e => patch(r.fileId, { supplierTaxId: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Κατηγορία</label>
                      <select className={inputCls} value={st.category}
                        onChange={e => patch(r.fileId, { category: e.target.value })}>
                        <option value="">— επιλογή —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Πληρωτέο €</label>
                      <input type="number" step="0.01" className={inputCls} value={st.payable}
                        onChange={e => patch(r.fileId, { payable: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Τρόπος</label>
                      <select className={inputCls} value={st.paymentMethod}
                        onChange={e => patch(r.fileId, { paymentMethod: e.target.value as RowState['paymentMethod'] })}>
                        <option value="unpaid">Απλήρωτο</option>
                        <option value="bank">Τράπεζα</option>
                        <option value="cash">Μετρητά</option>
                        <option value="offset">Συμψηφισμός</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Ημ. πληρωμής</label>
                      <input type="date" className={inputCls} value={st.paymentDate}
                        onChange={e => patch(r.fileId, { paymentDate: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className={labelCls}>Σημειώσεις</label>
                      <input type="text" className={inputCls} value={st.notes}
                        onChange={e => patch(r.fileId, { notes: e.target.value })}
                        placeholder="π.χ. Sima, Reset!, πληρώθηκε από…" />
                    </div>

                    {st.showAll ? (
                      <>
                        <div>
                          <label className={labelCls}>Καθαρή αξία €</label>
                          <input type="number" step="0.01" className={inputCls} value={st.netAmount}
                            onChange={e => patch(r.fileId, { netAmount: e.target.value })} />
                        </div>
                        <div>
                          <label className={labelCls}>ΦΠΑ €</label>
                          <input type="number" step="0.01" className={inputCls} value={st.vatAmount}
                            onChange={e => patch(r.fileId, { vatAmount: e.target.value })} />
                        </div>
                        <div>
                          <label className={labelCls}>Κρατήσεις €</label>
                          <input type="number" step="0.01" className={inputCls} value={st.withholding}
                            onChange={e => patch(r.fileId, { withholding: e.target.value })}
                            placeholder="αρνητικό, π.χ. -209.60" />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-end">
                        <button type="button" onClick={() => patch(r.fileId, { showAll: true })}
                          className="text-xs text-coral dark:text-coral-light hover:underline">
                          + καθαρή αξία / ΦΠΑ / κρατήσεις
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selected.length} προς καταχώρηση — η έγκριση και η εγγραφή στο ΕΞΟΔΑ έρχονται στο επόμενο βήμα.
          </p>
        </div>
      )}
    </div>
  )
}
