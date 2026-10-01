'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { eventPhase, dateRangeLabel, registrationClosed, athensToday, grDate } from '@/lib/events'

/**
 * «Δράσεις» στο προφίλ του μέλους.
 *
 * Δείχνει ΠΡΩΤΑ αυτό που απαιτεί ενέργεια: δράση που έρχεται και δεν έχεις
 * δηλώσει, με την προθεσμία δίπλα. Ό,τι έχει ήδη απαντηθεί κατεβαίνει, και
 * το αρχείο μένει κλειστό — ο λόγος που μπαίνει κανείς εδώ είναι «τι πρέπει
 * να κάνω», όχι «τι έκανα πέρυσι».
 */

type Ev = {
  documentId: string; Title: string; Slug: string; Subtitle?: string
  StartDate: string; EndDate: string; RegistrationDeadline?: string
  RegistrationOpen?: boolean; City?: string; Venue?: string; Audience?: string
}
type Reg = {
  documentId: string; Status: 'pending' | 'confirmed' | 'cancelled'
  Capacity: string; SubmittedAt?: string; eventSlug: string | null; eventTitle: string | null
}

export default function MyEvents() {
  const [events, setEvents] = useState<Ev[]>([])
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  const today = athensToday()

  useEffect(() => {
    let alive = true
    fetch('/api/events/mine', { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (!alive) return
        setEvents(j.events || [])
        setRegs(j.registrations || [])
      })
      .catch(err => { if (alive) setError(err?.message || 'Κάτι πήγε στραβά') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const regBySlug = useMemo(() => {
    const m = new Map<string, Reg>()
    for (const r of regs) {
      if (r.eventSlug && r.Status !== 'cancelled') m.set(r.eventSlug, r)
    }
    return m
  }, [regs])

  const { live, past } = useMemo(() => {
    const l: Ev[] = []; const p: Ev[] = []
    for (const e of events) (eventPhase(e, today) === 'past' ? p : l).push(e)
    l.sort((a, b) => a.StartDate.localeCompare(b.StartDate))
    p.sort((a, b) => b.StartDate.localeCompare(a.StartDate))
    return { live: l, past: p }
  }, [events, today])

  if (loading) {
    return <Wrap><p className="text-gray-600 dark:text-gray-300">Φορτώνει…</p></Wrap>
  }
  if (error) {
    return <Wrap><p className="text-red-700 dark:text-red-300">{error}</p></Wrap>
  }

  return (
    <Wrap>
      {live.length === 0 && past.length === 0 && (
        <p className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-8 text-gray-600 dark:text-gray-300">
          Δεν υπάρχουν δράσεις αυτή τη στιγμή. Θα ειδοποιηθείς με email μόλις ανακοινωθεί η επόμενη.
        </p>
      )}

      {live.length > 0 && (
        <div className="grid gap-4">
          {live.map(e => <Row key={e.documentId} ev={e} reg={regBySlug.get(e.Slug)} today={today} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-10">
          <button type="button" onClick={() => setShowPast(v => !v)} aria-expanded={showPast}
            className="flex items-baseline gap-3 text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 hover:text-coral transition-colors">
            ΑΡΧΕΙΟ
            <span className="text-sm font-normal tracking-normal">
              {past.length} {past.length === 1 ? 'δράση' : 'δράσεις'}
            </span>
            <span aria-hidden="true" className={`transition-transform ${showPast ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showPast && (
            <div className="grid gap-4 mt-4">
              {past.map(e => <Row key={e.documentId} ev={e} reg={regBySlug.get(e.Slug)} today={today} past />)}
            </div>
          )}
        </div>
      )}
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    /* ΙΔΙΑ απόσταση και ΙΔΙΟ πλάτος με το MyExpenseClaims, που είναι η
       αμέσως επόμενη ενότητα: εναλλάσσοντας «Δράσεις» ⇄ «Εξοδολόγια» η
       σελίδα δεν πρέπει να χοροπηδά. Χωρίς το pt, ο τίτλος κολλούσε πάνω
       στο hero. */
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-16">
      <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-2">Δράσεις</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Οι συναντήσεις του δικτύου και οι δηλώσεις συμμετοχής σου.
      </p>
      {children}
    </div>
  )
}

function Row({ ev, reg, today, past }: { ev: Ev; reg?: Reg; today: string; past?: boolean }) {
  const closed = registrationClosed(ev, today)
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-6">
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-bold text-coral dark:text-coral-light">
          {dateRangeLabel(ev.StartDate, ev.EndDate)}
        </span>
        {ev.City && <span className="text-sm text-gray-600 dark:text-gray-400">· {ev.City}</span>}
      </span>
      <h3 className="mt-1 text-lg font-bold text-charcoal dark:text-white">{ev.Title}</h3>
      {ev.Subtitle && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{ev.Subtitle}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {reg ? (
          <>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              reg.Status === 'confirmed'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'}`}>
              {reg.Status === 'confirmed' ? 'ΔΗΛΩΣΕΣ ΣΥΜΜΕΤΟΧΗ ✓' : 'ΕΚΚΡΕΜΕΙ ΕΠΙΒΕΒΑΙΩΣΗ'}
            </span>
            {reg.SubmittedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {grDate(String(reg.SubmittedAt))}
              </span>
            )}
          </>
        ) : past ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">Δεν είχες δηλώσει συμμετοχή</span>
        ) : closed ? (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            ΟΙ ΔΗΛΩΣΕΙΣ ΕΚΛΕΙΣΑΝ
          </span>
        ) : (
          <>
            <Link href={`/events/${ev.Slug}/register`}
              className="px-5 py-2 rounded-full bg-coral text-charcoal font-bold text-sm hover:brightness-105 transition">
              Δήλωσε συμμετοχή
            </Link>
            {ev.RegistrationDeadline && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                ως {grDate(ev.RegistrationDeadline)}
              </span>
            )}
          </>
        )}
        <Link href={`/events/${ev.Slug}`}
          className="ml-auto text-sm font-bold text-coral dark:text-coral-light hover:underline">
          Λεπτομέρειες →
        </Link>
      </div>
    </div>
  )
}
