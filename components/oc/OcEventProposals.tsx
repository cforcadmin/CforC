'use client'

import { useEffect, useMemo, useState } from 'react'
import { grDate } from '@/lib/events'
import { buildCsv, downloadCsv, datedFilename } from '@/lib/csv'
import OcSiteRequests from '@/components/oc/OcSiteRequests'

/**
 * ΠΡΟΤΑΣΕΙΣ ΔΡΑΣΕΩΝ — πλήρους πλάτους στην Επισκόπηση.
 *
 * Οι προτάσεις δεν ήρθαν με email: γράφτηκαν μέσα στην αίτηση και κάθονται
 * εδώ, δίπλα στον άνθρωπο που τις έκανε. Η ΟΣ αλλάζει ΜΟΝΟ κατάσταση και
 * σημειώσεις — ό,τι έγραψε το μέλος μένει ανέπαφο, και το ίδιο κείμενο
 * υπάρχει έτσι κι αλλιώς μέσα στη δήλωση ως αποδεικτικό.
 */

type Proposal = {
  documentId: string
  EventProposalTitle: string
  ProposalDescription?: string
  EventLocation?: string
  TimeSlot?: string
  TypeOfEvent?: string
  ProposalCost?: number | null
  ProposalDuration?: string
  ProposalLink?: string
  ProposalNotes: string
  Status: Status
  SubmittedAt?: string
  ProposerName?: string
  ProposerEmail?: string
  image?: string | null
  event?: { Title: string; Slug: string } | null
  registrationId?: string | null
}
type Status = 'new' | 'shortlisted' | 'accepted' | 'declined'

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'

/**
 * Οι στήλες της εξαγωγής, με τη σειρά που βγαίνουν.
 *
 * Η ΠΕΡΙΓΡΑΦΗ μπαίνει ΟΛΟΚΛΗΡΗ: το κουτί τη δείχνει κομμένη για να χωρέσει,
 * αλλά όποιος κατεβάζει το αρχείο το κάνει ακριβώς για να τη διαβάσει.
 * Οι αλλαγές γραμμής γίνονται κενά — το «;»-CSV με εισαγωγικά τις αντέχει,
 * αλλά μια πολυγραμμική τιμή καταστρέφει κάθε γρήγορη ματιά σε φύλλο.
 */
export const PROPOSAL_EXPORT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'title', label: 'Τίτλος' },
  { key: 'status', label: 'Κατάσταση' },
  { key: 'proposer', label: 'Πρότεινε' },
  { key: 'email', label: 'Email' },
  { key: 'event', label: 'Δράση' },
  { key: 'type', label: 'Είδος' },
  { key: 'timeSlot', label: 'Χρονικό πλαίσιο' },
  { key: 'location', label: 'Τόπος' },
  { key: 'duration', label: 'Διάρκεια' },
  { key: 'cost', label: 'Κόστος (€)' },
  { key: 'link', label: 'Σύνδεσμος' },
  { key: 'description', label: 'Περιγραφή' },
  { key: 'notes', label: 'Σημειώσεις ΟΣ' },
  { key: 'submitted', label: 'Υποβλήθηκε' },
]

const flat = (v: unknown): string => String(v ?? '').replace(/\s*\n+\s*/g, ' ').trim()

export function proposalCellValue(p: any, key: string): string {
  switch (key) {
    case 'title': return flat(p.EventProposalTitle)
    case 'status': return STATUS_META[p.Status as Status]?.label || String(p.Status || '')
    case 'proposer': return flat(p.ProposerName)
    case 'email': return flat(p.ProposerEmail)
    case 'event': return flat(p.event?.Title)
    case 'type': return flat(p.TypeOfEvent)
    case 'timeSlot': return flat(p.TimeSlot)
    case 'location': return flat(p.EventLocation)
    case 'duration': return flat(p.ProposalDuration)
    // Το 0 είναι ΤΙΜΗ (δωρεάν δράση), όχι κενό — γι' αυτό έλεγχος σε null
    case 'cost': return p.ProposalCost === null || p.ProposalCost === undefined
      ? '' : String(p.ProposalCost)
    case 'link': return flat(p.ProposalLink)
    case 'description': return flat(p.ProposalDescription)
    case 'notes': return flat(p.ProposalNotes)
    case 'submitted': return p.SubmittedAt ? grDate(String(p.SubmittedAt)) : ''
    default: return ''
  }
}

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  new: { label: 'Νέα', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
  shortlisted: { label: 'Shortlisted', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100' },
  accepted: { label: 'Δεκτή', cls: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
  declined: { label: 'Δεν επιλέχθηκε', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}
const ORDER: Status[] = ['new', 'shortlisted', 'accepted', 'declined']

export default function OcEventProposals({ canManageRequests = false }: { canManageRequests?: boolean }) {
  const [tab, setTab] = useState<'proposals' | 'requests'>('proposals')
  const [rows, setRows] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/oc/event-proposals', { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (alive) setRows(j.proposals || [])
      })
      .catch(err => { if (alive) setError(err?.message || 'Κάτι πήγε στραβά') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, new: 0, shortlisted: 0, accepted: 0, declined: 0 }
    for (const r of rows) c[r.Status] = (c[r.Status] || 0) + 1
    return c
  }, [rows])

  const shown = filter === 'all' ? rows : rows.filter(r => r.Status === filter)

  /** Εξάγει ΟΣΕΣ δείχνει το φίλτρο — «Νέα» σημαίνει αρχείο μόνο με τις νέες */
  function exportCsv() {
    const csv = buildCsv(shown, PROPOSAL_EXPORT_COLUMNS.map(c => ({
      header: c.label, value: (p: Proposal) => proposalCellValue(p, c.key),
    })))
    const tag = filter === 'all' ? 'ολες' : STATUS_META[filter as Status].label.toLowerCase()
    downloadCsv(csv, datedFilename(`CforC-προτάσεις-δράσεων-${tag}`))
  }

  /** Η αλλαγή φαίνεται ΑΜΕΣΩΣ και επαναφέρεται αν αποτύχει — όχι σιωπηλά */
  async function save(id: string, patch: { Status?: Status; ProposalNotes?: string }) {
    const before = rows
    setRows(rs => rs.map(r => (r.documentId === id ? { ...r, ...patch } : r)))
    setBusy(id); setError(null)
    try {
      const res = await fetch('/api/oc/event-proposals', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error || 'Η αλλαγή δεν αποθηκεύτηκε')
    } catch (e: any) {
      setRows(before)
      setError(e?.message || 'Η αλλαγή δεν αποθηκεύτηκε')
    } finally { setBusy(null) }
  }

  return (
    <div className={CARD}>
      {/* ΔΥΟ ΚΑΡΤΕΛΕΣ, ΕΝΑ ΚΟΥΤΙ: και οι δύο είναι «κάτι που έστειλε άνθρωπος
          απ' έξω και περιμένει απάντηση». Οι Προτάσεις γεννιούνται μέσα στις
          δηλώσεις, τα Αιτήματα από το feedback widget του ιστότοπου. */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {([['proposals', 'Προτάσεις δράσεων'], ['requests', 'Αιτήματα ιστότοπου']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              tab === k ? 'bg-coral text-charcoal'
                : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' ? <OcSiteRequests canManage={canManageRequests} /> : (<>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-4">
        <h3 className={EYEBROW}>ΠΡΟΤΑΣΕΙΣ ΔΡΑΣΕΩΝ</h3>
        {!loading && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {rows.length} {rows.length === 1 ? 'πρόταση' : 'προτάσεις'}
          </span>
        )}
        {!loading && rows.length > 0 && (
          <button type="button" onClick={exportCsv}
            title="Κατέβασε τις προτάσεις του φίλτρου σε CSV"
            className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral">
            Εξαγωγή CSV
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Φορτώνει…</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>}

      {!loading && (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {(['all', ...ORDER] as const).map(k => (
              <button key={k} type="button" onClick={() => setFilter(k as any)}
                aria-pressed={filter === k}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  filter === k
                    ? 'bg-coral text-charcoal'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'}`}>
                {k === 'all' ? 'Όλες' : STATUS_META[k as Status].label}
                <span className="ml-1.5 tabular-nums opacity-70">{counts[k] ?? 0}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rows.length === 0
                ? 'Καμία πρόταση ακόμη. Θα εμφανιστούν εδώ μόλις τις υποβάλουν μέσα από τη φόρμα δήλωσης.'
                : 'Καμία πρόταση σε αυτό το φίλτρο.'}
            </p>
          ) : (
            <div className="grid gap-2">
              {shown.map(p => (
                <div key={p.documentId}
                  className="rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <button type="button"
                    onClick={() => setOpen(open === p.documentId ? null : p.documentId)}
                    aria-expanded={open === p.documentId}
                    className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="font-bold text-charcoal dark:text-gray-100">{p.EventProposalTitle}</span>
                    {p.ProposerName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{p.ProposerName}</span>
                    )}
                    {p.event && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">· {p.event.Title}</span>
                    )}
                    <span className="ml-auto flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${STATUS_META[p.Status].cls}`}>
                        {STATUS_META[p.Status].label}
                      </span>
                      <span aria-hidden="true" className={`transition-transform ${open === p.documentId ? 'rotate-180' : ''}`}>▾</span>
                    </span>
                  </button>

                  {open === p.documentId && (
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                      <div className="grid gap-2 text-sm min-w-0">
                        {/* Καθαρισμένο ΔΥΟ φορές πριν φτάσει εδώ — στην εγγραφή
                            και στην ανάγνωση — με τον ίδιο καθαριστή που
                            φυλάει τα γράμματα. */}
                        {p.ProposalDescription && (
                          <div className="mb-1 rounded-xl bg-gray-50 dark:bg-gray-900/40 px-3 py-2
                            text-charcoal dark:text-gray-200 [&_a]:text-coral [&_a]:underline
                            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                            dangerouslySetInnerHTML={{ __html: p.ProposalDescription }} />
                        )}
                        <Row label="Πού" value={p.EventLocation} />
                        <Row label="Πότε" value={p.TimeSlot} />
                        <Row label="Είδος" value={p.TypeOfEvent} />
                        <Row label="Διάρκεια" value={p.ProposalDuration} />
                        <Row label="Κόστος" value={
                          p.ProposalCost == null ? '—' : `${String(p.ProposalCost).replace('.', ',')} €`} />
                        <Row label="Υποβλήθηκε" value={p.SubmittedAt ? grDate(p.SubmittedAt.slice(0, 10)) : undefined} />
                        <Row label="Επικοινωνία" value={p.ProposerEmail} />
                        {p.ProposalLink && (
                          <p className="flex gap-2">
                            <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Σύνδεσμος</span>
                            <a href={p.ProposalLink} target="_blank" rel="noopener noreferrer"
                              className="text-coral dark:text-coral-light hover:underline truncate">
                              {p.ProposalLink} ↗
                            </a>
                          </p>
                        )}
                        {/* Από την πρόταση πίσω στο αποδεικτικό */}
                        {p.registrationId && p.event && (
                          <p className="flex gap-2">
                            <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Η δήλωση</span>
                            <span className="text-gray-600 dark:text-gray-300 break-all notranslate">
                              {p.event.Title} — {p.registrationId}
                            </span>
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                          {ORDER.map(st => (
                            <button key={st} type="button" disabled={busy === p.documentId}
                              onClick={() => save(p.documentId, { Status: st })}
                              aria-pressed={p.Status === st}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 transition-colors ${
                                p.Status === st
                                  ? STATUS_META[st].cls
                                  : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'}`}>
                              {STATUS_META[st].label}
                            </button>
                          ))}
                        </div>

                        <label className="mt-2 block">
                          <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            ΣΗΜΕΙΩΣΕΙΣ ΤΗΣ ΟΣ
                          </span>
                          <textarea rows={2} defaultValue={p.ProposalNotes}
                            onBlur={e => {
                              if (e.target.value !== p.ProposalNotes) {
                                save(p.documentId, { ProposalNotes: e.target.value })
                              }
                            }}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-charcoal dark:text-gray-100" />
                        </label>
                      </div>

                      {p.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.image} alt={`Εικόνα για «${p.EventProposalTitle}»`}
                          className="max-h-48 rounded-xl border border-gray-200 dark:border-gray-600 justify-self-start" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      </>)}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="flex gap-2">
      <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-charcoal dark:text-gray-200 min-w-0">{value || '—'}</span>
    </p>
  )
}
