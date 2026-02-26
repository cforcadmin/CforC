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
import { getProjectEntryBySlug } from '@/lib/strapi'
import type { ProjectEntry } from '@/lib/types'

function renderInlineChild(child: any, i: number): React.ReactNode {
  if (child.type === 'link') {
    return (
      <a key={i} href={child.url} target="_blank" rel="noopener noreferrer" className="text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral underline">
        {child.children?.map((linkChild: any, j: number) => renderInlineChild(linkChild, j))}
      </a>
    )
  }
  let content: React.ReactNode = child.text || ''
  if (child.bold) content = <strong key={`${i}-b`}>{content}</strong>
  if (child.italic) content = <em key={`${i}-i`}>{content}</em>
  if (child.underline) content = <u key={`${i}-u`}>{content}</u>
  return <span key={i}>{content}</span>
}

function renderBlocks(blocks: any): React.ReactNode {
  if (!blocks || !Array.isArray(blocks)) return null
  return blocks.map((block: any, index: number) => {
    if (block.type === 'paragraph') {
      return (
        <p key={index} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          {block.children?.map((child: any, i: number) => renderInlineChild(child, i))}
        </p>
      )
    }
    if (block.type === 'heading') {
      const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements
      return (
        <Tag key={index} className="text-xl font-bold mb-3 text-charcoal dark:text-gray-100">
          {block.children?.map((child: any, i: number) => renderInlineChild(child, i))}
        </Tag>
      )
    }
    if (block.type === 'list') {
      const ListTag = block.format === 'ordered' ? 'ol' : 'ul'
      return (
        <ListTag key={index} className={`mb-4 pl-6 ${block.format === 'ordered' ? 'list-decimal' : 'list-disc'} text-gray-700 dark:text-gray-300`}>
          {block.children?.map((item: any, i: number) => (
            <li key={i} className="mb-1">
              {item.children?.map((child: any, j: number) => renderInlineChild(child, j))}
            </li>
          ))}
        </ListTag>
      )
    }
    return null
  })
}

interface Props {
  projectSlug: string
  entrySlug: string
}

export default function EntryDetail({ projectSlug, entrySlug }: Props) {
  const [entry, setEntry] = useState<ProjectEntry | null>(null)
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
    async function fetchEntry() {
      try {
        setLoading(true)
        const response = await getProjectEntryBySlug(entrySlug)
        if (!response.data || response.data.length === 0) {
          setNotFoundState(true)
          return
        }
        const fetchedEntry = response.data[0]

        // Verify the entry belongs to the correct project
        if (fetchedEntry.project && fetchedEntry.project.slug !== projectSlug) {
          setNotFoundState(true)
          return
        }

        setEntry(fetchedEntry)
      } catch (err) {
        console.error('Error fetching entry:', err)
        setNotFoundState(true)
      } finally {
        setLoading(false)
      }
    }
    fetchEntry()
  }, [entrySlug, projectSlug])

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

  const isExpired = entry?.expiration_date && new Date(entry.expiration_date) < new Date()

  // Build combined image list: cover_image first, then gallery images
  const allImages: Array<{ url: string; alt: string }> = []
  if (entry) {
    const coverUrl = getImageUrl(entry.cover_image)
    if (coverUrl) {
      allImages.push({ url: coverUrl, alt: entry.title })
    }
    if (entry.images && Array.isArray(entry.images)) {
      for (const img of entry.images) {
        const url = img.url?.startsWith('http') ? img.url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${img.url}`
        allImages.push({ url, alt: img.alternativeText || entry.title })
      }
    }
  }

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-none dark:text-coral">
                {entry?.title || '...'}
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

        {!loading && entry && (
          <section className="py-24 bg-white dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Back link */}
              <Link
                href={`/projects/${projectSlug}`}
                className="inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral mb-8 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Πίσω στο Έργο
              </Link>

              {/* Expired notice */}
              {isExpired && (
                <div className="bg-orange-50 dark:bg-gray-800 border border-orange-300 dark:border-orange-600 rounded-2xl p-8 text-center mb-8">
                  <svg className="w-12 h-12 text-orange-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-lg font-medium text-orange-700 dark:text-orange-400">
                    Αυτή η καταχώρηση δεν είναι πλέον διαθέσιμη
                  </p>
                </div>
              )}

              {!isExpired && (
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

                  {/* Category */}
                  {entry.category && (
                    <div className="mb-4">
                      <span className="px-4 py-2 rounded-full text-sm font-medium bg-coral/20 text-coral-dark dark:bg-coral/10 dark:text-coral-light">
                        {entry.category}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {entry.tags && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {entry.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string) => (
                        <span key={tag} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium dark:text-gray-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Date and Link row */}
                  <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-gray-600 dark:text-gray-400">
                    {entry.publication_date && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(entry.publication_date).toLocaleDateString('el-GR')}</span>
                      </div>
                    )}
                    {entry.entry_link && (
                      <a
                        href={entry.entry_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral transition-colors font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {entry.entry_link.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  {entry.description && (
                    <div className="prose dark:prose-invert max-w-none">
                      {renderBlocks(entry.description)}
                    </div>
                  )}

                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
