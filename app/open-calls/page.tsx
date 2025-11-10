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
import { getOpenCalls } from '@/lib/strapi'
import type { StrapiResponse, OpenCall } from '@/lib/types'

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

export default function OpenCallsPage() {
  const [allOpenCalls, setAllOpenCalls] = useState<OpenCall[]>([])
  const [filteredCalls, setFilteredCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'deadline' | 'dateAdded'>('deadline')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    async function fetchOpenCalls() {
      try {
        setLoading(true)
        const response: StrapiResponse<OpenCall[]> = await getOpenCalls()
        setAllOpenCalls(response.data)
        setFilteredCalls(response.data)
      } catch (err) {
        setError('Failed to load open calls')
        console.error('Error fetching open calls:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOpenCalls()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    let result = [...allOpenCalls]

    // Apply search filter
    if (searchQuery) {
      result = result.filter(call =>
        call.Title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      if (sortBy === 'deadline') {
        comparison = new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime()
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredCalls(result)
  }, [allOpenCalls, searchQuery, sortBy, sortOrder])

  return (
    <main className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none">
              <div>OPEN CALLS</div>
            </h1>
          </div>
        </div>
      </section>

      {/* Open Calls Section with Filtering */}
      <section className="py-24 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Indicator */}
          {loading && <LoadingIndicator />}

          {/* Filters Section */}
          <div className="mb-12 bg-white rounded-2xl p-6 shadow-md">
            <div className="grid md:grid-cols-3 gap-4">
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

              {/* Sort By */}
              <div>
                <label htmlFor="sortBy" className="block text-sm font-medium text-charcoal mb-2">
                  Ταξινόμηση κατά
                </label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'deadline' | 'dateAdded')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                >
                  <option value="deadline">Ημερομηνία λήξης</option>
                  <option value="dateAdded">Ημερομηνία προσθήκης</option>
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
                  <option value="asc">Αύξουσα</option>
                  <option value="desc">Φθίνουσα</option>
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              Βρέθηκαν {filteredCalls.length} καλέσματα
            </div>
          </div>

          {/* Error State */}
          {error && !loading && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
              <p className="text-orange-600 font-medium">{error}</p>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && filteredCalls.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600 font-medium">
                Δεν βρέθηκαν καλέσματα με αυτά τα κριτήρια
              </p>
            </div>
          )}

          {/* Open Calls List */}
          {!loading && !error && filteredCalls.length > 0 && (
            <div className="space-y-0">
              {filteredCalls.map((call, index) => {
                const descriptionText = extractTextFromBlocks(call.Description)

                // Handle both single image (object) and multiple images (array) from Strapi v5
                let imageUrl = null
                if (call.Image) {
                  if (Array.isArray(call.Image) && call.Image.length > 0) {
                    const url = call.Image[0].url
                    imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                  } else if (typeof call.Image === 'object' && !Array.isArray(call.Image) && 'url' in call.Image) {
                    const url = call.Image.url
                    imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                  }
                }

                return (
                  <div key={call.id}>
                    {index > 0 && <hr className="border-gray-300" />}
                    <Link
                      href={call.Link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block py-12 hover:bg-white hover:shadow-xl transition-all duration-300 relative rounded-2xl"
                    >
                      {/* Arrow Icon - Far Top Right Corner */}
                      <div className="absolute top-6 right-2">
                        <svg
                          className="w-8 h-8 text-charcoal group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 17L17 7M17 7H7M17 7V17"
                          />
                        </svg>
                      </div>

                      <div className="flex items-start gap-6 pr-16">
                        {/* Date and Priority Badges Section */}
                        <div className="flex flex-col gap-3 min-w-[140px] ml-8">
                          {/* Date Badge */}
                          <span className="inline-block bg-charcoal text-white px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                            {new Date(call.Deadline).toLocaleDateString('el-GR')}
                          </span>

                          {/* Priority Badge */}
                          {call.Priority && (
                            <span className="inline-block bg-white border-2 border-charcoal text-charcoal px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                              PRIORITY
                            </span>
                          )}
                        </div>

                        {/* Title and Description Section */}
                        <div className="flex-1 flex gap-6">
                          <div className="flex-1">
                            <h3 className="text-xl md:text-2xl font-bold mb-4 text-charcoal group-hover:text-coral transition-colors duration-300">
                              {call.Title}
                            </h3>

                            <p className="text-gray-600 leading-relaxed text-base mt-2">
                              {descriptionText}
                            </p>
                          </div>

                          {/* Circular image on right */}
                          {imageUrl && (
                            <div className="flex-shrink-0">
                              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-coral shadow-md">
                                <Image
                                  src={imageUrl}
                                  alt={(Array.isArray(call.Image) ? call.Image[0]?.alternativeText : call.Image?.alternativeText) || call.Title}
                                  width={112}
                                  height={112}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
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
