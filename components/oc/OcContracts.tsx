'use client'

// Μητρώο Συμβάσεων & Πληρωμών Συνεργατών — η ίδια γραμματική με το Μητρώο
// Μελών της Επισκόπησης: αναζήτηση, ταξινόμηση, επιλογέας στηλών, εξαγωγή,
// ανοιγόμενη γραμμή για τις λεπτομέρειες.
//
// Αυθεντία είναι το Strapi· κάθε αλλαγή γράφεται εκεί και μετά καθρεφτίζεται
// στο Google Sheet. Το ΑΦΜ και το IBAN εμφανίζονται κρυμμένα και ανοίγουν με
// κλικ — η καταχώριση γίνεται κανονικά, δεν μοιράζεται σε δύο συστήματα.

import { Fragment, useEffect, useMemo, useState } from 'react'
import { buildCsv, downloadCsv, datedFilename } from '@/lib/csv'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useColumnWidths } from '@/components/oc/useColumnWidths'

export interface Contract {
  documentId: string
  Aa: number | null
  Name: string
  Role: string | null
  Email: string | null
  Phone: string | null
  TaxId: string | null
  ContractType: string | null
  Project: string | null
  StartDate: string | null
  EndDate: string | null
  ContractStatus: string | null
  ContractFile: string | null
  ContractNotes: string | null
  Amount: number | null
  PaymentMethod: string | null
  PaymentFrequency: string | null
  PaymentSchedule: string | null
  NextPaymentDate: string | null
  NextPaymentStatus: string | null
  PaymentHistory: string | null
  BankIban: string | null
  PaymentStatus: string | null
  PaymentNotes: string | null
  ExpenseDocsLink: string | null
  ExpenseListLink: string | null
  Archived?: boolean | null
  SortIndex?: number | null
  CreatedByName?: string | null
  UpdatedByName?: string | null
}

type Col = {
  key: string
  label: string
  /** Πλάτος-υπόδειξη· το σύρσιμο έρχεται στη Μονάδα 4 */
  cls?: string
  value: (c: Contract) => string
  sort?: (c: Contract) => string | number
  /** Ευαίσθητο: εμφανίζεται κρυμμένο μέχρι να πατηθεί */
  secret?: boolean
}

const gr = (iso: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
const eur = (n: number | null) =>
  n === null || n === undefined ? '' : n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

/** Χρώμα κατάστασης — ίδια λογική με τα υπόλοιπα chips του OC */
function statusCls(v: string | null): string {
  const t = String(v || '').toUpperCase()
  if (t.includes('ΕΝΕΡΓ')) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
  if (t.includes('ΛΗΓΕΙ')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
  if (t.includes('ΛΗΞ')) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
}
function payCls(v: string | null): string {
  const t = String(v || '').toLowerCase()
  if (t.includes('πληρώθηκε')) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
  if (t.includes('έτοιμο')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
  if (t.includes('εκκρεμ')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
  if (t.includes('αναμον')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
}
/** Καθυστερημένη πληρωμή: κόκκινο, γιατί είναι η μόνη κατάσταση που ζητά ενέργεια σήμερα */
const lateCls = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'

const COLUMNS: Col[] = [
  { key: 'aa', label: 'Α/Α', value: c => (c.Aa === null ? '' : String(c.Aa)), sort: c => c.Aa ?? 9999 },
  { key: 'name', label: 'Ονοματεπώνυμο', value: c => c.Name || '', sort: c => c.Name || '' },
  { key: 'role', label: 'Ρόλος', value: c => c.Role || '', sort: c => c.Role || '' },
  { key: 'type', label: 'Τύπος σύμβασης', value: c => c.ContractType || '', sort: c => c.ContractType || '' },
  { key: 'project', label: 'Έργο', value: c => c.Project || '', sort: c => c.Project || '' },
  { key: 'start', label: 'Έναρξη', value: c => gr(c.StartDate), sort: c => c.StartDate || '' },
  { key: 'end', label: 'Λήξη', value: c => gr(c.EndDate), sort: c => c.EndDate || '' },
  { key: 'amount', label: 'Αμοιβή', value: c => eur(c.Amount), sort: c => c.Amount ?? -1 },
  { key: 'next', label: 'Επόμενη πληρωμή', value: c => gr(c.NextPaymentDate), sort: c => c.NextPaymentDate || '' },
  { key: 'cstatus', label: 'Κατάσταση σύμβασης', value: c => c.ContractStatus || '', sort: c => c.ContractStatus || '' },
  { key: 'pstatus', label: 'Status πληρωμής', value: c => c.PaymentStatus || '', sort: c => c.PaymentStatus || '' },
  { key: 'nextstatus', label: 'Status επόμενης πληρωμής', value: c => c.NextPaymentStatus || '', sort: c => c.NextPaymentStatus || '' },
  { key: 'freq', label: 'Συχνότητα', value: c => c.PaymentFrequency || '', sort: c => c.PaymentFrequency || '' },
  { key: 'method', label: 'Τρόπος πληρωμής', value: c => c.PaymentMethod || '', sort: c => c.PaymentMethod || '' },
  { key: 'email', label: 'Email', value: c => c.Email || '', sort: c => c.Email || '' },
  { key: 'phone', label: 'Τηλέφωνο', value: c => c.Phone || '', sort: c => c.Phone || '' },
  { key: 'taxid', label: 'ΑΦΜ', value: c => c.TaxId || '', sort: c => c.TaxId || '', secret: true },
  { key: 'iban', label: 'Τράπεζα & IBAN', value: c => c.BankIban || '', sort: c => c.BankIban || '', secret: true },
  { key: 'file', label: 'Αρχείο σύμβασης', value: c => c.ContractFile || '', sort: c => c.ContractFile || '' },
]

/** Στήλες με αριθμούς/ημερομηνίες: εκτός μετάφρασης */
const NUMERIC_COLS = new Set(['aa', 'amount', 'start', 'end', 'next'])

const DEFAULT_COLS = ['name', 'role', 'type', 'end', 'amount', 'next', 'cstatus', 'pstatus']
const COLS_KEY = 'oc-contracts-cols'

/** Κρυμμένο μέχρι να πατηθεί: «…7513» — η καταχώριση δεν επηρεάζεται */
function Secret({ value }: { value: string }) {
  const [open, setOpen] = useState(false)
  if (!value) return <span className="text-gray-300 dark:text-gray-600">—</span>
  const tail = value.replace(/\s+/g, '').slice(-4)
  return (
    <button type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      title={open ? 'Απόκρυψη' : 'Εμφάνιση'}
      className="notranslate text-left underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-coral">
      {open ? value : `••••${tail}`}
    </button>
  )
}

export default function OcContracts({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'aa', dir: 'asc' })
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS)
  const [showCols, setShowCols] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Contract | null>(null)
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const { width, ResizeHandle, resetWidths, hasCustom } = useColumnWidths('contracts')

  useEffect(() => {
    try {
      const s = localStorage.getItem(COLS_KEY)
      if (s) {
        const v = JSON.parse(s)
        if (Array.isArray(v) && v.length) setCols(v.filter((k: string) => COLUMNS.some(c => c.key === k)))
      }
    } catch { /* ιδιωτική περιήγηση */ }
  }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/oc/contracts${showArchived ? '?archived=1' : ''}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία φόρτωσης')
      setRows(d.contracts || [])
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία φόρτωσης')
    } finally { setLoading(false) }
  }
  useEffect(() => { if (open) load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, showArchived])

  const shown = useMemo(() => COLUMNS.filter(c => cols.includes(c.key)), [cols])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? rows.filter(c => [c.Name, c.Role, c.Project, c.ContractType, c.Email].some(v => String(v || '').toLowerCase().includes(q)))
      : rows
    const col = COLUMNS.find(c => c.key === sort.key)
    const get = col?.sort || (() => '')
    return [...filtered].sort((a, b) => {
      const va = get(a), vb = get(b)
      const n = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'el')
      return sort.dir === 'asc' ? n : -n
    })
  }, [rows, query, sort])

  function toggleCol(key: string) {
    setCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      try { localStorage.setItem(COLS_KEY, JSON.stringify(next)) } catch { /* ok */ }
      return next
    })
  }
  function toggleSort(key: string) {
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  async function save(payload: Record<string, any>, id?: string) {
    const res = await fetch('/api/oc/contracts', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id, ...payload } : payload),
    })
    const d = await res.json().catch(() => null)
    if (!res.ok) throw new Error(d?.error || 'Αποτυχία αποθήκευσης')
    setNotice(d?.mirror?.ok
      ? 'Αποθηκεύτηκε ✓ — το φύλλο ενημερώθηκε'
      : `Αποθηκεύτηκε στη βάση ✓ — το φύλλο ΔΕΝ ενημερώθηκε: ${d?.mirror?.error || 'άγνωστο σφάλμα'}`)
    await load()
  }

  async function setArchived(c: Contract, archived: boolean) {
    try { await save({ Archived: archived }, c.documentId) }
    catch (err: any) { setError(err?.message || 'Αποτυχία') }
  }

  function exportCsv() {
    // Τα ευαίσθητα δεν μπαίνουν από μόνα τους: εξάγεται ό,τι βλέπεις
    const columns = shown.map(c => ({ header: c.label, value: (r: Contract) => c.value(r) }))
    downloadCsv(buildCsv(list, columns), datedFilename('CforC-συμβάσεις'))
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left" aria-expanded={open}>
        <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Συνεργάτες &amp; Συμβάσεις</h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">μητρώο συμβάσεων και πληρωμών</span>
        {rows.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-coral/15 text-coral text-xs font-bold notranslate">{rows.length}</span>
        )}
        <span className={`ml-auto text-coral transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
      </button>

      {open && (
        <div className="mt-6">
          {notice && (
            <p className={`text-sm rounded-xl px-4 py-2.5 mb-4 ${
              notice.includes('ΔΕΝ')
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
                : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'}`}>
              {notice}
            </p>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

          {/* Χειριστήρια — ίδια σειρά με το Μητρώο Μελών */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <input
              type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Αναζήτηση σε όνομα, ρόλο, έργο…"
              className="h-9 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm text-charcoal dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-coral min-w-[16rem]"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400 notranslate">{list.length} από {rows.length}</span>

            <span className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                title="Οι συμβάσεις δεν διαγράφονται ποτέ — αρχειοθετούνται. Δείξε τες για να τις δεις ή να τις επαναφέρεις.">
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="accent-[#FF8B6A]" />
                Εμφάνιση αρχειοθετημένων
              </label>

              <div className="relative">
                <button type="button" onClick={() => setShowCols(v => !v)} aria-expanded={showCols}
                  className={`h-9 inline-flex items-center gap-2 px-4 text-sm font-medium rounded-full border bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 transition-colors ${
                    showCols ? 'border-coral ring-2 ring-coral/30' : 'border-gray-300 dark:border-gray-600 hover:border-coral'}`}>
                  Στήλες
                </button>
                {showCols && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowCols(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-full mt-2 z-40 w-72 menu-glass rounded-2xl border border-gray-200 dark:border-gray-600 p-4 max-h-[60vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ορατές στήλες</p>
                        <span className="flex gap-3">
                          <button type="button" onClick={() => { setCols(DEFAULT_COLS); try { localStorage.setItem(COLS_KEY, JSON.stringify(DEFAULT_COLS)) } catch { /* ok */ } }}
                            className="text-[11px] text-coral hover:underline">Προεπιλογή</button>
                          {hasCustom && (
                            <button type="button" onClick={resetWidths} className="text-[11px] text-coral hover:underline"
                              title="Επαναφορά των πλατών που έχεις σύρει">Πλάτη</button>
                          )}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {COLUMNS.map(c => (
                          <label key={c.key} className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200 cursor-pointer">
                            <input type="checkbox" checked={cols.includes(c.key)} onChange={() => toggleCol(c.key)} className="accent-[#FF8B6A]" />
                            {c.label}
                            {c.secret && <span className="text-[10px] text-gray-400">ευαίσθητο</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button type="button" onClick={exportCsv} title="Εξαγωγή σε αρχείο" aria-label="Εξαγωγή σε αρχείο"
                className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-coral hover:text-coral transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </button>

              {canEdit && (
                <button type="button" onClick={() => setCreating(true)}
                  className="h-9 px-5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90">
                  + Νέα σύμβαση
                </button>
              )}
            </span>
          </div>

          {loading ? (
            <p className="text-gray-400 py-6">Φόρτωση…</p>
          ) : list.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 py-6">Καμία σύμβαση.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: hasCustom ? 'fixed' : 'auto', minWidth: '100%' }}>
                <colgroup>
                  {shown.map(c => <col key={c.key} style={width(c.key) ? { width: `${width(c.key)}px` } : undefined} />)}
                  <col style={{ width: '2.5rem' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    {shown.map(c => (
                      <th key={c.key} className="relative py-2 pr-3 font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort(c.key)} className="hover:text-coral max-w-full truncate">
                          {c.label}
                          {sort.key === c.key && <span className="ml-1 text-[9px]" aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                        <ResizeHandle colKey={c.key} />
                      </th>
                    ))}
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {list.map(c => {
                    const isOpen = expanded.has(c.documentId)
                    const toggle = () => setExpanded(p => {
                      const n = new Set(p); n.has(c.documentId) ? n.delete(c.documentId) : n.add(c.documentId); return n
                    })
                    return (
                      <Fragment key={c.documentId}>
                        <tr onClick={toggle}
                          className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 ${c.Archived ? 'opacity-50' : ''}`}>
                          {shown.map(col => (
                            <td key={col.key} className="py-3 pr-3 text-charcoal dark:text-gray-200 align-top break-words">
                              {col.secret ? <Secret value={col.value(c)} />
                                : col.key === 'cstatus' && c.ContractStatus
                                  ? <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${statusCls(c.ContractStatus)}`}>{c.ContractStatus}</span>
                                  : col.key === 'pstatus' && c.PaymentStatus
                                    ? <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${payCls(c.PaymentStatus)}`}>{c.PaymentStatus}</span>
                                    : col.key === 'nextstatus' && c.NextPaymentStatus
                                      ? <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${String(c.NextPaymentStatus).includes('ΚΑΘΥΣΤΕΡ') ? lateCls : payCls(c.NextPaymentStatus)}`}>{c.NextPaymentStatus}</span>
                                      : <span className={NUMERIC_COLS.has(col.key) ? 'notranslate' : ''}>
                                          {col.value(c) || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </span>}
                            </td>
                          ))}
                          <td className="py-3 text-right whitespace-nowrap">
                            <span className="text-coral text-xs select-none" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
                            <span className="sr-only">{isOpen ? 'Απόκρυψη λεπτομερειών' : 'Εμφάνιση λεπτομερειών'}</span>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/20">
                            <td colSpan={shown.length + 1} className="px-4 py-4 text-sm">
                              <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
                                <Detail label="Έργο" value={c.Project} />
                                <Detail label="Διάρκεια" value={`${gr(c.StartDate) || '—'} → ${gr(c.EndDate) || '—'}`} />
                                <Detail label="Email" value={c.Email} />
                                <Detail label="Τηλέφωνο" value={c.Phone} />
                                <DetailSecret label="ΑΦΜ" value={c.TaxId} />
                                <DetailSecret label="Τράπεζα & IBAN" value={c.BankIban} />
                                <Detail label="Τρόπος πληρωμής" value={c.PaymentMethod} />
                                <Detail label="Συχνότητα" value={c.PaymentFrequency} />
                                <Detail label="Πρόγραμμα πληρωμών" value={c.PaymentSchedule} pre />
                                <Detail label="Ιστορικό πληρωμών" value={c.PaymentHistory} pre />
                                <Detail label="Αρχείο σύμβασης" value={c.ContractFile} />
                                <Detail label="Σημειώσεις σύμβασης" value={c.ContractNotes} pre />
                                <Detail label="Σχόλια πληρωμών" value={c.PaymentNotes} pre />
                                <Detail label="Καταχώριση" value={[c.CreatedByName, c.UpdatedByName && `· ενημέρωση: ${c.UpdatedByName}`].filter(Boolean).join(' ')} />
                              </div>
                              {canEdit && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                  <button type="button" onClick={() => setEditing(c)}
                                    className="px-4 py-1.5 rounded-full bg-coral text-white text-xs font-bold hover:bg-coral/90">Επεξεργασία</button>
                                  <button type="button" onClick={() => setArchived(c, !c.Archived)}
                                    className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-xs text-charcoal dark:text-gray-200 hover:border-coral">
                                    {c.Archived ? 'Επαναφορά' : 'Αρχειοθέτηση'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(creating || editing) && (
        <ContractForm
          contract={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={async payload => { await save(payload, editing?.documentId); setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function Detail({ label, value, pre }: { label: string; value: string | null | undefined; pre?: boolean }) {
  if (!value) return null
  return (
    <p className="flex gap-2">
      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{label}:</span>
      <span className={`text-charcoal dark:text-gray-200 min-w-0 ${pre ? 'whitespace-pre-line' : ''}`}>{value}</span>
    </p>
  )
}
function DetailSecret({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <p className="flex gap-2">
      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{label}:</span>
      <Secret value={value} />
    </p>
  )
}

/** Ορίζεται ΕΞΩ από τη φόρμα: ένα component μέσα σε render ξαναγεννιέται σε
 *  κάθε πληκτρολόγηση και το πεδίο χάνει την εστίαση. */
function Field({ k, label, value, onChange, type = 'text', list, area }: {
  k: string; label: string; value: string; onChange: (v: string) => void
  type?: string; list?: string[]; area?: boolean
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={`cf-${k}`}>{label}</label>
      {area ? (
        <textarea id={`cf-${k}`} rows={3} className={inputCls} value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <>
          <input id={`cf-${k}`} type={type} className={inputCls} value={value} onChange={e => onChange(e.target.value)}
            list={list ? `dl-${k}` : undefined} autoComplete="off" />
          {list && <datalist id={`dl-${k}`}>{list.map(v => <option key={v} value={v} />)}</datalist>}
        </>
      )}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const labelCls = 'block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1'

/** Γνωστές τιμές — προτείνονται, δεν επιβάλλονται (datalist, όχι select) */
const SUGGEST = {
  ContractType: ['Σύμβαση Έργου', 'Τίτλος Κτήσης', 'Μίσθωση'],
  ContractStatus: ['ΕΝΕΡΓΗ', 'ΛΗΓΕΙ ΣΥΝΤΟΜΑ', 'ΛΗΞΗ'],
  PaymentMethod: ['Τιμολόγιο', 'Τίτλος Κτήσης'],
  PaymentFrequency: ['Εφάπαξ', 'Σε Δόσεις (Milestones)'],
  NextPaymentStatus: ['ΜΕΛΛΟΝΤΙΚΗ', 'ΕΧΕΙ ΚΑΘΥΣΤΕΡΗΣΕΙ'],
  PaymentStatus: ['Εκκρεμεί Τιμολόγιο', 'Σε αναμονή έγκρισης', 'Έτοιμο για eBanking', 'Πληρώθηκε'],
}

function ContractForm({ contract, onClose, onSave }: {
  contract: Contract | null
  onClose: () => void
  onSave: (payload: Record<string, any>) => Promise<void>
}) {
  const ref = useFocusTrap<HTMLDivElement>(true)
  const [f, setF] = useState<Record<string, any>>(() => ({
    Name: contract?.Name || '', Role: contract?.Role || '', Email: contract?.Email || '', Phone: contract?.Phone || '',
    TaxId: contract?.TaxId || '', ContractType: contract?.ContractType || '', Project: contract?.Project || '',
    StartDate: contract?.StartDate || '', EndDate: contract?.EndDate || '', ContractStatus: contract?.ContractStatus || '',
    ContractFile: contract?.ContractFile || '', ContractNotes: contract?.ContractNotes || '',
    Amount: contract?.Amount ?? '', PaymentMethod: contract?.PaymentMethod || '', PaymentFrequency: contract?.PaymentFrequency || '',
    PaymentSchedule: contract?.PaymentSchedule || '', NextPaymentDate: contract?.NextPaymentDate || '',
    NextPaymentStatus: contract?.NextPaymentStatus || '', PaymentHistory: contract?.PaymentHistory || '',
    BankIban: contract?.BankIban || '', PaymentStatus: contract?.PaymentStatus || '', PaymentNotes: contract?.PaymentNotes || '',
    ExpenseDocsLink: contract?.ExpenseDocsLink || '', ExpenseListLink: contract?.ExpenseListLink || '',
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    if (!String(f.Name).trim()) { setErr('Λείπει το ονοματεπώνυμο'); return }
    setBusy(true); setErr(null)
    try { await onSave(f) }
    catch (e: any) { setErr(e?.message || 'Αποτυχία αποθήκευσης'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cf-title">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className="relative menu-glass glass-rim rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 menu-glass-dense px-6 py-4 border-b border-black/10 dark:border-white/10 rounded-t-3xl flex items-center justify-between">
          <h3 id="cf-title" className="text-lg font-bold text-charcoal dark:text-gray-100">
            {contract ? 'Επεξεργασία σύμβασης' : 'Νέα σύμβαση'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <svg className="w-5 h-5 text-charcoal dark:text-gray-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs font-bold tracking-widest text-coral">ΣΥΜΒΑΣΗ</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Field k="Name" value={String(f.Name ?? '')} onChange={v => setF(p => ({ ...p, Name: v }))} label="Ονοματεπώνυμο / Επωνυμία *" />
            <Field k="Role" value={String(f.Role ?? '')} onChange={v => setF(p => ({ ...p, Role: v }))} label="Ειδικότητα / Ρόλος" />
            <Field k="Email" value={String(f.Email ?? '')} onChange={v => setF(p => ({ ...p, Email: v }))} label="Email" type="email" />
            <Field k="Phone" value={String(f.Phone ?? '')} onChange={v => setF(p => ({ ...p, Phone: v }))} label="Τηλέφωνο" />
            <Field k="TaxId" value={String(f.TaxId ?? '')} onChange={v => setF(p => ({ ...p, TaxId: v }))} label="ΑΦΜ" />
            <Field k="ContractType" value={String(f.ContractType ?? '')} onChange={v => setF(p => ({ ...p, ContractType: v }))} label="Τύπος σύμβασης" list={SUGGEST.ContractType} />
            <Field k="Project" value={String(f.Project ?? '')} onChange={v => setF(p => ({ ...p, Project: v }))} label="Έργο" />
            <Field k="ContractStatus" value={String(f.ContractStatus ?? '')} onChange={v => setF(p => ({ ...p, ContractStatus: v }))} label="Κατάσταση" list={SUGGEST.ContractStatus} />
            <Field k="StartDate" value={String(f.StartDate ?? '')} onChange={v => setF(p => ({ ...p, StartDate: v }))} label="Ημερομηνία έναρξης" type="date" />
            <Field k="EndDate" value={String(f.EndDate ?? '')} onChange={v => setF(p => ({ ...p, EndDate: v }))} label="Ημερομηνία λήξης" type="date" />
            <Field k="ContractFile" value={String(f.ContractFile ?? '')} onChange={v => setF(p => ({ ...p, ContractFile: v }))} label="Αρχείο / σύνδεσμος σύμβασης" />
            <Field k="ContractNotes" value={String(f.ContractNotes ?? '')} onChange={v => setF(p => ({ ...p, ContractNotes: v }))} label="Σημειώσεις σύμβασης" area />
          </div>

          <p className="text-xs font-bold tracking-widest text-coral pt-2">ΠΛΗΡΩΜΕΣ</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Field k="Amount" value={String(f.Amount ?? '')} onChange={v => setF(p => ({ ...p, Amount: v }))} label="Αμοιβή (€)" />
            <Field k="PaymentMethod" value={String(f.PaymentMethod ?? '')} onChange={v => setF(p => ({ ...p, PaymentMethod: v }))} label="Τρόπος πληρωμής" list={SUGGEST.PaymentMethod} />
            <Field k="PaymentFrequency" value={String(f.PaymentFrequency ?? '')} onChange={v => setF(p => ({ ...p, PaymentFrequency: v }))} label="Συχνότητα" list={SUGGEST.PaymentFrequency} />
            <Field k="NextPaymentDate" value={String(f.NextPaymentDate ?? '')} onChange={v => setF(p => ({ ...p, NextPaymentDate: v }))} label="Επόμενη πληρωμή" type="date" />
            <Field k="NextPaymentStatus" value={String(f.NextPaymentStatus ?? '')} onChange={v => setF(p => ({ ...p, NextPaymentStatus: v }))} label="Status επόμενης πληρωμής" list={SUGGEST.NextPaymentStatus} />
            <Field k="PaymentStatus" value={String(f.PaymentStatus ?? '')} onChange={v => setF(p => ({ ...p, PaymentStatus: v }))} label="Status πληρωμής" list={SUGGEST.PaymentStatus} />
            <Field k="BankIban" value={String(f.BankIban ?? '')} onChange={v => setF(p => ({ ...p, BankIban: v }))} label="Τράπεζα & IBAN" />
            <Field k="PaymentSchedule" value={String(f.PaymentSchedule ?? '')} onChange={v => setF(p => ({ ...p, PaymentSchedule: v }))} label="Πρόγραμμα / ημερομηνίες πληρωμών" area />
            <Field k="PaymentHistory" value={String(f.PaymentHistory ?? '')} onChange={v => setF(p => ({ ...p, PaymentHistory: v }))} label="Ιστορικό πληρωμών" area />
            <Field k="PaymentNotes" value={String(f.PaymentNotes ?? '')} onChange={v => setF(p => ({ ...p, PaymentNotes: v }))} label="Σχόλια πληρωμών" area />
          </div>

          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={submit} disabled={busy}
              className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
              {busy ? 'Αποθήκευση…' : contract ? 'Αποθήκευση' : 'Καταχώριση'}
            </button>
            <button type="button" onClick={onClose} disabled={busy}
              className="px-5 py-2.5 rounded-full border border-black/15 dark:border-white/25 text-sm text-charcoal dark:text-gray-200 hover:border-coral">
              Άκυρο
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              Αποθηκεύεται πρώτα στη βάση και μετά στο φύλλο
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
