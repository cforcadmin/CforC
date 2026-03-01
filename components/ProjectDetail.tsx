'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import LoadingIndicator from '@/components/LoadingIndicator'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import { getProjectBySlug } from '@/lib/strapi'
import { useTheme } from '@/components/ThemeProvider'
import type { Project, ProjectEntry } from '@/lib/types'
import { renderBlocks } from '@/lib/renderBlocks'

const STATUS_LABELS: Record<string, string> = {
  active: 'Ενεργό',
  in_progress: 'Σε εξέλιξη',
  completed: 'Ολοκληρωμένο',
}

interface Props {
  slug: string
}

export default function ProjectDetail({ slug }: Props) {
  const { theme } = useTheme()
  const [project, setProject] = useState<Project | null>(null)
  const [publicEntries, setPublicEntries] = useState<ProjectEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [notFoundState, setNotFoundState] = useState(false)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150
      if (scrollPosition <= fadeStart) setAccessibilityButtonScale(1)
      else if (scrollPosition >= fadeEnd) setAccessibilityButtonScale(0)
      else setAccessibilityButtonScale(1 - (scrollPosition - fadeStart) / (fadeEnd - fadeStart))
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true)
        const response = await getProjectBySlug(slug)
        if (!response.data || response.data.length === 0) {
          setNotFoundState(true)
          return
        }
        const proj = response.data[0]
        setProject(proj)

        // Filter entries to only public ones
        if (proj.project_entries) {
          setPublicEntries(
            proj.project_entries.filter((entry: ProjectEntry) => entry.visibility === 'public')
          )
        }
      } catch (err) {
        console.error('Error fetching project:', err)
        setNotFoundState(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [slug])

  if (notFoundState) return notFound()

  const getImageUrl = (image: any): string | null => {
    if (!image) return null
    if (Array.isArray(image) && image.length > 0) {
      const url = image[0].url
      return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
    }
    if (typeof image === 'object' && !Array.isArray(image) && 'url' in image) {
      const url = image.url
      return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
    }
    return null
  }

  // Build combined image list: cover_image first, then project_images
  const allImages: Array<{ url: string; alt: string }> = []
  if (project) {
    const coverUrl = getImageUrl(project.cover_image)
    if (coverUrl) {
      allImages.push({ url: coverUrl, alt: project.title })
    }
    if (project.project_images && Array.isArray(project.project_images)) {
      for (const img of project.project_images) {
        const url = (img as any).url?.startsWith('http') ? (img as any).url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${(img as any).url}`
        allImages.push({ url, alt: (img as any).alternativeText || project.title })
      }
    }
  }

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 min-h-[25vh] flex items-center rounded-b-3xl relative z-10 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-none dark:text-coral">
                {project?.title || '...'}
              </h1>
            </div>
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

        {loading && (
          <section className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <LoadingIndicator />
            </div>
          </section>
        )}

        {!loading && project && (
          <>
            {/* Cover Image + Info */}
            <section className="py-24 bg-white dark:bg-gray-900">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back link */}
                <Link href="/projects" className="inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral mb-8 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Όλα τα Έργα
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-sm">
                  {/* Image Carousel */}
                  {allImages.length > 0 && (
                    <div className="mb-8">
                      <div className="aspect-[16/9] relative rounded-3xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <Image
                          src={allImages[currentImageIndex].url}
                          alt={allImages[currentImageIndex].alt}
                          fill
                          className="object-cover"
                        />

                        {/* Navigation Arrows */}
                        {allImages.length > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentImageIndex((prev) =>
                                prev === 0 ? allImages.length - 1 : prev - 1
                              )}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                            >
                              <svg className="w-6 h-6 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setCurrentImageIndex((prev) =>
                                prev === allImages.length - 1 ? 0 : prev + 1
                              )}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                            >
                              <svg className="w-6 h-6 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>

                            {/* Image Counter */}
                            <div className="absolute bottom-4 right-4 bg-black/60 dark:bg-black/80 text-white px-3 py-1 rounded-full text-sm">
                              {currentImageIndex + 1} / {allImages.length}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Thumbnail Strip */}
                      {allImages.length > 1 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                          {allImages.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                index === currentImageIndex ? 'border-coral dark:border-coral-light' : 'border-transparent opacity-60 hover:opacity-100'
                              }`}
                            >
                              <div className="relative w-full h-full bg-gray-200 dark:bg-gray-700">
                                <Image
                                  src={image.url}
                                  alt={image.alt}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status */}
                  {project.project_status && (
                    <div className="mb-4">
                      <span className="px-4 py-2 rounded-full text-sm font-medium bg-coral/20 text-coral-dark dark:bg-coral/10 dark:text-coral-light">
                        {STATUS_LABELS[project.project_status] || project.project_status}
                      </span>
                    </div>
                  )}

                  {/* Categories */}
                  {project.category && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.category.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string) => (
                        <span key={tag} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium dark:text-gray-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Date and Link row */}
                  <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-gray-600 dark:text-gray-400">
                    {project.start_date && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(project.start_date).toLocaleDateString('el-GR')}
                          {project.end_date && ` — ${new Date(project.end_date).toLocaleDateString('el-GR')}`}
                        </span>
                      </div>
                    )}
                    {project.project_link && (
                      <a
                        href={project.project_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral transition-colors font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {project.project_link.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </div>

                  {/* Full description */}
                  {project.full_description && (
                    <div className="prose dark:prose-invert max-w-none">
                      {renderBlocks(project.full_description)}
                    </div>
                  )}
                  {/* Supporters Banner */}
                  {(() => {
                    const bannerSource = theme === 'dark' ? project.supporters_banner_dark : project.supporters_banner_light
                    const bannerUrl = getImageUrl(bannerSource as any)
                    return bannerUrl ? (
                      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <Image
                          src={bannerUrl}
                          alt="Supporters"
                          width={1200}
                          height={300}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
            </section>

            {/* Partners */}
            {project.partners && project.partners.length > 0 && (
              <section className="py-16 bg-gray-50 dark:bg-gray-800">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-8">Συνεργάτες</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {project.partners.map((partner) => {
                      const logoUrl = partner.logo ? getImageUrl(partner.logo as any) : null
                      const content = (
                        <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-gray-700 rounded-xl">
                          {logoUrl ? (
                            <Image
                              src={logoUrl}
                              alt={partner.name}
                              width={80}
                              height={80}
                              className="w-20 h-20 object-contain mb-3"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-coral/10 flex items-center justify-center mb-3">
                              <span className="text-2xl font-bold text-coral">{partner.name.charAt(0)}</span>
                            </div>
                          )}
                          <p className="text-sm font-medium text-charcoal dark:text-gray-200">{partner.name}</p>
                        </div>
                      )

                      return partner.url ? (
                        <a key={partner.id} href={partner.url} target="_blank" rel="noopener noreferrer" className="hover:shadow-lg transition-shadow rounded-xl">
                          {content}
                        </a>
                      ) : (
                        <div key={partner.id}>{content}</div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* External Links */}
            {project.external_links && project.external_links.length > 0 && (
              <section className="py-16 bg-white dark:bg-gray-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-6">Σύνδεσμοι</h2>
                  <div className="space-y-3">
                    {project.external_links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-5 h-5 text-coral flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="text-charcoal dark:text-gray-200 font-medium">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Public Entries */}
            {publicEntries.length > 0 && (
              <section className="py-24 bg-orange-50 dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-3xl font-bold text-charcoal dark:text-gray-100 mb-10">Καταχωρήσεις</h2>
                  <div className="grid md:grid-cols-3 gap-10">
                    {publicEntries.map((entry) => {
                      const entryImgUrl = getImageUrl(entry.cover_image)
                      return (
                        <Link
                          key={entry.id}
                          href={`/projects/${slug}/entries/${entry.slug}`}
                          className="bg-white dark:bg-gray-700 rounded-2xl overflow-hidden border border-black dark:border-white hover:shadow-lg transition-shadow transform hover:scale-105"
                        >
                          {entryImgUrl ? (
                            <div className="aspect-video rounded-t-2xl overflow-hidden">
                              <Image
                                src={entryImgUrl}
                                alt={entry.title}
                                width={400}
                                height={225}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                          )}
                          <div className="p-6">
                            {entry.category && (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-coral/20 text-coral-dark dark:bg-coral/10 dark:text-coral-light mb-2">
                                {entry.category}
                              </span>
                            )}
                            <h3 className="text-lg font-bold text-charcoal dark:text-gray-100 line-clamp-2">
                              {entry.title}
                            </h3>
                            {entry.publication_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {new Date(entry.publication_date).toLocaleDateString('el-GR')}
                              </p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
