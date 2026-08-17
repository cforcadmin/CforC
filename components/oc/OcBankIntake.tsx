'use client'

import { useMemo, useState } from 'react'
import { notifyFinanceChanged } from '@/lib/ocFinanceEvents'
import OcExpenseIntake from '@/components/oc/OcExpenseIntake'

/**
 * ΑΝΑΦΟΡΑ ΕΣΟΔΩΝ/ΕΞΟΔΩΝ — μία μηνιαία επικόλληση τράπεζας, δύο ενότητες:
 *   Α. ΕΣΟΔΑ  — πιστώσεις → αποδείξεις (εδώ)
 *   Β. ΕΞΟΔΑ  — παραστατικά Drive + χρεώσεις (OcExpenseIntake)
 * Η επικόλληση είναι ΚΟΙΝΗ: το ίδιο statement περιέχει και τα δύο, οπότε
 * δεν γίνεται δύο φορές.
 *
 * Δύο πεδία επικόλλησης (Κινήσεις + Εισερχόμενες εντολές από myAlpha Web),
 * ανάλυση server-side (join στον Αρ. Συναλλαγής, dedup, προτάσεις μέλους),
 * και ανά γραμμή: πληρωτής read-only ↔ ΕΠΕΞΕΡΓΑΣΙΜΟ πεδίο μέλους. Καμία
 * έκδοση χωρίς ρητή επιβεβαίωση· κάθε επιβεβαίωση διδάσκει τον matcher.
 * Εγγραφές (45€) ΔΕΝ εκδίδονται εδώ — δρομολογούνται στη ροή αιτήσεων.
 */

interface MemberOption { docId: string; name: string; am: number; email: string }

interface IntakeRow {
  txnId: string
  date: string
  amount: number
  fee: number | null
  reason: string
  payerName: string | null
  payerBank: string | null
  kind: 'registration' | 'subscription' | 'grant-like' | 'unknown'
  existingNumber: number | null
  suggestion: { source: 'alias' | 'match'; docId: string | null; name: string; am: number | null; email: string; confidence?: string; confirmations?: number } | null
  candidates: Array<{ docId: string; name: string; am: number; score: number; confidence: string }>
}

interface RowState {
  include: boolean
  type: 'subscription' | 'extraordinary' | 'donation' | 'grant' | 'other' | 'record-grant'
  year: string
  memberDocId: string | null
  memberName: string
  query: string
  sendEmail: boolean
  status: 'pending' | 'issuing' | 'done' | 'error'
  resultText: string
}

const KIND_LABEL: Record<IntakeRow['kind'], string> = {
  registration: 'Εγγραφή;',
  subscription: 'Συνδρομή',
  'grant-like': 'Χρηματοδότηση;',
  unknown: '—',
}

const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'

export default function OcBankIntake({ canIssue, members, onIssued }: {
  canIssue: boolean
  members: MemberOption[]
  onIssued: () => void
}) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - 1)   // default: προηγούμενος μήνας
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [kiniseis, setKiniseis] = useState('')
  const [incoming, setIncoming] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [rows, setRows] = useState<IntakeRow[]>([])
  const [state, setState] = useState<Record<string, RowState>>({})
  const [activeQueryTxn, setActiveQueryTxn] = useState<string | null>(null)
  const [showIncomeHelp, setShowIncomeHelp] = useState(false)

  async function analyze() {
    setAnalyzing(true); setError(null); setRows([]); setWarnings([])
    try {
      const res = await fetch('/api/oc/bank-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kiniseis, incoming }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία ανάλυσης')
      setRows(data.rows)
      setWarnings(data.warnings || [])
      const init: Record<string, RowState> = {}
      for (const r of data.rows as IntakeRow[]) {
        const isSub = r.kind === 'subscription'
        init[r.txnId] = {
          // Προεπιλογή: όλα εκτός των εγγραφών (που περνούν από τις αιτήσεις)
          include: r.kind !== 'registration' && !r.existingNumber,
          type: r.kind === 'grant-like' ? 'record-grant' : 'subscription',
          year: String(new Date(r.date).getFullYear()),
          memberDocId: r.suggestion?.docId || null,
          memberName: r.suggestion?.name || '',
          query: '',
          sendEmail: isSub,   // μόνο οι συνδρομές στέλνουν αυτόματα απόδειξη
          status: 'pending',
          resultText: '',
        }
      }
      setState(init)
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία ανάλυσης')
    } finally {
      setAnalyzing(false)
    }
  }

  function patch(txnId: string, p: Partial<RowState>) {
    setState(s => ({ ...s, [txnId]: { ...s[txnId], ...p } }))
  }

  const selected = rows.filter(r => state[r.txnId]?.include && state[r.txnId]?.status !== 'done')
  const readyCount = selected.filter(r => {
    const st = state[r.txnId]
    if (st.type === 'record-grant') return true   // το όνομα το δίνει η τράπεζα
    return st.memberDocId || st.memberName.trim()
  }).length

  async function issueSelected() {
    setIssuing(true); setConfirming(false)
    for (const r of selected) {
      const st = state[r.txnId]
      if (st.type !== 'record-grant' && !st.memberDocId && !st.memberName.trim()) {
        patch(r.txnId, { status: 'error', resultText: 'Λείπει μέλος/όνομα' })
        continue
      }
      patch(r.txnId, { status: 'issuing' })
      try {
        // Χορηγίες χωρίς απόδειξη: δεν αγγίζουν τη σειρά ΑΠ. ΕΙΣ. —
        // γράφονται στο ΕΣΟΔΑ με την αναφορά της τράπεζας
        if (st.type === 'record-grant') {
          const res = await fetch('/api/oc/income-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: r.amount,
              paymentDate: r.date,
              category: 'grant',
              payerName: st.memberName.trim() || r.payerName || '',
              description: r.reason,
              docRef: r.reason,
              txnId: r.txnId,
              paymentMethod: 'bank',
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
          patch(r.txnId, {
            status: 'done',
            resultText: `καταχωρήθηκε ${data.aa}${data.renamed ? ` · ${data.renamed}` : ' · χωρίς απόδειξη'}`,
          })
          continue
        }

        const res = await fetch('/api/oc/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'issue',
            type: st.type,
            amount: r.amount,
            year: parseInt(st.year, 10),
            memberDocId: st.memberDocId,
            memberName: st.memberName.trim(),
            payerName: r.payerName || '',
            paymentDate: r.date,
            paymentMethod: 'bank',
            sendEmail: st.sendEmail,
            transactionId: r.txnId,
            notes: `Από κινήσεις τράπεζας · ${r.reason}${r.fee ? ` · έξοδα ${r.fee.toFixed(2)}€` : ''}`,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
        patch(r.txnId, {
          status: 'done',
          resultText: `ΑΠ. ΕΙΣ. ${data.number}` +
            (data.emailSent ? ' · email ✓' : st.sendEmail ? (data.to ? ' · email ✗' : ' · χωρίς email') : ''),
        })
      } catch (err: any) {
        patch(r.txnId, { status: 'error', resultText: err?.message || 'Αποτυχία' })
      }
    }
    setIssuing(false)
    notifyFinanceChanged(month)
    onIssued()
  }

  const doneCount = rows.filter(r => state[r.txnId]?.status === 'done').length

  const memberMatches = useMemo(() => {
    if (!activeQueryTxn) return []
    const q = (state[activeQueryTxn]?.query || '').trim().toLowerCase()
    if (q.length < 2) return []
    return members.filter(m => m.name.toLowerCase().includes(q) || String(m.am) === q).slice(0, 6)
  }, [activeQueryTxn, state, members])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left">
        <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Αναφορά Εσόδων/Εξόδων</h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">μηνιαία επικόλληση τράπεζας → αποδείξεις &amp; έξοδα</span>
        <span className={`ml-auto text-coral transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
      </button>

      {open && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide" htmlFor="bi-month">
              Μήνας αναφοράς
            </label>
            <input id="bi-month" type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-charcoal dark:text-gray-100" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              (η επικόλληση αφορά και τις δύο ενότητες — έσοδα και έξοδα)
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5" htmlFor="bi-kin">
                1. Κινήσεις (myAlpha Web → Κινήσεις → CSV → επικόλληση)
              </label>
              <textarea id="bi-kin" rows={5} className={`${inputCls} font-mono`} value={kiniseis}
                onChange={e => setKiniseis(e.target.value)} placeholder="Τίτλος;Κινήσεις Λογαριασμού: GR71…" disabled={!canIssue || analyzing || issuing} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5" htmlFor="bi-inc">
                2. Εισερχόμενες εντολές (ίδια περίοδος)
              </label>
              <textarea id="bi-inc" rows={5} className={`${inputCls} font-mono`} value={incoming}
                onChange={e => setIncoming(e.target.value)} placeholder="Τίτλος ; Εισερχόμενες εντολές: GR71…" disabled={!canIssue || analyzing || issuing} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-charcoal dark:text-gray-100">
              Α. Έσοδα <span className="text-sm font-normal text-gray-400 dark:text-gray-500">πιστώσεις → αποδείξεις μελών</span>
            </h3>
            <button type="button" onClick={() => setShowIncomeHelp(!showIncomeHelp)}
              onMouseEnter={() => setShowIncomeHelp(true)}
              aria-expanded={showIncomeHelp}
              title="Οδηγίες: από πού παίρνω τα δύο μπλοκ και τι κάνει η ανάλυση"
              className="w-6 h-6 rounded-full border border-coral text-coral text-xs font-bold hover:bg-coral hover:text-white transition-colors">
              i
            </button>
          </div>

          {showIncomeHelp && (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4 text-xs text-gray-600 dark:text-gray-300 space-y-2"
              onMouseLeave={() => setShowIncomeHelp(false)}>
              <p className="font-bold text-charcoal dark:text-gray-100">Από πού παίρνω τα δύο μπλοκ</p>
              <p>
                <strong>myAlpha Web → λογαριασμός → «Κινήσεις»</strong>: βάλε Από/Έως για τον μήνα → κουμπί <strong>CSV</strong>
                (δεξιά, δίπλα στο PDF) → ανοίγει παράθυρο με κείμενο → <strong>⌘A, ⌘C</strong> → επικόλληση στο 1ο πλαίσιο.
                Μετά καρτέλα <strong>«Εισερχόμενες εντολές»</strong> → CSV → ⌘A, ⌘C → 2ο πλαίσιο.
              </p>
              <p>
                Επικόλλησε <strong>ολόκληρο</strong> το κείμενο, μαζί με τις γραμμές των υπολοίπων: από αυτές ελέγχεται ότι
                δεν λείπει καμία κίνηση. Η ίδια επικόλληση τροφοδοτεί <strong>και τα έξοδα</strong> — δεν χρειάζεται δεύτερη.
              </p>
              <p className="font-bold text-charcoal dark:text-gray-100 pt-1">Τι σημαίνουν οι ενδείξεις</p>
              <p>
                <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 font-bold">σίγουρο ταίριασμα</span>{' '}
                ο matcher βρήκε το μέλος με ασφάλεια ·{' '}
                <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 font-bold">πιθανό — έλεγξε</span>{' '}
                <strong>έλεγξέ το πάντα</strong>: ~14% των πληρωτών δεν είναι το ίδιο πρόσωπο με το μέλος (εταιρείες, συγγενείς) ·{' '}
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 font-bold">γνωστός πληρωτής</span>{' '}
                το έχεις ξαναδηλώσει εσύ και θυμήθηκε.
              </p>
              <p>
                Το <strong>όνομα του πληρωτή είναι read-only</strong> (όπως ήρθε από την τράπεζα)· το πεδίο δίπλα του το αλλάζεις
                ελεύθερα. Οι <strong>εγγραφές 45 €</strong> δεν εκδίδονται εδώ — γίνονται από «Πληρώθηκε» στις αιτήσεις.
                Οι <strong>χορηγίες/επιχορηγήσεις</strong> επιλέγονται ως «χωρίς απόδειξη»: μπαίνουν στο ΕΣΟΔΑ με την αναφορά
                της τράπεζας, χωρίς να πάρουν αριθμό ΑΠ. ΕΙΣ.
              </p>
              <p>
                Έγγραφο χορηγίας; Ρίξ' το στο <strong>Παραστατικά → έτος → Έσοδα → μήνας</strong> με το <strong>ποσό στο όνομα</strong>
                (π.χ. <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">ECF_2500.pdf</code>) — μετονομάζεται αυτόματα στην ενιαία μορφή{' '}
                <code className="bg-white dark:bg-gray-800 px-1 rounded notranslate">Α/Α_σε ποιον αφορά_αριθμός_ΜΑΡΚ_ΗΗ-ΜΜ-ΕΕΕΕ_ποσό.pdf</code>, ίδια με τα έξοδα και τις αποδείξεις.
              </p>
              <p>Καμία απόδειξη δεν εκδίδεται χωρίς τη ρητή σου επιβεβαίωση.</p>
            </div>
          )}

          <button type="button" onClick={analyze}
            disabled={!canIssue || analyzing || issuing || !kiniseis.trim()}
            className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
            {analyzing ? 'Ανάλυση…' : 'Ανάλυση'}
          </button>
          {!canIssue && <p className="text-xs text-gray-400 dark:text-gray-500">Μόνο ο ενεργός ρόλος Financer.</p>}

          {error && <div className="rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-5 py-3 text-sm">{error}</div>}
          {warnings.length > 0 && (
            <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-5 py-3 text-sm space-y-1">
              {warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                      <th className="py-2 pr-2 font-medium"><span className="sr-only">Επιλογή</span></th>
                      <th className="py-2 pr-3 font-medium">Ημ/νία</th>
                      <th className="py-2 pr-3 font-medium">Ποσό</th>
                      <th className="py-2 pr-3 font-medium">Πληρωτής (τράπεζα)</th>
                      <th className="py-2 pr-3 font-medium">Μέλος / παραλήπτης απόδειξης</th>
                      <th className="py-2 pr-3 font-medium">Τύπος</th>
                      <th className="py-2 pr-3 font-medium">Email</th>
                      <th className="py-2 font-medium">Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const st = state[r.txnId]
                      if (!st) return null
                      const isReg = r.kind === 'registration'
                      const locked = st.status === 'done' || !!r.existingNumber || issuing
                      return (
                        <tr key={r.txnId} className={`border-b border-gray-100 dark:border-gray-700 align-top ${st.status === 'done' ? 'opacity-60' : ''}`}>
                          <td className="py-2.5 pr-2">
                            <input type="checkbox" className="w-4 h-4 accent-coral mt-1" checked={st.include}
                              onChange={e => patch(r.txnId, { include: e.target.checked })}
                              disabled={locked || isReg || !canIssue}
                              aria-label={`Επιλογή συναλλαγής ${r.txnId}`} />
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap text-gray-600 dark:text-gray-400 notranslate">
                            {new Date(r.date).toLocaleDateString('el-GR')}
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap notranslate">
                            <span className="font-bold text-charcoal dark:text-gray-100">{r.amount.toFixed(2).replace('.', ',')} €</span>
                            {r.fee && <span className="block text-orange-600 dark:text-orange-300" title="ΕΞΟΔΑ ΕΝΤΟΛΗΣ ίδιας συναλλαγής">−{r.fee.toFixed(2).replace('.', ',')} έξοδα</span>}
                          </td>
                          <td className="py-2.5 pr-3 max-w-44">
                            <span className="text-gray-700 dark:text-gray-300 notranslate">{r.payerName || <em className="text-gray-400">— ({r.reason.slice(0, 22)})</em>}</span>
                            {r.payerBank && <span className="block text-gray-400 dark:text-gray-500 truncate notranslate">{r.payerBank}</span>}
                          </td>
                          <td className="py-2.5 pr-3 min-w-[13rem] relative">
                            {isReg ? (
                              <span className="text-gray-500 dark:text-gray-400">
                                Πιθανή εγγραφή — μέσω «Πληρώθηκε» στις <a href="/oc" className="text-coral hover:underline">αιτήσεις</a>
                              </span>
                            ) : (
                              <>
                                <input type="text" className={inputCls}
                                  value={st.memberDocId || !st.query ? st.memberName : st.query}
                                  onFocus={() => setActiveQueryTxn(r.txnId)}
                                  onChange={e => { patch(r.txnId, { memberDocId: null, memberName: e.target.value, query: e.target.value }); setActiveQueryTxn(r.txnId) }}
                                  placeholder="Αναζήτηση μέλους ή ελεύθερο όνομα…"
                                  disabled={locked || !canIssue} />
                                {r.suggestion && !st.memberDocId && st.memberName === r.suggestion.name && (
                                  <span className="text-gray-400 dark:text-gray-500">πρόταση χωρίς προφίλ</span>
                                )}
                                {st.memberDocId && (
                                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    r.suggestion?.source === 'alias'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
                                      : r.suggestion?.confidence === 'high'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                                  }`}>
                                    {r.suggestion?.source === 'alias' ? `γνωστός πληρωτής ×${r.suggestion.confirmations}` : r.suggestion?.confidence === 'high' ? 'σίγουρο ταίριασμα' : 'πιθανό ταίριασμα — έλεγξε'}
                                  </span>
                                )}
                                {activeQueryTxn === r.txnId && memberMatches.length > 0 && (
                                  <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                    {memberMatches.map(m => (
                                      <li key={m.docId}>
                                        <button type="button" className="w-full text-left px-3 py-2 hover:bg-coral/10 text-charcoal dark:text-gray-100"
                                          onClick={() => { patch(r.txnId, { memberDocId: m.docId, memberName: m.name, query: '' }); setActiveQueryTxn(null) }}>
                                          {m.name} <span className="text-gray-400 notranslate">ΑΜ {m.am}</span>
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-2.5 pr-3">
                            {isReg ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">{KIND_LABEL[r.kind]}</span>
                            ) : (
                              <select className={inputCls} value={st.type}
                                onChange={e => {
                                  const t = e.target.value as RowState['type']
                                  patch(r.txnId, { type: t, sendEmail: t === 'subscription' })
                                }}
                                disabled={locked || !canIssue} aria-label="Τύπος απόδειξης">
                                <option value="subscription">Συνδρομή</option>
                                <option value="extraordinary">Έκτακτη</option>
                                <option value="donation">Δωρεά</option>
                                <option value="grant">Χορηγία (με απόδειξη)</option>
                                <option value="record-grant">Χορηγία/Επιχορήγηση — χωρίς απόδειξη</option>
                                <option value="other">Άλλο</option>
                              </select>
                            )}
                            {!isReg && st.type === 'subscription' && (
                              <input type="number" className={`${inputCls} mt-1`} value={st.year}
                                onChange={e => patch(r.txnId, { year: e.target.value })}
                                disabled={locked || !canIssue}
                                aria-label="Έτος συνδρομής"
                                title="Έτος συνδρομής — άλλαξέ το αν πληρώνεται οφειλή παλαιότερου έτους" />
                            )}
                          </td>
                          <td className="py-2.5 pr-3">
                            {!isReg && (
                              <input type="checkbox" className="w-4 h-4 accent-coral mt-1" checked={st.sendEmail}
                                onChange={e => patch(r.txnId, { sendEmail: e.target.checked })}
                                disabled={locked || !canIssue} aria-label="Αποστολή απόδειξης με email" />
                            )}
                          </td>
                          <td className="py-2.5 whitespace-nowrap">
                            {r.existingNumber ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 notranslate">✓ ΑΠ. ΕΙΣ. {r.existingNumber}</span>
                            ) : st.status === 'done' ? (
                              <span className="text-green-700 dark:text-green-300 font-bold notranslate">{st.resultText}</span>
                            ) : st.status === 'error' ? (
                              <span className="text-red-600 dark:text-red-400">{st.resultText}</span>
                            ) : st.status === 'issuing' ? (
                              <span className="text-gray-400">έκδοση…</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {!confirming ? (
                  <button type="button" onClick={() => setConfirming(true)}
                    disabled={!canIssue || issuing || readyCount === 0}
                    className="px-6 py-2.5 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                    Έκδοση {readyCount} αποδείξεων
                  </button>
                ) : (
                  <>
                    <span className="text-sm font-medium text-charcoal dark:text-gray-200">
                      Σίγουρα; Θα εκδοθούν {readyCount} αποδείξεις με τους επόμενους αριθμούς της σειράς.
                    </span>
                    <button type="button" onClick={issueSelected} disabled={issuing}
                      className="px-5 py-2 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                      Ναι, έκδοση
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} disabled={issuing}
                      className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-medium text-charcoal dark:text-gray-200">
                      Άκυρο
                    </button>
                  </>
                )}
                {selected.length !== readyCount && !confirming && (
                  <span className="text-xs text-orange-700 dark:text-orange-300">
                    {selected.length - readyCount} επιλεγμένες χωρίς μέλος/όνομα — συμπλήρωσε ή αποεπίλεξε.
                  </span>
                )}
                {doneCount > 0 && !issuing && (
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                    {doneCount} καταχωρήθηκαν ✓ — γραμμές ΕΣΟΔΑ και αρχειοθέτηση PDF έγιναν αυτόματα.
                  </span>
                )}
              </div>
            </>
          )}

          {/* Β. ΕΞΟΔΑ — παραστατικά Drive + χρεώσεις της ίδιας επικόλλησης */}
          <OcExpenseIntake canIssue={canIssue} month={month} kiniseis={kiniseis} />
        </div>
      )}
    </div>
  )
}
