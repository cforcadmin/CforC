'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getNewsletters } from '@/lib/strapi'
import type { StrapiResponse, Newsletter } from '@/lib/types'
import LoadingIndicator from '@/components/LoadingIndicator'

export default function NewslettersContent() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <section className="py-24 bg-orange-50 dark:bg-gray-800">
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
                  className="bg-orange-50 dark:bg-gray-700 rounded-2xl overflow-hidden border border-black dark:border-white hover:shadow-lg transition-shadow transform hover:scale-105"
                >
                  {/* Image with overlapping date */}
                  <div className="relative -mb-2">
                    {imageUrl ? (
                      <div className="aspect-video rounded-2xl overflow-hidden mx-2 mt-2 border border-black dark:border-white">
                        <Image
                          src={imageUrl}
                          alt={newsletter.Title}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover transition-transform duration-300 hover:duration-500 hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-200 dark:bg-gray-600 rounded-2xl mx-2 mt-2 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    )}

                    {/* Overlapping date badge */}
                    <div className="absolute top-2 left-4 z-10">
                      <span className="inline-block bg-orange-50 dark:bg-gray-600 dark:text-gray-200 px-2.5 py-0.5 rounded-full text-xs font-medium shadow-md border border-black dark:border-white">
                        {new Date(newsletter.Date).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    {/* External link indicator */}
                    <div className="absolute top-2 right-4 z-10">
                      <span className="inline-flex items-center bg-white/90 dark:bg-gray-800/90 px-2 py-0.5 rounded-full text-xs shadow-md border border-black dark:border-white">
                        <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="p-7 pt-9 flex flex-col h-[140px]">
                    <h3 className="text-lg font-bold mb-4 line-clamp-2 flex-grow text-charcoal dark:text-gray-100">
                      {newsletter.Title}
                    </h3>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-auto">
                      <div className="w-8 h-8 mr-2 flex-shrink-0">
                        <Image
                          src="/cforc_logo_small.svg"
                          alt="Διακοσμητικό στοιχείο"
                          width={32}
                          height={32}
                          className="w-full h-full"
                        />
                      </div>
                      <span>CULTURE FOR CHANGE</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
