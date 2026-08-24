'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import OcBankIntake from '@/components/oc/OcBankIntake'
import OcSubscriptions, { type SubMemberRow } from '@/components/oc/OcSubscriptions'
import OcMonthlyView from '@/components/oc/OcMonthlyView'

/**
 * OC → Οικονομικά: έκδοση αποδείξεων από την ενιαία σειρά «ΑΠ. ΕΙΣ.».
 * Προβολή για όλο το ΔΣ· έκδοση/αρχικοποίηση ΜΟΝΟ για ενεργό ρόλο Financer.
 * Μέχρι τη Φάση Γ οι αποδείξεις ΔΕΝ γράφουν το ΕΣΟΔΑ sheet (ένδειξη ανά
 * γραμμή) — η καταχώρηση εκεί παραμένει χειροκίνητη.
 */

interface MemberOption {
  docId: string
  name: string
  am: number
  email: string
}

interface RecentReceipt {
  number: number
  typeLabel: string
  amount: number
  memberName: string | null
  issueDate: string | null
  sheetSynced: boolean
  sentAt: string | null
  paymentMethod: 'bank' | 'cash' | null
}

const METHOD_LABELS: Record<'bank' | 'cash', string> = { bank: 'Τράπεζα', cash: 'Μετρητά' }

interface SeriesState {
  seeded: boolean
  nextNumber: number | null
  recent: RecentReceipt[]
  total: number
}

const TYPES = [
  { key: 'subscription', label: 'Ετήσια συνδρομή (ανανέωση)', amount: 35 },
  { key: 'registration', label: 'Εγγραφή + Ετήσια συνδρομή', amount: 45 },
  { key: 'extraordinary', label: 'Έκτακτη εισφορά', amount: 0 },
  { key: 'donation', label: 'Δωρεά', amount: 0 },
  { key: 'grant', label: 'Χορηγία', amount: 0 },
  { key: 'other', label: 'Άλλο', amount: 0 },
] as const

type TypeKey = (typeof TYPES)[number]['key']

const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const labelCls = 'block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'

const CONNECTION_MESSAGES: Record<string, { title: string; detail: string }> = {
  unconfigured: {
    title: 'Η σύνδεση με το ΕΣΟΔΑ-ΕΞΟΔΑ δεν έχει ρυθμιστεί σε αυτό το περιβάλλον',
    detail: 'Λείπει το FINANCE_SHEET_WEBAPP_URL ή το FINANCE_SHEET_WEBAPP_SECRET. Οι αποδείξεις εκδίδονται κανονικά, αλλά ΔΕΝ γράφονται γραμμές στο φύλλο και δεν αρχειοθετούνται PDF στο Drive.',
  },
  unauthorized: {
    title: 'Το ΕΣΟΔΑ-ΕΞΟΔΑ απορρίπτει τη σύνδεση',
    detail: 'Η διεύθυνση απαντά, αλλά το μυστικό δεν ταιριάζει. Έλεγξε ότι το FINANCE_SHEET_WEBAPP_SECRET είναι ίδιο με αυτό μέσα στο Apps Script.',
  },
  unreachable: {
    title: 'Δεν απαντά το ΕΣΟΔΑ-ΕΞΟΔΑ',
    detail: 'Συνήθως σημαίνει ότι το Apps Script δημοσιεύτηκε ως ΝΕΟ deployment (νέα διεύθυνση) αντί για νέα έκδοση του υπάρχοντος — ή ότι η διεύθυνση στις μεταβλητές περιβάλλοντος είναι παλιά.',
  },
}

export default function OcFinances({ canIssue, canRemind, members, subMembers }: {
  canIssue: boolean
  canRemind: boolean
  members: MemberOption[]
  subMembers: SubMemberRow[]
}) {
  const [series, setSeries] = useState<SeriesState | null>(null)
  const [listScope, setListScope] = useState<'recent' | 'all'>('recent')
  // Όλες οι ενότητες κλειστές στο φόρτωμα — άνοιγμα κατ' απαίτηση
  const [openIssue, setOpenIssue] = useState(false)
  const [openList, setOpenList] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // Αποτυχία χειροκίνητης έκδοσης → ΟΡΑΤΟ popup (το top notice χάνεται
  // εκτός οθόνης όταν η φόρμα είναι χαμηλά στη σελίδα)
  const [issueError, setIssueError] = useState<string | null>(null)
  // «Καλή Χρονιά» banner: Ιανουάριο/Φεβρουάριο, αν λείπει η δομή φακέλων
  // Παραστατικών του νέου έτους — δημιουργία ΜΟΝΟ με το ΟΚ του Financer
  const [yearPrompt, setYearPrompt] = useState<number | null>(null)
  const [yearBusy, setYearBusy] = useState(false)
  const [yearDone, setYearDone] = useState(false)
  // Κατάσταση σύνδεσης με το ΕΣΟΔΑ-ΕΞΟΔΑ: αν είναι σπασμένη, πρέπει να
  // φαίνεται ΕΔΩ και όχι στη μέση μιας έγκρισης
  const [connection, setConnection] = useState<'ok' | 'unconfigured' | 'unauthorized' | 'unreachable' | null>(null)
  const [connChecking, setConnChecking] = useState(false)
  /** Ταμείο: λείπει μέτρηση τρέχοντος μήνα — υπενθύμιση ΜΟΝΟ στον/στην Financer */
  const [treasuryStale, setTreasuryStale] = useState<{ asOf: string | null } | null>(null)

  // ---- φόρμα έκδοσης ----
  const [type, setType] = useState<TypeKey>('subscription')
  const [amount, setAmount] = useState('35')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [memberQuery, setMemberQuery] = useState('')
  const [pickedMember, setPickedMember] = useState<MemberOption | null>(null)
  const [freeEmail, setFreeEmail] = useState('')
  const [payerName, setPayerName] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [method, setMethod] = useState<'bank' | 'cash'>('bank')
  const [sendEmail, setSendEmail] = useState(true)
  const [isCompany, setIsCompany] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyTaxId, setCompanyTaxId] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [confirming, setConfirming] = useState(false)

  // ---- seeding ----
  const [seedNumber, setSeedNumber] = useState('')
  const [seedName, setSeedName] = useState('')
  const [seedAmount, setSeedAmount] = useState('')

  async function load(scope: 'recent' | 'all' = listScope) {
    try {
      const res = await fetch(scope === 'all' ? '/api/oc/receipts?all=1' : '/api/oc/receipts')
      if (!res.ok) throw new Error(String(res.status))
      setSeries(await res.json())
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }
  useEffect(() => { load(listScope) }, [listScope]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Ένα αίτημα, δύο απαντήσεις: κατάσταση σύνδεσης (πάντα) και δομή φακέλων
   * του έτους (banner μόνο Ιανουάριο/Φεβρουάριο — μετά, ή υπάρχει ή τη
   * φτιάχνει lazily ο writer). Override για δοκιμή ή πρόωρη δημιουργία
   * (π.χ. Δεκέμβριο): /oc?testNewYear=2027
   */
  const checkStructure = useCallback(async () => {
    if (!canIssue) return          // μόνο ο/η Financer μπορεί να το διορθώσει
    setConnChecking(true)
    const testYear = new URLSearchParams(window.location.search).get('testNewYear')
    try {
      const res = await fetch(`/api/oc/finance-structure${testYear ? `?year=${encodeURIComponent(testYear)}` : ''}`)
      const d = res.ok ? await res.json() : null
      if (!d) { setConnection('unreachable'); return }
      setConnection(d.connection || 'ok')
      const m = new Date().getMonth()
      if ((testYear || m <= 1) && d.exists === false) setYearPrompt(d.year)
    } catch {
      setConnection('unreachable')
    } finally {
      setConnChecking(false)
    }
  }, [canIssue])
  useEffect(() => { checkStructure() }, [checkStructure])

  useEffect(() => {
    if (!canIssue) return
    fetch('/api/oc/treasury')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.stale && !d.unconfigured) setTreasuryStale({ asOf: d.latest?.asOf || null }) })
      .catch(() => { /* σιωπηλά */ })
  }, [canIssue])

  async function createYearStructure() {
    setYearBusy(true)
    try {
      const res = await fetch('/api/oc/finance-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: yearPrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
      setYearDone(true)
    } catch (err: any) {
      setIssueError(err?.message || 'Αποτυχία δημιουργίας φακέλων')
    } finally {
      setYearBusy(false)
    }
  }

  const isSubscriptionLike = type === 'subscription' || type === 'registration'

  const matches = useMemo(() => {
    const q = memberQuery.trim().toLowerCase()
    if (q.length < 2 || pickedMember) return []
    return members
      .filter(m => m.name.toLowerCase().includes(q) || String(m.am) === q)
      .slice(0, 8)
  }, [memberQuery, members, pickedMember])

  function chooseType(t: TypeKey) {
    setType(t)
    const def = TYPES.find(x => x.key === t)!
    if (def.amount > 0) setAmount(String(def.amount))
  }

  function resetForm() {
    setConfirming(false)
    setPickedMember(null); setMemberQuery(''); setFreeEmail('')
    setPayerName(''); setPaymentDate(''); setNotes(''); setCustomLabel('')
    setIsCompany(false); setCompanyName(''); setCompanyAddress(''); setCompanyTaxId('')
    chooseType('subscription')
  }

  async function submitSeed() {
    const n = parseInt(seedNumber, 10)
    if (!Number.isInteger(n) || n < 1) {
      setNotice({ kind: 'err', text: 'Δώσε τον αριθμό της τελευταίας χειρόγραφης απόδειξης.' })
      return
    }
    setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/oc/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed', number: n, memberName: seedName, amount: parseFloat(seedAmount) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
      setNotice({ kind: 'ok', text: `Η σειρά αρχικοποιήθηκε στο ΑΠ. ΕΙΣ. ${data.number}. Επόμενη απόδειξη: ${data.number + 1}.` })
      await load()
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Αποτυχία αρχικοποίησης' })
    } finally {
      setBusy(false)
    }
  }

  async function submitIssue() {
    setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/oc/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue',
          type,
          amount: parseFloat(amount),
          year: parseInt(year, 10),
          memberDocId: pickedMember?.docId || null,
          memberName: pickedMember?.name || memberQuery.trim(),
          email: pickedMember?.email || freeEmail.trim(),
          payerName, paymentDate: paymentDate || undefined,
          paymentMethod: method, sendEmail,
          ...(isCompany && { companyName, companyAddress, companyTaxId }),
          ...(!isSubscriptionLike && customLabel && { customLabel }),
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
      setNotice({
        kind: 'ok',
        text: `Εκδόθηκε η ΑΠ. ΕΙΣ. ${data.number}.` +
          (data.emailSent ? ` Η απόδειξη στάλθηκε στο ${data.to}.` : sendEmail ? ' Το email ΔΕΝ στάλθηκε (λείπει διεύθυνση;).' : ' Χωρίς αποστολή email.') +
          ' Μην ξεχάσεις τη γραμμή στο ΕΣΟΔΑ (χειροκίνητα μέχρι τη Φάση Γ).',
      })
      resetForm()
      await load()
    } catch (err: any) {
      setConfirming(false)
      setNotice({ kind: 'err', text: err?.message || 'Αποτυχία έκδοσης' })
      setIssueError(err?.message || 'Αποτυχία έκδοσης — δοκίμασε ξανά')
    } finally {
      setBusy(false)
    }
  }

  // Επεξεργασία ημερομηνίας αποστολής: κλικ στο badge → inline date input
  const [editingSent, setEditingSent] = useState<number | null>(null)
  const [editingSentDate, setEditingSentDate] = useState('')

  function openSentEditor(r: RecentReceipt) {
    setEditingSent(r.number)
    setEditingSentDate((r.sentAt || new Date().toISOString()).slice(0, 10))
  }

  async function saveSent(number: number) {
    setBusy(true)
    try {
      const res = await fetch('/api/oc/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-sent', number, date: editingSentDate || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία')
      setEditingSent(null)
      await load()
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Αποτυχία σήμανσης αποστολής' })
    } finally {
      setBusy(false)
    }
  }

  const amountOk = parseFloat(amount) > 0
  const recipientOk = !!pickedMember || memberQuery.trim().length > 1
  const canSubmit = canIssue && !busy && amountOk && recipientOk

  return (
    <div className="space-y-8">
      {/* Popup αποτυχίας χειροκίνητης έκδοσης — πάντα ορατό */}
      {issueError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="alertdialog" aria-modal="true" aria-label="Η έκδοση απέτυχε"
          onClick={() => setIssueError(null)}>
          <div className="menu-glass rounded-3xl max-w-md w-full p-6 sm:p-8 text-center"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl" aria-hidden="true">⚠️</span>
            </div>
            <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-2">Η απόδειξη ΔΕΝ εκδόθηκε</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{issueError}</p>
            <button type="button" onClick={() => setIssueError(null)}
              className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90">
              Εντάξει
            </button>
          </div>
        </div>
      )}

      {/* 🎉 Νέο έτος: πρόταση δημιουργίας δομής φακέλων Παραστατικών */}
      {treasuryStale && (
        <div className="rounded-3xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-2xl leading-none" aria-hidden="true">🏦</span>
            <div className="flex-1 min-w-[15rem]">
              <p className="font-bold text-charcoal dark:text-gray-100">Το ταμείο δεν έχει ενημερωθεί αυτόν τον μήνα</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {treasuryStale.asOf
                  ? <>Τελευταία μέτρηση: <span className="notranslate">{new Date(treasuryStale.asOf).toLocaleDateString('el-GR')}</span>. Άνοιξε το πλακίδιο «Ταμείο» στην Επισκόπηση και καταχώρησε το υπόλοιπο της τράπεζας.</>
                  : <>Δεν έχει καταχωρηθεί ποτέ μέτρηση. Άνοιξε το πλακίδιο «Ταμείο» στην Επισκόπηση.</>}
              </p>
            </div>
          </div>
        </div>
      )}

      {connection && connection !== 'ok' && CONNECTION_MESSAGES[connection] && (
        <div className="rounded-3xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span className="text-2xl leading-none" aria-hidden="true">⚠️</span>
            <div className="flex-1 min-w-[15rem]">
              <p className="font-bold text-charcoal dark:text-gray-100">{CONNECTION_MESSAGES[connection].title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{CONNECTION_MESSAGES[connection].detail}</p>
            </div>
            <button type="button" onClick={checkStructure} disabled={connChecking}
              className="px-5 py-2 rounded-full border border-orange-400 dark:border-orange-600 text-sm font-bold text-charcoal dark:text-gray-100 hover:bg-orange-100 dark:hover:bg-orange-900/40 disabled:opacity-40">
              {connChecking ? 'Έλεγχος…' : 'Επανέλεγχος'}
            </button>
          </div>
        </div>
      )}

      {yearPrompt !== null && (
        <div className="bg-gradient-to-r from-coral/15 to-[#E9A13B]/15 dark:from-coral/10 dark:to-[#E9A13B]/10 rounded-3xl shadow-sm p-6 border border-coral/30">
          {yearDone ? (
            <p className="text-sm font-medium text-charcoal dark:text-gray-100">
              ✅ Η δομή φακέλων για το {yearPrompt} δημιουργήθηκε — Έσοδα, Έξοδα και Παράβολα με τους 12 μήνες τους. Καλή αρχή!
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm font-medium text-charcoal dark:text-gray-100">
                🎉 <strong>Καλή Χρονιά!</strong> Να δημιουργήσω τη δομή φακέλων Παραστατικών για το {yearPrompt};
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Θα φτιάξω: {yearPrompt} → Έσοδα/Έξοδα {yearPrompt} με φακέλους 01–12 μηνών + Παράβολα {yearPrompt}, στο Drive «Παραστατικά».
                </span>
              </p>
              {canIssue ? (
                <button type="button" onClick={createYearStructure} disabled={yearBusy}
                  className="px-5 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-50">
                  {yearBusy ? 'Δημιουργία…' : 'Ναι, δημιουργία 🎊'}
                </button>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">Δημιουργία: μόνο ο/η Financer</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Συνδρομές: μετρητές + υπενθυμίσεις, πάντα πρώτο */}
      <OcSubscriptions members={subMembers} canRemind={canRemind} canIssue={canIssue} onIssued={() => load()} />

      {notice && (
        <div role="status" className={`rounded-2xl px-5 py-4 text-sm font-medium ${
          notice.kind === 'ok'
            ? 'bg-[#6A994E]/15 text-[#3f6b2d] dark:text-[#9bd47c]'
            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
        }`}>
          {notice.text}
        </div>
      )}

      {/* Έκδοση απόδειξης — με τον επόμενο αριθμό της σειράς στην κεφαλίδα */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <button type="button" onClick={() => setOpenIssue(!openIssue)} className="w-full flex items-center gap-3 text-left"
          aria-expanded={openIssue}>
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Έκδοση απόδειξης</h2>
          <span className="ml-auto flex items-center gap-3">
            {series?.seeded && (
              <span className="notranslate px-4 py-1.5 rounded-full bg-[#6A994E]/15 text-[#4a7a35] dark:text-[#9bd47c] text-sm font-bold">
                Επόμενη: ΑΠ. ΕΙΣ. {series.nextNumber}
              </span>
            )}
            <span className={`text-coral transition-transform ${openIssue ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
          </span>
        </button>

        {openIssue && (
        <div className="mt-6">
        {loadError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">Αποτυχία φόρτωσης — δοκίμασε ανανέωση.</p>
        )}
        {series && !series.seeded && (
          <div className="mb-5 rounded-2xl border-2 border-dashed border-[#6A994E]/50 p-5">
            <p className="text-sm text-charcoal dark:text-gray-200 font-medium mb-1">Αρχικοποίηση σειράς</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Καταχώρησε την <strong>τελευταία χειρόγραφη απόδειξη</strong> που εκδόθηκε εκτός συστήματος —
              η αυτόματη αρίθμηση συνεχίζει από τον επόμενο αριθμό. Δεν στέλνεται κανένα email.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls} htmlFor="seed-number">Αριθμός</label>
                <input id="seed-number" type="number" min="1" className={inputCls} value={seedNumber}
                  onChange={e => setSeedNumber(e.target.value)} placeholder="π.χ. 365" disabled={!canIssue || busy} />
              </div>
              <div>
                <label className={labelCls} htmlFor="seed-name">Σε ποιον εκδόθηκε (προαιρετικό)</label>
                <input id="seed-name" type="text" className={inputCls} value={seedName}
                  onChange={e => setSeedName(e.target.value)} disabled={!canIssue || busy} />
              </div>
              <div>
                <label className={labelCls} htmlFor="seed-amount">Ποσό € (προαιρετικό)</label>
                <input id="seed-amount" type="number" min="0" step="0.01" className={inputCls} value={seedAmount}
                  onChange={e => setSeedAmount(e.target.value)} disabled={!canIssue || busy} />
              </div>
            </div>
            <button type="button" onClick={submitSeed} disabled={!canIssue || busy}
              className="mt-4 px-5 py-2.5 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
              Αρχικοποίηση
            </button>
            {!canIssue && <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Μόνο ο ενεργός ρόλος Financer.</p>}
          </div>
        )}

        <div className={series?.seeded ? '' : 'opacity-50 pointer-events-none'}>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {canIssue
            ? 'Για ανανεώσεις συνδρομής, μετρητά ΓΣ, δωρεές και έκτακτες εισφορές. Οι εγγραφές νέων μελών εκδίδονται αυτόματα από τη ροή πληρωμής.'
            : 'Μόνο ο ενεργός ρόλος Financer μπορεί να εκδώσει — προβολή μόνο.'}
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls} htmlFor="rc-type">Τύπος</label>
            <select id="rc-type" className={inputCls} value={type} onChange={e => chooseType(e.target.value as TypeKey)} disabled={!canIssue || busy}>
              {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="rc-amount">Ποσό €</label>
              <input id="rc-amount" type="number" min="0" step="0.01" className={inputCls} value={amount}
                onChange={e => setAmount(e.target.value)} disabled={!canIssue || busy} />
            </div>
            {isSubscriptionLike && (
              <div>
                <label className={labelCls} htmlFor="rc-year">Έτος</label>
                <input id="rc-year" type="number" className={inputCls} value={year}
                  onChange={e => setYear(e.target.value)} disabled={!canIssue || busy} />
              </div>
            )}
          </div>

          <div className="relative">
            <label className={labelCls} htmlFor="rc-member">{isSubscriptionLike ? 'Μέλος (όνομα ή ΑΜ)' : 'Ονοματεπώνυμο / φορέας'}</label>
            <input id="rc-member" type="text" className={inputCls} autoComplete="off"
              value={pickedMember ? pickedMember.name : memberQuery}
              onChange={e => { setPickedMember(null); setMemberQuery(e.target.value) }}
              placeholder={isSubscriptionLike ? 'Αναζήτηση μέλους…' : 'π.χ. ASSOCIATION ARTY FARTY'}
              disabled={!canIssue || busy} />
            {pickedMember && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 notranslate">
                ΑΜ {pickedMember.am} · {pickedMember.email}
                <button type="button" className="ml-2 text-coral hover:underline" onClick={() => { setPickedMember(null); setMemberQuery('') }}>αλλαγή</button>
              </p>
            )}
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                {matches.map(m => (
                  <li key={m.docId}>
                    <button type="button" className="w-full text-left px-4 py-2.5 text-sm hover:bg-coral/10 text-charcoal dark:text-gray-100"
                      onClick={() => { setPickedMember(m); setMemberQuery(m.name) }}>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-gray-400 ml-2 notranslate">ΑΜ {m.am}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="rc-email">Email παραλήπτη {pickedMember ? '(από το προφίλ)' : ''}</label>
            <input id="rc-email" type="email" className={inputCls}
              value={pickedMember ? pickedMember.email : freeEmail}
              onChange={e => setFreeEmail(e.target.value)}
              disabled={!canIssue || busy || !!pickedMember} />
          </div>

          <div>
            <label className={labelCls} htmlFor="rc-payer">Πληρωτής όπως στην τράπεζα (προαιρετικό)</label>
            <input id="rc-payer" type="text" className={inputCls} value={payerName}
              onChange={e => setPayerName(e.target.value)} placeholder="π.χ. KITSELLIS EMMANOUIL" disabled={!canIssue || busy} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="rc-date">Ημ. πληρωμής (τράπεζα)</label>
              <input id="rc-date" type="date" className={inputCls} value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)} disabled={!canIssue || busy} />
            </div>
            <div>
              <label className={labelCls} htmlFor="rc-method">Τρόπος</label>
              <select id="rc-method" className={inputCls} value={method} onChange={e => setMethod(e.target.value as 'bank' | 'cash')} disabled={!canIssue || busy}>
                <option value="bank">Τράπεζα</option>
                <option value="cash">Μετρητά</option>
              </select>
            </div>
          </div>

          {!isSubscriptionLike && (
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="rc-label">Αιτιολογία στην απόδειξη (προαιρετικό)</label>
              <input id="rc-label" type="text" className={inputCls} value={customLabel}
                onChange={e => setCustomLabel(e.target.value)} placeholder={TYPES.find(t => t.key === type)?.label} disabled={!canIssue || busy} />
            </div>
          )}

          <div className="sm:col-span-2 flex flex-wrap gap-x-8 gap-y-3">
            <label className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200">
              <input type="checkbox" className="w-4 h-4 accent-coral" checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)} disabled={!canIssue || busy} />
              Αποστολή απόδειξης με email
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200">
              <input type="checkbox" className="w-4 h-4 accent-coral" checked={isCompany}
                onChange={e => setIsCompany(e.target.checked)} disabled={!canIssue || busy} />
              Απόδειξη σε εταιρεία
            </label>
          </div>

          {isCompany && (
            <>
              <div>
                <label className={labelCls} htmlFor="rc-cname">Επωνυμία εταιρείας</label>
                <input id="rc-cname" type="text" className={inputCls} value={companyName}
                  onChange={e => setCompanyName(e.target.value)} disabled={!canIssue || busy} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="rc-ctax">ΑΦΜ εταιρείας</label>
                  <input id="rc-ctax" type="text" className={inputCls} value={companyTaxId}
                    onChange={e => setCompanyTaxId(e.target.value)} disabled={!canIssue || busy} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="rc-caddr">Διεύθυνση</label>
                  <input id="rc-caddr" type="text" className={inputCls} value={companyAddress}
                    onChange={e => setCompanyAddress(e.target.value)} disabled={!canIssue || busy} />
                </div>
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="rc-notes">Σημειώσεις (εσωτερικές)</label>
            <input id="rc-notes" type="text" className={inputCls} value={notes}
              onChange={e => setNotes(e.target.value)} disabled={!canIssue || busy} />
          </div>
        </div>

        {notice && (
          <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${
            notice.kind === 'ok'
              ? 'bg-[#6A994E]/15 text-[#3f6b2d] dark:text-[#9bd47c]'
              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
          }`}>
            {notice.text}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          {!confirming ? (
            <button type="button" disabled={!canSubmit}
              onClick={() => setConfirming(true)}
              className="px-6 py-3 rounded-full bg-coral text-white font-bold text-sm hover:bg-coral/90 disabled:opacity-40">
              Έκδοση {series?.seeded ? `ΑΠ. ΕΙΣ. ${series.nextNumber}` : ''}
            </button>
          ) : (
            <>
              <span className="text-sm font-medium text-charcoal dark:text-gray-200">
                Σίγουρα; Θα εκδοθεί η ΑΠ. ΕΙΣ. {series?.nextNumber}{sendEmail ? ' και θα σταλεί email' : ''}.
              </span>
              <button type="button" onClick={submitIssue} disabled={busy}
                className="px-5 py-2.5 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                {busy ? 'Έκδοση…' : 'Ναι, έκδοση'}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy}
                className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-medium text-charcoal dark:text-gray-200">
                Άκυρο
              </button>
            </>
          )}
        </div>
        </div>
        </div>
        )}
      </div>

      {/* Μηνιαία επικόλληση κινήσεων τράπεζας */}
      {series?.seeded && (
        <OcBankIntake canIssue={canIssue} members={members} onIssued={() => load()} />
      )}

      {/* Μηνιαία εικόνα: έγκριση μήνα από Financer (η αποστολή: Διαχείριση) */}
      <OcMonthlyView mode="financer" canReady={canIssue} />

      {/* Λίστα αποδείξεων: πρόσφατες / όλες */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <button type="button" onClick={() => setOpenList(!openList)} className="w-full flex items-center gap-3 text-left"
          aria-expanded={openList}>
          <h2 className="text-xl font-bold text-charcoal dark:text-gray-100">
            {listScope === 'recent' ? 'Πρόσφατες αποδείξεις' : 'Όλες οι αποδείξεις'}
          </h2>
          <span className="ml-auto flex items-center gap-3">
            {series && (
              <span className="text-sm text-gray-400 dark:text-gray-500 notranslate">
                {listScope === 'all' ? `${series.recent.length} αποδείξεις` : `${series.recent.length} από ${series.total}`}
              </span>
            )}
            <span className={`text-coral transition-transform ${openList ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
          </span>
        </button>

        {openList && (
        <div className="mt-5">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex rounded-full border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-bold" role="group" aria-label="Εύρος λίστας αποδείξεων">
            <button type="button" onClick={() => setListScope('recent')}
              aria-pressed={listScope === 'recent'}
              className={`px-4 py-1.5 transition-colors ${listScope === 'recent'
                ? 'bg-coral text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-charcoal dark:hover:text-gray-200'}`}>
              Πρόσφατες
            </button>
            <button type="button" onClick={() => setListScope('all')}
              aria-pressed={listScope === 'all'}
              className={`px-4 py-1.5 transition-colors ${listScope === 'all'
                ? 'bg-coral text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-charcoal dark:hover:text-gray-200'}`}>
              Όλες
            </button>
          </div>
        </div>
        {!series || series.recent.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">Καμία απόδειξη στο σύστημα ακόμη.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                  <th className="py-2 pr-4 font-medium">Αριθμός</th>
                  <th className="py-2 pr-4 font-medium">Προς</th>
                  <th className="py-2 pr-4 font-medium">Τύπος</th>
                  <th className="py-2 pr-4 font-medium">Ποσό</th>
                  <th className="py-2 pr-4 font-medium">Τρόπος</th>
                  <th className="py-2 pr-4 font-medium">Ημ. έκδοσης</th>
                  <th className="py-2 pr-4 font-medium">Αποστολή</th>
                  <th className="py-2 font-medium">ΕΣΟΔΑ</th>
                </tr>
              </thead>
              <tbody>
                {series.recent.map(r => (
                  <tr key={r.number} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 pr-4 font-bold text-charcoal dark:text-gray-100 notranslate">ΑΠ. ΕΙΣ. {r.number}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{r.memberName || '—'}</td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{r.typeLabel}</td>
                    <td className="py-3 pr-4 text-charcoal dark:text-gray-200 notranslate">{Number(r.amount).toFixed(2).replace('.', ',')} €</td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                      {r.paymentMethod ? METHOD_LABELS[r.paymentMethod] : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 notranslate">{r.issueDate ? new Date(r.issueDate).toLocaleDateString('el-GR') : '—'}</td>
                    <td className="py-3 pr-4">
                      {editingSent === r.number ? (
                        <span className="inline-flex items-center gap-1.5">
                          <input type="date" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-charcoal dark:text-gray-100"
                            value={editingSentDate} onChange={e => setEditingSentDate(e.target.value)}
                            aria-label={`Ημερομηνία αποστολής ΑΠ. ΕΙΣ. ${r.number}`} />
                          <button type="button" onClick={() => saveSent(r.number)} disabled={busy || !editingSentDate}
                            className="px-2 py-1 rounded-lg bg-[#6A994E] text-white text-xs font-bold disabled:opacity-40">✓</button>
                          <button type="button" onClick={() => setEditingSent(null)} disabled={busy}
                            className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-xs text-charcoal dark:text-gray-200">✕</button>
                        </span>
                      ) : r.sentAt ? (
                        canIssue ? (
                          <button type="button" onClick={() => openSentEditor(r)} disabled={busy}
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 notranslate hover:ring-2 hover:ring-green-300 disabled:opacity-50"
                            title="Στάλθηκε — πάτησε για διόρθωση ημερομηνίας">
                            ✓ {new Date(r.sentAt).toLocaleDateString('el-GR')}
                          </button>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 notranslate">
                            ✓ {new Date(r.sentAt).toLocaleDateString('el-GR')}
                          </span>
                        )
                      ) : canIssue ? (
                        <button type="button" onClick={() => openSentEditor(r)} disabled={busy}
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 hover:ring-2 hover:ring-orange-300 disabled:opacity-50"
                          title="Δεν έχει σταλεί — πάτησε για σήμανση με ημερομηνία">
                          εκκρεμεί
                        </button>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">εκκρεμεί</span>
                      )}
                    </td>
                    <td className="py-3">
                      {r.sheetSynced ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">✓</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200" title="Γράψε τη γραμμή στο ΕΣΟΔΑ χειροκίνητα (αυτόματα από τη Φάση Γ)">χειροκίνητα</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  )
}
