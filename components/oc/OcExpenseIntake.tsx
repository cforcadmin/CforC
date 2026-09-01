'use client'

import { useRef, useState } from 'react'
import { notifyFinanceChanged } from '@/lib/ocFinanceEvents'
import { detectStatementMonths, formatMonthEl } from '@/lib/bankStatement'

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
    grossAmount?: number | null
    withholding?: number | null
    supplierHint: string
  }
  suggestion: {
    docRef: string
    supplierName: string | null
    supplierTaxId: string | null
    category: string | null
    autoPaid?: boolean
    fromRegistry: boolean
    confirmations: number
  }
  existing: { documentId?: string; aa: string; state: string; amount: number | null; hasFile?: boolean } | null
  /** Χειροκίνητη καταχώρηση χωρίς αρχείο (ακραία περίπτωση — βλ. Προσθήκη) */
  manual?: boolean
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
  autoPaid: boolean
  showAll: boolean
}

const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const lockedCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-not-allowed'
const labelCls = 'block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5'

export default function OcExpenseIntake({ canIssue, canManual = false, month, kiniseis, onCarriedMatched }: {
  canIssue: boolean
  /** IT: προσθήκη + έγκριση ΜΟΝΟ χειροκίνητων γραμμών */
  canManual?: boolean
  month: string
  kiniseis: string
  /** documentIds παλαιότερων ανεξόφλητων που βρέθηκαν στις κινήσεις (✓ στη λίστα του γονέα) */
  onCarriedMatched?: (ids: string[]) => void
}) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  // Χειροκίνητη προσθήκη γραμμής: προειδοποίηση πρώτα, μετά η γραμμή
  const [addingManual, setAddingManual] = useState(false)
  const manualSeq = useRef(0)
  const [rows, setRows] = useState<IntakeRow[]>([])
  const [state, setState] = useState<Record<string, RowState>>({})
  const [stats, setStats] = useState<any>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [folderUrl, setFolderUrl] = useState<string | null>(null)
  const [mismatches, setMismatches] = useState<Array<{ fileId: string; fileName: string; fromName: number; fromBank: number }>>([])
  const [recon, setRecon] = useState<any>(null)
  const [acking, setAcking] = useState<string | null>(null)
  /** Ένα τιμολόγιο ↔ πολλές χρεώσεις: προτάσεις προς επιβεβαίωση */
  const [pairings, setPairings] = useState<any[]>([])
  const [groupPick, setGroupPick] = useState<Record<string, Record<string, boolean>>>({})
  const [openCharges, setOpenCharges] = useState<Record<string, boolean>>({})

  /** «Το έλεγξα»: η ενημέρωση κλείνει στη βάση, για όλους */
  async function ackRecon(documentId: string) {
    setAcking(documentId)
    try {
      const res = await fetch('/api/oc/expense-intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, action: 'ackRecon', id: documentId }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      setRecon((r: any) => (r ? { ...r, settledEarlier: (r.settledEarlier || []).filter((x: any) => x.documentId !== documentId) } : r))
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία σήμανσης')
    } finally { setAcking(null) }
  }
  const [carried, setCarried] = useState<any[]>([])
  const [carriedPick, setCarriedPick] = useState<Record<string, boolean>>({})
  const [approving, setApproving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [results, setResults] = useState<Record<string, { ok: boolean; aa?: string; newName?: string; error?: string }>>({})

  // Ίδιος έλεγχος με την Ανάλυση: μήνας αναφοράς ≠ μήνας επικόλλησης → προειδοποίηση
  const [monthWarn, setMonthWarn] = useState<string[] | null>(null)
  function analyze(force = false) {
    if (!force) {
      const months = detectStatementMonths(kiniseis)
      if (months.length > 0 && months[0] !== month) { setMonthWarn(months); return }
    }
    setMonthWarn(null)
    return runAnalyze()
  }

  async function runAnalyze() {
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
      setMismatches(data.mismatches || [])
      setCarried(data.carriedOver || [])
      setCarriedPick(Object.fromEntries((data.carriedOver || []).map((c: any) => [c.documentId, true])))
      onCarriedMatched?.((data.carriedOver || []).map((c: any) => c.documentId))
      setRecon(data.reconciliation || null)
      setPairings(data.pairings || [])
      setOpenCharges({})
      // Προεπιλογή: όλες οι προτεινόμενες χρεώσεις· ο άνθρωπος ξεδιαλέγει αν χρειαστεί
      setGroupPick(Object.fromEntries((data.pairings || []).map(
        (c: any) => [c.fileId, Object.fromEntries((c.charges || []).map((x: any) => [x.txnId, true]))])))
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
        // Προμηθευτής με αυτόματη χρέωση (τραπεζικά έξοδα, κάρτα):
        // πληρωμή την ίδια μέρα με την έκδοση, ακόμη κι αν δεν βρέθηκε κίνηση
        const auto = !!r.suggestion.autoPaid
        init[r.fileId] = {
          include: !r.existing || r.existing.hasFile === false,
          aa: r.existing?.aa || `${monthIdx}.${r.existing ? '' : seq++}`,
          issueDate: r.parsed.issueDate || '',
          docRef: r.suggestion.docRef,
          supplierName: r.suggestion.supplierName || '',
          supplierTaxId: r.suggestion.supplierTaxId || '',
          category: r.suggestion.category || '',
          netAmount: '',
          vatAmount: '',
          // «σύνολο→πληρωτέο» στο όνομα → οι κρατήσεις έρχονται έτοιμες
          withholding: r.parsed.withholding != null && r.parsed.withholding > 0 ? String(r.parsed.withholding) : '',
          payable: amount !== null ? String(amount) : '',
          paymentMethod: bank || auto ? 'bank' : 'unpaid',
          paymentDate: bank?.date || (auto ? (r.parsed.issueDate || '') : ''),
          txnId: bank?.txnId || '',
          notes: '',
          autoPaid: auto,
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

  /** Γραμμή χωρίς αρχείο: ίδια πεδία, ίδιος έλεγχος, ίδια έγκριση — μόνο
   *  σημαδεμένη «χειροκίνητη» στις Σημειώσεις (βάση + ΕΞΟΔΑ, από τον server) */
  function addManualRow() {
    manualSeq.current += 1
    const id = `manual-${manualSeq.current}`
    const monthIdx = Number(month.split('-')[1]) || 0
    const row: IntakeRow = {
      fileId: id, fileName: '', fileUrl: '', manual: true,
      parsed: { mark: null, docNumber: null, issueDate: null, amount: null, supplierHint: '' },
      suggestion: { docRef: '2.1/', supplierName: null, supplierTaxId: null, category: null, fromRegistry: false, confirmations: 0 },
      existing: null,
    }
    setRows(prev => [...prev, row])
    setState(prev => ({
      ...prev,
      [id]: {
        include: true, aa: `${monthIdx}.${rows.length + 1}`, issueDate: '', docRef: '2.1/',
        supplierName: '', supplierTaxId: '', category: '', netAmount: '', vatAmount: '', withholding: '',
        payable: '', paymentMethod: 'unpaid', paymentDate: '', txnId: '', notes: '', autoPaid: false, showAll: true,
      },
    }))
    setAddingManual(false)
  }

  const selected = rows.filter(r => state[r.fileId]?.include && !results[r.fileId]?.ok)
  const isLink = (r: IntakeRow) => !!r.existing && r.existing.hasFile === false
  /** Πληρωμή πριν από την έκδοση δεν υπάρχει — ούτε ως πρόταση, ούτε ως έγκριση */
  const paidBeforeIssued = (fileId: string) => {
    const st = state[fileId]
    return !!st?.paymentDate && !!st?.issueDate && st.paymentDate < st.issueDate
  }

  const ready = selected.filter(r => {
    if (isLink(r)) return true
    const st = state[r.fileId]
    return st.issueDate && Number(st.payable) > 0 && !paidBeforeIssued(r.fileId)
  })

  async function approve() {
    setConfirming(false); setApproving(true); setError(null)
    try {
      const items = ready.map(r => {
        const st = state[r.fileId]
        return {
          fileId: r.fileId,
          fileName: r.fileName,
          linkTo: isLink(r) ? r.existing!.documentId : undefined,
          issueDate: st.issueDate,
          docRef: st.docRef,
          docNumber: r.parsed.docNumber,
          mark: r.parsed.mark,
          supplierHint: r.parsed.supplierHint,
          supplierName: st.supplierName,
          supplierTaxId: st.supplierTaxId,
          category: st.category,
          netAmount: st.netAmount,
          vatAmount: st.vatAmount,
          withholding: st.withholding,
          payable: st.payable,
          paymentMethod: st.paymentMethod,
          paymentDate: st.paymentDate,
          txnId: st.txnId,
          notes: st.notes,
          autoPaid: st.autoPaid,
        }
      })
      const settlements = carried
        .filter(c => carriedPick[c.documentId])
        .map(c => ({
          documentId: c.documentId, docRef: c.docRef, amount: c.amount,
          paymentDate: c.paymentDate, paymentMethod: 'bank', txnId: c.txnId,
        }))
      const res = await fetch('/api/oc/expense-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', month, items, settlements }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία έγκρισης')
      const map: Record<string, any> = {}
      for (const r of data.results || []) map[r.fileId] = r
      setResults(prev => ({ ...prev, ...map }))
      if ((data.results || []).some((r: any) => r.ok)) notifyFinanceChanged(month)
      if ((data.settled || []).some((x: any) => x.ok)) {
        setCarried(prev => prev.filter(c => !(data.settled || []).some((x: any) => x.ok && x.documentId === c.documentId)))
      }
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία έγκρισης')
    } finally {
      setApproving(false)
    }
  }

  async function approveOne(fileId: string) {
    const r = rows.find(x => x.fileId === fileId)
    if (!r) return
    const st = state[fileId]
    setApproving(true); setError(null)
    try {
      const res = await fetch('/api/oc/expense-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve', month,
          items: [{
            fileId, fileName: r.fileName, linkTo: isLink(r) ? r.existing!.documentId : undefined, issueDate: st.issueDate, docRef: st.docRef,
            docNumber: r.parsed.docNumber, mark: r.parsed.mark, supplierHint: r.parsed.supplierHint,
            supplierName: st.supplierName, supplierTaxId: st.supplierTaxId, category: st.category,
            netAmount: st.netAmount, vatAmount: st.vatAmount, withholding: st.withholding,
            payable: st.payable, paymentMethod: st.paymentMethod, paymentDate: st.paymentDate,
            txnId: st.txnId, notes: st.notes, autoPaid: st.autoPaid,
          }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
      const one = (data.results || [])[0]
      if (one) setResults(prev => ({ ...prev, [fileId]: one }))
      if (one?.ok) notifyFinanceChanged(month)
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία έγκρισης')
    } finally {
      setApproving(false)
    }
  }

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
          </p>
          <p>
            <strong>Ποσό (προαιρετικό, αλλά χρήσιμο):</strong> γράψ' το ως ξεχωριστό κομμάτι του ονόματος, με{' '}
            <strong>κόμμα και δύο δεκαδικά</strong> — <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">36,26</code>,{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">1.299,52</code> — ή με{' '}
            <strong>€</strong> οπότε επιτρέπεται και τελεία:{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">16.20€</code>,{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">2500€</code>.
            Π.χ. <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">Strapi_72152_16,20_03-08-2026.pdf</code>.
            Όταν υπάρχει και στο όνομα και στην τράπεζα, τα <strong>συγκρίνουμε</strong> και σου δείχνουμε τυχόν διαφορά.
          </p>
          <p>
            <strong>Κρατήσεις (άλλο σύνολο, άλλο πληρωτέο):</strong> γράψε το ποσό ως ζεύγος{' '}
            <strong>σύνολο→πληρωτέο</strong> — π.χ.{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">Παπαδοπούλου_112_18-08-2026_120,00→96,00.pdf</code>.
            Διαβάζουμε 120,00 σύνολο και 96,00 πληρωτέο, συμπληρώνουμε μόνοι μας κρατήσεις 24,00 (στη βάση και στο ΕΞΟΔΑ)
            και με την τράπεζα συγκρίνουμε το <strong>πληρωτέο</strong> — αυτό φεύγει από τον λογαριασμό.
            Δεκτά και τα <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">-&gt;</code> ή{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">&gt;</code> αν το βέλος δυσκολεύει.
            Σκέτο ποσό σημαίνει «πληρωτέο, χωρίς κρατήσεις». Μετά την έγκριση το όνομα κρατά το ζεύγος.
          </p>
          <p>
            Μετά την έγκριση όλα τα αρχεία —τιμολόγια, έσοδα, αποδείξεις— <strong>μετονομάζονται στην ίδια μορφή</strong>:{' '}
            <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">Α/Α_σε ποιον αφορά_αριθμός παραστατικού_ΜΑΡΚ_ΗΗ-ΜΜ-ΕΕΕΕ_ποσό.pdf</code>{' '}
            — π.χ. <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">9.4_ΑΒ Βασιλόπουλος_4471-88012_400014700880013_28-08-2026_62,50.pdf</code>.
            Ό,τι λείπει (π.χ. ΜΑΡΚ) απλώς παραλείπεται. Έτσι η γραμμή του ΕΞΟΔΑ και το αρχείο βρίσκονται πάντα μεταξύ τους.
          </p>
          <p>
            Η <strong>επωνυμία, το ΑΦΜ και η κατηγορία</strong> συμπληρώνονται από το μητρώο προμηθευτών: το δηλώνεις μία φορά
            και θυμάται. Το <strong>ποσό και η ημερομηνία πληρωμής</strong> έρχονται από τις χρεώσεις της τράπεζας (κοινή επικόλληση πάνω).
          </p>
        </div>
      )}

      <button type="button" onClick={() => analyze()} disabled={!canIssue || analyzing}
        className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
        {analyzing ? 'Έλεγχος…' : 'Έλεγχος τιμολογίων'}
      </button>

      {monthWarn && (
            <div className="mt-4 rounded-2xl border-2 border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/60 p-4 text-sm text-fuchsia-950 dark:text-fuchsia-50">
              <p className="font-bold mb-1">⚠ Ο μήνας αναφοράς δεν ταιριάζει με τα δεδομένα</p>
              <p className="mb-3">
                Διάλεξες <strong className="notranslate">{formatMonthEl(month)}</strong>, αλλά οι κινήσεις που επικόλλησες είναι του{' '}
                <strong className="notranslate">{formatMonthEl(monthWarn[0])}</strong>
                {monthWarn.length > 1 && <> (και {monthWarn.slice(1).map(formatMonthEl).join(', ')})</>}.
                Αν συνεχίσεις, οι εγγραφές θα γραφτούν στον λάθος μήνα.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => analyze(true)}
                  className="px-4 py-1.5 rounded-full border border-fuchsia-400 text-xs font-bold text-fuchsia-900 dark:text-fuchsia-50 hover:bg-fuchsia-500/15">
                  Συνέχεια παρ' όλα αυτά
                </button>
                <button type="button" onClick={() => setMonthWarn(null)}
                  className="px-4 py-1.5 rounded-full bg-fuchsia-600 text-white text-xs font-bold hover:opacity-90">
                  Άκυρο
                </button>
              </div>
            </div>
          )}
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

      {/* Προτάσεις αντιστοίχισης: ένα τιμολόγιο ↔ πολλές χρεώσεις.
          Πρώτα ό,τι λύνεται με ένα κλικ — μετά τα υπόλοιπα. */}
      {pairings.map((c: any) => {
        const picks = groupPick[c.fileId] || {}
        const chosen = (c.charges || []).filter((x: any) => picks[x.txnId])
        const sum = Math.round(chosen.reduce((a: number, x: any) => a + x.amount, 0) * 100) / 100
        const inv = c.invoiceAmount
        const diff = inv === null ? null : Math.round((sum - inv) * 100) / 100
        const ok = diff !== null && Math.abs(diff) < 0.005
        const first = (c.charges || [])[0]
        const sameAmount = (c.charges || []).every((x: any) => Math.abs(x.amount - (first?.amount || 0)) < 0.005)
        const used = !!state[c.fileId]?.txnId && !!state[c.fileId]?.paymentDate
        return (
          <div key={c.fileId} className={`mt-4 rounded-2xl px-5 py-4 text-sm border ${
            ok ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
               : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'}`}>
            <p className="font-bold text-charcoal dark:text-gray-100">
              {ok ? '💡 ΠΡΟΤΕΙΝΟΜΕΝΗ ΑΝΤΙΣΤΟΙΧΙΣΗ' : '⚠ ΤΑ ΠΟΣΑ ΔΕΝ ΣΥΜΦΩΝΟΥΝ'}
            </p>
            <p className="mt-1 notranslate text-charcoal dark:text-gray-200 break-all">
              {c.fileName} · <strong>{inv !== null ? Number(inv).toFixed(2).replace('.', ',') : '—'} €</strong>
            </p>
            <p className="notranslate text-charcoal dark:text-gray-200">
              ↔ {sameAmount && first
                  ? `${(c.charges || []).length} × ${Number(first.amount).toFixed(2).replace('.', ',')} €`
                  : `${(c.charges || []).length} χρεώσεις`}
              {first?.reason ? ` · ${first.reason}` : ''}
              {first?.date ? ` · ${new Date(first.date).toLocaleDateString('el-GR')}` : ''}
            </p>
            <p className={`text-xs mt-1 ${ok ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
              {ok ? 'Τα ποσά συμφωνούν ακριβώς.'
                  : `Επιλογή ${sum.toFixed(2).replace('.', ',')} € έναντι τιμολογίου ${inv !== null ? Number(inv).toFixed(2).replace('.', ',') : '—'} € · διαφορά ${diff !== null ? (diff > 0 ? '+' : '') + diff.toFixed(2).replace('.', ',') : '—'} €`}
              {c.source === 'rule' && ' · κανόνας προμηθευτή'}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button type="button"
                onClick={() => {
                  const last = chosen.reduce((a: any, b: any) => (a && a.date > b.date ? a : b), null)
                  patch(c.fileId, {
                    include: true, paymentMethod: 'bank',
                    paymentDate: last ? String(last.date).slice(0, 10) : '',
                    txnId: last?.txnId || '',
                    payable: inv !== null ? String(inv) : state[c.fileId]?.payable || '',
                    // Η προηγούμενη σημείωση κάλυψης αντικαθίσταται, δεν προστίθεται:
                    // δεύτερο πάτημα έγραφε «Καλύπτει… · Καλύπτει…»
                    notes: [`Καλύπτει ${chosen.length} χρεώσεις (${sum.toFixed(2).replace('.', ',')} €)`,
                            ok ? '' : `διαφορά ${diff?.toFixed(2).replace('.', ',')} €`,
                            String(state[c.fileId]?.notes || '')
                              .split(' · ')
                              .filter(part => !/^Καλύπτει \d+ χρεώσεις|^διαφορά /.test(part.trim()))
                              .join(' · ')].filter(Boolean).join(' · '),
                  })
                }}
                disabled={chosen.length === 0}
                className="px-4 py-1.5 rounded-full bg-coral text-white text-xs font-bold hover:bg-coral/90 disabled:opacity-40">
                {used ? 'Ενημέρωση' : 'Χρήση'}
              </button>
              <button type="button" onClick={() => setOpenCharges(o => ({ ...o, [c.fileId]: !o[c.fileId] }))}
                className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-xs font-bold text-charcoal dark:text-gray-200 hover:border-coral">
                {openCharges[c.fileId] ? 'Απόκρυψη χρεώσεων' : 'Δείξε τις χρεώσεις'}
              </button>
              {used && <span className="text-xs text-green-700 dark:text-green-300">καταχωρήθηκε στη γραμμή ✓</span>}
            </div>

            {openCharges[c.fileId] && (
              <ul className="mt-3 space-y-0.5 border-t border-black/10 dark:border-white/10 pt-2">
                {(c.charges || []).map((x: any) => (
                  <li key={x.txnId} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="accent-[#FF8B6A]" checked={!!picks[x.txnId]}
                      onChange={e => setGroupPick(g => ({ ...g, [c.fileId]: { ...(g[c.fileId] || {}), [x.txnId]: e.target.checked } }))} />
                    <span className="notranslate text-gray-700 dark:text-gray-300">
                      {new Date(x.date).toLocaleDateString('el-GR')} · {x.amount.toFixed(2).replace('.', ',')} € · {x.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {mismatches.length > 0 && (
        <div className="mt-4 rounded-2xl bg-red-50 dark:bg-red-900/25 border border-red-300 dark:border-red-700 px-5 py-4 text-sm">
          <p className="font-bold text-red-800 dark:text-red-200 mb-2">⚠ Ασυμφωνία ποσού ονόματος ↔ τράπεζας</p>
          <ul className="space-y-1 text-red-700 dark:text-red-300">
            {mismatches.map(m => (
              <li key={m.fileId} className="notranslate">
                {m.fileName}: όνομα {m.fromName.toFixed(2).replace('.', ',')} € · τράπεζα {m.fromBank.toFixed(2).replace('.', ',')} €
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-700 dark:text-red-300 mt-2">
            Έλεγξε ποιο ισχύει πριν εγκρίνεις — το πεδίο «Πληρωτέο» έχει την τιμή του ονόματος.
          </p>
        </div>
      )}

      {carried.length > 0 && (
        <div className="mt-4 rounded-2xl bg-sky-50 dark:bg-sky-900/25 border border-sky-300 dark:border-sky-700 px-5 py-4 text-sm">
          <p className="font-bold text-sky-900 dark:text-sky-100 mb-1">
            Εξοφλήσεις παλαιότερων παραστατικών ({carried.length})
          </p>
          <p className="text-xs text-sky-800 dark:text-sky-200 mb-3">
            Τιμολόγια προηγούμενων μηνών που έμεναν απλήρωτα και πληρώθηκαν τώρα. Με την έγκριση
            συμπληρώνεται η <strong>υπάρχουσα</strong> γραμμή τους στο ΕΞΟΔΑ (σβήνει και το «ΔΙΑΦΟΡΑ!»).
          </p>
          <ul className="space-y-1.5">
            {carried.map(c => (
              <li key={c.documentId} className="flex flex-wrap items-center gap-2">
                <input type="checkbox" className="w-4 h-4 accent-coral" checked={!!carriedPick[c.documentId]}
                  onChange={e => setCarriedPick(p => ({ ...p, [c.documentId]: e.target.checked }))}
                  aria-label={`Εξόφληση ${c.aa}`} />
                <span className="text-charcoal dark:text-gray-100 notranslate">
                  {c.aa} · {c.supplierName || c.docRef} · {Number(c.amount).toFixed(2).replace('.', ',')} €
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 notranslate">
                  έκδοση {c.issueDate ? new Date(c.issueDate).toLocaleDateString('el-GR') : '—'} →
                  πληρωμή {new Date(c.paymentDate).toLocaleDateString('el-GR')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recon && (
        <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4 text-sm space-y-3">
          <p className="font-bold text-charcoal dark:text-gray-100">Συμφωνία μήνα</p>
          {recon.debitsWithoutInvoice?.length > 0 && (
            <div>
              <p className="text-orange-800 dark:text-orange-200 font-medium">
                {recon.debitsWithoutInvoice.length} χρεώσεις χωρίς παραστατικό
                <span className="notranslate"> — σύνολο {Number(recon.debitsWithoutInvoiceTotal).toFixed(2).replace('.', ',')} €</span>
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                {(recon.groupedLeftovers || []).map((g: any, i: number) => (
                  <li key={`${g.reason}-${g.amount}-${i}`} className="notranslate">
                    {g.count > 1
                      ? `${g.count} × ${Number(g.amount).toFixed(2).replace('.', ',')} € · ${g.reason} · ${[...new Set(g.dates.map((d: string) => new Date(d).toLocaleDateString('el-GR')))].join(', ')}`
                      : `${new Date(g.dates[0]).toLocaleDateString('el-GR')} · ${Number(g.amount).toFixed(2).replace('.', ',')} € · ${g.reason}`}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ζήτησε τα τιμολόγια που λείπουν και ρίξ' τα στον φάκελο του μήνα.
              </p>
            </div>
          )}
          {/* Εξοφλήσεις παραστατικών προηγούμενου μήνα: ενημέρωση, όχι σφάλμα.
              Το (i) εξηγεί τι να ελεγχθεί· το ✕ την κλείνει για όλους. */}
          {recon.settledEarlier?.length > 0 && (
            <div>
              <p className="text-charcoal dark:text-gray-200 font-medium flex items-center gap-1.5">
                {recon.settledEarlier.length} {recon.settledEarlier.length === 1 ? 'χρέωση εξοφλεί' : 'χρεώσεις εξοφλούν'} παραστατικό προηγούμενου μήνα
                <span className="relative inline-flex group">
                  <span tabIndex={0} role="note" aria-label="Τι να ελέγξεις"
                    className="w-4 h-4 rounded-full border border-gray-400 dark:border-gray-500 text-[10px] font-bold leading-none flex items-center justify-center text-gray-500 dark:text-gray-400 cursor-help">i</span>
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-40
                    rounded-xl bg-charcoal text-white text-xs leading-relaxed px-3 py-2 shadow-lg">
                    Δεν είναι λάθος: το παραστατικό ανήκει στον μήνα έκδοσής του και πληρώθηκε τώρα.
                    Αξίζει όμως μια ματιά ότι είναι σωστές και οι δύο ημερομηνίες — έκδοσης και πληρωμής.
                    Με το ✕ η ενημέρωση κλείνει οριστικά, για όλους.
                  </span>
                </span>
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                {recon.settledEarlier.map((x: any) => (
                  <li key={x.documentId} className="flex items-baseline gap-2">
                    <span className="notranslate">
                      {x.aa} · {x.supplierName || '—'}{x.docRef ? ` · ${x.docRef}` : ''} · {Number(x.amount).toFixed(2).replace('.', ',')} €
                      {' · '}έκδοση {x.issueDate ? new Date(x.issueDate).toLocaleDateString('el-GR') : '—'}
                      {' · '}πληρωμή {x.paymentDate ? new Date(x.paymentDate).toLocaleDateString('el-GR') : '—'}
                    </span>
                    {!x.hasFile && <span className="text-amber-700 dark:text-amber-300">χωρίς αρχείο</span>}
                    <button type="button" onClick={() => ackRecon(x.documentId)} disabled={acking === x.documentId}
                      title="Το έλεγξα — να μην ξαναεμφανιστεί" aria-label="Το έλεγξα — να μην ξαναεμφανιστεί"
                      className="ml-auto px-1.5 rounded-full text-gray-400 hover:text-coral hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recon.invoicesWithoutPayment?.length > 0 && (
            <div>
              <p className="text-charcoal dark:text-gray-200 font-medium">
                {recon.invoicesWithoutPayment.length} παραστατικά χωρίς πληρωμή στην τράπεζα
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                {recon.invoicesWithoutPayment.map((i: any) => (
                  <li key={i.fileName} className="notranslate">
                    {i.fileName}{i.amount ? ` · ${Number(i.amount).toFixed(2).replace('.', ',')} €` : ''}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Φυσιολογικό αν είναι όντως απλήρωτα — θα πάρουν ημ. πληρωμής όταν εμφανιστούν σε επόμενη επικόλληση.
              </p>
            </div>
          )}

          {/* Όταν όλα δένουν, ο έλεγχος πρέπει να ΤΟ ΛΕΕΙ — αλλιώς δεν ξέρεις
              αν έτρεξε ή αν απλώς δεν εμφανίστηκε τίποτα. */}
          {!recon.debitsWithoutInvoice?.length && !recon.invoicesWithoutPayment?.length && (
            <p className="text-green-800 dark:text-green-200 font-medium">
              ✓ Καμία ανεξήγητη χρέωση · κανένα απλήρωτο παραστατικό
            </p>
          )}
        </div>
      )}

      {(rows.length > 0 || recon || canManual) && (
        <div className="mt-4 space-y-3">
          {rows.map(r => {
            const st = state[r.fileId]
            if (!st) return null
            const locked = !!r.existing && r.existing.hasFile !== false
            const link = isLink(r)
            return (
              <div key={r.fileId}
                className={`rounded-2xl border p-4 ${
                  locked
                    ? 'border-green-300 bg-green-50/60 dark:border-green-700 dark:bg-green-900/20'
                    : r.manual
                      ? 'border-fuchsia-300 bg-fuchsia-50/40 dark:border-fuchsia-700 dark:bg-fuchsia-900/10'
                      : 'border-gray-200 dark:border-gray-600'
                }`}>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {!locked && (
                    <input type="checkbox" className="w-4 h-4 accent-coral" checked={st.include}
                      onChange={e => patch(r.fileId, { include: e.target.checked })}
                      aria-label={`Επιλογή ${r.manual ? 'χειροκίνητης καταχώρησης' : r.fileName}`} />
                  )}
                  {r.manual ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/50 dark:text-fuchsia-200"
                      title="Καταχώρηση χωρίς αρχείο — μόνο σε ακραίες περιπτώσεις, με ενημέρωση του IT">
                      ✍️ χειροκίνητη καταχώρηση
                    </span>
                  ) : (
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-charcoal dark:text-gray-100 hover:text-coral notranslate truncate max-w-md">
                    📄 {r.fileName}
                  </a>
                  )}
                  {locked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 notranslate">
                      ✓ καταχωρημένο ({r.existing!.aa})
                    </span>
                  )}
                  {link && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200 notranslate"
                      title="Η γραμμή υπάρχει ήδη στο ΕΞΟΔΑ/βάση χωρίς αρχείο — το αρχείο θα δεθεί σε αυτήν, χωρίς νέα εγγραφή">
                      ↳ υπάρχει ως {r.existing!.aa} χωρίς αρχείο — θα συνδεθεί
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
                  {!st.txnId && r.suggestion.autoPaid && !locked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200"
                      title="Προμηθευτής με αυτόματη χρέωση — πληρωμή την ημέρα έκδοσης">
                      αυτόματη χρέωση
                    </span>
                  )}
                  {mismatches.some(m => m.fileId === r.fileId) && !locked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                      ⚠ ασυμφωνία ποσού
                    </span>
                  )}
                  {results[r.fileId]?.ok && (
                    <span className="ml-auto text-xs font-bold text-green-700 dark:text-green-300 notranslate">
                      ✓ {results[r.fileId].aa} · {results[r.fileId].newName}
                    </span>
                  )}
                  {results[r.fileId] && !results[r.fileId].ok && (
                    <span className="ml-auto text-xs text-red-600 dark:text-red-400">{results[r.fileId].error}</span>
                  )}
                  {!locked && !results[r.fileId]?.ok && (r.manual ? canManual : canIssue) && (
                    <button type="button" onClick={() => approveOne(r.fileId)}
                      disabled={approving || (!link && (!st.issueDate || !(Number(st.payable) > 0)))}
                      title={link ? 'Δένει το αρχείο στην υπάρχουσα γραμμή' : !st.issueDate ? 'Λείπει ημερομηνία έκδοσης' : !(Number(st.payable) > 0) ? 'Λείπει ποσό' : undefined}
                      className="ml-auto px-3 py-1 rounded-full bg-[#6A994E] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40">
                      {link ? 'Σύνδεση' : 'Έγκριση'}
                    </button>
                  )}
                </div>

                {!locked && !results[r.fileId]?.ok && (
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
                      <input type="date" className={`${inputCls} ${paidBeforeIssued(r.fileId) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        value={st.paymentDate} min={st.issueDate || undefined}
                        onChange={e => patch(r.fileId, { paymentDate: e.target.value })} />
                      {paidBeforeIssued(r.fileId) && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                          ⚠ Πληρωμή πριν από την έκδοση — αδύνατο. Διόρθωσέ το ή άφησέ το ανεξόφλητο.
                        </p>
                      )}
                      <label className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <input type="checkbox" className="w-3 h-3 accent-coral" checked={st.autoPaid}
                          onChange={e => {
                            const on = e.target.checked
                            patch(r.fileId, {
                              autoPaid: on,
                              ...(on && !st.paymentDate ? { paymentDate: st.issueDate, paymentMethod: 'bank' as const } : {}),
                            })
                          }} />
                        αυτόματη χρέωση (να το θυμάται)
                      </label>
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

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {!confirming ? (
              <button type="button" onClick={() => setConfirming(true)}
                disabled={!(canIssue || canManual) || approving || (ready.length === 0 && carried.filter(c => carriedPick[c.documentId]).length === 0)}
                className="px-6 py-2.5 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                {approving ? 'Καταχώρηση…' : (() => {
                  const stl = carried.filter(c => carriedPick[c.documentId]).length
                  return `Έγκριση ${ready.length} εξόδων${stl ? ` + ${stl} εξοφλήσεων` : ''}`
                })()}
              </button>
            ) : (
              <>
                <span className="text-sm font-medium text-charcoal dark:text-gray-200">
                  Σίγουρα; Θα γραφτούν {ready.length} γραμμές στο ΕΞΟΔΑ και θα μετονομαστούν τα αρχεία.
                </span>
                <button type="button" onClick={approve} disabled={approving}
                  className="px-5 py-2 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                  Ναι, καταχώρηση
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={approving}
                  className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
                  Άκυρο
                </button>
              </>
            )}
            {canIssue && !canManual && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Χρειάζεται χειροκίνητη καταχώρηση (π.χ. αρχείο που δεν διαβάζεται); Επικοινώνησε με το IT (<a href="mailto:it@cultureforchange.net" className="text-coral underline">it@</a>) — γίνεται μόνο από εκεί.
              </span>
            )}
            {canManual && !confirming && !addingManual && (
              <button type="button" onClick={() => setAddingManual(true)} disabled={approving}
                className="px-5 py-2.5 rounded-full border-2 border-fuchsia-500 text-fuchsia-800 dark:text-fuchsia-100 text-sm font-bold hover:bg-fuchsia-500/15 disabled:opacity-40"
                title="Γραμμή χωρίς αρχείο — μόνο σε ακραίες περιπτώσεις">
                + Προσθήκη
              </button>
            )}
            {addingManual && (
              <div className="w-full rounded-2xl border-2 border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/60 p-4 text-sm text-fuchsia-950 dark:text-fuchsia-50">
                <p className="font-bold mb-1">⚠ Χειροκίνητη καταχώρηση (IT) — μόνο σε ακραίες περιπτώσεις</p>
                <p className="mb-3">
                  Πριν προχωρήσεις: ο/η <strong>Financer</strong> έχει κάνει τον οικονομικό έλεγχο (τράπεζα,
                  παραστατικό, ποσά) και σου έχει εξηγήσει γιατί δεν πέρασε από την κανονική ροή. Εσύ έλεγξε
                  <strong> τι έχει ήδη καταχωρηθεί</strong> (βάση και ΕΞΟΔΑ — να μη διπλογραφεί), κατάλαβε τι
                  δεν δούλεψε στον κώδικα και διόρθωσέ το, και μόνο τότε πρόσθεσε τη γραμμή. Θα σημανθεί
                  «Χειροκίνητη καταχώρηση από IT» στη βάση και στο ΕΞΟΔΑ και περνά από τον ίδιο έλεγχο
                  υποχρεωτικών πεδίων πριν την έγκριση.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={addManualRow}
                    className="px-4 py-1.5 rounded-full bg-fuchsia-600 text-white text-xs font-bold hover:opacity-90">
                    Κατάλαβα — προσθήκη γραμμής
                  </button>
                  <button type="button" onClick={() => setAddingManual(false)}
                    className="px-4 py-1.5 rounded-full border border-fuchsia-400 text-xs font-bold text-fuchsia-900 dark:text-fuchsia-50">
                    Άκυρο
                  </button>
                </div>
              </div>
            )}
            {selected.length !== ready.length && (
              <span className="text-xs text-orange-700 dark:text-orange-300">
                {selected.length - ready.length} επιλεγμένα χωρίς ημερομηνία ή ποσό — συμπλήρωσε ή αποεπίλεξε.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
