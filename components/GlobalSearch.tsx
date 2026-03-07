'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'

type ContentType = 'members' | 'activities' | 'open-calls' | 'pages'

const ALL_TYPES: ContentType[] = ['members', 'activities', 'open-calls', 'pages']

interface SearchResults {
  members: Array<{
    id: number
    documentId: string
    name: string
    slug: string
    fieldsOfWork: string
    city: string
    imageUrl: string | null
  }>
  activities: Array<{
    id: number
    documentId: string
    title: string
    slug: string
    category: string
    date: string
    imageUrl: string | null
  }>
  openCalls: Array<{
    id: number
    documentId: string
    title: string
    slug: string
    category: string
    date: string
    imageUrl: string | null
  }>
  pages: Array<{
    title: string
    href: string
  }>
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  members: 'Μέλη',
  activities: 'Νέα',
  'open-calls': 'Ανοιχτές Προσκλήσεις',
  pages: 'Σελίδες',
}

const SECTION_LABELS: Record<string, string> = {
  members: 'Μέλη',
  activities: 'Νέα',
  openCalls: 'Ανοιχτές Προσκλήσεις',
  pages: 'Σελίδες',
}

export default function GlobalSearch({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<ContentType[]>([...ALL_TYPES])
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [hoveredLocked, setHoveredLocked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { isAuthenticated } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()

  const allSelectableTypes = isAuthenticated ? ALL_TYPES : ALL_TYPES.filter(t => t !== 'open-calls')
  const allSelected = allSelectableTypes.every(t => activeTypes.includes(t))

  // Build flat list of all result items for keyboard navigation
  const getAllItems = useCallback((): Array<{ href: string; type: string }> => {
    if (!results) return []
    const items: Array<{ href: string; type: string }> = []

    if (activeTypes.includes('members')) {
      results.members.forEach(m => items.push({ href: `/members/${m.slug}`, type: 'members' }))
    }
    if (activeTypes.includes('activities')) {
      results.activities.forEach(a => items.push({ href: `/news/${a.slug || a.documentId || a.id}`, type: 'activities' }))
    }
    if (activeTypes.includes('open-calls') && isAuthenticated) {
      results.openCalls.forEach(oc => items.push({ href: `/open-calls/${oc.slug || oc.documentId || oc.id}`, type: 'openCalls' }))
    }
    if (activeTypes.includes('pages')) {
      results.pages.forEach(p => items.push({ href: p.href, type: 'pages' }))
    }
    return items
  }, [results, activeTypes, isAuthenticated])

  // Focus input when modal opens — restore previous search from sessionStorage
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      const savedQuery = sessionStorage.getItem('globalSearchQuery')
      const savedResults = sessionStorage.getItem('globalSearchResults')
      const savedTypes = sessionStorage.getItem('globalSearchTypes')
      if (savedQuery) {
        setQuery(savedQuery)
        if (savedResults) {
          try { setResults(JSON.parse(savedResults)) } catch { setResults(null) }
        }
        if (savedTypes) {
          try { setActiveTypes(JSON.parse(savedTypes)) } catch { /* keep default */ }
        }
      } else {
        setQuery('')
        setResults(null)
      }
      setSelectedIndex(-1)
      setHoveredLocked(false)
    }
  }, [isOpen])

  // Save search state to sessionStorage when it changes
  useEffect(() => {
    if (query && query.length >= 2) {
      sessionStorage.setItem('globalSearchQuery', query)
      if (results) sessionStorage.setItem('globalSearchResults', JSON.stringify(results))
      sessionStorage.setItem('globalSearchTypes', JSON.stringify(activeTypes))
    }
  }, [query, results, activeTypes])

  // Clear persisted search after 5 minutes of inactivity
  useEffect(() => {
    if (!isOpen && sessionStorage.getItem('globalSearchQuery')) {
      const timeout = setTimeout(() => {
        sessionStorage.removeItem('globalSearchQuery')
        sessionStorage.removeItem('globalSearchResults')
        sessionStorage.removeItem('globalSearchTypes')
      }, 5 * 60 * 1000)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.length < 2) {
      setResults(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const typesParam = activeTypes.join(',')
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&types=${typesParam}&includeOpenCalls=${isAuthenticated}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setSelectedIndex(-1)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, activeTypes, isAuthenticated])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = getAllItems()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : items.length - 1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
      e.preventDefault()
      router.push(items[selectedIndex].href)
      onClose()
    }
  }

  const toggleType = (type: ContentType) => {
    if (type === 'open-calls' && !isAuthenticated) {
      // Navigate to login with return URL that will re-open search modal
      const returnTo = `${pathname}?search=1`
      onClose()
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    setActiveTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev // keep at least one
        return prev.filter(t => t !== type)
      }
      return [...prev, type]
    })
  }

  const selectAll = () => {
    if (isAuthenticated) {
      setActiveTypes([...ALL_TYPES])
    } else {
      setActiveTypes(ALL_TYPES.filter(t => t !== 'open-calls'))
    }
  }

  const deselectAll = () => {
    // Keep only 'pages' as minimum
    setActiveTypes(['pages'])
  }

  const handleResultClick = () => {
    onClose()
  }

  const getImageSrc = (url: string | null) => {
    if (!url) return null
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }

  const hasResults = results && (
    results.members.length > 0 ||
    results.activities.length > 0 ||
    results.openCalls.length > 0 ||
    results.pages.length > 0
  )

  const hasNoResults = results && !hasResults && query.length >= 2

  if (!isOpen) return null

  // Track item index across all sections for keyboard navigation
  let itemIndex = -1

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] sm:pt-[15vh] p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Αναζήτηση"
        className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[75vh] flex flex-col animate-flyIn"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Αναζήτηση σε μέλη, νέα, σελίδες..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-base bg-transparent border-none outline-none text-charcoal dark:text-gray-200 placeholder-charcoal/70 dark:placeholder-white/70 focus:ring-2 focus:ring-coral dark:focus:ring-coral-light rounded-full px-2 py-1"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null); sessionStorage.removeItem('globalSearchQuery'); sessionStorage.removeItem('globalSearchResults'); sessionStorage.removeItem('globalSearchTypes') }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Καθαρισμός"
            >
              <svg className="w-4 h-4 text-charcoal dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <kbd className="px-1.5 py-0.5 bg-charcoal/10 dark:bg-white/15 text-charcoal dark:text-white rounded text-[10px] font-mono font-bold border border-charcoal/20 dark:border-white/30">ESC</kbd>
          </div>
        </div>

        {/* Content Type Chips + Select/Deselect All */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]).map(([type, label]) => {
              const isActive = activeTypes.includes(type)
              const isOpenCallsLocked = type === 'open-calls' && !isAuthenticated

              return (
                <div key={type} className="relative group/chip">
                  <button
                    onClick={() => toggleType(type)}
                    onMouseEnter={() => isOpenCallsLocked && setHoveredLocked(true)}
                    onMouseLeave={() => isOpenCallsLocked && setHoveredLocked(false)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      isOpenCallsLocked
                        ? hoveredLocked
                          ? 'border-coral dark:border-coral-light bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light cursor-pointer'
                          : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                        : isActive
                          ? 'border-charcoal dark:border-white bg-charcoal dark:bg-white text-white dark:text-gray-900'
                          : 'border-charcoal dark:border-gray-400 bg-white dark:bg-gray-800 text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isOpenCallsLocked && !hoveredLocked && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                      {isOpenCallsLocked && hoveredLocked ? 'Κλικ για σύνδεση' : label}
                    </span>
                  </button>
                  {/* Tooltip for locked open calls */}
                  {isOpenCallsLocked && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/chip:opacity-100 transition-opacity duration-200 z-50">
                      Διαθέσιμο μόνο για εγγεγραμμένα μέλη
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-charcoal dark:border-t-gray-100" />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Separator */}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Select All / Deselect All */}
            {!allSelected ? (
              <button
                onClick={selectAll}
                className="px-2 py-1.5 text-xs text-coral dark:text-coral-light hover:underline font-medium whitespace-nowrap"
              >
                Επιλογή όλων
              </button>
            ) : (
              <button
                onClick={deselectAll}
                className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:underline font-medium whitespace-nowrap"
              >
                Αποεπιλογή
              </button>
            )}
          </div>

          {/* Info line — how chips look */}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-charcoal dark:text-white font-medium">
            <span className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-full border ${
                theme === 'dark'
                  ? 'border-white bg-white'
                  : 'border-charcoal bg-charcoal'
              }`} />
              {theme === 'dark' ? 'Λευκό' : 'Μαύρο'} = ενεργό
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-full border ${
                theme === 'dark'
                  ? 'border-gray-400 bg-gray-800'
                  : 'border-charcoal bg-white'
              }`} />
              {theme === 'dark' ? 'Σκούρο' : 'Λευκό'} = ανενεργό
            </span>
            {allSelected && (
              <>
                <span className="text-charcoal/40 dark:text-white/40">|</span>
                <span>Αναζήτηση σε όλες τις κατηγορίες</span>
              </>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 py-2">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <svg className="w-5 h-5 text-coral animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {/* No results */}
          {!isLoading && hasNoResults && (
            <div className="text-center py-8 px-6">
              <p className="text-gray-500 dark:text-gray-400">Δεν βρέθηκαν αποτελέσματα για &laquo;{query}&raquo;</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Δοκίμασε διαφορετικούς όρους αναζήτησης</p>
            </div>
          )}

          {/* Results sections */}
          {!isLoading && hasResults && (
            <>
              {/* Members */}
              {activeTypes.includes('members') && results!.members.length > 0 && (
                <ResultSection label={SECTION_LABELS.members} count={results!.members.length}>
                  {results!.members.map((member) => {
                    itemIndex++
                    const idx = itemIndex
                    const imgSrc = getImageSrc(member.imageUrl)
                    return (
                      <Link
                        key={member.id}
                        href={`/members/${member.slug}`}
                        onClick={handleResultClick}
                        className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                          selectedIndex === idx
                            ? 'bg-charcoal/10 dark:bg-gray-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        {imgSrc ? (
                          <div className="w-9 h-9 relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                            <Image src={imgSrc} alt={member.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-sm">{member.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal dark:text-gray-100 truncate">{member.name}</p>
                          {member.fieldsOfWork && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.fieldsOfWork}</p>
                          )}
                        </div>
                        {member.city && member.city !== '-' && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{member.city}</span>
                        )}
                      </Link>
                    )
                  })}
                </ResultSection>
              )}

              {/* Activities */}
              {activeTypes.includes('activities') && results!.activities.length > 0 && (
                <ResultSection label={SECTION_LABELS.activities} count={results!.activities.length}>
                  {results!.activities.map((activity) => {
                    itemIndex++
                    const idx = itemIndex
                    return (
                      <Link
                        key={activity.id}
                        href={`/news/${activity.slug || activity.documentId || activity.id}`}
                        onClick={handleResultClick}
                        className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                          selectedIndex === idx
                            ? 'bg-charcoal/10 dark:bg-gray-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal dark:text-gray-100 truncate">{activity.title}</p>
                          <div className="flex items-center gap-2">
                            {activity.category && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{activity.category}</span>
                            )}
                            {activity.date && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {new Date(activity.date).toLocaleDateString('el-GR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </ResultSection>
              )}

              {/* Open Calls */}
              {activeTypes.includes('open-calls') && isAuthenticated && results!.openCalls.length > 0 && (
                <ResultSection label={SECTION_LABELS.openCalls} count={results!.openCalls.length}>
                  {results!.openCalls.map((oc) => {
                    itemIndex++
                    const idx = itemIndex
                    return (
                      <Link
                        key={oc.id}
                        href={`/open-calls/${oc.slug || oc.documentId || oc.id}`}
                        onClick={handleResultClick}
                        className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                          selectedIndex === idx
                            ? 'bg-charcoal/10 dark:bg-gray-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-charcoal/10 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-charcoal dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal dark:text-gray-100 truncate">{oc.title}</p>
                          <div className="flex items-center gap-2">
                            {oc.category && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{oc.category}</span>
                            )}
                            {oc.date && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {new Date(oc.date).toLocaleDateString('el-GR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </ResultSection>
              )}

              {/* Pages */}
              {activeTypes.includes('pages') && results!.pages.length > 0 && (
                <ResultSection label={SECTION_LABELS.pages} count={results!.pages.length}>
                  {results!.pages.map((page) => {
                    itemIndex++
                    const idx = itemIndex
                    return (
                      <Link
                        key={page.href}
                        href={page.href}
                        onClick={handleResultClick}
                        className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                          selectedIndex === idx
                            ? 'bg-charcoal/10 dark:bg-gray-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-charcoal dark:text-gray-100">{page.title}</p>
                      </Link>
                    )
                  })}
                </ResultSection>
              )}
            </>
          )}

          {/* Initial state — no query */}
          {!query && (
            <div className="text-center py-8 px-6">
              <p className="text-sm text-charcoal dark:text-white">Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες για αναζήτηση</p>
            </div>
          )}

          {/* Typing but not enough chars */}
          {query && query.length < 2 && (
            <div className="text-center py-8 px-6">
              <p className="text-sm text-charcoal dark:text-white">Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-charcoal dark:text-white font-medium">
          <div className="flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-charcoal/10 dark:bg-white/15 text-charcoal dark:text-white rounded text-[10px] font-mono font-bold border border-charcoal/20 dark:border-white/30">↑↓</kbd>
                πλοήγηση
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-charcoal/10 dark:bg-white/15 text-charcoal dark:text-white rounded text-[10px] font-mono font-bold border border-charcoal/20 dark:border-white/30">Enter</kbd>
                άνοιγμα
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-charcoal/10 dark:bg-white/15 text-charcoal dark:text-white rounded text-[10px] font-mono font-bold border border-charcoal/20 dark:border-white/30">⌘K</kbd>
                αναζήτηση
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-charcoal/10 dark:bg-white/15 text-charcoal dark:text-white rounded text-[10px] font-mono font-bold border border-charcoal/20 dark:border-white/30">ESC</kbd>
              κλείσιμο
            </span>
          </div>
          {hasResults && (
            <p className="mt-1.5 text-[11px] text-charcoal/60 dark:text-white/50 hidden sm:block">
              Μετά το άνοιγμα αποτελέσματος, πάτα ξανά το εικονίδιο αναζήτησης ή <kbd className="font-mono text-[10px]">⌘K</kbd> / <kbd className="font-mono text-[10px]">Ctrl+K</kbd> για να επιστρέψεις στην αναζήτηση
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultSection({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-6 py-2 flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500">({count})</span>
      </div>
      {children}
    </div>
  )
}
