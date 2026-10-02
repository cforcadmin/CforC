'use client'

import { useEffect, useMemo, useState } from 'react'
import { OC_EVENT_COLUMNS, OC_EVENT_DEFAULT_COLS } from '@/components/oc/ocPrefs'
import { eventPhase, dateRangeLabel, athensToday, grDate } from '@/lib/events'
import { CAPACITY_LABELS } from '@/lib/eventForm'

/**
 * ΔΡΑΣΕΙΣ — πλήρους πλάτους στην Επισκόπηση.
 *
 * Οι συμμετέχοντες φορτώνονται ΜΟΝΟ όταν επιλεγεί δράση: είναι προσωπικά
 * δεδομένα και δεν υπάρχει λόγος να ταξιδεύουν επειδή κάποιος άνοιξε την
 * Επισκόπηση για άλλο λόγο.
 *
 * Φαίνονται ΚΑΙ οι εκκρεμείς (μη επιβεβαιωμένες) δηλώσεις, σημασμένες: μια
 * εκκρεμής τρεις μέρες πριν την προθεσμία είναι άνθρωπος που αξίζει ένα
 * τηλέφωνο, όχι γραμμή που πρέπει να κρυφτεί.
 */

type Ev = {
  documentId: string; Title: string; Slug: string; Subtitle?: string
  StartDate: string; EndDate: string; RegistrationDeadline?: string
  City?: string; Venue?: string; Audience?: string
  Sessions: Array<{ id: number; Title: string }>
  counts: { confirmed: number; pending: number; proposals: number }
}
type Reg = {
  documentId: string; FirstName: string; LastName: string; Email: string; Phone?: string
  proposal?: { documentId: string; Title: string; Status: string } | null
  Capacity: string; CapacityOther?: string; Status: 'pending' | 'confirmed' | 'cancelled'
  SessionChoices: Record<string, string>; OptionAnswers: Record<string, string>
  Dietary?: string; AgendaTopic?: string; GeneralComments?: string; SubmittedAt?: string
}
type Filter = 'all' | 'running' | 'upcoming' | 'past'

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'

export default function OcEvents() {
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [regs, setRegs] = useState<Reg[]>([])
  const [regsBusy, setRegsBusy] = useState(false)
  const [cols, setCols] = useState<string[]>(OC_EVENT_DEFAULT_COLS)
  const [showCols, setShowCols] = useState(false)
  const today = athensToday()

  useEffect(() => {
    let alive = true
    fetch('/api/oc/events', { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (alive) setEvents(j.events || [])
      })
      .catch(err => { if (alive) setError(err?.message || 'Κάτι πήγε στραβά') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!openSlug) { setRegs([]); return }
    let alive = true
    setRegsBusy(true)
    fetch(`/api/oc/events?slug=${encodeURIComponent(openSlug)}`, { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (alive) setRegs(j.registrations || [])
      })
      .catch(() => { if (alive) setRegs([]) })
      .finally(() => { if (alive) setRegsBusy(false) })
    return () => { alive = false }
  }, [openSlug])

  const shown = useMemo(() => {
    const withPhase = events.map(e => ({ e, phase: eventPhase(e, today) }))
    const f = filter === 'all' ? withPhase : withPhase.filter(x => x.phase === filter)
    return f.sort((a, b) => b.e.StartDate.localeCompare(a.e.StartDate))
  }, [events, filter, today])

  const openEvent = events.find(e => e.Slug === openSlug) || null
  const show = (k: string) => cols.includes(k)

  const counts = useMemo(() => {
    const c = { all: events.length, running: 0, upcoming: 0, past: 0 }
    for (const e of events) c[eventPhase(e, today)]++
    return c
  }, [events, today])

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-4">
        <h3 className={EYEBROW}>ΔΡΑΣΕΙΣ</h3>
        {!loading && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {events.length} {events.length === 1 ? 'δράση' : 'δράσεις'}
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Φορτώνει…</p>}
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

      {!loading && !error && (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {([['all', 'Όλες'], ['running', 'Τώρα'], ['upcoming', 'Επόμενες'], ['past', 'Αρχείο']] as const)
              .map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)}
                  aria-pressed={filter === k}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    filter === k
                      ? 'bg-coral text-charcoal'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'}`}>
                  {label}
                  <span className="ml-1.5 tabular-nums opacity-70">{counts[k]}</span>
                </button>
              ))}
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Καμία δράση σε αυτό το φίλτρο.</p>
          ) : (
            <div className="grid gap-2">
              {shown.map(({ e, phase }) => (
                <div key={e.documentId}
                  className="rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <button type="button"
                    onClick={() => setOpenSlug(openSlug === e.Slug ? null : e.Slug)}
                    aria-expanded={openSlug === e.Slug}
                    className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="font-bold text-charcoal dark:text-gray-100">{e.Title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {dateRangeLabel(e.StartDate, e.EndDate)}{e.City ? ` · ${e.City}` : ''}
                    </span>
                    {phase === 'running' && <Tag tone="coral">ΤΩΡΑ</Tag>}
                    {e.Audience === 'non-member' && <Tag tone="grey">ΑΝΟΙΧΤΗ</Tag>}
                    <span className="ml-auto flex items-center gap-2 text-xs tabular-nums">
                      <Tag tone="green">{e.counts.confirmed} δηλώσεις</Tag>
                      {e.counts.pending > 0 && <Tag tone="amber">{e.counts.pending} εκκρεμείς</Tag>}
                      {e.counts.proposals > 0 && <Tag tone="grey">{e.counts.proposals} προτάσεις</Tag>}
                      <span aria-hidden="true" className={`transition-transform ${openSlug === e.Slug ? 'rotate-180' : ''}`}>▾</span>
                    </span>
                  </button>

                  {openSlug === e.Slug && (
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-center justify-between mb-3 relative">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          ΣΥΜΜΕΤΕΧΟΝΤΕΣ {regsBusy ? '…' : `(${regs.length})`}
                        </p>
                        <button type="button" onClick={() => setShowCols(v => !v)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral">
                          Στήλες
                        </button>
                        {showCols && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowCols(false)} aria-hidden="true" />
                            <div className="absolute right-0 top-full mt-2 z-40 w-72 menu-glass rounded-2xl border border-gray-200 dark:border-gray-600 p-4 shadow-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ορατές στήλες</p>
                                <span className="flex gap-2">
                                  <button type="button" onClick={() => setCols(OC_EVENT_COLUMNS.map(c => c.key))}
                                    className="text-[11px] text-coral dark:text-coral-light hover:underline">Όλες</button>
                                  <button type="button" onClick={() => setCols(OC_EVENT_DEFAULT_COLS)}
                                    className="text-[11px] text-coral dark:text-coral-light hover:underline">Προεπιλογή</button>
                                </span>
                              </div>
                              {OC_EVENT_COLUMNS.map(c => (
                                <label key={c.key} className="flex items-center gap-2 py-1 cursor-pointer">
                                  <input type="checkbox" checked={cols.includes(c.key)}
                                    onChange={() => setCols(prev =>
                                      prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key])}
                                    className="w-4 h-4 text-coral rounded focus:ring-coral" />
                                  <span className={`text-sm ${c.key === 'dietary'
                                    ? 'text-amber-800 dark:text-amber-200 font-semibold'
                                    : 'text-charcoal dark:text-gray-200'}`}>{c.label}</span>
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {regsBusy ? (
                        <p className="text-sm text-gray-500">Φορτώνει…</p>
                      ) : regs.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Καμία δήλωση ακόμη.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                <th className="py-2 pr-4 font-medium">Ονοματεπώνυμο</th>
                                {show('capacity') && <th className="py-2 pr-4 font-medium">Ιδιότητα</th>}
                                {show('email') && <th className="py-2 pr-4 font-medium">Email</th>}
                                {show('phone') && <th className="py-2 pr-4 font-medium">Τηλέφωνο</th>}
                                {show('sessions') && <th className="py-2 pr-4 font-medium">Συνεδρίες</th>}
                                {show('travel') && <th className="py-2 pr-4 font-medium">Μετακίνηση</th>}
                                {show('transport') && <th className="py-2 pr-4 font-medium">Μέσο</th>}
                                {show('proposal') && <th className="py-2 pr-4 font-medium">Πρόταση</th>}
                                {show('accommodation') && <th className="py-2 pr-4 font-medium">Διαμονή</th>}
                                {show('meals') && <th className="py-2 pr-4 font-medium">Γεύματα</th>}
                                {show('dietary') && <th className="py-2 pr-4 font-medium text-amber-800 dark:text-amber-200">Διατροφικά</th>}
                                {show('agenda') && <th className="py-2 pr-4 font-medium">Ατζέντα</th>}
                                {show('submitted') && <th className="py-2 font-medium">Υποβλήθηκε</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {regs.map(r => (
                                <tr key={r.documentId} className="border-t border-gray-100 dark:border-gray-700">
                                  <td className="py-2 pr-4">
                                    <span className="flex items-center gap-2">
                                      <span className="text-charcoal dark:text-gray-100">{r.FirstName} {r.LastName}</span>
                                      {r.Status === 'pending' && <Tag tone="amber">εκκρεμεί</Tag>}
                                      {r.Status === 'cancelled' && <Tag tone="grey">άκυρη</Tag>}
                                    </span>
                                  </td>
                                  {show('capacity') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                                    {r.Capacity === 'other' ? (r.CapacityOther || 'Άλλο') : (CAPACITY_LABELS as any)[r.Capacity] || r.Capacity}
                                  </td>}
                                  {show('email') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{r.Email}</td>}
                                  {show('phone') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{r.Phone || '—'}</td>}
                                  {show('sessions') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300 tabular-nums">
                                    {sessionSummary(r.SessionChoices)}
                                  </td>}
                                  {show('travel') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                                    {travelSummary(r.OptionAnswers)}
                                  </td>}
                                  {show('transport') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                                    {transportLabel(r.OptionAnswers?.transport)}
                                  </td>}
                                  {show('proposal') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                                    {r.proposal?.Title || '—'}
                                  </td>}
                                  {show('accommodation') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                                    {r.OptionAnswers?.accommodation || '—'}
                                  </td>}
                                  {show('meals') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                                    {[r.OptionAnswers?.lunch, r.OptionAnswers?.dinner].filter(Boolean).join(' · ') || '—'}
                                  </td>}
                                  {show('dietary') && <td className="py-2 pr-4 text-amber-900 dark:text-amber-100">{r.Dietary || '—'}</td>}
                                  {show('agenda') && <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{r.AgendaTopic || '—'}</td>}
                                  {show('submitted') && <td className="py-2 text-gray-500 dark:text-gray-400 tabular-nums">
                                    {r.SubmittedAt ? grDate(String(r.SubmittedAt)) : '—'}
                                  </td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Οι ετικέτες ζουν στη ΔΡΑΣΗ (Choices)· εδώ μόνο ό,τι χρειάζεται ο πίνακας.
 *  Ο οδηγός ξεχωρίζει από τον συνεπιβάτη: αυτό δείχνει ποιος έχει θέσεις. */
const TRANSPORT_LABELS: Record<string, string> = {
  bus: 'ΚΤΕΛ', train: 'Τρένο', plane: 'Αεροπλάνο', boat: 'Πλοίο',
  'car-driver': 'ΙΧ — οδηγός', 'car-passenger': 'ΙΧ — συνεπιβάτης', other: 'Άλλο',
}
const transportLabel = (v?: string) => (v ? TRANSPORT_LABELS[v] || v : '—')

/** «3 δια ζώσης · 1 online» — ο αριθμός που χρειάζεται για να κλείσεις αίθουσα */
function sessionSummary(choices: Record<string, string>): string {
  const vals = Object.values(choices || {})
  const inP = vals.filter(v => v === 'in-person').length
  const on = vals.filter(v => v === 'online').length
  const parts: string[] = []
  if (inP) parts.push(`${inP} δια ζώσης`)
  if (on) parts.push(`${on} online`)
  return parts.join(' · ') || '—'
}

function travelSummary(a: Record<string, string>): string {
  const t = a?.travel
  if (!t) return '—'
  if (t === 'no') return 'Όχι'
  return a?.travelFromCity ? `Ναι — ${a.travelFromCity}` : 'Ναι'
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'coral' | 'green' | 'amber' | 'grey' }) {
  const cls = {
    coral: 'bg-coral text-charcoal',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
    grey: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }[tone]
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{children}</span>
}
