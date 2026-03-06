'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getNewsletters } from '@/lib/strapi'
import type { StrapiResponse, Newsletter } from '@/lib/types'
import LoadingIndicator from '@/components/LoadingIndicator'
import ViewToggle from '@/components/shared/ViewToggle'

export default function NewslettersContent() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    async function fetchNewsletters() {
      try {
        setLoading(true)
        const response: StrapiResponse<Newsletter[]> = await getNewsletters()
        setNewsletters(response.data)
      } catch (err) {
        setError('Δεν ήταν δυνατή η φόρτωση των newsletters')
        console.error('Error fetching newsletters:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNewsletters()
  }, [])

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && <LoadingIndicator />}

        {error && !loading && (
          <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && newsletters.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Δεν υπάρχουν διαθέσιμα newsletters ακόμα
            </p>
          </div>
        )}

        {!loading && !error && newsletters.length > 0 && (
          <>
            <div className="flex justify-end mb-6">
              <ViewToggle view={viewMode} onViewChange={setViewMode} />
            </div>

            {viewMode === 'grid' ? (
              <div className="grid md:grid-cols-3 gap-10">
                {newsletters.map((newsletter) => {
                  let imageUrl: string | null = null
                  if (newsletter.Image) {
                    if (Array.isArray(newsletter.Image) && newsletter.Image.length > 0) {
                      const url = newsletter.Image[0].url
                      imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                    } else if (typeof newsletter.Image === 'object' && !Array.isArray(newsletter.Image) && 'url' in newsletter.Image) {
                      const url = newsletter.Image.url
                      imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                    }
                  }

                  return (
                    <a
                      key={newsletter.id}
                      href={newsletter.DriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow transform hover:scale-105 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light"
                    >
                      {imageUrl ? (
                        <div className="aspect-video overflow-hidden">
                          <Image
                            src={imageUrl}
                            alt={newsletter.Title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      )}

                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <time
                            dateTime={newsletter.Date}
                            className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {new Date(newsletter.Date).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                          </time>
                          <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full">
                            Newsletter
                          </span>
                        </div>

                        <h3 className="text-lg font-bold mb-2 text-charcoal dark:text-gray-100 line-clamp-2">
                          {newsletter.Title}
                        </h3>

                        <div className="flex-1" />
                        <div className="flex items-center justify-end pt-2">
                          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {newsletters.map((newsletter) => {
                  let imageUrl: string | null = null
                  if (newsletter.Image) {
                    if (Array.isArray(newsletter.Image) && newsletter.Image.length > 0) {
                      const url = newsletter.Image[0].url
                      imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                    } else if (typeof newsletter.Image === 'object' && !Array.isArray(newsletter.Image) && 'url' in newsletter.Image) {
                      const url = newsletter.Image.url
                      imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                    }
                  }

                  return (
                    <a
                      key={newsletter.id}
                      href={newsletter.DriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-5 p-4 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light"
                    >
                      {imageUrl ? (
                        <div className="w-20 h-14 relative rounded-xl overflow-hidden flex-shrink-0">
                          <Image src={imageUrl} alt={newsletter.Title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-14 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-charcoal dark:text-gray-100 line-clamp-1 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">{newsletter.Title}</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(newsletter.Date).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
