'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getOpenCalls } from '@/lib/strapi'
import type { StrapiResponse, OpenCall } from '@/lib/types'
import LocalizedText from '@/components/LocalizedText'
import LoadingIndicator from '@/components/LoadingIndicator'
import BlurredImage from '@/components/shared/BlurredImage'
import ViewToggle from '@/components/shared/ViewToggle'
import CategoryFilter from '@/components/shared/CategoryFilter'
import YearFilter from '@/components/shared/YearFilter'
import SortDropdown from '@/components/shared/SortDropdown'
import FundingGuidelinesModal from '@/components/FundingGuidelinesModal'

function extractTextFromBlocks(blocks: any): string {
  if (!blocks) return ''
  if (typeof blocks === 'string') return blocks
  if (Array.isArray(blocks)) {
    return blocks
      .map((block: any) => {
        if (block.type === 'paragraph' && block.children) {
          return block.children.map((child: any) => child.type === 'link' && child.children ? child.children.map((c: any) => c.text || '').join('') : child.text || '').join('')
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

const SORT_OPTIONS = [
  { value: 'deadline-asc', label: 'Πιο κοντινή προθεσμία' },
  { value: 'deadline-desc', label: 'Πιο μακρινή προθεσμία' },
]

function FlipCard({ call, getImageUrl }: { call: OpenCall; getImageUrl: (call: OpenCall) => string | null }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const [hoverHeight, setHoverHeight] = useState<number | null>(null)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)

  const descriptionText = extractTextFromBlocks(call.Description)
  const engDescriptionText = call.EngDescription ? extractTextFromBlocks(call.EngDescription) : null
  const imageUrl = getImageUrl(call)

  const handleMouseEnter = () => {
    flipTimeout.current = setTimeout(() => {
      // Measure if back needs more space than the grid-assigned height
      const containerH = containerRef.current?.offsetHeight || 0
      const backH = backRef.current?.scrollHeight || 0
      setHoverHeight(backH > containerH ? backH : null)
      setIsFlipped(true)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (flipTimeout.current) clearTimeout(flipTimeout.current)
    setIsFlipped(false)
    setHoverHeight(null)
  }

  return (
    <div
      ref={containerRef}
      className="[perspective:1200px]"
      style={{
        height: hoverHeight ? `${hoverHeight}px` : undefined,
        transition: 'height 0.4s ease',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div className="[backface-visibility:hidden] w-full h-full">
          <a
            href={call.Link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow duration-300 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light flex flex-col h-full"
            aria-label={`${call.Title} (ανοίγει σε νέα καρτέλα)`}
          >
            {imageUrl && (
              <BlurredImage
                src={imageUrl}
                alt={call.ImageAltText || call.Title}
              />
            )}

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <time
                  dateTime={call.Deadline}
                  className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                >
                  {new Date(call.Deadline).toLocaleDateString('el-GR')}
                </time>
                {call.Category && (
                  <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full">
                    {call.Category}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold mb-2 text-charcoal dark:text-gray-100 line-clamp-2">
                <LocalizedText text={call.Title} engText={call.EngTitle} />
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                <LocalizedText text={descriptionText} engText={engDescriptionText} />
              </p>

              <div className="flex-1" />
              <div className="flex items-center justify-end pt-2">
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </a>
        </div>

        {/* Back */}
        <div ref={backRef} className="absolute top-0 left-0 w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <a
            href={call.Link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl dark:shadow-gray-700/50 border-l-4 border-coral dark:border-coral-light flex flex-col"
            aria-label={`${call.Title} — πλήρης περιγραφή (ανοίγει σε νέα καρτέλα)`}
          >
            <div className="p-6 flex flex-col">
              {/* Compact header */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <time
                  dateTime={call.Deadline}
                  className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                >
                  {new Date(call.Deadline).toLocaleDateString('el-GR')}
                </time>
                {call.Category && (
                  <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full">
                    {call.Category}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold mb-3 text-coral dark:text-coral-light line-clamp-1">
                <LocalizedText text={call.Title} engText={call.EngTitle} />
              </h3>

              {/* Full description */}
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                <LocalizedText text={descriptionText} engText={engDescriptionText} />
              </p>

              {/* Link prompt */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-500 dark:text-gray-400">Κάνε κλικ για περισσότερα</span>
                <svg
                  className="w-5 h-5 text-coral dark:text-coral-light"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

const OC_STORAGE_KEY = 'cforc-opencalls-search'

function saveOCSearch(state: Record<string, any>) {
  try { sessionStorage.setItem(OC_STORAGE_KEY, JSON.stringify(state)) } catch {}
}
function loadOCSearch() {
  try { const r = sessionStorage.getItem(OC_STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null }
}

export default function OpenCallsContent() {
  const [allOpenCalls, setAllOpenCalls] = useState<OpenCall[]>([])
  const [filteredCalls, setFilteredCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [sortMode, setSortMode] = useState('deadline-asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [initialized, setInitialized] = useState(false)

  // Animated counter
  const [displayCount, setDisplayCount] = useState(0)

  // On mount: restore from sessionStorage
  useEffect(() => {
    const saved = loadOCSearch()
    if (saved) {
      setSearchQuery(saved.searchQuery || '')
      setActiveTab(saved.activeTab || 'current')
      setSelectedCategory(saved.selectedCategory || '')
      setSelectedYear(saved.selectedYear ?? null)
      setSortMode(saved.sortMode || 'deadline-asc')
      setViewMode(saved.viewMode || 'grid')
    }
    setInitialized(true)
  }, [])

  // Persist search state to sessionStorage
  useEffect(() => {
    if (!initialized) return
    saveOCSearch({ searchQuery, activeTab, selectedCategory, selectedYear, sortMode, viewMode })
  }, [initialized, searchQuery, activeTab, selectedCategory, selectedYear, sortMode, viewMode])

  useEffect(() => {
    async function fetchOpenCalls() {
      try {
        setLoading(true)
        const response: StrapiResponse<OpenCall[]> = await getOpenCalls()
        setAllOpenCalls(response.data)
      } catch (err) {
        setError('Failed to load open calls')
        console.error('Error fetching open calls:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOpenCalls()
  }, [])

  // Derive categories and years
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    allOpenCalls.forEach(c => { if (c.Category) cats.add(c.Category) })
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'el'))
  }, [allOpenCalls])

  const availableYears = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const years = new Set<number>()
    allOpenCalls
      .filter(c => activeTab === 'previous' ? new Date(c.Deadline) < today : new Date(c.Deadline) >= today)
      .forEach(c => { if (c.Deadline) years.add(new Date(c.Deadline).getFullYear()) })
    return Array.from(years).sort((a, b) => b - a)
  }, [allOpenCalls, activeTab])

  // Apply filters
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let result = [...allOpenCalls]

    if (activeTab === 'current') {
      result = result.filter(c => new Date(c.Deadline) >= today)
    } else {
      result = result.filter(c => new Date(c.Deadline) < today)
    }

    if (selectedCategory) {
      result = result.filter(c => c.Category === selectedCategory)
    }

    if (selectedYear) {
      result = result.filter(c => new Date(c.Deadline).getFullYear() === selectedYear)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.Title.toLowerCase().includes(q) ||
        extractTextFromBlocks(c.Description).toLowerCase().includes(q)
      )
    }

    if (sortMode === 'deadline-asc') {
      result.sort((a, b) => activeTab === 'current'
        ? new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime()
        : new Date(b.Deadline).getTime() - new Date(a.Deadline).getTime()
      )
    } else {
      result.sort((a, b) => activeTab === 'current'
        ? new Date(b.Deadline).getTime() - new Date(a.Deadline).getTime()
        : new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime()
      )
    }

    setFilteredCalls(result)
  }, [allOpenCalls, searchQuery, activeTab, selectedCategory, selectedYear, sortMode])

  // Animated counter
  useEffect(() => {
    const end = filteredCalls.length
    if (end === 0) { setDisplayCount(0); return }
    let start = 0
    const increment = end / (1000 / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) { setDisplayCount(end); clearInterval(timer) }
      else setDisplayCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [filteredCalls])

  // Wrap setActiveTab to reset year on user-initiated tab switches
  const handleTabChange = (tab: 'current' | 'previous') => {
    if (tab !== activeTab) {
      setSelectedYear(null)
    }
    setActiveTab(tab)
  }

  const totalActiveFilters = (selectedCategory ? 1 : 0) + (selectedYear ? 1 : 0) + (searchQuery ? 1 : 0)

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedYear(null)
    try { sessionStorage.removeItem(OC_STORAGE_KEY) } catch {}
  }

  function getImageUrl(call: OpenCall): string | null {
    if (!call.Image) return null
    if (Array.isArray(call.Image) && call.Image.length > 0) {
      const url = call.Image[0].url
      return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
    }
    if (typeof call.Image === 'object' && !Array.isArray(call.Image) && 'url' in call.Image) {
      const url = call.Image.url
      return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
    }
    return null
  }

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && <LoadingIndicator />}

        {/* Info Box with count */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Εδώ θα βρεις τις τρέχουσες ευκαιρίες χρηματοδότησης, συνεργασίας και συμμετοχής σε πολιτιστικά προγράμματα. Φιλτράρισε ανά κατηγορία ή αναζήτησε αυτό που σε ενδιαφέρει.
            </p>
            <div className="shrink-0">
              <div className="bg-white dark:bg-gray-700 px-6 py-3 rounded-full border-2 border-charcoal dark:border-gray-400 inline-block">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap" aria-live="polite">
                  Αποτελέσματα: <span className="text-coral dark:text-coral-light">{displayCount}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 mb-12 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Αναζήτηση..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[140px] max-w-[200px] px-4 py-3 border border-charcoal dark:border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 placeholder-charcoal dark:placeholder-gray-400"
              aria-label="Αναζήτηση προσκλήσεων"
            />

            {/* Tabs as pills */}
            <div className="flex rounded-full border border-charcoal dark:border-gray-400 overflow-hidden" role="tablist" aria-label="Φίλτρο κατάστασης">
              <button
                onClick={() => handleTabChange('current')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'current'
                    ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
                }`}
                role="tab"
                aria-selected={activeTab === 'current'}
              >
                Τρέχουσες
              </button>
              <button
                onClick={() => handleTabChange('previous')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-l border-charcoal dark:border-gray-400 ${
                  activeTab === 'previous'
                    ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
                }`}
                role="tab"
                aria-selected={activeTab === 'previous'}
              >
                Προηγούμενες
              </button>
            </div>

            {/* Category */}
            {availableCategories.length > 0 && (
              <CategoryFilter
                categories={availableCategories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            )}

            {/* Year - only in Previous tab */}
            {activeTab === 'previous' && availableYears.length > 0 && (
              <YearFilter
                years={availableYears}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            )}

            {/* Sort */}
            <SortDropdown
              options={SORT_OPTIONS}
              selected={sortMode}
              onSortChange={setSortMode}
            />

            {/* View Toggle */}
            <ViewToggle view={viewMode} onViewChange={setViewMode} />

            {/* Funding Guidelines */}
            <FundingGuidelinesModal />

            {/* Clear filters */}
            {totalActiveFilters > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-3 text-xs font-medium text-coral dark:text-coral-light hover:underline whitespace-nowrap"
              >
                Καθαρισμός φίλτρων ({totalActiveFilters})
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredCalls.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Δεν βρέθηκαν προσκλήσεις με τα επιλεγμένα κριτήρια.</p>
          </div>
        )}

        {/* Grid View */}
        {!loading && !error && filteredCalls.length > 0 && viewMode === 'grid' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCalls.map((call) => (
              <FlipCard key={call.id} call={call} getImageUrl={getImageUrl} />
            ))}
          </div>
        )}

        {/* List View */}
        {!loading && !error && filteredCalls.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            {filteredCalls.map((call) => {
              const descriptionText = extractTextFromBlocks(call.Description)
              const engDescriptionText = call.EngDescription ? extractTextFromBlocks(call.EngDescription) : null

              return (
                <a
                  key={call.id}
                  href={call.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 md:gap-6 bg-white dark:bg-gray-800 rounded-2xl p-4 hover:shadow-lg dark:hover:shadow-gray-700/50 transition-all duration-300 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light"
                  aria-label={`${call.Title} (ανοίγει σε νέα καρτέλα)`}
                >
                  {/* Date + Category badges */}
                  <div className="flex flex-col items-center gap-1 min-w-[80px] flex-shrink-0">
                    <time dateTime={call.Deadline} className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      {new Date(call.Deadline).toLocaleDateString('el-GR')}
                    </time>
                    {call.Category && (
                      <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap max-w-[120px] truncate">
                        {call.Category}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-bold text-charcoal dark:text-gray-100 group-hover:text-coral dark:group-hover:text-coral-light transition-colors line-clamp-1">
                      <LocalizedText text={call.Title} engText={call.EngTitle} />
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      <LocalizedText text={descriptionText} engText={engDescriptionText} />
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-coral dark:group-hover:text-coral-light group-hover:translate-x-1 group-hover:-translate-y-1 transition-all flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
