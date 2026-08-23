'use client'

import { useEffect, useMemo, useState } from 'react'
import LoadingIndicator from '@/components/LoadingIndicator'
import FieldsFilter from '@/components/members/FieldsFilter'
import LibraryFileCell from './LibraryFileCell'
import LibraryIntroModal from './LibraryIntroModal'
import LibraryForm from './LibraryForm'
import { LIB_COLUMNS, LIB_DEFAULT_COLS } from './libraryPrefs'
import { shortDocType, type LibraryItem } from '@/lib/library'
import { doesFieldMatchFilter } from '@/lib/memberTaxonomy'

type SortKey = 'title' | 'theme' | 'docType' | 'year' | 'language'
type Dir = 'asc' | 'desc'

/**
 * ΠΡΟΣΟΧΗ ΣΤΙΣ ΚΛΑΣΕΙΣ: σε αυτό το project κάποιες utility classes του
 * Tailwind δεν φτάνουν στο στοιχείο παρότι υπάρχουν στο CSS (το έχουμε
 * πληρώσει με grid-cols-7 και appearance-none). Ό,τι είναι ΜΗΧΑΝΙΣΜΟΣ
 * διάταξης εδώ μπαίνει με inline style· η θεματοδότηση μένει σε κλάσεις.
 */
const CELL_CLAMP: React.CSSProperties = {
  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  overflow: 'hidden', textOverflow: 'ellipsis',
}

export default function LibraryContent() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cols, setCols] = useState<string[]>(LIB_DEFAULT_COLS)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [showCols, setShowCols] = useState(false)

  const [query, setQuery] = useState('')
  const [fields, setFields] = useState<string[]>([])
  const [docType, setDocType] = useState('')
  const [language, setLanguage] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'title', dir: 'asc' })

  const [introSeen, setIntroSeen] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [listRes, prefRes] = await Promise.all([
          fetch('/api/library'),
          fetch('/api/library/prefs'),
        ])
        if (!listRes.ok) throw new Error('load')
        const list = await listRes.json()
        const prefs = prefRes.ok ? await prefRes.json() : null
        if (!alive) return
        setItems(list.items || [])
        if (prefs?.cols) setCols(prefs.cols)
        if (prefs?.density) setDensity(prefs.density)
        if (prefs?.introSeen) setIntroSeen(true)
      } catch {
        if (alive) setError('Δεν ήταν δυνατή η φόρτωση της βιβλιοθήκης')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /** Το ενημερωτικό εμφανίζεται μία φορά — εκτός αν το μέλος ζητήσει αλλιώς */
  const startAdd = () => (introSeen ? setShowForm(true) : setShowIntro(true))

  const acceptIntro = (dontShowAgain: boolean) => {
    setShowIntro(false)
    setShowForm(true)
    if (dontShowAgain) { setIntroSeen(true); persist({ introSeen: true }) }
  }

  async function reload() {
    const r = await fetch('/api/library')
    if (r.ok) setItems((await r.json()).items || [])
  }

  const persist = (body: Record<string, unknown>) =>
    fetch('/api/library/prefs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => { /* η προτίμηση δεν αξίζει σφάλμα στην οθόνη */ })

  const show = (k: string) => cols.includes(k)
  const toggleCol = (k: string) => {
    const next = show(k) ? cols.filter(c => c !== k) : [...cols, k]
    setCols(next); persist({ cols: next })
  }
  const applyDensity = (d: 'comfortable' | 'compact') => { setDensity(d); persist({ density: d }) }
  const toggleSort = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  const docTypes = useMemo(
    () => [...new Set(items.map(i => i.docType).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'el')),
    [items])
  const languages = useMemo(
    () => [...new Set(items.map(i => i.language).filter(Boolean) as string[])].sort(),
    [items])

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('el')
    const out = items.filter(i => {
      if (q && !(`${i.title} ${i.description ?? ''}`.toLocaleLowerCase('el').includes(q))) return false
      if (docType && i.docType !== docType) return false
      if (language && i.language !== language) return false
      if (fields.length) {
        // Η ίδια λογική με τα φίλτρα των μελών: κατηγορία ταιριάζει και με
        // τις υποκατηγορίες της, ώστε «Τέχνες & Πολιτισμός» να πιάνει και
        // το «Χειροτεχνία».
        const tags = [i.theme, ...i.subthemes].join(', ')
        if (!fields.some(f => doesFieldMatchFilter(tags, f))) return false
      }
      return true
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    return out.sort((a, b) => {
      if (sort.key === 'year') return ((a.year ?? 0) - (b.year ?? 0)) * dir
      const av = String(sort.key === 'docType' ? shortDocType(a.docType) : a[sort.key] ?? '')
      const bv = String(sort.key === 'docType' ? shortDocType(b.docType) : b[sort.key] ?? '')
      return av.localeCompare(bv, 'el') * dir
    })
  }, [items, query, docType, language, fields, sort])

  const py = density === 'compact' ? 'py-1.5' : 'py-3'
  const txt = density === 'compact' ? 'text-xs' : 'text-sm'
  const RESET_SELECT: React.CSSProperties = {
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    backgroundImage: 'none', paddingRight: '2rem',
  }
  const selectCls = 'h-9 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-4 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'

  if (loading) return <section className="py-24"><LoadingIndicator /></section>

  return (
    <section className="pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-2xl p-6 text-center mb-8">
            <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
          </div>
        )}

        {/* Φίλτρα */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[14rem]">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Αναζήτηση σε τίτλο και περιγραφή…"
              aria-label="Αναζήτηση στη βιβλιοθήκη"
              className="w-full h-9 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>

          <FieldsFilter selectedFields={fields} onSelectionChange={setFields} />

          <div className="relative">
            <select value={docType} onChange={e => setDocType(e.target.value)}
              aria-label="Είδος αρχείου" className={selectCls} style={RESET_SELECT}>
              <option value="">Κάθε είδος</option>
              {docTypes.map(d => <option key={d} value={d}>{shortDocType(d)}</option>)}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
          </div>

          <div className="relative">
            <select value={language} onChange={e => setLanguage(e.target.value)}
              aria-label="Γλώσσα" className={selectCls} style={RESET_SELECT}>
              <option value="">Κάθε γλώσσα</option>
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
          </div>

          {/* Στήλες */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCols(v => !v)}
              aria-expanded={showCols}
              className={`h-9 inline-flex items-center gap-2 px-4 text-sm font-medium rounded-full border bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 transition-colors ${
                showCols ? 'border-coral ring-2 ring-coral/30' : 'border-gray-300 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light'
              }`}
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h13M21 17h-1" />
                <circle cx="16" cy="7" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="19" cy="17" r="2" />
              </svg>
              Στήλες
            </button>
            {showCols && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowCols(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-2 z-40 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ορατές στήλες</p>
                  <div className="space-y-1.5 mb-4">
                    {LIB_COLUMNS.map(c => (
                      <label key={c.key} className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200 cursor-pointer">
                        <input type="checkbox" checked={show(c.key)} onChange={() => toggleCol(c.key)} className="accent-[#FF8B6A]" />
                        {c.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Πυκνότητα</p>
                  <div className="flex gap-2">
                    {([['comfortable', 'Άνετη'], ['compact', 'Συμπαγής']] as const).map(([d, label]) => (
                      <button key={d} type="button" onClick={() => applyDensity(d)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                          density === d ? 'bg-coral text-white border-coral' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-coral'
                        }`}>{label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={startAdd}
            aria-label="Προσθήκη τεκμηρίου"
            title="Προσθήκη τεκμηρίου"
            className="h-9 inline-flex items-center gap-2 px-4 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            Προσθήκη
          </button>
        </div>

        {flash && (
          <div className="rounded-2xl border border-coral/40 bg-coral/10 dark:bg-coral/20 px-5 py-4 mb-5 flex items-start gap-3">
            <span aria-hidden="true">✓</span>
            <p className="text-sm text-charcoal dark:text-gray-100 flex-1">{flash}</p>
            <button type="button" onClick={() => setFlash(null)} aria-label="Κλείσιμο"
              className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 leading-none">×</button>
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span className="notranslate">{rows.length}</span>
          {rows.length === items.length ? ' τεκμήρια' : <> από <span className="notranslate">{items.length}</span> τεκμήρια</>}
        </p>

        {items.length === 0 && !error ? (
          <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 p-14 text-center">
            <p className="text-lg font-bold text-charcoal dark:text-gray-100 mb-1">Η βιβλιοθήκη είναι ακόμη άδεια</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Το πρώτο τεκμήριο μπορεί να είναι δικό σου.</p>
            <button type="button" onClick={startAdd}
              className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 transition-colors">
              Προσθήκη τεκμηρίου
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className={`w-full ${txt}`}>
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                  <Th label="Τίτλος" k="title" sort={sort} onSort={toggleSort} py={py} />
                  {show('theme') && <Th label="Θεματική" k="theme" sort={sort} onSort={toggleSort} py={py} />}
                  {show('subthemes') && <th className={`${py} px-3 font-medium`}>Υποθεματική</th>}
                  {show('docType') && <Th label="Είδος" k="docType" sort={sort} onSort={toggleSort} py={py} />}
                  {show('file') && <th className={`${py} px-3 font-medium`}>Αρχείο</th>}
                  {show('language') && <Th label="Γλώσσα" k="language" sort={sort} onSort={toggleSort} py={py} />}
                  {show('year') && <Th label="Έτος" k="year" sort={sort} onSort={toggleSort} py={py} />}
                  {show('source') && <th className={`${py} px-3 font-medium`}>Πηγή</th>}
                  {show('submittedBy') && <th className={`${py} px-3 font-medium`}>Καταχώρηση</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(it => (
                  <tr key={it.documentId} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                    <td className={`${py} px-3 max-w-md`}>
                      {/* Ο τίτλος κρατά την περιγραφή σε tooltip — title ώστε να
                          δουλεύει και με πληκτρολόγιο και σε κινητό με long-press */}
                      <span
                        title={it.description || undefined}
                        tabIndex={it.description ? 0 : -1}
                        className={`font-medium text-charcoal dark:text-gray-100 ${it.description ? 'cursor-help decoration-dotted underline-offset-4 hover:underline' : ''}`}
                        style={CELL_CLAMP}
                      >
                        {it.title}
                      </span>
                    </td>
                    {show('theme') && <td className={`${py} px-3 text-gray-600 dark:text-gray-300`} style={CELL_CLAMP}>{it.theme}</td>}
                    {show('subthemes') && (
                      <td className={`${py} px-3`}>
                        <span className="flex flex-wrap gap-1">
                          {it.subthemes.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light text-[11px] whitespace-nowrap">{s}</span>
                          ))}
                          {it.subthemes.length === 0 && <span className="text-gray-400">—</span>}
                        </span>
                      </td>
                    )}
                    {show('docType') && <td className={`${py} px-3 text-gray-600 dark:text-gray-300`} title={it.docType} style={CELL_CLAMP}>{shortDocType(it.docType)}</td>}
                    {show('file') && <td className={`${py} px-3 whitespace-nowrap`}><LibraryFileCell fileId={it.fileId} fileName={it.fileName} mimeType={it.mimeType} /></td>}
                    {show('language') && <td className={`${py} px-3 text-gray-600 dark:text-gray-300 whitespace-nowrap`}>{it.language || '—'}</td>}
                    {show('year') && <td className={`${py} px-3 text-gray-600 dark:text-gray-300 notranslate`}>{it.year ?? '—'}</td>}
                    {show('source') && (
                      <td className={`${py} px-3`}>
                        {it.sourceUrl
                          ? <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" title={it.sourceUrl}
                              className="text-coral hover:underline dark:text-coral-light">Εκδότης&nbsp;↗</a>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    )}
                    {show('submittedBy') && <td className={`${py} px-3 text-gray-500 dark:text-gray-400`} style={CELL_CLAMP}>{it.submittedBy || '—'}</td>}
                  </tr>
                ))}
                {rows.length === 0 && items.length > 0 && (
                  <tr><td colSpan={9} className="py-14 text-center text-gray-500 dark:text-gray-400">
                    Κανένα τεκμήριο με αυτά τα φίλτρα.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showIntro && (
        <LibraryIntroModal onAccept={acceptIntro} onClose={() => setShowIntro(false)} />
      )}
      {showForm && (
        <LibraryForm
          onClose={() => setShowForm(false)}
          onSaved={result => {
            setShowForm(false)
            setFlash(result.state === 'pending'
              ? `Λάβαμε το τεκμήριο. Ο τίτλος μοιάζει με «${result.duplicateOf?.title ?? 'υπάρχον τεκμήριο'}», οπότε θα το ελέγξει ο Βιβλιοθηκάριος πριν δημοσιευτεί.`
              : 'Το τεκμήριο καταχωρήθηκε και είναι ήδη ορατό σε όλα τα μέλη. Ευχαριστούμε!')
            reload()
          }}
        />
      )}
    </section>
  )
}

function Th({ label, k, sort, onSort, py }: {
  label: string; k: SortKey; sort: { key: SortKey; dir: Dir }; onSort: (k: SortKey) => void; py: string
}) {
  const active = sort.key === k
  return (
    <th className={`${py} px-3 font-medium`}>
      <button type="button" onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-coral transition-colors ${active ? 'text-coral dark:text-coral-light font-bold' : ''}`}>
        {label}
        {active && <span className="text-[9px]" aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  )
}
