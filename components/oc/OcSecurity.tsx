'use client'

// Ασφάλεια++ — μόνο για τη θέση IT. Φάση 1: τα Ζωτικά.
//
// Μία σειρά ανά έλεγχο, με χρώμα ΚΑΙ λέξη: το χρώμα μόνο του αποκλείει όποιον
// δεν το ξεχωρίζει, και η οθόνη υπάρχει ακριβώς για να λέει την αλήθεια.
//
// Τα υπόλοιπα τρία κουτιά (Χάρτης δεδομένων, Πρόσβαση & μυστικά, AI) έπονται —
// βλ. docs/OC-Asfaleia-Plus-Plus.md.

import { useCallback, useEffect, useState } from 'react'

type HealthState = 'ok' | 'warn' | 'down' | 'unknown'

interface SubCheck {
  key: string
  label: string
  state: HealthState
  detail: string
}

interface Check {
  key: string
  label: string
  state: HealthState
  detail: string
  ms?: number
  action?: string
  /** Ομαδοποιημένος έλεγχος (π.χ. τα αρχεία Google) — ανοίγει με κλικ */
  items?: SubCheck[]
}

interface Payload {
  checkedAt: string
  overall: HealthState
  checks: Check[]
}

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'

/** Χρώμα ΚΑΙ λέξη — ποτέ μόνο χρώμα */
const TONE: Record<HealthState, { dot: string; word: string; text: string }> = {
  ok: { dot: 'bg-emerald-500', word: 'Εντάξει', text: 'text-emerald-700 dark:text-emerald-300' },
  warn: { dot: 'bg-amber-500', word: 'Προσοχή', text: 'text-amber-700 dark:text-amber-200' },
  down: { dot: 'bg-red-600', word: 'Βλάβη', text: 'text-red-700 dark:text-red-300' },
  unknown: { dot: 'bg-gray-400', word: 'Άγνωστο', text: 'text-gray-600 dark:text-gray-300' },
}

const HEADLINE: Record<HealthState, string> = {
  ok: 'Όλα λειτουργούν',
  warn: 'Κάτι θέλει προσοχή',
  down: 'Κάτι έχει χαλάσει',
  unknown: 'Δεν απαντούν όλα',
}

export default function OcSecurity() {
  const [data, setData] = useState<Payload | null>(null)
  /** Ποιες ομαδοποιημένες γραμμές είναι ανοιχτές */
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/oc/security', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Αποτυχία')
      setData(j)
    } catch (err: any) {
      setError(err?.message || 'Κάτι πήγε στραβά')
    } finally {
      setBusy(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="grid gap-6">
      <div className={CARD}>
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <h3 className={EYEBROW}>ΖΩΤΙΚΑ</h3>
          {data && (
            <span className={`text-sm font-bold ${TONE[data.overall].text}`}>{HEADLINE[data.overall]}</span>
          )}
          <button type="button" onClick={load} disabled={busy}
            className="ml-auto px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
            {busy ? 'Έλεγχος…' : 'Επανέλεγχος'}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Κάθε έλεγχος τρέχει ζωντανά, τώρα. Κανένας δεν εξαρτάται από τους άλλους — αν ένας πάροχος
          δεν απαντά, οι υπόλοιποι εξακολουθούν να λένε την αλήθεια.
        </p>

        {error && (
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
        )}

        {!data && busy && (
          <p className="text-sm text-gray-500">Γίνεται έλεγχος…</p>
        )}

        {data && (
          <div className="grid gap-2">
            {data.checks.map(c => {
              const group = !!c.items?.length
              const isOpen = !!open[c.key]
              return (
                <div key={c.key}
                  className="rounded-2xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full shrink-0 ${TONE[c.state].dot}`} />
                    {group ? (
                      <button type="button" onClick={() => setOpen(o => ({ ...o, [c.key]: !o[c.key] }))}
                        aria-expanded={isOpen}
                        className="font-semibold min-w-0 text-left hover:text-coral">
                        {c.label}
                        <span aria-hidden="true" className={`ml-1.5 inline-block text-coral transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                      </button>
                    ) : (
                      <span className="font-semibold min-w-0">{c.label}</span>
                    )}
                    <span className={`text-xs font-bold ${TONE[c.state].text}`}>{TONE[c.state].word}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0">{c.detail}</span>
                    {typeof c.ms === 'number' && (
                      <span className="text-xs text-gray-500 tabular-nums ml-auto">{c.ms} ms</span>
                    )}
                  </div>
                  {c.action && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 pl-6 pt-1">→ {c.action}</p>
                  )}
                  {/* Τα επιμέρους αρχεία: ανοίγουν με κλικ, αλλά ό,τι ΔΕΝ είναι
                      εντάξει φαίνεται ήδη στη σύνοψη της γραμμής — κανείς δεν
                      χρειάζεται να ανοίξει για να μάθει ότι κάτι έσπασε. */}
                  {group && isOpen && (
                    <div className="mt-3 grid gap-1.5 pl-6">
                      {c.items!.map(it => (
                        <div key={it.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                          <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${TONE[it.state].dot}`} />
                          <span className="font-medium">{it.label}</span>
                          <span className={`text-xs font-bold ${TONE[it.state].text}`}>{TONE[it.state].word}</span>
                          <span className="text-gray-600 dark:text-gray-400">{it.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {data && (
          <p className="mt-4 text-xs text-gray-500">
            Τελευταίος έλεγχος: {new Date(data.checkedAt).toLocaleString('el-GR')}
          </p>
        )}
      </div>

      {/* Τα επόμενα κουτιά δηλώνονται εδώ ώστε να μη μοιάζει τελειωμένη η οθόνη */}
      <div className={CARD}>
        <h3 className={`${EYEBROW} mb-2`}>ΕΠΟΜΕΝΑ</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 grid gap-1.5">
          <li>· <strong>Χάρτης δεδομένων</strong> — ποια προσωπικά δεδομένα κρατάμε και ποιοι τρίτοι τα αγγίζουν</li>
          <li>· <strong>Πρόσβαση &amp; μυστικά</strong> — ποιος έχει πρόσβαση πού, ηλικία κλειδιών, συμφωνία με το Vercel</li>
          <li>· <strong>Ιστορικό</strong> — πότε έτρεξε κάθε cron και τι απέτυχε, 90 ημέρες πίσω</li>
          <li>· <strong>AI &amp; δεδομένα</strong> — ανώνυμα δεδομένα ανάπτυξης, ώστε να μη χρειάζεται ερώτημα σε ζωντανά μέλη</li>
        </ul>
      </div>
    </div>
  )
}
