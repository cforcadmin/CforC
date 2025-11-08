'use client'

import { useEffect, useState } from 'react'
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

export default function OpenCallsSection() {
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOpenCalls() {
      try {
        setLoading(true)
        console.log('Fetching open calls from Strapi...')

        const response: StrapiResponse<OpenCall[]> = await getOpenCalls()

        console.log('Open calls response:', response)
        console.log('Open calls data:', response.data)
        console.log('Number of open calls:', response.data?.length || 0)

        // Sort by createdAt (submission date) in descending order (most recent first)
        // Then take only the 4 most recent entries
        const sortedCalls = response.data
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 4)

        setOpenCalls(sortedCalls)
      } catch (err) {
        setError('Failed to load open calls from Strapi')
        console.error('Error fetching open calls:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOpenCalls()
  }, [])

  if (loading) {
    return (
      <section id="open-calls" className="py-24 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2 mb-12"></div>
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error || openCalls.length === 0) {
    return (
      <section id="open-calls" className="py-24 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-coral text-sm font-medium mb-2">ΑΝΟΙΧΤΑ ΚΑΛΕΣΜΑΤΑ</p>
              <h2 className="text-4xl md:text-5xl font-bold">
                ΚΑΛΕΣΜΑΤΑ ΤΟΥ CULTURE<br />
                FOR CHANGE
              </h2>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
            <p className="text-orange-600 font-medium">
              {error || 'No open calls available at the moment'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="open-calls" className="py-24 bg-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="text-coral text-sm font-medium mb-2">ΑΝΟΙΧΤΑ ΚΑΛΕΣΜΑΤΑ</p>
            <h2 className="text-4xl md:text-5xl font-bold">
              ΚΑΛΕΣΜΑΤΑ ΤΟΥ CULTURE<br />
              FOR CHANGE
            </h2>
          </div>
          <button className="hidden md:block bg-coral text-white px-6 py-3 rounded-full font-medium hover:bg-coral-dark transition-colors">
            ΟΛΑ ΤΑ ΚΑΛΕΣΜΑΤΑ
          </button>
        </div>

        <div className="space-y-0">
          {openCalls.map((call, index) => {
            const descriptionText = extractTextFromBlocks(call.Description)

            // Handle both single image (object) and multiple images (array) from Strapi v5
            let imageUrl = null
            if (call.Image) {
              if (Array.isArray(call.Image) && call.Image.length > 0) {
                // Multiple images - use first one
                const url = call.Image[0].url
                imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
              } else if (typeof call.Image === 'object' && !Array.isArray(call.Image) && 'url' in call.Image) {
                // Single image - direct object
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
                    {/* Date and Priority Badges Section - Moved Right */}
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

        <button className="md:hidden w-full mt-8 bg-coral text-white px-6 py-3 rounded-full font-medium">
          ΟΛΑ ΤΑ ΚΑΛΕΣΜΑΤΑ
        </button>
      </div>
    </section>
  )
}
