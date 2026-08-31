'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { OcOverviewData, OcMemberRow, OcMemberStatus, OcNewsletterStats } from '@/lib/ocOverview'
import type { OcApplicationSummary } from '@/components/oc/OcShell'
import { OC_TABLE_COLUMNS, OC_TABLE_DEFAULT_COLS } from '@/components/oc/ocPrefs'
import OcRenewalsPopup from '@/components/oc/OcRenewalsPopup'
import OcTreasuryPopup from '@/components/oc/OcTreasuryPopup'
import OcMyTasks from '@/components/oc/OcMyTasks'
import OcExportModal from '@/components/oc/OcExportModal'
import { useColumnWidths } from '@/components/oc/useColumnWidths'

const STATUS_META: Record<OcMemberStatus, { label: string; cls: string }> = {
  paid: { label: 'Τακτοποιημένο', cls: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
  'new-unpaid': { label: 'Νέο — εκκρεμεί συνδρομή', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
  'owes-1': { label: 'Εκκρεμεί συνδρομή', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' },
  'owes-2': { label: 'Προς διαγραφή (2 έτη)', cls: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
  unknown: { label: '—', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
}

// Γρήγοροι σύνδεσμοι — συμπλήρωσε/άλλαξε URLs εδώ (κενό URL = δεν εμφανίζεται)
const QUICK_LINKS: Array<{ label: string; href: string; external?: boolean }> = [
  { label: 'Μητρώο (Google Sheet)', href: '', external: true },
  { label: 'Strapi Admin', href: 'https://faithful-crystal-a2269c9fd9.strapiapp.com/admin', external: true },
  { label: 'Sender (Newsletter)', href: 'https://app.sender.net', external: true },
  { label: 'Φόρμα αίτησης μέλους', href: '/apply' },
  { label: 'Δημόσια σελίδα μελών', href: '/members' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function Tile({ value, label, accent, sub }: { value: string | number; label: string; accent?: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex flex-col">
      <span className="text-3xl font-bold notranslate" style={accent ? { color: accent } : undefined}>
        <span className={accent ? '' : 'text-charcoal dark:text-gray-100'}>{value}</span>
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">{label}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</span>}
    </div>
  )
}

function NameChips({ list, tone }: { list: Array<{ am: number; name: string }>; tone: 'orange' | 'red' }) {
  const [open, setOpen] = useState(false)
  const shown = open ? list : list.slice(0, 6)
  const toneCls = tone === 'red'
    ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
    : 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800'
  if (list.length === 0) return <p className="text-sm text-gray-400 dark:text-gray-500">Κανένα μέλος 🎉</p>
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {shown.map(p => (
        <span key={p.am} className={`text-xs px-2 py-1 rounded-full border ${toneCls}`}>
          {p.name}
        </span>
      ))}
      {list.length > 6 && (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-xs text-coral dark:text-coral-light hover:underline"
        >
          {open ? 'Λιγότερα' : `+${list.length - 6} ακόμη…`}
        </button>
      )}
    </div>
  )
}

function NewsletterSeries({ title, sub, series }: { title: string; sub: string; series: OcNewsletterStats[] }) {
  const current = series[0]
  const history = series.slice(1, 4)
  return (
    <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-600 min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="font-bold text-charcoal dark:text-gray-100">{title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{sub}</p>
      </div>
      {!current ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Καμία αποστολή ακόμη.</p>
      ) : (
        <>
          <p className="text-sm font-medium text-charcoal dark:text-gray-100 truncate" title={current.subject}>
            {current.subject}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Στάλθηκε {formatDate(current.sentAt)}</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xl font-bold text-charcoal dark:text-gray-100 notranslate">{current.recipients}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Παραλήπτες</p>
            </div>
            <div>
              <p className="text-xl font-bold notranslate" style={{ color: '#2A9D8F' }}>
                {current.openRate !== null ? `${current.openRate}%` : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Open rate ({current.opens})</p>
            </div>
            <div>
              <p className="text-xl font-bold text-charcoal dark:text-gray-100 notranslate">{current.clicks}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
            </div>
          </div>
          {history.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Ιστορικό</p>
              <ul className="space-y-1.5">
                {history.map(nl => (
                  <li key={nl.subject + (nl.sentAt || '')} className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                    <span className="notranslate w-20 flex-shrink-0 text-gray-400 dark:text-gray-500">{formatDate(nl.sentAt)}</span>
                    <span className="truncate min-w-0 flex-1" title={nl.subject}>{nl.subject}</span>
                    <span className="notranslate flex-shrink-0">{nl.recipients} παρ.</span>
                    <span className="notranslate flex-shrink-0 font-medium" style={{ color: '#2A9D8F' }}>
                      {nl.openRate !== null ? `${nl.openRate}%` : '—'}
                    </span>
                    <span className="notranslate flex-shrink-0 text-gray-400 dark:text-gray-500">{nl.clicks} cl.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const YEARS_SHOWN = [2021, 2022, 2023, 2024, 2025, 2026]

function PaymentCells({ m }: { m: OcMemberRow }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {YEARS_SHOWN.map(y => {
        const v = m.payments[String(y)]
        const before = m.regYear !== null && y < m.regYear
        const cls = before || v === 0
          ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
          : v === 1
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
        const txt = before ? '·' : v === 1 ? '✓' : v === 0 ? '0' : '—'
        return (
          <span key={y} className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${cls}`} title={`${y}: ${before ? 'προ εγγραφής' : v === 1 ? 'πληρωμένο' : v === 0 ? 'δεν όφειλε' : 'εκκρεμεί'}`}>
            {String(y).slice(2)}{txt}
          </span>
        )
      })}
    </div>
  )
}

type SortKey = 'am' | 'name' | 'city' | 'email' | 'phone' | 'regYear' | 'year' | 'status' | 'payments'
type SortDir = 'asc' | 'desc'
type SortState = { key: SortKey; dir: SortDir }

const SORT_LABELS: Record<SortKey, string> = {
  am: 'ΑΜ', name: 'Όνομα', city: 'Πόλη', email: 'Email', phone: 'Τηλέφωνο',
  regYear: 'Εγγραφή', year: 'Τρέχον έτος', status: 'Κατάσταση', payments: 'Πληρωμές',
}

// Ποια (προαιρετική) στήλη «κρατά» κάθε κλειδί — αν κρυφτεί, η ταξινόμηση
// γυρίζει στο ΑΜ αντί να μένει ενεργή σε στήλη που δεν φαίνεται.
const SORT_COL: Partial<Record<SortKey, string>> = {
  city: 'city', email: 'email', phone: 'phone', regYear: 'regYear',
  year: 'year', status: 'status', payments: 'payments',
}

// Βαρύτητα κατάστασης: φθίνουσα = τα πιο επείγοντα πρώτα
const STATUS_RANK: Record<OcMemberStatus, number> = {
  'owes-2': 4, 'owes-1': 3, 'new-unpaid': 2, paid: 1, unknown: 0,
}

/** Κενό πεδίο → πάντα στο τέλος, ανεξάρτητα από τη φορά */
function isBlank(key: SortKey, m: OcMemberRow): boolean {
  switch (key) {
    case 'name': return !m.name.trim()
    case 'city': return !m.city.trim()
    case 'email': return !m.email.trim()
    case 'phone': return !m.phone.trim()
    case 'regYear': return m.regYear == null
    default: return false
  }
}

/** Πληρωμή τρέχοντος έτους: πληρωμένο → μηδενικό → εκκρεμεί */
function yearRank(m: OcMemberRow, currentYear: number): number {
  const v = m.payments[String(currentYear)]
  return v === 1 ? 2 : v === 0 ? 1 : 0
}

function paidCount(m: OcMemberRow): number {
  return Object.values(m.payments).filter(v => v === 1).length
}

function compareRows(a: OcMemberRow, b: OcMemberRow, sort: SortState, currentYear: number): number {
  const blankA = isBlank(sort.key, a)
  const blankB = isBlank(sort.key, b)
  if (blankA !== blankB) return blankA ? 1 : -1
  let c = 0
  if (!blankA) {
    switch (sort.key) {
      case 'am': c = a.am - b.am; break
      case 'name': c = a.name.localeCompare(b.name, 'el'); break
      case 'city': c = a.city.localeCompare(b.city, 'el'); break
      case 'email': c = a.email.localeCompare(b.email, 'el'); break
      case 'phone': c = a.phone.localeCompare(b.phone, 'el'); break
      case 'regYear': c = (a.regYear || 0) - (b.regYear || 0); break
      case 'year': c = yearRank(a, currentYear) - yearRank(b, currentYear); break
      case 'status': c = STATUS_RANK[a.status] - STATUS_RANK[b.status]; break
      case 'payments': c = paidCount(a) - paidCount(b); break
    }
    if (sort.dir === 'desc') c = -c
  }
  return c || a.am - b.am
}

/** Κεφαλίδα με ταξινόμηση: 1ο κλικ φθίνουσα (▼), 2ο αύξουσα (▲) */
function SortTh({ label, sortKey, sort, onSort, py, className = '', handle }: {
  label: React.ReactNode
  sortKey: SortKey
  sort: SortState
  onSort: (key: SortKey) => void
  py: string
  className?: string
  /** Χειριστήριο αλλαγής πλάτους — ίδιο σε όλους τους πίνακες του OC */
  handle?: React.ReactNode
}) {
  const active = sort.key === sortKey
  return (
    <th
      className={`relative ${py} pr-3 font-medium ${className}`}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="group inline-flex items-center gap-1 whitespace-nowrap hover:text-charcoal dark:hover:text-gray-200 transition-colors"
      >
        {label}
        <span
          aria-hidden="true"
          className={`text-[9px] leading-none ${
            active ? 'text-coral dark:text-coral-light' : 'text-gray-400 opacity-0 group-hover:opacity-60'
          }`}
        >
          {active && sort.dir === 'asc' ? '▲' : '▼'}
        </span>
        <span className="sr-only">
          {active
            ? sort.dir === 'asc' ? ' — ταξινόμηση αύξουσα' : ' — ταξινόμηση φθίνουσα'
            : ' — ταξινόμηση'}
        </span>
      </button>
      {handle}
    </th>
  )
}

interface TablePrefs {
  cols: string[]
  density: 'comfortable' | 'compact'
}

function MembersTable({ members, currentYear, canDelete, initialPrefs }: {
  members: OcMemberRow[]
  currentYear: number
  /** Ενεργός ρόλος IT/Γραμματεία → εμφανίζεται η Διαγραφή μέλους */
  canDelete: boolean
  initialPrefs: TablePrefs
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'am', dir: 'asc' })
  const [sortOpen, setSortOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [cols, setCols] = useState<string[]>(initialPrefs.cols)
  const [density, setDensity] = useState<'comfortable' | 'compact'>(initialPrefs.density)
  const [showCols, setShowCols] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const { width, ResizeHandle, resetWidths, hasCustom } = useColumnWidths('members')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteWarn, setDeleteWarn] = useState<string | null>(null)

  const show = (key: string) => cols.includes(key)
  const py = density === 'compact' ? 'py-1' : 'py-2.5'
  const txt = density === 'compact' ? 'text-xs' : 'text-sm'

  function persist(next: Partial<{ tableCols: string; tableDensity: string }>) {
    fetch('/api/oc/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
      keepalive: true,
    }).catch(() => {})
  }

  function toggleCol(key: string) {
    setCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      persist({ tableCols: next.join(',') })
      return next
    })
    // κρύφτηκε η στήλη της ενεργής ταξινόμησης → πίσω στο ΑΜ
    setSort(s => (SORT_COL[s.key] === key && cols.includes(key) ? { key: 'am', dir: 'asc' } : s))
  }

  /** Νέα στήλη → φθίνουσα· ίδια στήλη → εναλλαγή φοράς */
  function toggleSort(key: SortKey) {
    setSort(s => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  }

  function applyDensity(d: 'comfortable' | 'compact') {
    setDensity(d)
    persist({ tableDensity: d })
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || String(m.am) === q)
      : members
    return [...filtered].sort((a, b) => compareRows(a, b, sort, currentYear))
  }, [members, query, sort, currentYear])

  function toggle(am: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(am)) next.delete(am)
      else next.add(am)
      return next
    })
  }

  async function removeMember(m: OcMemberRow) {
    if (confirmDelete !== m.am) {
      setConfirmDelete(m.am)
      setDeleteError(null)
      return
    }
    setConfirmDelete(null)
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/oc/members/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: m.docId }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setDeleteError(json?.error || 'Κάτι πήγε στραβά — δοκίμασε ξανά')
        return
      }
      if (json.sheetSynced === false) {
        setDeleteWarn(`Το μέλος «${json.removed}» αφαιρέθηκε, αλλά το Μητρώο (Sheet) δεν ενημερώθηκε — κάνε τη διαγραφή και εκεί χειροκίνητα.`)
      }
      router.refresh()
    } catch {
      setDeleteError('Κάτι πήγε στραβά — δοκίμασε ξανά')
    } finally {
      setDeleting(false)
    }
  }

  const colCount = 3 + OC_TABLE_COLUMNS.filter(c => show(c.key)).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-bold text-lg text-charcoal dark:text-gray-100">
          Μητρώο μελών <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({members.length})</span>
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              role="searchbox"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Αναζήτηση (όνομα, email, ΑΜ)…"
              style={{ paddingLeft: '2.5rem' }}
              className="h-9 pr-4 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 w-72 transition-colors"
              aria-label="Αναζήτηση μέλους"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(v => !v)}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              className={`h-9 inline-flex items-center gap-2 px-4 text-sm rounded-full border bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 transition-colors ${
                sortOpen
                  ? 'border-coral ring-2 ring-coral/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light'
              }`}
            >
              Ταξινόμηση: {SORT_LABELS[sort.key]}
              <span className="text-coral dark:text-coral-light text-[9px] leading-none" aria-hidden="true">
                {sort.dir === 'asc' ? '▲' : '▼'}
              </span>
              <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${sortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-2 z-40 w-48 menu-glass rounded-2xl border border-gray-200 dark:border-gray-600 py-2" role="listbox" aria-label="Ταξινόμηση">
                  {(Object.keys(SORT_LABELS) as SortKey[])
                    .filter(k => !SORT_COL[k] || show(SORT_COL[k]!))
                    .map(k => (
                    <button
                      key={k}
                      type="button"
                      role="option"
                      aria-selected={sort.key === k}
                      onClick={() => { toggleSort(k); setSortOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sort.key === k
                          ? 'text-coral dark:text-coral-light font-bold'
                          : 'text-charcoal dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {SORT_LABELS[k]}
                      {sort.key === k && <span className="ml-1 text-[9px]" aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCols(v => !v)}
              aria-expanded={showCols}
              className={`h-9 inline-flex items-center gap-2 px-4 text-sm font-medium rounded-full border bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 transition-colors ${
                showCols
                  ? 'border-coral ring-2 ring-coral/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light'
              }`}
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h13M21 17h-1" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="10" cy="12" r="2" />
                <circle cx="19" cy="17" r="2" />
              </svg>
              Στήλες
            </button>
            {showCols && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowCols(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-2 z-40 w-64 menu-glass rounded-2xl border border-gray-200 dark:border-gray-600 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ορατές στήλες</p>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button type="button"
                        onClick={() => { const all = OC_TABLE_COLUMNS.map(c => c.key); setCols(all); persist({ tableCols: all.join(',') }) }}
                        className="text-[11px] text-coral dark:text-coral-light hover:underline">Όλες</button>
                      <button type="button"
                        onClick={() => {
                          setCols(OC_TABLE_DEFAULT_COLS)
                          persist({ tableCols: OC_TABLE_DEFAULT_COLS.join(',') })
                          // ίδια προστασία με το toggleCol: ταξινόμηση σε
                          // στήλη που μόλις κρύφτηκε → πίσω στο ΑΜ
                          setSort(s => {
                            const col = SORT_COL[s.key]
                            return col && !OC_TABLE_DEFAULT_COLS.includes(col) ? { key: 'am', dir: 'asc' } : s
                          })
                        }}
                        className="text-[11px] text-coral dark:text-coral-light hover:underline">Προεπιλογή</button>
                      {hasCustom && (
                        <button type="button" onClick={resetWidths}
                          title="Επαναφορά των πλατών που έχεις σύρει"
                          className="text-[11px] text-coral dark:text-coral-light hover:underline">Πλάτη</button>
                      )}
                    </span>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {OC_TABLE_COLUMNS.map(c => (
                      <label key={c.key} className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={show(c.key)}
                          onChange={() => toggleCol(c.key)}
                          className="accent-[#FF8B6A]"
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Πυκνότητα</p>
                  <div className="flex gap-2">
                    {([['comfortable', 'Άνετη'], ['compact', 'Συμπαγής']] as const).map(([d, label]) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => applyDensity(d)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                          density === d
                            ? 'bg-coral text-white border-coral'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-coral'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Εξαγωγή: ο χρήστης διαλέγει στήλες και κατεβάζει CSV μόνο με αυτές */}
          <button
            type="button"
            onClick={() => setShowExport(true)}
            title="Εξαγωγή μελών σε αρχείο"
            aria-label="Εξαγωγή μελών σε αρχείο"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-coral hover:text-coral dark:hover:border-coral-light dark:hover:text-coral-light transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </button>
        </div>
      </div>

      <OcExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        rows={rows}
        currentYear={currentYear}
        years={YEARS_SHOWN}
        visibleCols={cols}
      />

      {deleteWarn && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">{deleteWarn}</p>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full ${txt}`} style={{ tableLayout: hasCustom ? 'fixed' : 'auto', minWidth: '100%' }}>
          <colgroup>
            {['am', 'name', ...OC_TABLE_COLUMNS.filter(c => show(c.key)).map(c => c.key)].map(k => (
              <col key={k} style={width(k) ? { width: `${width(k)}px` } : undefined} />
            ))}
            <col style={{ width: '2.5rem' }} />
          </colgroup>
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
              <SortTh label="ΑΜ" sortKey="am" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="am" />} />
              <SortTh label="Ονοματεπώνυμο" sortKey="name" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="name" />} />
              {show('city') && <SortTh label="Πόλη" sortKey="city" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="city" />} className="hidden md:table-cell" />}
              {show('email') && <SortTh label="Email" sortKey="email" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="email" />} />}
              {show('phone') && <SortTh label="Τηλέφωνο" sortKey="phone" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="phone" />} />}
              {show('regYear') && <SortTh label="Εγγραφή" sortKey="regYear" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="regYear" />} />}
              {show('year') && <SortTh label={currentYear} sortKey="year" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="year" />} />}
              {show('status') && <SortTh label="Κατάσταση" sortKey="status" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="status" />} />}
              {show('payments') && <SortTh label="Πληρωμές" sortKey="payments" sort={sort} onSort={toggleSort} py={py} handle={<ResizeHandle colKey="payments" />} />}
              <th className={`${py} font-medium sr-only`}>Λεπτομέρειες</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(m => {
              const st = STATUS_META[m.status]
              const isOpen = expanded.has(m.am)
              const cur = m.payments[String(currentYear)]
              return (
                <Fragment key={m.am}>
                  <tr
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                    onClick={() => toggle(m.am)}
                  >
                    <td className={`${py} pr-3 text-gray-500 dark:text-gray-400 notranslate`}>{m.am}</td>
                    <td className={`${py} pr-3 font-medium text-charcoal dark:text-gray-200`}>
                      {m.name}
                      {!m.profileVisible && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded px-1 py-px whitespace-nowrap">Προφίλ μη ενημερωμένο</span>
                      )}
                    </td>
                    {show('city') && <td className={`${py} pr-3 text-gray-600 dark:text-gray-400 hidden md:table-cell`}>{m.city || '—'}</td>}
                    {show('email') && <td className={`${py} pr-3 text-gray-600 dark:text-gray-400 notranslate`}>{m.email || '—'}</td>}
                    {show('phone') && <td className={`${py} pr-3 text-gray-600 dark:text-gray-400 notranslate`}>{m.phone || '—'}</td>}
                    {show('regYear') && <td className={`${py} pr-3 text-gray-600 dark:text-gray-400 notranslate`}>{m.regYear || '—'}</td>}
                    {show('year') && (
                      <td className={`${py} pr-3 notranslate`}>
                        {cur === 1 ? '✓' : cur === 0 ? '0' : <span className="text-red-500 dark:text-red-400">—</span>}
                      </td>
                    )}
                    {show('status') && (
                      <td className={`${py} pr-3`}>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                      </td>
                    )}
                    {show('payments') && (
                      <td className={`${py} pr-3`}><PaymentCells m={m} /></td>
                    )}
                    <td className={`${py} text-right`}>
                      <span className="text-coral dark:text-coral-light text-xs select-none" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
                      <span className="sr-only">{isOpen ? 'Απόκρυψη λεπτομερειών' : 'Εμφάνιση λεπτομερειών'}</span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/20">
                      <td colSpan={colCount} className="py-3 px-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                          <PaymentCells m={m} />
                          <div className="flex flex-wrap gap-x-5 gap-y-1 items-center flex-1">
                            <span className="notranslate">{m.email || '—'}</span>
                            {m.phone && <span className="notranslate">{m.phone}</span>}
                            {m.regYear && <span>Εγγραφή: {m.regYear}</span>}
                            {m.slug && m.profileVisible && (
                              <Link href={`/members/${m.slug}`} className="text-coral dark:text-coral-light hover:underline" onClick={e => e.stopPropagation()}>
                                Προφίλ →
                              </Link>
                            )}
                          </div>
                          {canDelete && (
                            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              {deleteError && confirmDelete === null && (
                                <span className="text-red-600 dark:text-red-400">{deleteError}</span>
                              )}
                              <button
                                type="button"
                                disabled={deleting}
                                onClick={() => removeMember(m)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                                  confirmDelete === m.am
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900/80'
                                }`}
                              >
                                {confirmDelete === m.am ? 'Σίγουρα; Πάτησε ξανά' : 'Διαγραφή μέλους'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Κανένα αποτέλεσμα.</p>
        )}
      </div>
    </div>
  )
}

interface OcOverviewProps {
  data: OcOverviewData
  applications: OcApplicationSummary[]
  /** Ενεργός ρόλος it/admin → δικαίωμα διαγραφής μέλους στον πίνακα */
  canDeleteMembers?: boolean
  /** Ενεργός ρόλος financer → κουμπιά πληρωμής/υπενθύμισης στο popup */
  canRecordPayments?: boolean
  /** Ενεργός ρόλος financer/community → υπενθυμίσεις συνδρομής */
  canRemind?: boolean
  /** Deep link /oc?open=renewals → popup δηλώσεων ανοιχτό στο φόρτωμα */
  initialShowRenewals?: boolean
  tableCols?: string[]
  tableDensity?: 'comfortable' | 'compact'
}

export default function OcOverview({
  data, applications, canDeleteMembers = false, canRecordPayments = false,
  canRemind = false, initialShowRenewals = false, tableCols, tableDensity,
}: OcOverviewProps) {
  const router = useRouter()
  const [payConfirm, setPayConfirm] = useState<string | null>(null)
  const [failWarn, setFailWarn] = useState<string | null>(null)
  const [payBusy, setPayBusy] = useState<string | null>(null)
  const [payNotes, setPayNotes] = useState<Record<string, string>>({})

  async function financerAction(appId: string, action: 'paid' | 'remind' | 'failed') {
    if (action === 'paid' && payConfirm !== appId) {
      setPayConfirm(appId)
      return
    }
    setPayConfirm(null)
    setFailWarn(null)
    setPayBusy(appId + action)
    try {
      const res = await fetch('/api/oc/applications/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, action }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setPayNotes(n => ({ ...n, [appId]: json?.error || 'Κάτι πήγε στραβά — δοκίμασε ξανά' }))
        return
      }
      if (action === 'remind') {
        setPayNotes(n => ({ ...n, [appId]: 'Η υπενθύμιση εστάλη ✓' }))
      } else if (action === 'failed') {
        setPayNotes(n => ({ ...n, [appId]: 'Το email αποτυχίας εστάλη — η δήλωση μηδενίστηκε ✓' }))
        router.refresh()
      } else {
        setPayNotes(n => ({
          ...n,
          [appId]: json.emailSent
            ? `Καταχωρήθηκε (ΑΜ ${json.am}) — στάλθηκε email καλωσορίσματος ✓`
            : `Καταχωρήθηκε (ΑΜ ${json.am}) — το email ΔΕΝ στάλθηκε, στείλ'το χειροκίνητα`,
        }))
        router.refresh()
      }
    } catch {
      setPayNotes(n => ({ ...n, [appId]: 'Κάτι πήγε στραβά — δοκίμασε ξανά' }))
    } finally {
      setPayBusy(null)
    }
  }
  const pending = applications.filter(a => a.state === 'submitted')
  const y = data.currentYear
  const [showApproved, setShowApproved] = useState(false)
  const [showRenewals, setShowRenewals] = useState(initialShowRenewals)
  const [showTreasury, setShowTreasury] = useState(false)
  const [armBusy, setArmBusy] = useState<string | null>(null)
  const [treasury, setTreasury] = useState<{ bank: number; asOf: string; stale: boolean } | null>(null)
  const renewalClaims = data.members.filter(m =>
    m.renewalClaimedAt && (m.status === 'owes-1' || m.status === 'owes-2' || m.status === 'new-unpaid')
  ).length

  // Ταμείο: τελευταία μέτρηση για το πλακίδιο (όλο το ΔΣ βλέπει)
  useEffect(() => {
    fetch('/api/oc/treasury')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.latest) setTreasury({ bank: d.latest.bank, asOf: d.latest.asOf, stale: !!d.stale }) })
      .catch(() => { /* σιωπηλά — το πλακίδιο μένει «—» */ })
  }, [])

  /** Οπλισμός αυτόματων υπενθυμίσεων — μία αίτηση ή όλη η λίστα */
  async function armReminders(opts: { id?: string; all?: boolean; armed: boolean }) {
    setArmBusy(opts.all ? 'all' : opts.id || null)
    try {
      const res = await fetch('/api/oc/applications/arm-reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      router.refresh()
    } catch (err) {
      console.error('arm reminders failed:', err)
    } finally { setArmBusy(null) }
  }

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Tile value={data.activeMembers} label="Ενεργά μέλη" />
        <button
          type="button"
          onClick={() => setShowRenewals(true)}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-2xl"
          aria-haspopup="dialog"
        >
          <div className={`relative rounded-2xl shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow border ${
            renewalClaims > 0
              ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700'
              : 'bg-white dark:bg-gray-800 border-transparent hover:border-coral/40'
          }`}>
            {renewalClaims > 0 && (
              <span
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shadow"
                title={`${renewalClaims} δήλωση/εις πληρωμής συνδρομής προς επιβεβαίωση`}
              >
                i
              </span>
            )}
            <span className="text-3xl font-bold notranslate" style={{ color: data.paidCurrent >= data.activeMembers * 0.7 ? '#2A9D8F' : '#E9A13B' }}>
              {data.paidCurrent}/{data.activeMembers}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">Πληρωμένο {y}</span>
            <span className="text-xs text-coral dark:text-coral-light mt-0.5">
              {renewalClaims > 0 ? `${renewalClaims} δήλωσαν ότι πλήρωσαν →` : 'Προβολή λίστας →'}
            </span>
          </div>
        </button>
        <Tile value={pending.length} label="Εκκρεμείς αιτήσεις" accent={pending.length > 0 ? '#FF8B6A' : undefined} />
        <button
          type="button"
          onClick={() => setShowApproved(true)}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-2xl"
          aria-haspopup="dialog"
        >
          <div className={`relative rounded-2xl shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow border ${
            data.paymentClaims > 0
              ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700'
              : 'bg-white dark:bg-gray-800 border-transparent hover:border-coral/40'
          }`}>
            {data.paymentClaims > 0 && (
              <span
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shadow"
                title={`${data.paymentClaims} δήλωση/εις πληρωμής προς επιβεβαίωση`}
              >
                i
              </span>
            )}
            <span className="text-3xl font-bold text-charcoal dark:text-gray-100 notranslate">{data.approvedUnpaidApps}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">Εγκρίθηκαν — αναμονή πληρωμής</span>
            <span className="text-xs text-coral dark:text-coral-light mt-0.5">
              {data.paymentClaims > 0 ? `${data.paymentClaims} δήλωσαν ότι πλήρωσαν →` : 'Προβολή λίστας →'}
            </span>
          </div>
        </button>
        <Tile value={data.newThisYear} label={`Νέα μέλη ${y}`} accent="#4A90D9" />
        <button
          type="button"
          onClick={() => setShowTreasury(true)}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-2xl"
          aria-haspopup="dialog"
        >
          <div className={`relative rounded-2xl shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow border ${
            treasury?.stale
              ? 'bg-amber-50 dark:bg-amber-900/25 border-amber-300 dark:border-amber-700'
              : 'bg-white dark:bg-gray-800 border-transparent hover:border-coral/40'
          }`}>
            {treasury?.stale && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow"
                title="Το ταμείο δεν έχει ενημερωθεί αυτόν τον μήνα">!</span>
            )}
            <span className="text-3xl font-bold text-charcoal dark:text-gray-100 notranslate">
              {treasury ? `${Math.round(treasury.bank).toLocaleString('el-GR')} €` : '—'}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">Ταμείο</span>
            <span className={`text-xs mt-0.5 ${treasury?.stale ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-coral dark:text-coral-light'}`}>
              {treasury
                ? `${treasury.stale ? '⚠ ' : ''}μέτρηση ${new Date(treasury.asOf).toLocaleDateString('el-GR')} →`
                : 'καταχώρηση μέτρησης →'}
            </span>
          </div>
        </button>
      </div>

      {showTreasury && (
        <OcTreasuryPopup
          canEdit={canRecordPayments}
          onClose={() => setShowTreasury(false)}
          onSaved={() => {
            fetch('/api/oc/treasury').then(r => r.ok ? r.json() : null).then(d => {
              if (d?.latest) setTreasury({ bank: d.latest.bank, asOf: d.latest.asOf, stale: !!d.stale })
            }).catch(() => {})
          }}
        />
      )}

      {/* Popup: ανεξόφλητες συνδρομές — έκδοση/υπενθύμιση επιτόπου */}
      {showRenewals && (
        <OcRenewalsPopup
          members={data.members}
          canIssue={canRecordPayments}
          canRemind={canRemind}
          claimsOnly
          onClose={() => setShowRenewals(false)}
          onChanged={() => router.refresh()}
        />
      )}

      {/* Popup: εγκεκριμένες αιτήσεις σε αναμονή πληρωμής */}
      {showApproved && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Εγκεκριμένες αιτήσεις σε αναμονή πληρωμής"
          onClick={() => setShowApproved(false)}
        >
          <div
            className="menu-glass rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="font-bold text-lg text-charcoal dark:text-gray-100">
                Εγκρίθηκαν — αναμονή πληρωμής
                <span className="ml-2 text-sm font-normal text-gray-400">({data.approvedApps.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowApproved(false)}
                className="text-gray-400 hover:text-charcoal dark:hover:text-gray-200 text-xl leading-none"
                aria-label="Κλείσιμο"
              >
                ✕
              </button>
            </div>
            {canRemind && data.approvedApps.some(a => !a.claimedAt) && (() => {
              // Κατάσταση, όχι μόνο ενέργειες: φαίνεται ΤΙ ισχύει τώρα, με
              // πράσινο περίγραμμα στην τρέχουσα επιλογή. Προεπιλογή: ανενεργές.
              const unpaid = data.approvedApps.filter(a => !a.claimedAt)
              const armed = unpaid.filter(a => a.armed).length
              const state = armed === 0 ? 'off' : armed === unpaid.length ? 'on' : 'mixed'
              const pill = (current: boolean) =>
                `px-4 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${current
                  ? 'bg-green-100 text-green-800 ring-2 ring-green-600 dark:bg-green-900/50 dark:text-green-100 dark:ring-green-400'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-coral'}`
              return (
                <div className="mb-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
                  <p className="text-sm text-charcoal dark:text-gray-200">
                    <strong>Αυτόματες υπενθυμίσεις προθεσμίας</strong> — στέλνονται στις 15 και στις 28 ημέρες
                    από την έγκριση, μόνο σε όσους έχουν ενεργοποιηθεί.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button type="button" disabled={armBusy !== null}
                      onClick={() => armReminders({ all: true, armed: false })}
                      className={pill(state === 'off')}>
                      {state === 'off' && '✓ '}Ανενεργές
                    </button>
                    <button type="button" disabled={armBusy !== null}
                      onClick={() => armReminders({ all: true, armed: true })}
                      className={pill(state === 'on')}>
                      {state === 'on' && '✓ '}Ενεργές σε όλους
                    </button>
                    {armBusy === 'all' && <span className="text-xs text-gray-500 dark:text-gray-400">Ενημέρωση…</span>}
                    {state === 'mixed' && (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300 notranslate">
                        ενεργές σε {armed} από {unpaid.length}
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}
            {data.approvedApps.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Καμία εγκεκριμένη αίτηση σε αναμονή πληρωμής. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {data.approvedApps.map(app => (
                  <li
                    key={app.id}
                    className={`p-3 rounded-2xl border ${
                      app.claimedAt
                        ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal dark:text-gray-200 truncate">{app.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {app.decisionDate ? `Εγκρίθηκε: ${formatDate(app.decisionDate)}` : `Αίτηση: ${formatDate(app.submittedAt)}`}
                          {app.claimedAt && (
                            <span className="text-teal-700 dark:text-teal-300 font-medium"> · Δήλωσε πληρωμή {formatDate(app.claimedAt)}</span>
                          )}
                          {!app.claimedAt && app.daysSinceDecision !== null && app.daysSinceDecision >= 30 && (
                            <span className="text-red-600 dark:text-red-400 font-bold"> · ⚠ η προθεσμία έληξε ({app.daysSinceDecision} μέρες)</span>
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/oc/applications/${app.id}`}
                        className="text-coral dark:text-coral-light text-sm whitespace-nowrap hover:underline flex-shrink-0"
                      >
                        Άνοιγμα αίτησης →
                      </Link>
                    </div>
                    {canRemind && !app.claimedAt && (
                      <button type="button" disabled={armBusy !== null}
                        onClick={() => armReminders({ id: app.id, armed: !app.armed })}
                        title={app.armed
                          ? 'Οι αυτόματες υπενθυμίσεις είναι ενεργές — κλικ για απενεργοποίηση'
                          : 'Ενεργοποίηση αυτόματων υπενθυμίσεων στις 15 και 28 ημέρες'}
                        className={`mt-2.5 px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${app.armed
                          ? 'bg-coral/15 text-coral'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-coral'}`}>
                        {armBusy === app.id ? '…' : app.armed ? '✓ Αυτόματες υπενθυμίσεις' : 'Αυτόματες υπενθυμίσεις'}
                      </button>
                    )}
                    {canRecordPayments && (
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <button
                          type="button"
                          disabled={payBusy !== null}
                          onClick={() => financerAction(app.id, 'paid')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                            payConfirm === app.id
                              ? 'bg-green-600 text-white'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:hover:bg-green-900/80'
                          }`}
                        >
                          {payBusy === app.id + 'paid' ? 'Καταχώρηση…'
                            : payConfirm === app.id ? 'Σίγουρα; Πάτησε ξανά' : 'Πληρώθηκε η εγγραφή'}
                        </button>
                        {app.claimedAt ? (
                          <button
                            type="button"
                            disabled={payBusy !== null}
                            onClick={() => setFailWarn(app.id)}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900/80 transition-colors disabled:opacity-50"
                          >
                            {payBusy === app.id + 'failed' ? 'Αποστολή…' : 'Αποτυχία πληρωμής'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={payBusy !== null}
                            onClick={() => financerAction(app.id, 'remind')}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:hover:bg-orange-900/80 transition-colors disabled:opacity-50"
                          >
                            {payBusy === app.id + 'remind' ? 'Αποστολή…' : 'Υπενθύμιση'}
                          </button>
                        )}
                        {failWarn === app.id && (
                          <div className="w-full mt-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-xs text-orange-900 dark:text-orange-100">
                            <p className="mb-2">
                              ⚠️ Πληρωμές που έγιναν Σαββατοκύριακο εκκαθαρίζονται τη Δευτέρα, και μια
                              μεταφορά μεταξύ τραπεζών μπορεί να χρειαστεί έως δύο εργάσιμες. Σίγουρα
                              θες να σταλεί email αποτυχίας πληρωμής;
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setFailWarn(null)}
                                className="px-3 py-1 rounded-full font-bold bg-white dark:bg-gray-700 text-charcoal dark:text-gray-200 border border-gray-300 dark:border-gray-500"
                              >
                                Άκυρο
                              </button>
                              <button
                                type="button"
                                disabled={payBusy !== null}
                                onClick={() => financerAction(app.id, 'failed')}
                                className="px-3 py-1 rounded-full font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Αποστολή email
                              </button>
                            </div>
                          </div>
                        )}
                        {payNotes[app.id] && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{payNotes[app.id]}</span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Η πληρωμή καταχωρείται από τον/την Financer στο Μητρώο (ΠΛΗΡΩΜΗ = Ναι) και το μέλος
              δημιουργείται αυτόματα.
            </p>
          </div>
        </div>
      )}

      {/* Εκκρεμείς αιτήσεις — πρώτο μεγάλο block */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8">
        <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-4">
          Εκκρεμείς αιτήσεις μελών
          {pending.length > 0 && (
            <span className="ml-2 bg-coral text-white text-xs px-2 py-0.5 rounded-full align-middle">{pending.length}</span>
          )}
        </h3>
        {pending.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">Καμία εκκρεμής αίτηση αυτή τη στιγμή. 🎉</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map(app => (
              <Link
                key={app.id}
                href={`/oc/applications/${app.id}`}
                className="p-5 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light transition-colors group"
              >
                <p className="font-bold text-charcoal dark:text-gray-100 group-hover:text-coral dark:group-hover:text-coral-light transition-colors truncate">
                  {app.name || 'Χωρίς όνομα'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Υποβλήθηκε {formatDate(app.submittedAt)}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-3 bg-coral text-white text-xs font-bold px-3 py-1.5 rounded-full group-hover:bg-coral/90 transition-colors">
                  Έλεγχος αίτησης →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Οικονομικά + Προφίλ/Σύνδεσμοι δίπλα-δίπλα */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-4">Συνδρομές</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-2xl font-bold text-charcoal dark:text-gray-100 notranslate">
                {data.paidPrev}<span className="text-base font-normal text-gray-400">/{data.activeMembers}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Πληρωμένο {y - 1}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal dark:text-gray-100 notranslate">
                {data.paidCurrent}<span className="text-base font-normal text-gray-400">/{data.activeMembers}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Πληρωμένο {y}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-charcoal dark:text-gray-200 mb-2">
                Προς ειδοποίηση <span className="font-normal text-gray-400">({data.notifyList.length})</span>
              </p>
              <NameChips list={data.notifyList} tone="orange" />
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal dark:text-gray-200 mb-2">
                Προς διαγραφή — 2 έτη ανεξόφλητα <span className="font-normal text-gray-400">({data.deleteList.length})</span>
              </p>
              <NameChips list={data.deleteList} tone="red" />
            </div>
          </div>
        </div>

        <OcMyTasks />

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <h3 className="font-bold text-charcoal dark:text-gray-100 mb-2">Προφίλ ιστοσελίδας</h3>
            <p className="text-2xl font-bold text-charcoal dark:text-gray-100 notranslate">
              {data.profilesVisible}<span className="text-base font-normal text-gray-400">/{data.activeMembers}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">ορατά προφίλ μελών</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <h3 className="font-bold text-charcoal dark:text-gray-100 mb-3">Γρήγοροι σύνδεσμοι</h3>
            <ul className="space-y-2">
              {QUICK_LINKS.filter(l => l.href).map(l => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-coral dark:text-coral-light hover:underline">
                      {l.label} ↗
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm text-coral dark:text-coral-light hover:underline">
                      {l.label} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Newsletter: 2 σειρές/μήνα — Μελών (Paid, ~10) και Κοινού (External, ~15),
          καθεμία με το τρέχον τεύχος + ιστορικό 3 προηγούμενων. Οι δοκιμαστικές
          αποστολές φιλτράρονται στο lib/ocOverview. */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8">
        <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-4">Newsletter</h3>
        {data.newsletters.members.length === 0 && data.newsletters.external.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Δεν ήταν δυνατή η ανάκτηση στοιχείων από το Sender.</p>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-4">
              <NewsletterSeries
                title="Newsletter Μελών"
                sub="group Paid · ~10 του μήνα"
                series={data.newsletters.members}
              />
              <NewsletterSeries
                title="Newsletter Κοινού"
                sub="group External non media · ~15 του μήνα"
                series={data.newsletters.external}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Σύνολο συνδρομητών & μεταβολές μήνα: εκκρεμεί διεύρυνση δικαιωμάτων στο Sender API token.
            </p>
          </>
        )}
      </div>

      {/* Πρόσφατη δραστηριότητα */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8">
        <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-4">Πρόσφατη δραστηριότητα</h3>
        {data.feed.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Καμία καταγεγραμμένη δραστηριότητα ακόμη.</p>
        ) : (
          <ul className="space-y-3">
            {data.feed.map((e, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span
                  className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: e.kind === 'application' ? '#FF8B6A' : '#2A9D8F' }}
                  aria-hidden="true"
                />
                <span className="text-gray-700 dark:text-gray-300 min-w-0 flex-1 truncate" title={e.text}>{e.text}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 notranslate">{formatDate(e.when)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Πλήρης πίνακας μελών */}
      <MembersTable
        members={data.members}
        currentYear={y}
        canDelete={canDeleteMembers}
        initialPrefs={{ cols: tableCols ?? OC_TABLE_DEFAULT_COLS, density: tableDensity ?? 'comfortable' }}
      />
    </div>
  )
}
