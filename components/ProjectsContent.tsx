'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import LoadingIndicator from '@/components/LoadingIndicator'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import { getProjects } from '@/lib/strapi'
import type { StrapiResponse, Project } from '@/lib/types'
import ViewToggle from '@/components/shared/ViewToggle'
import ProjectFlipCard from '@/components/shared/ProjectFlipCard'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: 'Ενεργό', className: 'bg-white text-green-700 dark:bg-gray-900 dark:text-green-400' },
  in_progress: { label: 'Σε εξέλιξη', className: 'bg-white text-coral-dark dark:bg-gray-900 dark:text-coral-light' },
  completed: { label: 'Ολοκληρωμένο', className: 'bg-white text-charcoal dark:bg-gray-900 dark:text-gray-300' },
}

export default function ProjectsContent() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)

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
    async function fetchProjects() {
      try {
        setLoading(true)
        const response: StrapiResponse<Project[]> = await getProjects()
        setProjects(response.data)
      } catch (err) {
        setError('Δεν ήταν δυνατή η φόρτωση των έργων')
        console.error('Error fetching projects:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const getImageUrl = (image: Project['cover_image']): string | null => {
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

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                ΕΡΓΑ
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

        {/* Projects Grid */}
        <section className="py-24 bg-orange-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading && <LoadingIndicator />}

            {error && !loading && (
              <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
                <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
              </div>
            )}

            {!loading && !error && projects.length === 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Δεν υπάρχουν διαθέσιμα έργα ακόμα
                </p>
              </div>
            )}

            {!loading && !error && projects.length > 0 && (
              <>
                <div className="flex justify-end mb-6">
                  <ViewToggle view={viewMode} onViewChange={setViewMode} />
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid md:grid-cols-3 gap-8">
                    {projects.map((project) => (
                      <ProjectFlipCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {projects.map((project) => {
                      const imageUrl = getImageUrl(project.cover_image)
                      const statusInfo = project.project_status ? STATUS_LABELS[project.project_status] : null
                      const partners = project.project_partners
                        ? project.project_partners.split(',').map((p: string) => p.trim()).filter(Boolean)
                        : []

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.slug}`}
                          className="bg-orange-50 dark:bg-gray-700 rounded-2xl overflow-hidden border border-black dark:border-white hover:shadow-lg transition-all duration-300 flex items-center gap-5 p-4 group border-l-4 border-l-transparent hover:border-l-coral dark:hover:border-l-coral-light"
                        >
                          {imageUrl ? (
                            <div className="w-24 h-16 relative rounded-xl overflow-hidden flex-shrink-0">
                              <Image src={imageUrl} alt={project.title} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-24 h-16 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0">
                              <svg className="w-8 h-8 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-charcoal dark:text-gray-100 line-clamp-1 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">{project.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              {statusInfo && (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-black dark:border-white ${statusInfo.className}`}>
                                  {statusInfo.label}
                                </span>
                              )}
                              {project.CforC_project_role && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{project.CforC_project_role}</span>
                              )}
                              {partners.length > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">{partners.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
