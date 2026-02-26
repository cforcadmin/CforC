'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getOpenCalls } from '@/lib/strapi'
import type { StrapiResponse, OpenCall } from '@/lib/types'
import LocalizedText from '@/components/LocalizedText'
import LoadingIndicator from '@/components/LoadingIndicator'

// Helper function to extract text from Strapi rich text blocks
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

export default function OpenCallsContent() {
  const [allOpenCalls, setAllOpenCalls] = useState<OpenCall[]>([])
  const [filteredCalls, setFilteredCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGreek, setIsGreek] = useState(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current')

  // Detect language changes (e.g., Google Translate)
  useEffect(() => {
    const checkLanguage = () => {
      const lang = document.documentElement.lang
      setIsGreek(lang === 'el' || lang === 'el-GR' || lang === '')
    }

    checkLanguage()
    const interval = setInterval(checkLanguage, 1000)
    return () => clearInterval(interval)
  }, [])

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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let result = [...allOpenCalls]

    if (activeTab === 'current') {
      result = result.filter(call => new Date(call.Deadline) >= today)
      result.sort((a, b) => new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime())
    } else {
      result = result.filter(call => new Date(call.Deadline) < today)
      result.sort((a, b) => new Date(b.Deadline).getTime() - new Date(a.Deadline).getTime())
    }

    if (searchQuery) {
      const descriptionTextMap = new Map(
        result.map(call => [call.id, extractTextFromBlocks(call.Description)])
      )

      result = result.filter(call =>
        call.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        descriptionTextMap.get(call.id)?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredCalls(result)
  }, [allOpenCalls, searchQuery, activeTab])

  return (
    <section className="py-24 bg-orange-50 dark:bg-gray-800">
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md dark:shadow-gray-700/50">
              <div className="max-w-xl">
                <label htmlFor="open-calls-search" className="block text-sm font-medium text-charcoal dark:text-gray-200 mb-2">
                  Αναζήτηση
                </label>
                <input
                  id="open-calls-search"
                  type="text"
                  placeholder="Αναζήτηση κατά λέξη..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
                />
              </div>

              {/* Results count */}
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                Βρέθηκαν {filteredCalls.length} προσκλήσεις
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
        {!loading && !error && filteredCalls.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Δεν βρέθηκαν προσκλήσεις με αυτά τα κριτήρια
            </p>
          </div>
        )}

        {/* Open Calls List */}
        {!loading && !error && filteredCalls.length > 0 && (
          <div className="space-y-0">
            {filteredCalls.map((call, index) => {
              const descriptionText = extractTextFromBlocks(call.Description)
              const engDescriptionText = call.EngDescription ? extractTextFromBlocks(call.EngDescription) : null

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
                  {index > 0 && <hr className="border-gray-300 dark:border-gray-600" aria-hidden="true" />}
                  <Link
                    href={call.Link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block py-12 hover:bg-white dark:hover:bg-gray-700 hover:shadow-xl transition-all duration-300 relative rounded-2xl"
                  >
                    {/* Arrow Icon - Far Top Right Corner */}
                    <div className="absolute top-6 right-2">
                      <svg
                        className="w-8 h-8 text-charcoal dark:text-gray-300 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                        <span className="inline-block bg-charcoal dark:bg-gray-600 text-white px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                          {new Date(call.Deadline).toLocaleDateString('el-GR')}
                        </span>

                        {call.Priority && (
                          <span className="inline-block bg-white dark:bg-gray-700 border-2 border-charcoal dark:border-gray-400 text-charcoal dark:text-gray-200 px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                            PRIORITY
                          </span>
                        )}
                      </div>

                      {/* Title and Description Section */}
                      <div className="flex-1 flex gap-6">
                        <div className="flex-1">
                          <h3 className="text-xl md:text-2xl font-bold mb-4 text-charcoal dark:text-gray-100 group-hover:text-coral dark:group-hover:text-coral-light transition-colors duration-300">
                            <LocalizedText text={call.Title} engText={call.EngTitle} />
                          </h3>

                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base mt-2">
                            <LocalizedText text={descriptionText} engText={engDescriptionText} />
                          </p>
                        </div>

                        {/* Circular image on right */}
                        {imageUrl && (
                          <div className="flex-shrink-0">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-coral dark:border-coral-light shadow-md">
                              <Image
                                src={imageUrl}
                                alt={call.ImageAltText || call.Title}
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
  )
}
