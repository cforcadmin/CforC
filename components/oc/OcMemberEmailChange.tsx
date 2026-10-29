'use client'

// Αλλαγή email μέλους — κουτί στο Ασφάλεια++ (θέση IT μόνο).
//
// Τρεις κινήσεις: αναζήτηση με όνομα → επιλογή μέλους (ΑΜ + τρέχον email,
// γιατί τα ονόματα δεν είναι μοναδικά) → νέο email + πώς ζητήθηκε → «Αλλαγή».
// Μόλις επιλεγεί μέλος, ο server λέει πού ζει το τρέχον email και αν εκκρεμούν
// συνδρομές — χωρίς να αλλάξει τίποτα. Η «Αλλαγή» κάνει τα έξι βήματα και
// δείχνει το καθένα με το όνομά του· ένα βήμα που απέτυχε γράφει τι να γίνει
// με το χέρι — όχι «κάτι πήγε στραβά».

import { useEffect, useRef, useState } from 'react'
import { EMAIL_CHANGE_REQUEST_SOURCES } from '@/lib/memberEmailChangeOptions'
import { SUBSCRIPTION_FEE } from '@/lib/subscriptionOwed'

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'
const INPUT = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const BTN = 'rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed'

type StepState = 'done' | 'failed' | 'skipped' | 'unchanged'
interface Step { state: StepState; detail: string }
interface Match { docId: string; name: string; engName: string; am: number | null; email: string }
interface Preview {
  member: { name: string; am: number | null; docId: string; email: string }
  owedYears: number[]
  found: { application: boolean; newsletter: boolean; sender: boolean; registry: boolean }
}
interface Outcome { member: { name: string }; from: string; to: string; changedAt: string; requestedVia: string; steps: Record<string, Step> }

const STEP_LABEL: Record<string, string> = {
  strapi: 'Strapi — μέλος (σύνδεση)',
  application: 'Strapi — φάκελος αίτησης',
  registry: 'Μητρώο (Google Sheet)',
  newsletter: 'Newsletter (Strapi)',
  sender: 'Sender — ομάδα Paid',
  notice: 'Ειδοποίηση μέλους (it@ → νέο, κοιν. παλιό + it@ + hello@)',
}
const STEP_ORDER = ['strapi', 'application', 'registry', 'newsletter', 'sender', 'notice']
const TONE: Record<StepState, { dot: string; word: string; text: string }> = {
  done:      { dot: 'bg-emerald-500', word: 'έγινε',       text: 'text-emerald-700 dark:text-emerald-300' },
  unchanged: { dot: 'bg-amber-500',   word: 'δεν βρέθηκε', text: 'text-amber-700 dark:text-amber-200' },
  skipped:   { dot: 'bg-gray-400',    word: 'παραλείφθηκε', text: 'text-gray-600 dark:text-gray-400' },
  failed:    { dot: 'bg-red-500',     word: 'ΑΠΕΤΥΧΕ',     text: 'text-red-700 dark:text-red-300' },
}
const fmtAthens = (iso: string) =>
  new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'short', timeStyle: 'short' })

export default function OcMemberEmailChange() {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Match | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [requestedVia, setRequestedVia] = useState('')
  const [requestedDetail, setRequestedDetail] = useState('')
  const [includeOwedReminder, setIncludeOwedReminder] = useState(true)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState<'lookup' | 'change' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchSeq = useRef(0)

  // Αναζήτηση με όνομα — με μικρή καθυστέρηση ώστε να μη χτυπά το Strapi σε κάθε πλήκτρο
  useEffect(() => {
    if (selected) return
    const q = query.trim()
    if (q.length < 2) { setMatches([]); return }
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/oc/members/email?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (seq !== searchSeq.current) return   // ήρθε απάντηση για παλιότερη πληκτρολόγηση
        if (!res.ok || !json?.ok) { setError(json?.error || `Αποτυχία αναζήτησης (${res.status})`); return }
        setError(null)
        setMatches(json.matches || [])
      } catch {
        if (seq === searchSeq.current) setError('Κάτι πήγε στραβά στην αναζήτηση')
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, selected])

  const reset = () => {
    setSelected(null); setPreview(null); setOutcome(null); setError(null)
    setNewEmail(''); setRequestedVia(''); setRequestedDetail(''); setIncludeOwedReminder(true)
    setMatches([]); setQuery('')
  }

  // Επιλογή μέλους → αμέσως προεπισκόπηση (dry run): τίποτα δεν αλλάζει
  const pick = async (m: Match) => {
    setSelected(m); setMatches([]); setPreview(null); setOutcome(null); setError(null); setIncludeOwedReminder(true)
    setBusy('lookup')
    try {
      const res = await fetch('/api/oc/members/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberDocId: m.docId, dryRun: true }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) { setError(json?.error || `Αποτυχία (${res.status})`); return }
      setPreview(json)
    } catch {
      setError('Κάτι πήγε στραβά — δοκίμασε ξανά')
    } finally {
      setBusy(null)
    }
  }

  const change = async () => {
    if (!selected) return
    setBusy('change'); setError(null)
    try {
      const res = await fetch('/api/oc/members/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberDocId: selected.docId, newEmail, requestedVia, requestedDetail, includeOwedReminder }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) { setError(json?.error || `Αποτυχία (${res.status})`); return }
      setOutcome(json); setPreview(null)
    } catch {
      setError('Κάτι πήγε στραβά — δοκίμασε ξανά')
    } finally {
      setBusy(null)
    }
  }

  const validNew = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()) &&
    newEmail.trim().toLowerCase() !== (preview?.member.email || '').toLowerCase()
  const validSource = !!requestedVia && (requestedVia !== 'Άλλο' || requestedDetail.trim().length > 0)
  const canChange = !!preview && validNew && validSource && !busy

  return (
    <div className={CARD}>
      <h3 className={`${EYEBROW} mb-1`}>ΑΛΛΑΓΗ EMAIL ΜΕΛΟΥΣ</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Το email ζει σε πέντε σημεία (σύνδεση, φάκελος αίτησης, Μητρώο, newsletter,
        Sender) και κανένα δεν ενημερώνει το άλλο. Βρες το μέλος με το όνομά του,
        διάλεξέ το, γράψε το νέο email και πώς ζητήθηκε η αλλαγή. Στο τέλος το μέλος
        ειδοποιείται από το it@ στο νέο email, με κοινοποίηση στο παλιό, στο it@ και
        στο hello@. Η απόδειξη είσπραξης και το ΕΣΟΔΑ δεν αγγίζονται.
      </p>

      {/* ── 1. Αναζήτηση / επιλογή μέλους ── */}
      {!selected ? (
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-charcoal dark:text-gray-200">Μέλος</span>
          <input className={INPUT} type="text" value={query} autoComplete="off"
            placeholder="Όνομα ή επώνυμο — με ή χωρίς τόνους"
            onChange={e => { setQuery(e.target.value); setOutcome(null) }} />
          {searching && <span className="text-xs text-gray-500">Ψάχνει…</span>}
          {!searching && query.trim().length >= 2 && matches.length === 0 && (
            <span className="text-xs text-gray-500">Κανένα μέλος με αυτό το όνομα.</span>
          )}
          {matches.length > 0 && (
            <ul className="mt-1 rounded-2xl border border-gray-200 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden">
              {matches.map(m => (
                <li key={m.docId}>
                  <button type="button" onClick={() => pick(m)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-semibold text-charcoal dark:text-gray-100">{m.name || m.engName || '—'}</span>
                    <span className="text-xs text-gray-500">{m.am != null ? `ΑΜ ${m.am}` : 'χωρίς ΑΜ'}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">{m.email || 'χωρίς email'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-600 p-4 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold text-charcoal dark:text-gray-100">{selected.name || selected.engName}</span>
            <span className="text-xs text-gray-500">{selected.am != null ? `ΑΜ ${selected.am}` : 'χωρίς ΑΜ (εκτός ενεργού μητρώου)'}</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Τρέχον email: <span className="font-mono">{selected.email || '—'}</span></span>
            {!outcome && (
              <button type="button" onClick={reset} className="ml-auto text-xs text-coral underline">Άλλο μέλος</button>
            )}
          </div>
          {busy === 'lookup' && <p className="mt-2 text-xs text-gray-500">Ελέγχει πού ζει το email…</p>}
          {preview && !outcome && (
            <>
              <ul className="mt-2 grid gap-1 text-gray-600 dark:text-gray-400">
                <li>Φάκελος αίτησης: {preview.found.application ? 'υπάρχει — θα ενημερωθεί' : 'δεν υπάρχει'}</li>
                <li>Newsletter (Strapi): {preview.found.newsletter ? 'υπάρχει — θα ενημερωθεί' : 'δεν υπάρχει'}</li>
                <li>Sender: {preview.found.sender ? 'ρυθμισμένος — θα μεταφερθεί' : 'μη ρυθμισμένος — παραλείπεται'}</li>
                <li>Μητρώο: {preview.found.registry ? 'συνδεδεμένο — θα αντικατασταθεί σε όλα τα φύλλα' : 'μη συνδεδεμένο — με το χέρι'}</li>
                <li>Συνδρομές: {preview.owedYears?.length ? `εκκρεμούν ${preview.owedYears.join(', ')}` : 'εντάξει'}</li>
              </ul>
              {preview.owedYears?.length > 0 && (
                <label className="mt-3 flex items-start gap-2 text-sm text-charcoal dark:text-gray-100 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-coral mt-0.5" checked={includeOwedReminder}
                    onChange={e => setIncludeOwedReminder(e.target.checked)} />
                  <span>
                    Να μπει στην ειδοποίηση ευγενικό σημείωμα για τη συνδρομή ({preview.owedYears.join(', ')} · {preview.owedYears.length * SUBSCRIPTION_FEE} €) με στοιχεία πληρωμής.
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Ξετίκαρε για σκέτη ειδοποίηση αλλαγής email.</span>
                  </span>
                </label>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 2. Νέο email + πώς ζητήθηκε ── */}
      {selected && !outcome && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 mt-3">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-charcoal dark:text-gray-200">Νέο email</span>
              <input className={INPUT} type="email" value={newEmail} autoComplete="off"
                onChange={e => setNewEmail(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-charcoal dark:text-gray-200">Πώς ζητήθηκε η αλλαγή</span>
              <select className={INPUT} value={requestedVia} onChange={e => setRequestedVia(e.target.value)}>
                <option value="">— διάλεξε —</option>
                {EMAIL_CHANGE_REQUEST_SOURCES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            {requestedVia === 'Άλλο' && (
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="font-semibold text-charcoal dark:text-gray-200">Λεπτομέρειες</span>
                <input className={INPUT} type="text" value={requestedDetail} maxLength={500}
                  placeholder="π.χ. από κοντά στη συνάντηση 28/10, το ζήτησε η ίδια"
                  onChange={e => setRequestedDetail(e.target.value)} />
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button type="button" onClick={change} disabled={!canChange} className={`${BTN} bg-coral text-white`}>
              {busy === 'change' ? 'Αλλάζει… (έως 2 λεπτά)' : 'Αλλαγή'}
            </button>
            {preview && !canChange && !busy && (
              <span className="text-xs text-amber-700 dark:text-amber-200">
                {!validNew
                  ? 'Συμπλήρωσε έγκυρο νέο email, διαφορετικό από το τρέχον.'
                  : requestedVia === 'Άλλο'
                    ? 'Γράψε στις «Λεπτομέρειες» πώς ζητήθηκε η αλλαγή.'
                    : 'Διάλεξε πώς ζητήθηκε η αλλαγή.'}
              </span>
            )}
          </div>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

      {/* ── 3. Αποτέλεσμα ανά βήμα ── */}
      {outcome && (
        <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-600 p-4 text-sm">
          <p className="text-charcoal dark:text-gray-100">
            <strong>{outcome.member.name}</strong>: {outcome.from} → <strong>{outcome.to}</strong>
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Έγινε {fmtAthens(outcome.changedAt)} · {outcome.requestedVia}
          </p>
          {outcome.steps.notice?.state === 'done' && (
            <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              ✉ Το email ειδοποίησης στάλθηκε στο μέλος ({fmtAthens(outcome.changedAt)}).
            </p>
          )}
          <ul className="mt-2 grid gap-1.5">
            {STEP_ORDER.filter(k => outcome.steps[k]).map(k => {
              const s = outcome.steps[k]
              return (
                <li key={k} className="flex items-baseline gap-2 flex-wrap">
                  <span className={`inline-block w-2 h-2 rounded-full ${TONE[s.state].dot}`} aria-hidden="true" />
                  <span className="text-charcoal dark:text-gray-200">{STEP_LABEL[k] || k}</span>
                  <span className={`text-xs font-bold ${TONE[s.state].text}`}>{TONE[s.state].word}</span>
                  <span className="block w-full text-xs text-gray-600 dark:text-gray-400 pl-4">{s.detail}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Το μέλος ειδοποιείται αυτόματα (βήμα «Ειδοποίηση μέλους»)· αν αυτό απέτυχε, πες του εσύ ότι το παλιό email δεν συνδέεται πια.
          </p>
          <button type="button" onClick={reset} className={`${BTN} mt-3 border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-100`}>
            Νέα αλλαγή
          </button>
        </div>
      )}
    </div>
  )
}
