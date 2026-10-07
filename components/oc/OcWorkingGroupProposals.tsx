'use client'

/**
 * ΠΡΟΤΑΣΕΙΣ ΝΕΩΝ ΟΜΑΔΩΝ ΕΡΓΑΣΙΑΣ — ό,τι έστειλε μέλος από τη φόρμα του site.
 *
 * Ίδια γλώσσα με τα «Αιτήματα ιστότοπου» (φίλτρα-chips, άνοιγμα γραμμής,
 * αρχείο, εξαγωγή με τον κοινό επιλογέα στηλών) γιατί είναι το ίδιο είδος
 * δουλειάς. Η διαφορά είναι ΠΟΙΟΣ αποφασίζει: εδώ Συντονισμός, Κοινότητα
 * και IT — μια ομάδα εργασίας είναι απόφαση δικτύου, όχι τεχνική εκκρεμότητα.
 */

import { useEffect, useMemo, useState } from 'react'
import { grDate } from '@/lib/events'
import { buildCsv, downloadCsv, datedFilename } from '@/lib/csv'
import OcCsvPicker from '@/components/oc/OcCsvPicker'
import {
  PROPOSAL_STATUSES, PROPOSAL_STATUS_LABELS, canArchive, type ProposalStatus,
} from '@/lib/workingGroupProposals'

type Proposal = {
  documentId: string
  Title: string
  Theme: string
  Goal: string
  MoreInfo?: string | null
  ContactPerson: string
  ProposerName: string
  ProposerEmail: string
  Phone: string
  Facebook?: string | null
  Links?: string[] | null
  MemberAm?: number | null
  Status: ProposalStatus
  Notes?: string | null
  Archived?: boolean
  ArchivedAt?: string | null
  DecidedAt?: string | null
  SubmittedAt?: string | null
  createdAt?: string
}

const STATUS_CLS: Record<ProposalStatus, string> = {
  'new': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'under-review': 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
  'approved': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  'rejected': 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const CHIP = 'px-4 py-1.5 rounded-full text-xs font-bold transition-colors'
const GHOST = 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'

export default function OcWorkingGroupProposals() {
  const [rows, setRows] = useState<Proposal[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [filter, setFilter] = useState<ProposalStatus | 'all' | 'archived'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState<string>('')
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/oc/working-group-proposals', { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (!alive) return
        setRows(j.proposals || [])
        setCanManage(!!j.canManage)
        setUnavailable(!!j.unavailable)
      })
      .catch(err => { if (alive) setError(err?.message || 'Κάτι πήγε στραβά') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Το αρχείο δεν μετράει στις κανονικές καρτέλες: μια κριθείσα πρόταση που
  // αρχειοθετήθηκε θα φαινόταν δύο φορές.
  const live = rows.filter(r => !r.Archived)
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: live.length, archived: rows.filter(r => r.Archived).length,
    }
    for (const s of PROPOSAL_STATUSES) c[s] = 0
    for (const r of live) c[r.Status] = (c[r.Status] || 0) + 1
    return c
  }, [rows, live])

  const shown = filter === 'archived' ? rows.filter(r => r.Archived)
    : filter === 'all' ? live
      : live.filter(r => r.Status === filter)

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    setBusy(id); setError(null); setNote(null)
    const before = rows
    try {
      const res = await fetch('/api/oc/working-group-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: id, ...body }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) { setRows(before); setError(j?.error || 'Αποτυχία'); return }
      setRows(rs => rs.map(r => (r.documentId === id ? { ...r, ...(j.proposal || {}) } : r)))
      setNote(okMsg)
    } catch {
      setRows(before); setError('Δεν ολοκληρώθηκε η κλήση')
    } finally {
      setBusy(null)
    }
  }

  const EXPORT_COLUMNS = [
    { key: 'date', label: 'Ημερομηνία' },
    { key: 'status', label: 'Κατάσταση' },
    { key: 'archived', label: 'Αρχειοθετημένη' },
    { key: 'title', label: 'Τίτλος' },
    { key: 'theme', label: 'Θεματική' },
    { key: 'goal', label: 'Στόχος' },
    { key: 'moreInfo', label: 'Περισσότερα' },
    { key: 'contact', label: 'Άτομο επικοινωνίας' },
    { key: 'proposer', label: 'Προτείνων/ουσα' },
    { key: 'am', label: 'ΑΜ' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Τηλέφωνο' },
    { key: 'links', label: 'Σύνδεσμοι' },
    { key: 'notes', label: 'Σημειώσεις' },
  ]

  const cellValue = (r: Proposal, key: string): string => {
    const flat = (v: unknown) => String(v ?? '').replace(/\s*\n+\s*/g, ' ').trim()
    switch (key) {
      case 'date': return r.SubmittedAt || r.createdAt ? grDate(String(r.SubmittedAt || r.createdAt)) : ''
      case 'status': return PROPOSAL_STATUS_LABELS[r.Status] || r.Status
      case 'archived': return r.Archived ? 'Ναι' : 'Όχι'
      case 'title': return flat(r.Title)
      case 'theme': return flat(r.Theme)
      case 'goal': return flat(r.Goal)
      case 'moreInfo': return flat(r.MoreInfo)
      case 'contact': return flat(r.ContactPerson)
      case 'proposer': return flat(r.ProposerName)
      case 'am': return r.MemberAm ? String(r.MemberAm) : ''
      case 'email': return flat(r.ProposerEmail)
      case 'phone': return flat(r.Phone)
      case 'links': return [r.Facebook, ...(r.Links || [])].filter(Boolean).join(' · ')
      case 'notes': return flat(r.Notes)
      default: return ''
    }
  }

  function exportCsv(keys: string[]) {
    const label = Object.fromEntries(EXPORT_COLUMNS.map(c => [c.key, c.label]))
    const csv = buildCsv(shown, keys.map(k => ({
      header: label[k] || k, value: (r: Proposal) => cellValue(r, k),
    })))
    downloadCsv(csv, datedFilename('CforC-προτάσεις-ομάδων'))
  }

  if (loading) return <p className="text-sm text-gray-500">Φορτώνει…</p>

  if (unavailable) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-5">
        <p className="text-sm font-bold text-charcoal dark:text-gray-100 mb-1">Η συλλογή δεν είναι ακόμη διαθέσιμη</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ο τύπος «Working Group Proposal» πρέπει να δημιουργηθεί στο Strapi Cloud και να του
          δοθούν δικαιώματα. Μέχρι τότε οι προτάσεις φτάνουν κανονικά με email στο hello@ και it@.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([['all', 'Όλες'], ...PROPOSAL_STATUSES.map(s => [s, PROPOSAL_STATUS_LABELS[s]] as const),
          ['archived', 'Αρχείο']] as Array<readonly [string, string]>).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k as any)}
            aria-pressed={filter === k}
            className={`${CHIP} ${filter === k ? 'bg-coral text-charcoal' : GHOST}`}>
            {label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[k] ?? 0}</span>
          </button>
        ))}
        {shown.length > 0 && (
          <button type="button" onClick={() => setExportOpen(true)}
            className={`ml-auto text-xs font-bold px-3 py-1.5 rounded-full ${GHOST}`}>
            Εξαγωγή CSV
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>}
      {note && <p className="text-sm text-green-700 dark:text-green-300 mb-3">{note}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filter === 'archived' ? 'Καμία αρχειοθετημένη πρόταση.' : 'Καμία πρόταση σε αυτό το φίλτρο.'}
        </p>
      ) : (
        <div className="grid gap-2 min-w-0">
          {shown.map(r => {
            const when = r.SubmittedAt || r.createdAt
            const isOpen = open === r.documentId
            const links = [...(r.Facebook ? [r.Facebook] : []), ...(r.Links || [])]
            return (
              <div key={r.documentId} className="rounded-2xl border border-gray-200 dark:border-gray-600 min-w-0">
                <button type="button"
                  onClick={() => { setOpen(isOpen ? null : r.documentId); setDraftNote(r.Notes || '') }}
                  aria-expanded={isOpen}
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-t-2xl">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[r.Status]}`}>
                    {PROPOSAL_STATUS_LABELS[r.Status]}
                  </span>
                  <span className="font-medium text-charcoal dark:text-gray-100">{r.Title}</span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {r.ProposerName}
                    {when && <span className="tabular-nums">{grDate(String(when))}</span>}
                    <span aria-hidden="true" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200 dark:border-gray-600 p-4 space-y-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">Θεματική</p>
                        <p className="text-charcoal dark:text-gray-200 whitespace-pre-line">{r.Theme}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">Στόχος</p>
                        <p className="text-charcoal dark:text-gray-200 whitespace-pre-line">{r.Goal}</p>
                      </div>
                      {r.MoreInfo && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">Μοιράστηκε επιπλέον</p>
                          <p className="text-charcoal dark:text-gray-200 whitespace-pre-line">{r.MoreInfo}</p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <p>Άτομο επικοινωνίας: <span className="text-charcoal dark:text-gray-200">{r.ContactPerson}</span></p>
                      <p>
                        Προτείνων/ουσα: <span className="text-charcoal dark:text-gray-200">{r.ProposerName}</span>
                        {r.MemberAm ? <span className="notranslate"> · ΑΜ {r.MemberAm}</span> : null}
                      </p>
                      <p>
                        <a href={`mailto:${r.ProposerEmail}`} className="text-coral hover:underline">{r.ProposerEmail}</a>
                        {' · '}
                        <a href={`tel:${String(r.Phone).replace(/\s+/g, '')}`} className="text-coral hover:underline">{r.Phone}</a>
                      </p>
                      {links.length > 0 && (
                        <p className="break-all">
                          {links.length === 1 ? 'Σύνδεσμος: ' : 'Σύνδεσμοι: '}
                          {links.map((l, i) => (
                            <span key={l}>
                              {i > 0 && ' · '}
                              <a href={l} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">{l}</a>
                            </span>
                          ))}
                        </p>
                      )}
                      {r.DecidedAt && <p>Κρίθηκε: {grDate(String(r.DecidedAt))}</p>}
                      {r.ArchivedAt && <p>Αρχειοθετήθηκε: {grDate(String(r.ArchivedAt))}</p>}
                    </div>

                    {canManage ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {PROPOSAL_STATUSES.map(s => (
                            <button key={s} type="button" disabled={busy === r.documentId || r.Status === s}
                              onClick={() => patch(r.documentId, { status: s }, `Κατάσταση: ${PROPOSAL_STATUS_LABELS[s]}`)}
                              className={`${CHIP} ${r.Status === s ? 'bg-coral text-charcoal' : GHOST} disabled:opacity-50`}>
                              {PROPOSAL_STATUS_LABELS[s]}
                            </button>
                          ))}
                          {r.Archived ? (
                            <button type="button" disabled={busy === r.documentId}
                              onClick={() => patch(r.documentId, { archived: false }, 'Βγήκε από το αρχείο')}
                              className={`${CHIP} ${GHOST} disabled:opacity-50`}>
                              Επαναφορά
                            </button>
                          ) : (
                            <button type="button" disabled={busy === r.documentId || !canArchive(r.Status)}
                              title={canArchive(r.Status) ? 'Αρχειοθέτηση' : 'Αρχειοθετείται μόνο πρόταση που κρίθηκε'}
                              onClick={() => patch(r.documentId, { archived: true }, 'Αρχειοθετήθηκε')}
                              className={`${CHIP} ${GHOST} disabled:opacity-40`}>
                              Αρχειοθέτηση
                            </button>
                          )}
                        </div>

                        <div>
                          <label htmlFor={`note-${r.documentId}`} className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Σημειώσεις ΔΣ
                          </label>
                          <textarea id={`note-${r.documentId}`} rows={2} value={draftNote}
                            onChange={e => setDraftNote(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-charcoal dark:text-gray-100" />
                          <button type="button" disabled={busy === r.documentId || draftNote === (r.Notes || '')}
                            onClick={() => patch(r.documentId, { notes: draftNote }, 'Η σημείωση αποθηκεύτηκε')}
                            className={`${CHIP} ${GHOST} mt-2 disabled:opacity-40`}>
                            Αποθήκευση σημείωσης
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Η απόφαση ΔΕΝ στέλνει αυτόματο email — η απάντηση σε πρόταση ομάδας γράφεται από άνθρωπο.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Την πρόταση κρίνουν Συντονισμός, Κοινότητα ή IT.
                        {r.Notes && <span className="block mt-1">Σημειώσεις: {r.Notes}</span>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {exportOpen && (
        <OcCsvPicker
          isOpen onClose={() => setExportOpen(false)}
          title="Εξαγωγή προτάσεων"
          columns={EXPORT_COLUMNS}
          defaultKeys={['date', 'status', 'title', 'theme', 'goal', 'proposer', 'email']}
          storageKey="oc-export-wg-proposals"
          rowCount={shown.length} rowNoun={['πρόταση', 'προτάσεις']}
          scopeNote="Εξάγονται όσες δείχνουν τα φίλτρα που έχεις επιλέξει."
          onDownload={exportCsv}
        />
      )}
    </div>
  )
}
