'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollToTop from '@/components/ScrollToTop'
import LoadingIndicator from '@/components/LoadingIndicator'
import Link from 'next/link'
import Image from 'next/image'
import { getActivities } from '@/lib/strapi'
import type { StrapiResponse, Activity } from '@/lib/types'

// Helper function to extract text from Strapi rich text blocks
function extractTextFromBlocks(blocks: any): string {
  if (!blocks) return ''
  if (typeof blocks === 'string') return blocks

  if (Array.isArray(blocks)) {
    return blocks
      .map((block: any) => {
        if (block.type === 'paragraph' && block.children) {
          return block.children.map((child: any) => child.text || '').join('')
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }

  return ''
}

function ActivitiesPageContent() {
  const searchParams = useSearchParams()
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGreek, setIsGreek] = useState(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current')

  // Set initial tab based on query parameter
  useEffect(() => {
    const fromParam = searchParams.get('from')
    if (fromParam === 'previous') {
      setActiveTab('previous')
    } else if (fromParam === 'current') {
      setActiveTab('current')
    }
  }, [searchParams])

  // Detect language changes (e.g., Google Translate)
  useEffect(() => {
    const checkLanguage = () => {
      const lang = document.documentElement.lang
      setIsGreek(lang === 'el' || lang === 'el-GR' || lang === '')
    }

    checkLanguage()

    // Check periodically for language changes
    const interval = setInterval(checkLanguage, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true)

        const response: StrapiResponse<Activity[]> = await getActivities()
        setAllActivities(response.data)
        setFilteredActivities(response.data)
      } catch (err) {
        setError('Failed to load activities')
        console.error('Error fetching activities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let result = [...allActivities]

    // Filter by date based on active tab
    if (activeTab === 'current') {
      // Current activities: date is today or in the future
      result = result.filter(activity => new Date(activity.Date) >= today)
      // Sort by closest date first
      result.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())
    } else {
      // Previous activities: date has passed
      result = result.filter(activity => new Date(activity.Date) < today)
      // Sort by closest to current date first (most recent date first)
      result.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
    }

    // Apply search filter (search in both title and description)
    if (searchQuery) {
      const descriptionTextMap = new Map(
        result.map(activity => [activity.id, extractTextFromBlocks(activity.Description)])
      )

      result = result.filter(activity =>
        activity.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        descriptionTextMap.get(activity.id)?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredActivities(result)
  }, [allActivities, searchQuery, activeTab])

  return (
    <main className="min-h-screen dark:bg-gray-900">
      <Navigation />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
              <div>ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</div>
            </h1>
          </div>
        </div>
      </section>

      {/* Activities Section with Filtering */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Indicator */}
          {loading && <LoadingIndicator />}

          {/* Tabs and Search Section */}
          <div className="mb-12">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('current')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'current'
                    ? 'text-coral dark:text-coral-light border-b-2 border-coral dark:border-coral-light'
                    : 'text-gray-600 dark:text-gray-400 hover:text-coral dark:hover:text-coral-light'
                }`}
              >
                Τρέχουσες
              </button>
              <button
                onClick={() => setActiveTab('previous')}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === 'previous'
                    ? 'text-coral dark:text-coral-light border-b-2 border-coral dark:border-coral-light'
                    : 'text-gray-600 dark:text-gray-400 hover:text-coral dark:hover:text-coral-light'
                }`}
              >
                Προηγούμενες
              </button>
            </div>

            {/* Search - Only show for Greek language */}
            {isGreek && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-md dark:shadow-gray-900">
                <div className="max-w-xl">
                  <label htmlFor="search" className="block text-sm font-medium text-charcoal dark:text-gray-200 mb-2">
                    Αναζήτηση
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="Αναζήτηση κατά λέξη..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent"
                  />
                </div>

                {/* Results count */}
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  Βρέθηκαν {filteredActivities.length} δραστηριότητες
                </div>
              </div>
            )}
          </div>

          {/* Error State */}
          {error && !loading && (
            <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
              <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && filteredActivities.length === 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center">
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                Δεν βρέθηκαν δραστηριότητες με αυτά τα κριτήρια
              </p>
            </div>
          )}

          {/* Activities Grid */}
          {!loading && !error && filteredActivities.length > 0 && (
            <div className="grid md:grid-cols-3 gap-10">
              {filteredActivities.map((activity) => {
                // Create slug from title
                const slug = activity.Title.toLowerCase()
                  .replace(/[^\w\s-]/g, '')
                  .replace(/\s+/g, '-')

                return (
                  <Link
                    key={activity.id}
                    href={`/activities/${activity.Slug || activity.documentId || activity.id}?from=${activeTab}`}
                    className="bg-orange-50 dark:bg-gray-700 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow transform hover:scale-105"
                  >
                    {/* Image with overlapping date */}
                    <div className="relative -mb-2">
                      {activity.Visuals && activity.Visuals.length > 0 ? (
                        <div className="aspect-video rounded-2xl overflow-hidden mx-2 mt-2">
                          <Image
                            src={activity.Visuals[0].url.startsWith('http') ? activity.Visuals[0].url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[0].url}`}
                            alt={activity.Visuals[0].alternativeText || activity.Title}
                            width={activity.Visuals[0].width}
                            height={activity.Visuals[0].height}
                            className="w-full h-full object-cover transition-transform duration-300 hover:duration-500 hover:scale-110"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-200 dark:bg-gray-600 rounded-2xl mx-2 mt-2 flex items-center justify-center">
                          <span className="text-gray-400 dark:text-gray-300">No image</span>
                        </div>
                      )}

                      {/* Overlapping date badge */}
                      <div className="absolute top-2 left-4 z-10">
                        <span className="inline-block bg-orange-50 dark:bg-gray-600 dark:text-gray-200 px-2.5 py-0.5 rounded-full text-xs font-medium shadow-md">
                          {new Date(activity.Date).toLocaleDateString('el-GR')}
                        </span>
                      </div>
                    </div>

                    <div className="p-7 pt-9 flex flex-col h-[200px]">
                      <h3 className="text-lg font-bold mb-4 line-clamp-3 flex-grow dark:text-gray-100">
                        {activity.Title}
                      </h3>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-auto">
                        <div className="w-8 h-8 mr-2 flex-shrink-0">
                          <Image
                            src="/cforc_logo_small.svg"
                            alt="Culture for Change Logo"
                            width={32}
                            height={32}
                            className="w-full h-full"
                          />
                        </div>
                        <span>CULTURE FOR CHANGE</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <NewsletterSection />
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  )
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen dark:bg-gray-900">
        <Navigation />
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                <div>ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</div>
              </h1>
            </div>
          </div>
        </section>
        <section className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <LoadingIndicator />
          </div>
        </section>
        <Footer />
      </main>
    }>
      <ActivitiesPageContent />
    </Suspense>
  )
}
