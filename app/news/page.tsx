'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import ScrollToTop from '@/components/ScrollToTop'
import LoadingIndicator from '@/components/LoadingIndicator'
import Link from 'next/link'
import Image from 'next/image'
import { getActivities } from '@/lib/strapi'
import type { StrapiResponse, Activity } from '@/lib/types'
import LocalizedText from '@/components/LocalizedText'
import NewsFlipCard from '@/components/shared/NewsFlipCard'
import BlurredImage from '@/components/shared/BlurredImage'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
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
  { value: 'date-asc', label: 'Πιο πρόσφατες πρώτα' },
  { value: 'date-desc', label: 'Παλαιότερες πρώτα' },
]

const NEWS_STORAGE_KEY = 'cforc-news-search'

function saveNewsSearch(state: Record<string, any>) {
  try { sessionStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(state)) } catch {}
}
function loadNewsSearch() {
  try { const r = sessionStorage.getItem(NEWS_STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null }
}

function ActivitiesPageContent() {
  const searchParams = useSearchParams()
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [sortMode, setSortMode] = useState('date-asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [fundingHovered, setFundingHovered] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Animated counter
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150
      if (scrollPosition <= fadeStart) setAccessibilityButtonScale(1)
      else if (scrollPosition >= fadeEnd) setAccessibilityButtonScale(0)
      else setAccessibilityButtonScale(1 - (scrollPosition - fadeStart) / (fadeEnd - fadeStart))
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // On mount: restore from URL params (priority) or sessionStorage
  useEffect(() => {
    const fromParam = searchParams.get('from')
    const tagParam = searchParams.get('tag')
    const categoryParam = searchParams.get('category')
    const hasUrlParams = fromParam || tagParam || categoryParam

    if (hasUrlParams) {
      if (fromParam === 'previous') setActiveTab('previous')
      else if (fromParam === 'current') setActiveTab('current')
      if (tagParam) setSelectedTag(tagParam)
      if (categoryParam) setSelectedCategory(categoryParam)
      if (tagParam || categoryParam) {
        const url = new URL(window.location.href)
        url.searchParams.delete('tag')
        url.searchParams.delete('category')
        window.history.replaceState({}, '', url.pathname + (url.search || ''))
      }
    } else {
      const saved = loadNewsSearch()
      if (saved) {
        setSearchQuery(saved.searchQuery || '')
        setActiveTab(saved.activeTab || 'current')
        setSelectedCategory(saved.selectedCategory || '')
        setSelectedTag(saved.selectedTag || '')
        setSelectedYear(saved.selectedYear ?? null)
        setSortMode(saved.sortMode || 'date-asc')
        setViewMode(saved.viewMode || 'grid')
      }
    }
    setInitialized(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist search state to sessionStorage
  useEffect(() => {
    if (!initialized) return
    saveNewsSearch({ searchQuery, activeTab, selectedCategory, selectedTag, selectedYear, sortMode, viewMode })
  }, [initialized, searchQuery, activeTab, selectedCategory, selectedTag, selectedYear, sortMode, viewMode])

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true)
        const response: StrapiResponse<Activity[]> = await getActivities()
        setAllActivities(response.data)
      } catch (err) {
        setError('Failed to load activities')
        console.error('Error fetching activities:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [])

  // Auto-switch to "previous" tab if no current entries exist (and no URL param or saved state set a tab)
  useEffect(() => {
    if (allActivities.length > 0 && !searchParams.get('from') && !loadNewsSearch()?.activeTab) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const hasCurrentEntries = allActivities.some(a => new Date(a.Date) >= today)
      if (!hasCurrentEntries) {
        setActiveTab('previous')
      }
    }
  }, [allActivities, searchParams])

  // Derive available categories and years from data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    allActivities.forEach(a => { if (a.Category) cats.add(a.Category) })
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'el'))
  }, [allActivities])

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    allActivities.forEach(a => {
      if (a.Tags) a.Tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t))
    })
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'el'))
  }, [allActivities])

  const availableYears = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const years = new Set<number>()
    allActivities
      .filter(a => activeTab === 'previous' ? new Date(a.Date) < today : new Date(a.Date) >= today)
      .forEach(a => { if (a.Date) years.add(new Date(a.Date).getFullYear()) })
    return Array.from(years).sort((a, b) => b - a)
  }, [allActivities, activeTab])

  // Apply filters
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let result = [...allActivities]

    // Tab filter
    if (activeTab === 'current') {
      result = result.filter(a => new Date(a.Date) >= today)
    } else {
      result = result.filter(a => new Date(a.Date) < today)
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(a => a.Category === selectedCategory)
    }

    // Tag filter
    if (selectedTag) {
      result = result.filter(a => {
        if (!a.Tags) return false
        return a.Tags.split(',').map(t => t.trim()).includes(selectedTag)
      })
    }

    // Year filter
    if (selectedYear) {
      result = result.filter(a => new Date(a.Date).getFullYear() === selectedYear)
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.Title.toLowerCase().includes(q) ||
        extractTextFromBlocks(a.Description).toLowerCase().includes(q) ||
        (a.Tags && a.Tags.toLowerCase().includes(q))
      )
    }

    // Sort
    if (sortMode === 'date-asc') {
      result.sort((a, b) => activeTab === 'current'
        ? new Date(a.Date).getTime() - new Date(b.Date).getTime()
        : new Date(b.Date).getTime() - new Date(a.Date).getTime()
      )
    } else {
      result.sort((a, b) => activeTab === 'current'
        ? new Date(b.Date).getTime() - new Date(a.Date).getTime()
        : new Date(a.Date).getTime() - new Date(b.Date).getTime()
      )
    }

    setFilteredActivities(result)
  }, [allActivities, searchQuery, activeTab, selectedCategory, selectedTag, selectedYear, sortMode])

  // Animated counter
  useEffect(() => {
    const end = filteredActivities.length
    if (end === 0) { setDisplayCount(0); return }
    let start = 0
    const increment = end / (1000 / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) { setDisplayCount(end); clearInterval(timer) }
      else setDisplayCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [filteredActivities])

  // Wrap setActiveTab to reset year on user-initiated tab switches
  const handleTabChange = (tab: 'current' | 'previous') => {
    if (tab !== activeTab) {
      setSelectedYear(null)
    }
    setActiveTab(tab)
  }

  const totalActiveFilters = (selectedCategory ? 1 : 0) + (selectedTag ? 1 : 0) + (selectedYear ? 1 : 0) + (searchQuery ? 1 : 0)

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedTag('')
    setSelectedYear(null)
    try { sessionStorage.removeItem(NEWS_STORAGE_KEY) } catch {}
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                <div>ΝΕΑ</div>
              </h1>
            </div>
            <div
              className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                transform: `translateY(-50%) scale(${accessibilityButtonScale})`,
                opacity: accessibilityButtonScale,
                pointerEvents: accessibilityButtonScale < 0.1 ? 'none' : 'auto'
              }}
            >
              <AccessibilityButton />
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-24 bg-[#F5F0EB] dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading && <LoadingIndicator />}

            {/* Info Box with count */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mb-6 relative shadow-sm">
              <div className="absolute top-8 right-8">
                <div className="bg-white dark:bg-gray-700 px-6 py-3 rounded-full border-2 border-charcoal dark:border-gray-400">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200" aria-live="polite">
                    Αποτελέσματα: <span className="text-coral dark:text-coral-light">{displayCount}</span>
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl">
                Παρακολούθησε τα νέα του Δικτύου Culture for Change: εκδηλώσεις, εργαστήρια, δικτυώσεις, δράσεις συνηγορίας και ενημερωτικά δελτία.
              </p>
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
                  className={`flex-1 min-w-[100px] px-4 py-3 border border-charcoal dark:border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 placeholder-charcoal dark:placeholder-gray-400 transition-all duration-200 ${
                    fundingHovered && activeTab === 'previous' ? 'max-w-[120px]' : 'max-w-[200px]'
                  }`}
                  aria-label="Αναζήτηση νέων"
                />

                {/* Tabs as pills */}
                <div className="flex rounded-full border border-charcoal dark:border-gray-400 overflow-hidden" role="tablist" aria-label="Φίλτρο χρόνου">
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
                    Τρέχοντα
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
                    Προηγούμενα
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

                {/* Tag filter */}
                {availableTags.length > 0 && (
                  <CategoryFilter
                    categories={availableTags}
                    selectedCategory={selectedTag}
                    onCategoryChange={setSelectedTag}
                    label="Ετικέτα"
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
                <FundingGuidelinesModal compact={activeTab === 'previous'} onHoverChange={setFundingHovered} />

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
            {!loading && !error && filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">Δεν βρέθηκαν νέα με τα επιλεγμένα κριτήρια.</p>
              </div>
            )}

            {/* Grid View */}
            {!loading && !error && filteredActivities.length > 0 && viewMode === 'grid' && (
              <div className="grid md:grid-cols-3 gap-8">
                {filteredActivities.map((activity) => (
                  <NewsFlipCard key={activity.id} activity={activity} fromTab={activeTab} />
                ))}
              </div>
            )}

            {/* List View */}
            {!loading && !error && filteredActivities.length > 0 && viewMode === 'list' && (
              <div className="space-y-3">
                {filteredActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/news/${activity.Slug || activity.documentId || activity.id}?from=${activeTab}`}
                    className="flex items-center gap-4 md:gap-6 bg-white dark:bg-gray-800 rounded-2xl p-4 hover:shadow-lg dark:hover:shadow-gray-700/50 transition-all duration-300 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light"
                  >
                    {/* Thumbnail */}
                    {activity.Visuals && activity.Visuals.length > 0 ? (
                      <div className="w-24 h-16 md:w-32 md:h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <BlurredImage
                          src={activity.Visuals[0].url.startsWith('http') ? activity.Visuals[0].url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[0].url}`}
                          alt={activity.ImageAltText || activity.Title}
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-16 md:w-32 md:h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                        <span className="text-gray-400 dark:text-gray-500 text-xl">{activity.Title.charAt(0)}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <time dateTime={activity.Date} className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-0.5 rounded-full text-xs font-medium">
                          {new Date(activity.Date).toLocaleDateString('el-GR')}
                        </time>
                        {activity.Category && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedCategory(activity.Category!) }}
                            className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-2 py-0.5 rounded-full hover:bg-charcoal hover:text-white dark:hover:bg-white dark:hover:text-charcoal transition-colors"
                          >
                            {activity.Category}
                          </button>
                        )}
                        {activity.Tags && (() => {
                          const tags = activity.Tags!.split(',').map(t => t.trim()).filter(Boolean)
                          const visible = tags.slice(0, 3)
                          const extra = tags.length - 3
                          return (
                            <>
                              {visible.map(tag => (
                                <button
                                  key={tag}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedTag(tag) }}
                                  className="inline-block bg-gray-100 dark:bg-gray-700 text-charcoal dark:text-gray-200 border border-charcoal dark:border-gray-400 text-[10px] px-2 py-0.5 rounded-full hover:bg-charcoal hover:text-white dark:hover:bg-white dark:hover:text-charcoal transition-colors"
                                >
                                  {tag}
                                </button>
                              ))}
                              {extra > 0 && <span className="text-[10px] text-gray-400 dark:text-gray-500">+{extra}</span>}
                            </>
                          )
                        })()}
                      </div>
                      <h3 className="text-sm md:text-base font-bold text-charcoal dark:text-gray-100 group-hover:text-coral dark:group-hover:text-coral-light line-clamp-2 transition-colors">
                        <LocalizedText text={activity.Title} engText={activity.EngTitle} />
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <CombinedCtaSection />
      </main>
      <Footer variant="members" />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
        <Navigation />
        <main id="main-content">
          <section className="relative -bottom-20">
            <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                  <div>ΝΕΑ</div>
                </h1>
              </div>
            </div>
          </section>
          <section className="py-24 bg-[#F5F0EB] dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <LoadingIndicator />
            </div>
          </section>
        </main>
        <Footer variant="members" />
      </div>
    }>
      <ActivitiesPageContent />
    </Suspense>
  )
}
