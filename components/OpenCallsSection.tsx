'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import LoadingIndicator from './LoadingIndicator'
import { getOpenCalls } from '@/lib/strapi'
import type { StrapiResponse, OpenCall } from '@/lib/types'
import { useAuth } from './AuthProvider'

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
  const { user, loading: authLoading } = useAuth()
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([])
  const [expiredCalls, setExpiredCalls] = useState<OpenCall[]>([])
  const [totalActiveCalls, setTotalActiveCalls] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)

  useEffect(() => {
    async function fetchOpenCalls() {
      try {
        setLoading(true)

        console.log('Fetching open calls from Strapi...')

        const response: StrapiResponse<OpenCall[]> = await getOpenCalls()

        console.log('Open calls response:', response)
        console.log('Open calls data:', response.data)
        console.log('Number of open calls:', response.data?.length || 0)

        // Separate active and expired calls
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset time to start of day

        const activeCalls = response.data
          .filter(call => new Date(call.Deadline) >= today)
          .sort((a, b) => new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime())

        const expiredCallsList = response.data
          .filter(call => new Date(call.Deadline) < today)
          .sort((a, b) => new Date(b.Deadline).getTime() - new Date(a.Deadline).getTime())
          .slice(0, 3) // Take 3 most recent expired

        setTotalActiveCalls(activeCalls.length)
        setOpenCalls(activeCalls.slice(0, 4)) // Show top 4 active for logged-in users
        setExpiredCalls(expiredCallsList)
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
      <section id="open-calls" className="py-24 bg-orange-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingIndicator />
        </div>
      </section>
    )
  }

  if (error || openCalls.length === 0) {
    return (
      <section id="open-calls" className="py-24 bg-orange-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-coral dark:text-coral-light text-sm font-medium mb-2">ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</p>
              <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
                ΤΟΥ CULTURE<br />
                FOR CHANGE
              </h2>
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">
              {error || 'No open calls available at the moment'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  const handleViewAllClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      setShowMemberModal(true)
    }
  }

  return (
    <>
      {/* Member-Only Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowMemberModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-coral dark:text-coral-light mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 dark:text-gray-100">Περιεχόμενο Μελών</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Οι ανοιχτές προσκλήσεις είναι διαθέσιμες μόνο για εγγεγραμμένα μέλη. Εγγραφείτε δωρεάν για πρόσβαση.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="bg-coral dark:bg-coral-light text-white px-6 py-3 rounded-full font-medium hover:bg-coral-dark dark:hover:bg-coral transition-colors"
                  onClick={() => setShowMemberModal(false)}
                >
                  Εγγραφή Δωρεάν
                </Link>
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section id="open-calls" className="py-24 bg-orange-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-coral dark:text-coral-light text-sm font-medium mb-2">ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</p>
              <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
                ΤΟΥ CULTURE<br />
                FOR CHANGE
              </h2>
            </div>
            {user ? (
              <Link href="/open-calls" className="hidden md:block bg-coral dark:bg-coral-light text-white px-6 py-3 rounded-full font-medium hover:bg-coral-dark dark:hover:bg-coral transition-colors">
                ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ
              </Link>
            ) : (
              <button
                onClick={handleViewAllClick}
                className="hidden md:block bg-coral dark:bg-coral-light text-white px-6 py-3 rounded-full font-medium hover:bg-coral-dark dark:hover:bg-coral transition-colors"
              >
                ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ
              </button>
            )}
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
                {index > 0 && <hr className="border-gray-300 dark:border-gray-600" />}
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
                      <span className="inline-block bg-charcoal dark:bg-gray-600 text-white px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                        {new Date(call.Deadline).toLocaleDateString('el-GR')}
                      </span>

                      {/* Priority Badge */}
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
                          {call.Title}
                        </h3>

                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base mt-2">
                          {descriptionText}
                        </p>
                      </div>

                      {/* Circular image on right */}
                      {imageUrl && (
                        <div className="flex-shrink-0">
                          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-coral dark:border-coral-light shadow-md">
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

        {user ? (
          <Link href="/open-calls" className="md:hidden w-full mt-8 bg-coral dark:bg-coral-light text-white px-6 py-3 rounded-full font-medium text-center block hover:bg-coral-dark dark:hover:bg-coral transition-colors">
            ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ
          </Link>
        ) : (
          <button
            onClick={handleViewAllClick}
            className="md:hidden w-full mt-8 bg-coral dark:bg-coral-light text-white px-6 py-3 rounded-full font-medium text-center block hover:bg-coral-dark dark:hover:bg-coral transition-colors"
          >
            ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ
          </button>
        )}

        {/* Teaser Banner for Non-Logged-In Users */}
        {!user && (
          <div className="mt-16 bg-gradient-to-r from-coral to-coral-dark dark:from-coral-light dark:to-coral rounded-3xl p-12 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm px-6 py-2 rounded-full text-sm font-medium mb-4">
                  Αποκλειστικό Περιεχόμενο Μελών
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  {totalActiveCalls} Ενεργές Ανοιχτές Προσκλήσεις
                </h3>
                <p className="text-lg text-white text-opacity-90 mb-8">
                  Αποκτήστε πρόσβαση σε ευκαιρίες χρηματοδότησης, υποτροφίες, residencies και διαγωνισμούς από όλη την Ευρώπη
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8 text-left">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-3xl mb-2">🇪🇺</div>
                  <div className="font-semibold mb-1">Ευρωπαϊκά Προγράμματα</div>
                  <div className="text-sm text-white text-opacity-80">Creative Europe, Horizon, CERV</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-3xl mb-2">💰</div>
                  <div className="font-semibold mb-1">Χρηματοδότηση</div>
                  <div className="text-sm text-white text-opacity-80">Grants & Funding Opportunities</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-3xl mb-2">🎨</div>
                  <div className="font-semibold mb-1">Residencies</div>
                  <div className="text-sm text-white text-opacity-80">Καλλιτεχνικές Υποτροφίες</div>
                </div>
              </div>

              <Link
                href="/signup"
                className="inline-block bg-white text-coral px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Εγγραφή Δωρεάν
              </Link>
            </div>
          </div>
        )}

        {/* Expired Open Calls Section - Show 3 Recent Expired */}
        {expiredCalls.length > 0 && (
          <div className="mt-16">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold dark:text-gray-100">
                  Πρόσφατες Προσκλήσεις
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Δείτε παραδείγματα προηγούμενων ευκαιριών
                </p>
              </div>
            </div>

            <div className="space-y-0">
              {expiredCalls.map((call, index) => {
                const descriptionText = extractTextFromBlocks(call.Description)

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
                    {index > 0 && <hr className="border-gray-300 dark:border-gray-600" />}
                    <div className="py-12 opacity-60 relative rounded-2xl">
                      <div className="flex items-start gap-6 pr-16">
                        <div className="flex flex-col gap-3 min-w-[140px] ml-8">
                          <span className="inline-block bg-gray-400 dark:bg-gray-600 text-white px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                            {new Date(call.Deadline).toLocaleDateString('el-GR')}
                          </span>
                          <span className="inline-block bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                            ΕΛΗΞΕ
                          </span>
                        </div>

                        <div className="flex-1 flex gap-6">
                          <div className="flex-1">
                            <h3 className="text-xl md:text-2xl font-bold mb-4 text-gray-500 dark:text-gray-400">
                              {call.Title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-500 leading-relaxed text-base mt-2 line-clamp-2">
                              {descriptionText}
                            </p>
                          </div>

                          {imageUrl && (
                            <div className="flex-shrink-0">
                              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-300 dark:border-gray-600 shadow-md opacity-50">
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
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 text-center">
              {user ? (
                <Link
                  href="/open-calls"
                  className="inline-block bg-coral dark:bg-coral-light text-white px-8 py-3 rounded-full font-medium hover:bg-coral-dark dark:hover:bg-coral transition-colors"
                >
                  ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ
                </Link>
              ) : (
                <button
                  onClick={handleViewAllClick}
                  className="inline-block bg-coral dark:bg-coral-light text-white px-8 py-3 rounded-full font-medium hover:bg-coral-dark dark:hover:bg-coral transition-colors"
                >
                  ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
    </>
  )
}
