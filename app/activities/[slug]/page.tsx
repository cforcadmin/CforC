'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollToTop from '@/components/ScrollToTop'
import Link from 'next/link'
import Image from 'next/image'
import { getActivityById, getActivities } from '@/lib/strapi'
import type { StrapiResponse, Activity } from '@/lib/types'
import LocalizedText from '@/components/LocalizedText'
import { AccessibilityButton } from '@/components/AccessibilityMenu'

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
      .join('\n\n')
  }

  return ''
}

function ActivityDetailPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const fromTab = searchParams.get('from') || 'current' // Default to 'current' if not specified

  const [activity, setActivity] = useState<Activity | null>(null)
  const [relatedActivities, setRelatedActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)

  // Photo carousel state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Handle scroll for accessibility button fade
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150

      if (scrollPosition <= fadeStart) {
        setAccessibilityButtonScale(1)
      } else if (scrollPosition >= fadeEnd) {
        setAccessibilityButtonScale(0)
      } else {
        const progress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart)
        setAccessibilityButtonScale(1 - progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      <main className="min-h-screen dark:bg-gray-900">
        <Navigation />
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8"></div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
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
      <main className="min-h-screen dark:bg-gray-900">
        <Navigation />
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
              <p className="text-orange-600 dark:text-orange-400 font-medium">
                {error || 'Activity not found'}
              </p>
              <Link href={`/activities?from=${fromTab}`} className="inline-block mt-4 text-charcoal dark:text-coral-light hover:underline font-bold">
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
  const engDescription = activity.EngDescription ? extractTextFromBlocks(activity.EngDescription) : null

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight dark:text-coral">
                <LocalizedText text={activity.Title} engText={activity.EngTitle} />
              </h1>
            </div>

            {/* Accessibility Menu Trigger Button */}
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

      {/* Content Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link href={`/activities?from=${fromTab}`} className="inline-flex items-center text-charcoal dark:text-coral-light hover:underline font-bold mb-8">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Επιστροφή στις δραστηριότητες
          </Link>

          {/* Date */}
          <div className="mb-8">
            <span className="inline-block bg-orange-50 dark:bg-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-medium">
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
                <button
                  className="aspect-video rounded-2xl overflow-hidden cursor-pointer w-full focus:outline-none focus:ring-4 focus:ring-coral dark:focus:ring-coral-light"
                  onClick={() => setIsFullScreen(true)}
                  aria-label="Προβολή φωτογραφίας σε πλήρη οθόνη"
                >
                  <Image
                    src={activity.Visuals[currentPhotoIndex].url.startsWith('http')
                      ? activity.Visuals[currentPhotoIndex].url
                      : `${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[currentPhotoIndex].url}`}
                    alt={activity.ImageAltText || activity.Title}
                    width={activity.Visuals[currentPhotoIndex].width}
                    height={activity.Visuals[currentPhotoIndex].height}
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Carousel Controls */}
                {activity.Visuals.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                      aria-label="Προηγούμενη φωτογραφία"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                      aria-label="Επόμενη φωτογραφία"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                          aria-label={`Φωτογραφία ${index + 1}`}
                          aria-current={index === currentPhotoIndex ? 'true' : undefined}
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
            <h2 className="text-2xl font-bold mb-6 text-charcoal dark:text-gray-100">Περιγραφή</h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              <LocalizedText text={description} engText={engDescription} />
            </div>
          </div>
        </div>
      </section>

      {/* Related Activities Section */}
      {relatedActivities.length > 0 && (
        <section className="py-24 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 dark:text-gray-100">
              Πρόσφατες Δραστηριότητες
            </h2>

            <div className="grid md:grid-cols-3 gap-10">
              {relatedActivities.map((relatedActivity) => (
                <Link
                  key={relatedActivity.id}
                  href={`/activities/${relatedActivity.Slug || relatedActivity.documentId || relatedActivity.id}?from=${fromTab}`}
                  className="bg-orange-50 dark:bg-gray-700 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow transform hover:scale-105"
                >
                  {/* Image with overlapping date */}
                  <div className="relative -mb-2">
                    {relatedActivity.Visuals && relatedActivity.Visuals.length > 0 ? (
                      <div className="aspect-video rounded-2xl overflow-hidden mx-2 mt-2">
                        <Image
                          src={relatedActivity.Visuals[0].url.startsWith('http')
                            ? relatedActivity.Visuals[0].url
                            : `${process.env.NEXT_PUBLIC_STRAPI_URL}${relatedActivity.Visuals[0].url}`}
                          alt={relatedActivity.ImageAltText || relatedActivity.Title}
                          width={relatedActivity.Visuals[0].width}
                          height={relatedActivity.Visuals[0].height}
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
                        {new Date(relatedActivity.Date).toLocaleDateString('el-GR')}
                      </span>
                    </div>
                  </div>

                  <div className="p-7 pt-9 flex flex-col h-[200px]">
                    <h3 className="text-lg font-bold mb-4 line-clamp-3 flex-grow dark:text-gray-100">
                      <LocalizedText text={relatedActivity.Title} engText={relatedActivity.EngTitle} />
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
          role="dialog"
          aria-modal="true"
          aria-label="Προβολή φωτογραφίας σε πλήρη οθόνη"
        >
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Κλείσιμο"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center px-4">
            <Image
              src={activity.Visuals[currentPhotoIndex].url.startsWith('http')
                ? activity.Visuals[currentPhotoIndex].url
                : `${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[currentPhotoIndex].url}`}
              alt={activity.ImageAltText || activity.Title}
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
                  aria-label="Προηγούμενη φωτογραφία"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                  aria-label="Επόμενη φωτογραφία"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <NewsletterSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}

export default function ActivityDetailPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen dark:bg-gray-900">
        <Navigation />
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8"></div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    }>
      <ActivityDetailPageContent />
    </Suspense>
  )
}
