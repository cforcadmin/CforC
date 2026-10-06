'use client'

import { useEffect, useMemo, useState } from 'react'
import { OC_EVENT_COLUMNS, OC_EVENT_DEFAULT_COLS } from '@/components/oc/ocPrefs'
import { eventPhase, dateRangeLabel, athensToday, grDate } from '@/lib/events'
import { CAPACITY_LABELS } from '@/lib/eventForm'
import { buildCsv, downloadCsv, datedFilename } from '@/lib/csv'
import { useColumnWidths } from '@/components/oc/useColumnWidths'
import OcEventEditor from '@/components/oc/OcEventEditor'

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

/** Γραμματεία και IT γράφουν δράσεις· όλοι οι άλλοι μόνο διαβάζουν. */
export default function OcEvents({ canEdit = false }: { canEdit?: boolean }) {
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [regs, setRegs] = useState<Reg[]>([])
  const [regsBusy, setRegsBusy] = useState(false)
  const [cols, setCols] = useState<string[]>(OC_EVENT_DEFAULT_COLS)
  const [showCols, setShowCols] = useState(false)
  const [full, setFull] = useState<{ title: string; who: string; text: string } | null>(null)
  const { width, ResizeHandle, resetWidths, hasCustom } = useColumnWidths('event-registrations')
  // null = κλειστός· '' = νέα δράση· documentId = επεξεργασία
  const [editing, setEditing] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
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
  }, [reloadKey])

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
  // Το ονοματεπώνυμο πρώτο και πάντα — οι υπόλοιπες όπως τις διάλεξε ο χρήστης
  const tableCols = [
    { key: 'name', label: 'Ονοματεπώνυμο' },
    ...OC_EVENT_COLUMNS.filter(c => cols.includes(c.key)),
  ]

  /**
   * Εξαγωγή σε CSV — ΟΤΙ ΒΛΕΠΕΙΣ, με τη σειρά που το βλέπεις.
   *
   * Ακολουθεί τις επιλεγμένες στήλες επίτηδες: αν κάποιος έκρυψε τα
   * διατροφικά (άρθρο 9) για να δείξει την οθόνη, δεν θέλει να φύγουν κιόλας
   * σε αρχείο. Όνομα και κατάσταση μπαίνουν πάντα — χωρίς αυτά η γραμμή δεν
   * λέει ποιανού είναι.
   */
  function exportCsv(ev: Ev) {
    const keys = ['name', 'status', ...OC_EVENT_COLUMNS.map(c => c.key).filter(k => cols.includes(k))]
    const labels: Record<string, string> = {
      name: 'Ονοματεπώνυμο', status: 'Κατάσταση',
      ...Object.fromEntries(OC_EVENT_COLUMNS.map(c => [c.key, c.label])),
    }
    const csv = buildCsv(regs, keys.map(k => ({
      header: labels[k] || k,
      value: (r: Reg) => eventCellValue(r, k),
    })))
    downloadCsv(csv, datedFilename(`CforC-${ev.Slug}-συμμετέχοντες`))
  }

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
        {canEdit && (
          <button type="button" onClick={() => setEditing('')}
            className="ml-auto px-4 py-1.5 rounded-full text-xs font-bold bg-coral text-charcoal hover:bg-coral/90 transition-colors">
            + Νέα δράση
          </button>
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
            <div className="grid gap-2 min-w-0">
              {shown.map(({ e, phase }) => (
                <div key={e.documentId}
                  /* ΟΧΙ overflow-hidden: ΕΚΟΒΕ το μενού «Στήλες», που είναι
                     absolute μέσα στη γραμμή — καμία τιμή z-index δεν σώζει
                     στοιχείο μέσα σε κλεισμένο overflow. Τις στρογγυλές γωνίες
                     τις κρατά πλέον το ίδιο το κουμπί της κεφαλίδας.
                     Το `relative z-20` όταν η γραμμή είναι ανοιχτή τη σηκώνει
                     πάνω από τις ΕΠΟΜΕΝΕΣ γραμμές — αλλιώς το μενού θα
                     περνούσε από κάτω τους.

                     Το `min-w-0` (εδώ, στο πλέγμα και στον κύλινδρο) είναι το
                     αντίβαρο: τα στοιχεία πλέγματος έχουν min-width:auto, οπότε
                     χωρίς αυτό ο φαρδύς πίνακας συμμετεχόντων ΦΟΥΣΚΩΝΕΙ τη
                     γραμμή έξω από την κάρτα αντί να κυλήσει μέσα της. Παλιά
                     το έκρυβε το overflow-hidden· τώρα διορθώνεται στη ρίζα. */
                  className={`rounded-2xl border border-gray-200 dark:border-gray-600 min-w-0 ${
                    openSlug === e.Slug ? 'relative z-20' : ''}`}>
                  <button type="button"
                    onClick={() => setOpenSlug(openSlug === e.Slug ? null : e.Slug)}
                    aria-expanded={openSlug === e.Slug}
                    className={`w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-t-2xl ${
                      openSlug === e.Slug || canEdit ? '' : 'rounded-b-2xl'}`}>
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

                  {canEdit && (
                    <div className="px-4 pb-2 -mt-1">
                      <button type="button" onClick={() => setEditing(e.documentId)}
                        className="text-xs font-bold text-coral hover:underline">
                        Επεξεργασία
                      </button>
                    </div>
                  )}

                  {openSlug === e.Slug && (
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                      <div className="flex items-center justify-between mb-3 relative">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          ΣΥΜΜΕΤΕΧΟΝΤΕΣ {regsBusy ? '…' : `(${regs.length})`}
                        </p>
                        <span className="flex items-center gap-2">
                          <button type="button" onClick={() => exportCsv(e)} disabled={regs.length === 0}
                            title="Κατέβασε τις ορατές στήλες σε CSV"
                            className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral disabled:opacity-40">
                            Εξαγωγή CSV
                          </button>
                          {hasCustom && (
                            <button type="button" onClick={resetWidths}
                              title="Επαναφορά των πλατών που έχεις σύρει"
                              className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral">
                              Πλάτη
                            </button>
                          )}
                          <button type="button" onClick={() => setShowCols(v => !v)}
                            className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral">
                            Στήλες
                          </button>
                        </span>
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
                        <div className="overflow-x-auto min-w-0 max-w-full">
                          {/* Κεφαλίδα ΚΑΙ σώμα από την ΙΔΙΑ λίστα στηλών: έτσι
                              μια νέα στήλη μπαίνει σε ένα σημείο, και το πλάτος
                              που σύρθηκε αντιστοιχεί πάντα στο σωστό κελί. */}
                          <table className="w-full text-sm"
                            style={{ tableLayout: hasCustom ? 'fixed' : 'auto', minWidth: '100%' }}>
                            <colgroup>
                              {tableCols.map(c => (
                                <col key={c.key} style={width(c.key) ? { width: `${width(c.key)}px` } : undefined} />
                              ))}
                            </colgroup>
                            <thead>
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                {tableCols.map(c => (
                                  <th key={c.key}
                                    className={`relative py-2 pr-4 font-medium whitespace-nowrap ${
                                      c.key === 'dietary' ? 'text-amber-800 dark:text-amber-200' : ''}`}>
                                    <span className="block max-w-full truncate">{c.label}</span>
                                    <ResizeHandle colKey={c.key} />
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {regs.map(r => (
                                <tr key={r.documentId} className="border-t border-gray-100 dark:border-gray-700">
                                  {tableCols.map(c => (
                                    <td key={c.key}
                                      className={`py-2 pr-4 align-top max-w-[22rem] ${
                                        c.key === 'name' ? 'text-charcoal dark:text-gray-100'
                                          : c.key === 'dietary' ? 'text-amber-900 dark:text-amber-100'
                                            : c.key === 'submitted' ? 'text-gray-500 dark:text-gray-400 tabular-nums'
                                              : 'text-gray-600 dark:text-gray-300'}`}>
                                      {c.key === 'name' ? (
                                        <span className="flex items-center gap-2">
                                          <span>{eventCellValue(r, 'name')}</span>
                                          {r.Status === 'pending' && <Tag tone="amber">εκκρεμεί</Tag>}
                                          {r.Status === 'cancelled' && <Tag tone="grey">άκυρη</Tag>}
                                        </span>
                                      ) : (
                                        <LongCell
                                          text={eventCellValue(r, c.key)}
                                          onOpen={() => setFull({
                                            title: c.label,
                                            who: eventCellValue(r, 'name'),
                                            text: eventCellValue(r, c.key),
                                          })}
                                        />
                                      )}
                                    </td>
                                  ))}
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

      {/* Η φόρμα ζει ΕΔΩ και όχι μέσα στη λίστα: είναι overlay σε όλη την
          οθόνη, και φωλιασμένη μέσα στις γραμμές θα κληρονομούσε το overflow
          του πίνακα συμμετεχόντων. */}
      {full && (
        <FullTextModal title={full.title} who={full.who} text={full.text} onClose={() => setFull(null)} />
      )}

      {canEdit && editing !== null && (
        <OcEventEditor
          documentId={editing || undefined}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setReloadKey(k => k + 1) }}
        />
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
/**
 * Η ΤΙΜΗ ΚΑΘΕ ΣΤΗΛΗΣ, ΜΙΑ ΦΟΡΑ.
 *
 * Η εξαγωγή ΔΕΝ ξαναγράφει τη λογική των κελιών: ένα δεύτερο αντίγραφο θα
 * απέκλινε σιωπηλά, και το αρχείο που κατεβάζει κανείς για να στείλει στο
 * ξενοδοχείο θα έλεγε άλλα από την οθόνη.
 */
export function eventCellValue(r: Reg, key: string): string {
  switch (key) {
    case 'name': return `${r.FirstName} ${r.LastName}`.trim()
    case 'status': return r.Status === 'pending' ? 'εκκρεμεί'
      : r.Status === 'cancelled' ? 'άκυρη' : 'επιβεβαιωμένη'
    case 'capacity': return r.Capacity === 'other'
      ? (r.CapacityOther || 'Άλλο')
      : (CAPACITY_LABELS as any)[r.Capacity] || r.Capacity
    case 'email': return r.Email || ''
    case 'phone': return r.Phone || ''
    case 'sessions': return sessionSummary(r.SessionChoices)
    case 'travel': return travelSummary(r.OptionAnswers)
    case 'fromCity': return r.OptionAnswers?.travelFromCity || ''
    case 'transport': return transportLabel(r.OptionAnswers?.transport)
    case 'proposal': return r.proposal?.Title || ''
    case 'accommodation': return r.OptionAnswers?.accommodation || ''
    case 'meals': return [r.OptionAnswers?.lunch, r.OptionAnswers?.dinner].filter(Boolean).join(' · ')
    case 'dietary': return r.Dietary || ''
    case 'agenda': return r.AgendaTopic || ''
    case 'submitted': return r.SubmittedAt ? grDate(String(r.SubmittedAt)) : ''
    default: return ''
  }
}

/** Πάνω από αυτό, το κελί κόβεται και ανοίγει με κλικ */
const LONG_TEXT = 90

/**
 * ΚΕΛΙ ΜΕ ΜΑΚΡΥ ΚΕΙΜΕΝΟ.
 *
 * Μια ελεύθερη απάντηση 1.300 χαρακτήρων (θέμα ατζέντας, διατροφικά) έκανε τη
 * ΓΡΑΜΜΗ ψηλότερη από την οθόνη και έσπρωχνε όλες τις άλλες στήλες σε μια
 * λωρίδα πλάτους μιας λέξης.
 *
 * ΟΧΙ TOOLTIP ΣΤΟ HOVER: μακρύ κείμενο δεν κυλά μέσα σε tooltip, χάνεται
 * μόλις κουνηθεί ο δείκτης, δεν υπάρχει καθόλου σε οθόνη αφής και διαβάζεται
 * άσχημα από αναγνώστες οθόνης. Κόβουμε στις δύο γραμμές με «…» (κανόνας UI
 * του έργου) και το πλήρες κείμενο ανοίγει με ΚΛΙΚ — επιλέξιμο, με δυνατότητα
 * αντιγραφής, και με πληκτρολόγιο.
 */
function LongCell({ text, onOpen }: { text: string; onOpen: () => void }) {
  if (!text) return <>—</>
  if (text.length <= LONG_TEXT) return <>{text}</>
  return (
    <button type="button" onClick={onOpen}
      title="Δες ολόκληρο το κείμενο"
      className="text-left w-full group">
      <span className="line-clamp-2 group-hover:text-coral transition-colors">{text}</span>
      <span className="text-[11px] font-bold text-coral opacity-80 group-hover:opacity-100">
        Δες ολόκληρο
      </span>
    </button>
  )
}

/** Το πλήρες κείμενο — Esc για κλείσιμο, και κουμπί αντιγραφής */
function FullTextModal({ title, who, text, onClose }: {
  title: string; who: string; text: string; onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={`${title} — ${who}`}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
            <p className="font-bold text-charcoal dark:text-gray-100 truncate">{who}</p>
          </div>
          <button type="button"
            onClick={() => {
              navigator.clipboard?.writeText(text).then(() => {
                setCopied(true); setTimeout(() => setCopied(false), 1500)
              }).catch(() => { /* χωρίς πρόχειρο: το κείμενο είναι ούτως ή άλλως επιλέξιμο */ })
            }}
            className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral">
            {copied ? 'Αντιγράφηκε ✓' : 'Αντιγραφή'}
          </button>
          <button type="button" onClick={onClose}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            Κλείσιμο
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <p className="text-sm leading-relaxed text-charcoal dark:text-gray-200 whitespace-pre-line">{text}</p>
        </div>
      </div>
    </div>
  )
}

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
