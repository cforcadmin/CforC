'use client'

import { useEffect, useState } from 'react'
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

export default function ActivitiesPage() {
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Get unique categories
  const categories = ['all', ...new Set(allActivities.map(a => a.Category).filter(Boolean))]

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
    let result = [...allActivities]

    // Apply search filter
    if (searchQuery) {
      result = result.filter(activity =>
        activity.Title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(activity => activity.Category === categoryFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      if (sortBy === 'date') {
        comparison = new Date(a.Date).getTime() - new Date(b.Date).getTime()
      } else {
        comparison = a.Title.localeCompare(b.Title)
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredActivities(result)
  }, [allActivities, searchQuery, sortBy, sortOrder, categoryFilter])

  return (
    <main className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none">
              <div>ACTIVITIES</div>
            </h1>
          </div>
        </div>
      </section>

      {/* Activities Section with Filtering */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Indicator */}
          {loading && <LoadingIndicator />}

          {/* Filters Section */}
          <div className="mb-12 bg-gray-50 rounded-2xl p-6 shadow-md">
            <div className="grid md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-charcoal mb-2">
                  Αναζήτηση
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Αναζήτηση κατά τίτλο..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-charcoal mb-2">
                  Κατηγορία
                </label>
                <select
                  id="category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                >
                  <option value="all">Όλες οι κατηγορίες</option>
                  {categories.filter(c => c !== 'all').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label htmlFor="sortBy" className="block text-sm font-medium text-charcoal mb-2">
                  Ταξινόμηση κατά
                </label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'title')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                >
                  <option value="date">Ημερομηνία</option>
                  <option value="title">Τίτλος</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-charcoal mb-2">
                  Σειρά
                </label>
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                >
                  <option value="desc">Φθίνουσα</option>
                  <option value="asc">Αύξουσα</option>
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              Βρέθηκαν {filteredActivities.length} δραστηριότητες
            </div>
          </div>

          {/* Error State */}
          {error && !loading && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
              <p className="text-orange-600 font-medium">{error}</p>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && filteredActivities.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600 font-medium">
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
                    href={`/activities/${activity.documentId || activity.id}`}
                    className="bg-orange-50 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow transform hover:scale-105"
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
                        <div className="aspect-video bg-gray-200 rounded-2xl mx-2 mt-2 flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}

                      {/* Overlapping date badge */}
                      <div className="absolute top-2 left-4 z-10">
                        <span className="inline-block bg-orange-50 px-2.5 py-0.5 rounded-full text-xs font-medium shadow-md">
                          {new Date(activity.Date).toLocaleDateString('el-GR')}
                        </span>
                      </div>
                    </div>

                    <div className="p-7 pt-9 flex flex-col h-[200px]">
                      <h3 className="text-lg font-bold mb-4 line-clamp-3 flex-grow">
                        {activity.Title}
                      </h3>

                      <div className="flex items-center text-sm text-gray-600 mt-auto">
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
