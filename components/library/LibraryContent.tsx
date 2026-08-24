'use client'

import { useEffect, useMemo, useState } from 'react'
import LoadingIndicator from '@/components/LoadingIndicator'
import FieldsFilter from '@/components/members/FieldsFilter'
import LibraryFileCell from './LibraryFileCell'
import LibraryIntroModal from './LibraryIntroModal'
import LibraryForm from './LibraryForm'
import LibraryReview from './LibraryReview'
import { LIB_COLUMNS, LIB_DEFAULT_COLS } from './libraryPrefs'
import { shortDocType, type LibraryItem } from '@/lib/library'
import { doesFieldMatchFilter } from '@/lib/memberTaxonomy'

type SortKey = 'created' | 'title' | 'theme' | 'subthemes' | 'docType' | 'file' | 'language' | 'year' | 'source' | 'submittedBy'
type Dir = 'asc' | 'desc'

/**
 * ΠΡΟΣΟΧΗ ΣΤΙΣ ΚΛΑΣΕΙΣ: σε αυτό το project κάποιες utility classes του
 * Tailwind δεν φτάνουν στο στοιχείο παρότι υπάρχουν στο CSS (το έχουμε
 * πληρώσει με grid-cols-7 και appearance-none). Ό,τι είναι ΜΗΧΑΝΙΣΜΟΣ
 * διάταξης εδώ μπαίνει με inline style· η θεματοδότηση μένει σε κλάσεις.
 */
/** «Νέο» για 30 μέρες — αντί για shuffle: η ανανέωση φαίνεται χωρίς να
 *  αποδιοργανώνεται ο πίνακας. */
const isNew = (iso: string | null) =>
  !!iso && Date.now() - Date.parse(iso) < 30 * 24 * 3600 * 1000

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
  // Νεότερα πρώτα — οι βιβλιοθηκάριοι θέλουν να φαίνεται ότι ανανεώνεται.
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'created', dir: 'desc' })
  const [editItem, setEditItem] = useState<LibraryItem | null>(null)
  const [guideManual, setGuideManual] = useState(false)
  const [deleteArm, setDeleteArm] = useState<string | null>(null)

  const [introSeen, setIntroSeen] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [librarians, setLibrarians] = useState<Array<{ name: string; until?: string | null }>>([])
  const [isLibrarian, setIsLibrarian] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)

  // Ο σύνδεσμος στο email του Βιβλιοθηκάριου ανοίγει κατευθείαν το τεκμήριο
  useEffect(() => {
    if (!deleteArm) return
    const t = setTimeout(() => setDeleteArm(null), 4000)
    return () => clearTimeout(t)
  }, [deleteArm])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const id = p.get('review')
    if (id) { setFocusId(id); setShowReview(true) }
  }, [])

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
        setLibrarians(list.librarians || [])
        setIsLibrarian(!!list.isLibrarian)
        setPendingCount(list.pendingCount || 0)
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

  async function removeItem(documentId: string) {
    setDeleteArm(null)
    const r = await fetch(`/api/library/manage?documentId=${encodeURIComponent(documentId)}`, { method: 'DELETE' })
    const j = await r.json().catch(() => null)
    if (!r.ok) { setFlash(j?.error || 'Η διαγραφή απέτυχε'); return }
    setFlash('Το τεκμήριο διαγράφηκε. Το αρχείο του είναι στον κάδο του Drive.')
    reload()
  }

  async function reload() {
    const r = await fetch('/api/library')
    if (!r.ok) return
    const j = await r.json()
    setItems(j.items || [])
    setLibrarians(j.librarians || [])
    setIsLibrarian(!!j.isLibrarian)
    setPendingCount(j.pendingCount || 0)
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
        const tags = [
          i.theme, ...i.subthemes,
          ...i.secondaryThemes.flatMap(b => [b.theme, ...b.subthemes]),
        ].join(', ')
        if (!fields.some(f => doesFieldMatchFilter(tags, f))) return false
      }
      return true
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    // Κάθε στήλη ταξινομείται. Τα κενά πάνε ΠΑΝΤΑ τελευταία, ό,τι φορά κι αν
    // έχει η ταξινόμηση: μια στήλη με παύλες στην κορυφή δεν λέει τίποτα.
    const keyOf = (i: LibraryItem): string | number => {
      switch (sort.key) {
        case 'created': return i.submittedAt ?? ''
        case 'year': return i.year ?? Number.NEGATIVE_INFINITY
        case 'docType': return shortDocType(i.docType)
        case 'subthemes': return i.subthemes.join(', ')
        case 'file': return i.fileName ?? ''
        case 'source': return i.sourceUrl ?? ''
        case 'submittedBy': return i.submittedBy ?? ''
        default: return String(i[sort.key] ?? '')
      }
    }
    return out.sort((a, b) => {
      const av = keyOf(a), bv = keyOf(b)
      const aEmpty = av === '' || av === Number.NEGATIVE_INFINITY
      const bEmpty = bv === '' || bv === Number.NEGATIVE_INFINITY
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1
      if (aEmpty && bEmpty) return 0
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), 'el') * dir
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
        {/* pt-24: οι άλλες ενότητες το παίρνουν από το py-24 του component τους */}
        <div className="pt-24 mb-8" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: '1 1 24rem', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-gray-100">
                CforC Ανοιχτή βιβλιοθήκη
              </h2>
              <span className="px-3 py-1 rounded-full border border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                Δοκιμαστική λειτουργία
              </span>
            </div>
            <p className="mt-2 text-base text-gray-600 dark:text-gray-300 max-w-3xl">
              Συλλογικά επιμελημένο υλικό για τον πολιτισμό — μελέτες, οδηγοί, νομοθεσία και
              εργαλεία. Για εσωτερική και εκπαιδευτική χρήση των μελών του δικτύου.
            </p>
          </div>
          <button type="button" onClick={() => setGuideManual(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-charcoal dark:text-gray-200 rounded-full text-sm font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Οδηγίες συμπλήρωσης
          </button>
        </div>
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

          {/* allowSplit=false: το τεκμήριο κρατά πάντα την πλήρη ετικέτα, οπότε
              το βελάκι θα υποσχόταν τρίτο επίπεδο που δεν υπάρχει. */}
          <FieldsFilter selectedFields={fields} onSelectionChange={setFields} allowSplit={false} variant="compact" />

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
                showCols ? 'border-coral ring-2 ring-coral' : 'border-gray-300 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light'
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
                {/* Ίδια λογική με το φίλτρο πεδίων: γυάλινο, ανοίγει πάνω στο κουμπί */}
                <div className="absolute -right-1.5 -top-1.5 z-[60] w-64 menu-glass rounded-xl p-4">
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

          {isLibrarian && (
            <button
              type="button"
              onClick={() => { setFocusId(null); setShowReview(true) }}
              aria-label={pendingCount > 0 ? `Έλεγχος διπλοεγγραφών: ${pendingCount} σε αναμονή` : 'Έλεγχος διπλοεγγραφών και ιστορικό απορρίψεων'}
              className={`h-9 inline-flex items-center gap-2 px-4 rounded-full border text-sm font-medium transition-colors ${
                pendingCount > 0
                  ? 'border-coral text-coral dark:text-coral-light bg-coral/10'
                  : 'border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-100 bg-white dark:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Έλεγχος
              {pendingCount > 0 && (
                <span className="notranslate inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-coral text-white text-[11px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

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
                  {show('subthemes') && <Th label="Υποθεματική" k="subthemes" sort={sort} onSort={toggleSort} py={py} />}
                  {show('docType') && <Th label="Είδος" k="docType" sort={sort} onSort={toggleSort} py={py} />}
                  {show('file') && <Th label="Αρχείο" k="file" sort={sort} onSort={toggleSort} py={py} />}
                  {show('language') && <Th label="Γλώσσα" k="language" sort={sort} onSort={toggleSort} py={py} />}
                  {show('year') && <Th label="Έτος" k="year" sort={sort} onSort={toggleSort} py={py} />}
                  {show('source') && <Th label="Πηγή" k="source" sort={sort} onSort={toggleSort} py={py} />}
                  {show('submittedBy') && <Th label="Καταχώρηση" k="submittedBy" sort={sort} onSort={toggleSort} py={py} />}
                  {isLibrarian && <th className={`${py} px-3 font-medium sr-only`}>Ενέργειες</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(it => (
                  <tr key={it.documentId} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                    <td className={`${py} px-3 max-w-md`}>
                      {/* semibold και όχι medium: η Founders Grotesk δεν έχει
                          ελληνικά και το ελληνικό κείμενο πέφτει σε Arial, όπου
                          το βάρος 500 δεν ξεχωρίζει από το κανονικό. Στο 600 ο
                          browser συνθέτει έντονη Arial και τα ελληνικά
                          «χοντραίνουν» όσο και τα λατινικά. */}
                      {/* Σήμα ΔΕΞΙΑ του τίτλου, στην ίδια γραμμή — μπροστά του
                          έσπαγε σε δική του γραμμή λόγω του line-clamp */}
                      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span
                          title={it.description || undefined}
                          tabIndex={it.description ? 0 : -1}
                          className={`font-semibold text-charcoal dark:text-gray-100 ${it.description ? 'cursor-help decoration-dotted underline-offset-4 hover:underline' : ''}`}
                          style={{ ...CELL_CLAMP, minWidth: 0 }}
                        >
                          {it.title}
                        </span>
                        {isNew(it.submittedAt) && (
                          <span style={{ flexShrink: 0 }} className="px-2 py-0.5 rounded-full bg-coral text-white text-[10px] font-bold uppercase">Νέο</span>
                        )}
                      </span>
                    </td>
                    {show('theme') && (
                      <td className={`${py} px-3 text-gray-600 dark:text-gray-300`}>
                        <span style={CELL_CLAMP}>{it.theme}</span>
                        {it.secondaryThemes.length > 0 && (
                          <span className="block text-xs text-gray-400 dark:text-gray-500" style={CELL_CLAMP}>
                            + {it.secondaryThemes.map(b => b.theme).join(' · ')}
                          </span>
                        )}
                      </td>
                    )}
                    {show('subthemes') && (
                      <td className={`${py} px-3`}>
                        <span className="flex flex-wrap gap-1">
                          {it.subthemes.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light text-[11px] whitespace-nowrap">{s}</span>
                          ))}
                          {it.secondaryThemes.flatMap(b => b.subthemes).map(s => (
                            <span key={'sec-' + s} className="px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-gray-600/50 text-gray-600 dark:text-gray-300 text-[11px] whitespace-nowrap">{s}</span>
                          ))}
                          {it.subthemes.length === 0 && it.secondaryThemes.every(b => !b.subthemes.length) && <span className="text-gray-400">—</span>}
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
                    {isLibrarian && (
                      <td className={`${py} px-3 whitespace-nowrap`}>
                        <button type="button" onClick={() => setEditItem(it)}
                          aria-label={`Επεξεργασία: ${it.title}`} title="Επεξεργασία"
                          className="text-gray-400 hover:text-coral dark:hover:text-coral-light transition-colors mr-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Διαγραφή σε δύο βήματα — όχι native confirm, που
                            μπλοκάρει και δεν έχει δικό μας λεκτικό */}
                        {deleteArm === it.documentId ? (
                          <button type="button" onClick={() => removeItem(it.documentId)}
                            className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold">
                            Οριστικά;
                          </button>
                        ) : (
                          <button type="button" onClick={() => setDeleteArm(it.documentId)}
                            aria-label={`Διαγραφή: ${it.title}`} title="Διαγραφή"
                            className="text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    )}
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
        <LibraryIntroModal onAccept={acceptIntro} onClose={() => setShowIntro(false)} librarians={librarians} />
      )}
      {guideManual && (
        <LibraryIntroModal manual onAccept={() => setGuideManual(false)} onClose={() => setGuideManual(false)} librarians={librarians} />
      )}
      {editItem && (
        <LibraryForm
          editItem={editItem}
          onShowGuide={() => setGuideManual(true)}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null)
            setFlash('Το τεκμήριο ενημερώθηκε.')
            reload()
          }}
        />
      )}
      {showReview && (
        <LibraryReview
          focusId={focusId}
          onDone={reload}
          onClose={() => {
            setShowReview(false); setFocusId(null)
            // Καθαρίζουμε το ?review= ώστε ένα refresh να μην ξανανοίγει το παράθυρο
            const u = new URL(window.location.href)
            if (u.searchParams.has('review')) {
              u.searchParams.delete('review')
              window.history.replaceState({}, '', u.toString())
            }
          }}
        />
      )}
      {showForm && (
        <LibraryForm
          onShowGuide={() => setGuideManual(true)}
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
    <th className={`${py} px-3 font-medium`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)}
        aria-label={`Ταξινόμηση κατά ${label}${active ? (sort.dir === 'asc' ? ', αύξουσα' : ', φθίνουσα') : ''}`}
        className={`inline-flex items-center gap-1 hover:text-coral transition-colors ${active ? 'text-coral dark:text-coral-light font-bold' : ''}`}>
        {label}
        <span className="text-[9px]" aria-hidden="true">
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : <span className="opacity-30">▲</span>}
        </span>
      </button>
    </th>
  )
}
