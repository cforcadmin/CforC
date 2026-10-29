'use client'

// Αλλαγή email μέλους — κουτί στο Ασφάλεια++ (θέση IT μόνο).
//
// Δύο κινήσεις, ποτέ μία: «Έλεγχος» βρίσκει το μέλος και λέει ΠΟΥ ζει το
// παλιό email χωρίς να αλλάξει τίποτα· «Αλλαγή» κάνει τα πέντε βήματα και
// δείχνει το καθένα με το όνομά του. Ένα βήμα που απέτυχε γράφει τι να
// γίνει με το χέρι — όχι «κάτι πήγε στραβά».

import { useState } from 'react'
import { EMAIL_CHANGE_REQUEST_SOURCES } from '@/lib/memberEmailChangeOptions'

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'
const INPUT = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const BTN = 'rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed'

type StepState = 'done' | 'failed' | 'skipped' | 'unchanged'
interface Step { state: StepState; detail: string }
interface Preview {
  member: { name: string; am: number | null }
  found: { application: boolean; newsletter: boolean; sender: boolean; registry: boolean }
}
interface Outcome { member: { name: string }; from: string; to: string; changedAt: string; requestedVia: string; steps: Record<string, Step> }

const fmtAthens = (iso: string) =>
  new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'short', timeStyle: 'short' })

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

export default function OcMemberEmailChange() {
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [requestedVia, setRequestedVia] = useState('')
  const [requestedDetail, setRequestedDetail] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState<'check' | 'change' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const call = async (dryRun: boolean) => {
    setBusy(dryRun ? 'check' : 'change'); setError(null)
    if (dryRun) { setPreview(null); setOutcome(null) }
    try {
      const res = await fetch('/api/oc/members/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentEmail, newEmail, dryRun, requestedVia, requestedDetail }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error || `Αποτυχία (${res.status})`)
        return
      }
      if (dryRun) setPreview(json)
      else { setOutcome(json); setPreview(null) }
    } catch {
      setError('Κάτι πήγε στραβά — δοκίμασε ξανά')
    } finally {
      setBusy(null)
    }
  }

  const validNew = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()) && newEmail.trim().toLowerCase() !== currentEmail.trim().toLowerCase()
  const validSource = !!requestedVia && (requestedVia !== 'Άλλο' || requestedDetail.trim().length > 0)
  // Η αλλαγή ανοίγει ΜΟΝΟ μετά από έλεγχο με το ίδιο τρέχον email, και με δηλωμένη πηγή αιτήματος
  const canChange = !!preview && validNew && validSource && !busy

  return (
    <div className={CARD}>
      <h3 className={`${EYEBROW} mb-1`}>ΑΛΛΑΓΗ EMAIL ΜΕΛΟΥΣ</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Το email ζει σε πέντε σημεία (σύνδεση, φάκελος αίτησης, Μητρώο, newsletter,
        Sender) και κανένα δεν ενημερώνει το άλλο. Στο τέλος το μέλος ειδοποιείται από το it@
        στο νέο email, με κοινοποίηση στο παλιό, στο it@ και στο hello@. Πρώτα «Έλεγχος» — βρίσκει το
        μέλος χωρίς να αλλάξει τίποτα — μετά «Αλλαγή». Η απόδειξη είσπραξης και
        το ΕΣΟΔΑ δεν αγγίζονται: κρατούν το email της εποχής τους.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-charcoal dark:text-gray-200">Τρέχον email</span>
          <input className={INPUT} type="email" value={currentEmail} autoComplete="off"
            onChange={e => { setCurrentEmail(e.target.value); setPreview(null); setOutcome(null) }} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-charcoal dark:text-gray-200">Νέο email</span>
          <input className={INPUT} type="email" value={newEmail} autoComplete="off"
            onChange={e => { setNewEmail(e.target.value); setOutcome(null) }} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mt-3">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-charcoal dark:text-gray-200">Πώς ζητήθηκε η αλλαγή</span>
          <select className={INPUT} value={requestedVia}
            onChange={e => { setRequestedVia(e.target.value); setOutcome(null) }}>
            <option value="">— διάλεξε —</option>
            {EMAIL_CHANGE_REQUEST_SOURCES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        {requestedVia === 'Άλλο' && (
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-charcoal dark:text-gray-200">Λεπτομέρειες</span>
            <input className={INPUT} type="text" value={requestedDetail} maxLength={500}
              placeholder="π.χ. από κοντά στη συνάντηση 28/10, το ζήτησε η ίδια"
              onChange={e => { setRequestedDetail(e.target.value); setOutcome(null) }} />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button type="button" onClick={() => call(true)} disabled={!!busy || !currentEmail.trim()}
          className={`${BTN} border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-100`}>
          {busy === 'check' ? 'Ψάχνει…' : 'Έλεγχος'}
        </button>
        <button type="button" onClick={() => call(false)} disabled={!canChange}
          className={`${BTN} bg-coral text-white`}>
          {busy === 'change' ? 'Αλλάζει… (έως 2 λεπτά)' : 'Αλλαγή'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

      {preview && !outcome && (
        <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-600 p-4 text-sm">
          <p className="text-charcoal dark:text-gray-100">
            Μέλος: <strong>{preview.member.name || '—'}</strong>
            {preview.member.am != null ? ` · ΑΜ ${preview.member.am}` : ' · χωρίς ΑΜ (εκτός ενεργού μητρώου)'}
          </p>
          <ul className="mt-2 grid gap-1 text-gray-600 dark:text-gray-400">
            <li>Φάκελος αίτησης: {preview.found.application ? 'υπάρχει — θα ενημερωθεί' : 'δεν υπάρχει'}</li>
            <li>Newsletter (Strapi): {preview.found.newsletter ? 'υπάρχει — θα ενημερωθεί' : 'δεν υπάρχει'}</li>
            <li>Sender: {preview.found.sender ? 'ρυθμισμένος — θα μεταφερθεί' : 'μη ρυθμισμένος — παραλείπεται'}</li>
            <li>Μητρώο: {preview.found.registry ? 'συνδεδεμένο — θα αντικατασταθεί σε όλα τα φύλλα' : 'μη συνδεδεμένο — με το χέρι'}</li>
          </ul>
          {(!validNew || !validSource) && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
              {!validNew
                ? 'Συμπλήρωσε έγκυρο νέο email, διαφορετικό από το τρέχον, για να ανοίξει η «Αλλαγή».'
                : requestedVia === 'Άλλο'
                  ? 'Γράψε στις «Λεπτομέρειες» πώς ζητήθηκε η αλλαγή.'
                  : 'Διάλεξε πώς ζητήθηκε η αλλαγή για να ανοίξει η «Αλλαγή».'}
            </p>
          )}
        </div>
      )}

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
        </div>
      )}
    </div>
  )
}
