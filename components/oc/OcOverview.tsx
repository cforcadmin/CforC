'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { OcOverviewData, OcMemberRow, OcMemberStatus, OcNewsletterStats } from '@/lib/ocOverview'
import type { OcApplicationSummary } from '@/components/oc/OcShell'
import { OC_TABLE_COLUMNS, OC_TABLE_DEFAULT_COLS } from '@/components/oc/ocPrefs'

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

type SortKey = 'am' | 'name' | 'status'

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
  const [sortKey, setSortKey] = useState<SortKey>('am')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [cols, setCols] = useState<string[]>(initialPrefs.cols)
  const [density, setDensity] = useState<'comfortable' | 'compact'>(initialPrefs.density)
  const [showCols, setShowCols] = useState(false)
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
  }

  function applyDensity(d: 'comfortable' | 'compact') {
    setDensity(d)
    persist({ tableDensity: d })
  }

  const STATUS_ORDER: Record<OcMemberStatus, number> = { 'owes-2': 0, 'owes-1': 1, 'new-unpaid': 2, paid: 3, unknown: 4 }
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || String(m.am) === q)
      : members
    return [...filtered].sort((a, b) =>
      sortKey === 'am' ? a.am - b.am
        : sortKey === 'name' ? a.name.localeCompare(b.name, 'el')
        : STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.am - b.am
    )
  }, [members, query, sortKey])

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
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Αναζήτηση (όνομα, email, ΑΜ)…"
              className="h-9 pl-9 pr-4 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 w-60 transition-colors"
              aria-label="Αναζήτηση μέλους"
            />
          </div>
          <div className="relative">
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="h-9 pl-4 pr-9 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 appearance-none cursor-pointer focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 transition-colors"
              aria-label="Ταξινόμηση"
            >
              <option value="am">Ταξινόμηση: ΑΜ</option>
              <option value="name">Ταξινόμηση: Όνομα</option>
              <option value="status">Ταξινόμηση: Κατάσταση</option>
            </select>
            <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
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
                <div className="absolute right-0 top-full mt-2 z-40 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ορατές στήλες</p>
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
        </div>
      </div>
      {deleteWarn && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">{deleteWarn}</p>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full ${txt}`}>
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
              <th className={`${py} pr-3 font-medium`}>ΑΜ</th>
              <th className={`${py} pr-3 font-medium`}>Ονοματεπώνυμο</th>
              {show('city') && <th className={`${py} pr-3 font-medium hidden md:table-cell`}>Πόλη</th>}
              {show('email') && <th className={`${py} pr-3 font-medium`}>Email</th>}
              {show('phone') && <th className={`${py} pr-3 font-medium`}>Τηλέφωνο</th>}
              {show('regYear') && <th className={`${py} pr-3 font-medium`}>Εγγραφή</th>}
              {show('year') && <th className={`${py} pr-3 font-medium`}>{currentYear}</th>}
              {show('status') && <th className={`${py} pr-3 font-medium`}>Κατάσταση</th>}
              {show('payments') && <th className={`${py} pr-3 font-medium`}>Πληρωμές</th>}
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
  tableCols?: string[]
  tableDensity?: 'comfortable' | 'compact'
}

export default function OcOverview({
  data, applications, canDeleteMembers = false,
  tableCols, tableDensity,
}: OcOverviewProps) {
  const pending = applications.filter(a => a.state === 'submitted')
  const y = data.currentYear
  const [showApproved, setShowApproved] = useState(false)

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Tile value={data.activeMembers} label="Ενεργά μέλη" />
        <Tile
          value={`${data.paidCurrent}/${data.activeMembers}`}
          label={`Πληρωμένο ${y}`}
          accent={data.paidCurrent >= data.activeMembers * 0.7 ? '#2A9D8F' : '#E9A13B'}
        />
        <Tile value={pending.length} label="Εκκρεμείς αιτήσεις" accent={pending.length > 0 ? '#FF8B6A' : undefined} />
        <button
          type="button"
          onClick={() => setShowApproved(true)}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-2xl"
          aria-haspopup="dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow border border-transparent hover:border-coral/40">
            <span className="text-3xl font-bold text-charcoal dark:text-gray-100 notranslate">{data.approvedUnpaidApps}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">Εγκρίθηκαν — αναμονή πληρωμής</span>
            <span className="text-xs text-coral dark:text-coral-light mt-0.5">Προβολή λίστας →</span>
          </div>
        </button>
        <Tile value={data.newThisYear} label={`Νέα μέλη ${y}`} accent="#4A90D9" />
        <Tile value="—" label="Ταμείο" sub="ενημερώνεται από Οικονομικά" />
      </div>

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
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8"
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
            {data.approvedApps.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Καμία εγκεκριμένη αίτηση σε αναμονή πληρωμής. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {data.approvedApps.map(app => (
                  <li key={app.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-600">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal dark:text-gray-200 truncate">{app.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Αίτηση: {formatDate(app.submittedAt)}</p>
                    </div>
                    <Link
                      href={`/oc/applications/${app.id}`}
                      className="text-coral dark:text-coral-light text-sm whitespace-nowrap hover:underline flex-shrink-0"
                    >
                      Άνοιγμα αίτησης →
                    </Link>
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
