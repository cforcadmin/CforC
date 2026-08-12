'use client'

import { useState } from 'react'

/**
 * Φόρμα αποχώρησης — στο ύφος του /apply. 8 βασικές ερωτήσεις.
 * Ανώνυμη από προεπιλογή· τσεκ «να συμπληρωθεί το όνομά μου» → η ταυτότητα
 * προστίθεται server-side από το signed token (ποτέ ελεύθερο input).
 */

const REASONS = [
  'Το κόστος της συνδρομής',
  'Δεν έβρισκα αρκετή αξία/οφέλη για μένα',
  'Έλλειψη χρόνου για συμμετοχή',
  'Οι δράσεις δεν ήταν σχετικές με το αντικείμενό μου',
  'Αλλαγή καριέρας / αποχώρηση από τον πολιτιστικό τομέα',
  'Μετακόμιση στο εξωτερικό',
  'Οικονομική δυσκολία',
  'Εντάχθηκα σε άλλο δίκτυο που με καλύπτει',
  'Προσωπικοί λόγοι',
]

const USEFUL = [
  'Newsletter',
  'Ανοιχτές προσκλήσεις',
  'Εκπαιδεύσεις / εργαλεία',
  'Δικτύωση με μέλη',
  'Ομάδες Εργασίας',
  'Προβολή προφίλ / έργου',
  'Η κοινότητα γενικά',
  'Τίποτα ιδιαίτερα',
]

const BARRIERS = [
  'Έλλειψη χρόνου',
  'Απόσταση / τοποθεσία δράσεων',
  'Ωράρια εκδηλώσεων',
  'Δεν ένιωσα «μέσα» στην κοινότητα',
  'Δεν ήξερα τι προσφέρεται',
  'Τίποτα — συμμετείχα όσο ήθελα',
]

const RETURN_OPTIONS = [
  'Χαμηλότερη συνδρομή',
  'Περισσότερες δράσεις στην πόλη μου',
  'Πιο στοχευμένες ευκαιρίες για το αντικείμενό μου',
  'Δυνατότητα πλήρως διαδικτυακής συμμετοχής',
  'Δεν σκοπεύω να επιστρέψω',
]

function CheckGroup({ options, selected, onChange }: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt} className="flex items-start gap-3 cursor-pointer text-sm text-charcoal dark:text-gray-200">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() =>
              onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])
            }
            className="accent-[#FF8B6A] mt-0.5"
          />
          {opt}
        </label>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8">
      <h2 className="font-bold text-charcoal dark:text-gray-100 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function FarewellForm({ token, memberName }: { token: string; memberName: string }) {
  const [reasons, setReasons] = useState<string[]>([])
  const [reasonOther, setReasonOther] = useState('')
  const [satisfaction, setSatisfaction] = useState<number | null>(null)
  const [useful, setUseful] = useState<string[]>([])
  const [barriers, setBarriers] = useState<string[]>([])
  const [wouldChange, setWouldChange] = useState('')
  const [wouldReturn, setWouldReturn] = useState<string[]>([])
  const [keepNewsletter, setKeepNewsletter] = useState<boolean | null>(null)
  const [finalComment, setFinalComment] = useState('')
  const [identify, setIdentify] = useState(false)
  const [allowFollowUp, setAllowFollowUp] = useState(false)
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  async function submit() {
    setState('busy')
    try {
      const res = await fetch('/api/farewell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, reasons, reasonOther, satisfaction, useful, barriers,
          wouldChange, wouldReturn, keepNewsletter, finalComment,
          identify, allowFollowUp: identify && allowFollowUp,
        }),
      })
      const json = await res.json().catch(() => null)
      setState(res.ok && json?.ok ? 'done' : 'error')
      if (res.ok && json?.ok) window.scrollTo({ top: 0 })
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">Σε ευχαριστούμε!</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Οι απαντήσεις σου καταχωρήθηκαν και θα μας βοηθήσουν να γίνουμε καλύτεροι.
          Σου ευχόμαστε ό,τι καλύτερο — και να ξέρεις ότι η πόρτα του CforC μένει πάντα ανοιχτή. 💛
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-charcoal dark:text-coral">ΦΟΡΜΑ ΑΠΟΧΩΡΗΣΗΣ</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          2-3 λεπτά · Οι απαντήσεις είναι <strong>ανώνυμες</strong>, εκτός αν επιλέξεις διαφορετικά στο τέλος.
        </p>
      </div>

      <Section title="Ποιοι είναι οι κύριοι λόγοι της αποχώρησής σου;">
        <CheckGroup options={REASONS} selected={reasons} onChange={setReasons} />
        <input
          type="text"
          value={reasonOther}
          onChange={e => setReasonOther(e.target.value)}
          placeholder="Άλλο (προαιρετικά)…"
          className="mt-3 w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 focus:outline-none focus:border-coral"
        />
      </Section>

      <Section title="Πόσο ικανοποιημένος/η έμεινες συνολικά από τη συμμετοχή σου;">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setSatisfaction(n)}
              aria-pressed={satisfaction === n}
              className={`w-11 h-11 rounded-full font-bold text-sm transition-colors ${
                satisfaction === n
                  ? 'bg-coral text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-charcoal dark:text-gray-200 hover:bg-coral/20'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">1 = καθόλου · 5 = πολύ</p>
      </Section>

      <Section title="Τι σου φάνηκε πιο χρήσιμο όσο ήσουν μέλος;">
        <CheckGroup options={USEFUL} selected={useful} onChange={setUseful} />
      </Section>

      <Section title="Τι σε εμπόδισε να συμμετέχεις περισσότερο;">
        <CheckGroup options={BARRIERS} selected={barriers} onChange={setBarriers} />
      </Section>

      <Section title="Τι θα έπρεπε να αλλάξει ή να προστεθεί για να είχες μείνει;">
        <textarea
          value={wouldChange}
          onChange={e => setWouldChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 focus:outline-none focus:border-coral"
        />
      </Section>

      <Section title="Τι θα σε έκανε να επιστρέψεις στο μέλλον;">
        <CheckGroup options={RETURN_OPTIONS} selected={wouldReturn} onChange={setWouldReturn} />
      </Section>

      <Section title="Θέλεις να παραμείνεις στο δημόσιο newsletter του CforC;">
        <div className="flex gap-3">
          {[['Ναι', true], ['Όχι', false]].map(([label, val]) => (
            <button
              key={String(label)}
              type="button"
              onClick={() => setKeepNewsletter(val as boolean)}
              aria-pressed={keepNewsletter === val}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${
                keepNewsletter === val
                  ? 'bg-coral text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-charcoal dark:text-gray-200 hover:bg-coral/20'
              }`}
            >
              {String(label)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Κάτι τελευταίο που θα ήθελες να μας πεις;">
        <textarea
          value={finalComment}
          onChange={e => setFinalComment(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 focus:outline-none focus:border-coral"
        />
      </Section>

      <Section title="Ταυτότητα απαντήσεων">
        <label className="flex items-start gap-3 cursor-pointer text-sm text-charcoal dark:text-gray-200">
          <input
            type="checkbox"
            checked={identify}
            onChange={e => setIdentify(e.target.checked)}
            className="accent-[#FF8B6A] mt-0.5"
          />
          <span>
            Να συμπληρωθεί αυτόματα το όνομά μου
            {memberName && <strong className="notranslate"> ({memberName})</strong>} — αλλιώς οι
            απαντήσεις καταχωρούνται ανώνυμα.
          </span>
        </label>
        {identify && (
          <label className="flex items-start gap-3 cursor-pointer text-sm text-charcoal dark:text-gray-200 mt-3 ml-7">
            <input
              type="checkbox"
              checked={allowFollowUp}
              onChange={e => setAllowFollowUp(e.target.checked)}
              className="accent-[#FF8B6A] mt-0.5"
            />
            Μπορείτε να επικοινωνήσετε μαζί μου για ένα σύντομο follow-up.
          </label>
        )}
      </Section>

      <div className="text-center">
        <button
          type="button"
          disabled={state === 'busy'}
          onClick={submit}
          className="bg-coral text-white font-bold rounded-full px-10 py-3 hover:bg-coral/90 transition-colors disabled:opacity-50"
        >
          {state === 'busy' ? 'Αποστολή…' : 'Υποβολή'}
        </button>
        {state === 'error' && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-3">
            Κάτι πήγε στραβά — δοκίμασε ξανά.
          </p>
        )}
      </div>
    </div>
  )
}
