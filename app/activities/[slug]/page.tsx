'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollToTop from '@/components/ScrollToTop'
import Link from 'next/link'
import Image from 'next/image'
import { getActivityById, getActivities } from '@/lib/strapi'
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
      .join('\n\n')
  }

  return ''
}

export default function ActivityDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [activity, setActivity] = useState<Activity | null>(null)
  const [relatedActivities, setRelatedActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Photo carousel state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch current activity
        const activityResponse = await getActivityById(slug)
        setActivity(activityResponse.data)

        // Fetch all activities for related section
        const allActivitiesResponse: StrapiResponse<Activity[]> = await getActivities()

        // Get 3 most recent activities (excluding current one)
        const related = allActivitiesResponse.data
          .filter(a => a.id !== activityResponse.data.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)

        setRelatedActivities(related)
      } catch (err) {
        setError('Failed to load activity')
        console.error('Error fetching activity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  const nextPhoto = () => {
    if (activity?.Visuals) {
      setCurrentPhotoIndex((prev) => (prev + 1) % activity.Visuals!.length)
    }
  }

  const prevPhoto = () => {
    if (activity?.Visuals) {
      setCurrentPhotoIndex((prev) => (prev - 1 + activity.Visuals!.length) % activity.Visuals!.length)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded w-2/3 mb-8"></div>
              <div className="h-96 bg-gray-200 rounded-2xl mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (error || !activity) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
              <p className="text-orange-600 font-medium">
                {error || 'Activity not found'}
              </p>
              <Link href="/activities" className="inline-block mt-4 text-coral hover:underline">
                ← Επιστροφή στις δραστηριότητες
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const description = extractTextFromBlocks(activity.Description)

  return (
    <main className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight dark:text-coral">
              {activity.Title}
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link href="/activities" className="inline-flex items-center text-coral hover:underline mb-8">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Επιστροφή στις δραστηριότητες
          </Link>

          {/* Date */}
          <div className="mb-8">
            <span className="inline-block bg-orange-50 px-4 py-2 rounded-full text-sm font-medium">
              {new Date(activity.Date).toLocaleDateString('el-GR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>

          {/* Photo Carousel */}
          {activity.Visuals && activity.Visuals.length > 0 && (
            <div className="mb-12">
              <div className="relative">
                <div
                  className="aspect-video rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => setIsFullScreen(true)}
                >
                  <Image
                    src={activity.Visuals[currentPhotoIndex].url.startsWith('http')
                      ? activity.Visuals[currentPhotoIndex].url
                      : `${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[currentPhotoIndex].url}`}
                    alt={activity.Visuals[currentPhotoIndex].alternativeText || activity.Title}
                    width={activity.Visuals[currentPhotoIndex].width}
                    height={activity.Visuals[currentPhotoIndex].height}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Carousel Controls */}
                {activity.Visuals.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Dots indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {activity.Visuals.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {activity.Visuals.length > 1 && (
                <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                  {activity.Visuals.map((visual, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentPhotoIndex ? 'border-coral scale-105' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={visual.url.startsWith('http') ? visual.url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${visual.url}`}
                        alt={visual.alternativeText || `Photo ${index + 1}`}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold mb-6 text-charcoal">Περιγραφή</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {description}
            </div>
          </div>
        </div>
      </section>

      {/* Related Activities Section */}
      {relatedActivities.length > 0 && (
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-12">
              Πρόσφατες Δραστηριότητες
            </h2>

            <div className="grid md:grid-cols-3 gap-10">
              {relatedActivities.map((relatedActivity) => (
                <Link
                  key={relatedActivity.id}
                  href={`/activities/${relatedActivity.documentId || relatedActivity.id}`}
                  className="bg-orange-50 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow transform hover:scale-105"
                >
                  {/* Image with overlapping date */}
                  <div className="relative -mb-2">
                    {relatedActivity.Visuals && relatedActivity.Visuals.length > 0 ? (
                      <div className="aspect-video rounded-2xl overflow-hidden mx-2 mt-2">
                        <Image
                          src={relatedActivity.Visuals[0].url.startsWith('http')
                            ? relatedActivity.Visuals[0].url
                            : `${process.env.NEXT_PUBLIC_STRAPI_URL}${relatedActivity.Visuals[0].url}`}
                          alt={relatedActivity.Visuals[0].alternativeText || relatedActivity.Title}
                          width={relatedActivity.Visuals[0].width}
                          height={relatedActivity.Visuals[0].height}
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
                        {new Date(relatedActivity.Date).toLocaleDateString('el-GR')}
                      </span>
                    </div>
                  </div>

                  <div className="p-7 pt-9 flex flex-col h-[200px]">
                    <h3 className="text-lg font-bold mb-4 line-clamp-3 flex-grow">
                      {relatedActivity.Title}
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fullscreen Photo Modal */}
      {isFullScreen && activity.Visuals && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsFullScreen(false)}
        >
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center px-4">
            <Image
              src={activity.Visuals[currentPhotoIndex].url.startsWith('http')
                ? activity.Visuals[currentPhotoIndex].url
                : `${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[currentPhotoIndex].url}`}
              alt={activity.Visuals[currentPhotoIndex].alternativeText || activity.Title}
              width={activity.Visuals[currentPhotoIndex].width}
              height={activity.Visuals[currentPhotoIndex].height}
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {activity.Visuals.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <NewsletterSection />
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  )
}
