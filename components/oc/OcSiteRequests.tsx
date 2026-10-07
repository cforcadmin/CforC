'use client'

import { useEffect, useMemo, useState } from 'react'
import { grDate } from '@/lib/events'
import { buildCsv, downloadCsv, datedFilename } from '@/lib/csv'
import OcCsvPicker from '@/components/oc/OcCsvPicker'
import {
  REQUEST_STATUSES, REQUEST_STATUS_LABELS, canArchive, requestPreview,
  REQUEST_KIND_LABELS, REQUEST_CATEGORY_LABELS, REQUEST_CATEGORIES,
  type RequestStatus, type RequestKind, type RequestCategory,
} from '@/lib/siteRequests'

/**
 * ΑΙΤΗΜΑΤΑ ΑΠΟ ΤΟΝ ΙΣΤΟΤΟΠΟ — η καρτέλα δίπλα στις Προτάσεις δράσεων.
 *
 * Μοιράζονται κουτί γιατί είναι το ίδιο είδος δουλειάς: κάτι που έστειλε
 * άνθρωπος απ' έξω και περιμένει απάντηση. Αλλάζουν ΜΟΝΟ από το IT· όλο το
 * ΔΣ τα βλέπει, γιατί αίτημα που δεν το βλέπει κανείς είναι αίτημα που
 * χάνεται.
 */

type Req = {
  documentId: string
  Message: string
  SenderName?: string | null
  SenderEmail?: string | null
  PageUrl?: string | null
  Source: 'feedback' | 'contact'
  Kind?: RequestKind
  Category?: RequestCategory
  Status: RequestStatus
  Notes?: string | null
  Archived?: boolean
  ArchivedAt?: string | null
  CompletedAt?: string | null
  NotifiedAt?: string | null
  SubmittedAt?: string | null
  createdAt?: string
}

const STATUS_CLS: Record<RequestStatus, string> = {
  'not-started': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'in-progress': 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
  'completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
}

const CHIP = 'px-4 py-1.5 rounded-full text-xs font-bold transition-colors'

export default function OcSiteRequests({ canManage = false }: { canManage?: boolean }) {
  const [rows, setRows] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [filter, setFilter] = useState<RequestStatus | 'all' | 'archived'>('all')
  const [cat, setCat] = useState<RequestCategory | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/oc/site-requests', { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (!alive) return
        setRows(j.requests || [])
        setUnavailable(!!j.unavailable)
      })
      .catch(err => { if (alive) setError(err?.message || 'Κάτι πήγε στραβά') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Το αρχείο ΔΕΝ μετράει στις κανονικές καρτέλες: αλλιώς ένα «Ολοκληρώθηκε»
  // που αρχειοθετήθηκε θα φαινόταν δύο φορές.
  const live = rows.filter(r => !r.Archived)
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: live.length, 'not-started': 0, 'in-progress': 0, 'completed': 0,
      archived: rows.filter(r => r.Archived).length,
    }
    for (const r of live) c[r.Status] = (c[r.Status] || 0) + 1
    return c
  }, [rows, live])

  const byStatus = filter === 'archived' ? rows.filter(r => r.Archived)
    : filter === 'all' ? live
      : live.filter(r => r.Status === filter)
  const shown = cat === 'all' ? byStatus : byStatus.filter(r => r.Category === cat)

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    setBusy(id); setError(null); setNote(null)
    const before = rows
    try {
      const res = await fetch('/api/oc/site-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: id, ...body }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) { setRows(before); setError(j?.error || 'Αποτυχία'); return }
      setRows(rs => rs.map(r => (r.documentId === id ? { ...r, ...(j.request || {}) } : r)))
      setNote(j.notified ? `${okMsg} · στάλθηκε ειδοποίηση στον αποστολέα` : okMsg)
    } catch {
      setRows(before); setError('Δεν ολοκληρώθηκε η κλήση')
    } finally {
      setBusy(null)
    }
  }

  /** Μία πηγή για τις στήλες: ίδιες ετικέτες στο παράθυρο και στο αρχείο */
  const EXPORT_COLUMNS = [
    { key: 'date', label: 'Ημερομηνία' },
    { key: 'status', label: 'Κατάσταση' },
    { key: 'kind', label: 'Είδος' },
    { key: 'category', label: 'Αφορά' },
    { key: 'archived', label: 'Αρχειοθετημένο' },
    { key: 'sender', label: 'Από' },
    { key: 'email', label: 'Email' },
    { key: 'page', label: 'Σελίδα' },
    { key: 'message', label: 'Μήνυμα', hint: '(ολόκληρο)' },
    { key: 'notes', label: 'Σημειώσεις' },
  ]

  const cellValue = (r: Req, key: string): string => {
    const flat = (v: unknown) => String(v ?? '').replace(/\s*\n+\s*/g, ' ').trim()
    switch (key) {
      case 'date': return r.SubmittedAt || r.createdAt ? grDate(String(r.SubmittedAt || r.createdAt)) : ''
      case 'status': return REQUEST_STATUS_LABELS[r.Status] || r.Status
      case 'kind': return r.Kind ? REQUEST_KIND_LABELS[r.Kind] : ''
      case 'category': return r.Category ? REQUEST_CATEGORY_LABELS[r.Category] : ''
      case 'archived': return r.Archived ? 'Ναι' : 'Όχι'
      case 'sender': return flat(r.SenderName)
      case 'email': return flat(r.SenderEmail)
      case 'page': return flat(r.PageUrl)
      case 'message': return flat(r.Message)
      case 'notes': return flat(r.Notes)
      default: return ''
    }
  }

  function exportCsv(keys: string[]) {
    const label = Object.fromEntries(EXPORT_COLUMNS.map(c => [c.key, c.label]))
    const csv = buildCsv(shown, keys.map(k => ({
      header: label[k] || k, value: (r: Req) => cellValue(r, k),
    })))
    downloadCsv(csv, datedFilename('CforC-αιτήματα-ιστότοπου'))
  }

  if (loading) return <p className="text-sm text-gray-500">Φορτώνει…</p>

  if (unavailable) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-5">
        <p className="text-sm font-bold text-charcoal dark:text-gray-100 mb-1">Η συλλογή δεν είναι ακόμη διαθέσιμη</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ο τύπος «Site Request» πρέπει να δημιουργηθεί στο Strapi Cloud και να του δοθούν
          δικαιώματα. Μέχρι τότε τα αιτήματα φτάνουν κανονικά με email στο it@.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([['all', 'Όλα'], ...REQUEST_STATUSES.map(s => [s, REQUEST_STATUS_LABELS[s]] as const),
          ['archived', 'Αρχείο']] as Array<readonly [string, string]>).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k as any)}
            aria-pressed={filter === k}
            className={`${CHIP} ${filter === k
              ? 'bg-coral text-charcoal'
              : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'}`}>
            {label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[k] ?? 0}</span>
          </button>
        ))}
        {shown.length > 0 && (
          <button type="button" onClick={() => setExportOpen(true)}
            className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral">
            Εξαγωγή CSV
          </button>
        )}
      </div>

      {/* Δεύτερος άξονας: η κατηγορία φιλτράρει ΜΕΣΑ στην καρτέλα που βλέπεις */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Αφορά:</span>
        <button type="button" onClick={() => setCat('all')}
          className={`${CHIP} ${cat === 'all' ? 'bg-charcoal text-white dark:bg-gray-600'
            : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'}`}>
          Όλες
        </button>
        {REQUEST_CATEGORIES.filter(c => rows.some(r => r.Category === c)).map(c => (
          <button key={c} type="button" onClick={() => setCat(c)}
            className={`${CHIP} ${cat === c ? 'bg-charcoal text-white dark:bg-gray-600'
              : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'}`}>
            {REQUEST_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>}
      {note && <p className="text-sm text-green-700 dark:text-green-300 mb-3">{note}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filter === 'archived' ? 'Κανένα αρχειοθετημένο αίτημα.' : 'Κανένα αίτημα σε αυτό το φίλτρο.'}
        </p>
      ) : (
        <div className="grid gap-2 min-w-0">
          {shown.map(r => {
            const when = r.SubmittedAt || r.createdAt
            return (
              <div key={r.documentId}
                className="rounded-2xl border border-gray-200 dark:border-gray-600 min-w-0">
                <button type="button"
                  onClick={() => setOpen(open === r.documentId ? null : r.documentId)}
                  aria-expanded={open === r.documentId}
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-t-2xl">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[r.Status]}`}>
                    {REQUEST_STATUS_LABELS[r.Status]}
                  </span>
                  {r.Kind && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {REQUEST_KIND_LABELS[r.Kind]}
                    </span>
                  )}
                  {r.Category && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                      {REQUEST_CATEGORY_LABELS[r.Category]}
                    </span>
                  )}
                  <span className="text-charcoal dark:text-gray-100">{requestPreview(r.Message)}</span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {r.SenderName || 'Ανώνυμος'}
                    {when && <span className="tabular-nums">{grDate(String(when))}</span>}
                    <span aria-hidden="true" className={`transition-transform ${open === r.documentId ? 'rotate-180' : ''}`}>▾</span>
                  </span>
                </button>

                {open === r.documentId && (
                  <div className="border-t border-gray-200 dark:border-gray-600 p-4 space-y-3">
                    <p className="text-sm text-charcoal dark:text-gray-200 whitespace-pre-line">{r.Message}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      {r.SenderEmail
                        ? <p>Email: <a href={`mailto:${r.SenderEmail}`} className="text-coral hover:underline">{r.SenderEmail}</a></p>
                        : <p>Χωρίς email — δεν στέλνεται ειδοποίηση ολοκλήρωσης.</p>}
                      {r.PageUrl && <p className="break-all">Σελίδα: {r.PageUrl}</p>}
                      {r.NotifiedAt && <p>Ειδοποιήθηκε: {grDate(String(r.NotifiedAt))}</p>}
                      {r.ArchivedAt && <p>Αρχειοθετήθηκε: {grDate(String(r.ArchivedAt))}</p>}
                    </div>

                    {canManage ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {REQUEST_STATUSES.map(s => (
                          <button key={s} type="button" disabled={busy === r.documentId || r.Status === s}
                            onClick={() => patch(r.documentId, { status: s }, `Κατάσταση: ${REQUEST_STATUS_LABELS[s]}`)}
                            className={`${CHIP} ${r.Status === s
                              ? 'bg-coral text-charcoal'
                              : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'} disabled:opacity-50`}>
                            {REQUEST_STATUS_LABELS[s]}
                          </button>
                        ))}
                        {r.Archived ? (
                          <button type="button" disabled={busy === r.documentId}
                            onClick={() => patch(r.documentId, { archived: false }, 'Βγήκε από το αρχείο')}
                            className={`${CHIP} border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral disabled:opacity-50`}>
                            Επαναφορά
                          </button>
                        ) : (
                          <button type="button" disabled={busy === r.documentId || !canArchive(r.Status)}
                            title={canArchive(r.Status) ? 'Αρχειοθέτηση' : 'Αρχειοθετείται μόνο ό,τι έχει ολοκληρωθεί'}
                            onClick={() => patch(r.documentId, { archived: true }, 'Αρχειοθετήθηκε')}
                            className={`${CHIP} border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral disabled:opacity-40`}>
                            Αρχειοθέτηση
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Οι καταστάσεις αλλάζουν από το IT.</p>
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
          title="Εξαγωγή αιτημάτων"
          columns={EXPORT_COLUMNS}
          defaultKeys={['date', 'status', 'kind', 'category', 'sender', 'message']}
          storageKey="oc-export-site-requests"
          rowCount={shown.length} rowNoun={['αίτημα', 'αιτήματα']}
          scopeNote="Εξάγονται όσα δείχνουν τα φίλτρα που έχεις επιλέξει."
          onDownload={exportCsv}
        />
      )}
    </div>
  )
}
