'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import Link from 'next/link'
import Image from 'next/image'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import { renderBlocks } from '@/lib/renderBlocks'

interface Member {
  id: number
  documentId: string
  Name: string
  Slug: string
  Image?: Array<{
    url: string
    alternativeText?: string
  }>
  ProfileImageAltText?: string  // Accessibility alt text for profile image
  Project1Title?: string
  Project1Description?: string
  Project1Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project1PicturesAltText?: string  // Accessibility alt text for project 1 images
  Project1Tags?: string
  Project1Links?: string
  Project2Title?: string
  Project2Description?: string
  Project2Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project2PicturesAltText?: string  // Accessibility alt text for project 2 images
  Project2Tags?: string
  Project2Links?: string
}

function getWebsiteDisplay(url: string): { label: string; icon: React.ReactNode } {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return {
      label: 'YouTube',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('instagram.com')) {
    return {
      label: 'Instagram',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('linkedin.com')) {
    return {
      label: 'LinkedIn',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('facebook.com')) {
    return {
      label: 'Facebook',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('linktr.ee') || lowerUrl.includes('linktree.com')) {
    return {
      label: 'Linktree',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.953 15.066l-.038-4.079-4.86-.002v-2.97h4.86L3.954 3.99l2.19-2.307 4.032 4.17 3.96-4.17 2.305 2.307-4.07 4.025h4.96v2.97l-4.985.002-.025 4.079h-4.368zm2.184 7.63l-2.184-2.28 2.184-2.29 2.262 2.29-2.262 2.28z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('tiktok.com')) {
    return {
      label: 'TikTok',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return {
      label: 'X',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    }
  }

  // For other URLs, extract and display the clean domain
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '')
    return {
      label: domain,
      icon: <span className="text-coral dark:text-coral-light">🔗</span>,
    }
  } catch {
    return {
      label: url,
      icon: <span className="text-coral dark:text-coral-light">🔗</span>,
    }
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [member, setMember] = useState<Member | null>(null)
  const [projectData, setProjectData] = useState<{
    title: string
    description: string
    pictures: Array<{ url: string; alternativeText?: string }>
    picturesAltText?: string  // Accessibility alt text for project images
    tags: string[]
    links: string[]
  } | null>(null)
  const [otherProject, setOtherProject] = useState<{
    title: string
    pictures: Array<{ url: string; alternativeText?: string }>
    picturesAltText?: string  // Accessibility alt text for project images
  } | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)

  const memberSlug = params.name as string
  const projectName = decodeURIComponent(params.project as string)

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
    const fetchMemberAndProject = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/members?populate=*&filters[Slug][$eq]=${memberSlug}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_TOKEN}`,
            },
          }
        )
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          const memberData = data.data[0]
          setMember(memberData)

          // Determine which project to show
          if (memberData.Project1Title === projectName) {
            setProjectData({
              title: memberData.Project1Title,
              description: memberData.Project1Description || '',
              pictures: memberData.Project1Pictures || [],
              picturesAltText: memberData.Project1PicturesAltText,
              tags: memberData.Project1Tags?.split(',').map((t: string) => t.trim()) || [],
              links: memberData.Project1Links?.split(',').map((l: string) => l.trim()).filter((l: string) => l) || [],
            })
            if (memberData.Project2Title) {
              setOtherProject({
                title: memberData.Project2Title,
                pictures: memberData.Project2Pictures || [],
                picturesAltText: memberData.Project2PicturesAltText,
              })
            }
          } else if (memberData.Project2Title === projectName) {
            setProjectData({
              title: memberData.Project2Title,
              description: memberData.Project2Description || '',
              pictures: memberData.Project2Pictures || [],
              picturesAltText: memberData.Project2PicturesAltText,
              tags: memberData.Project2Tags?.split(',').map((t: string) => t.trim()) || [],
              links: memberData.Project2Links?.split(',').map((l: string) => l.trim()).filter((l: string) => l) || [],
            })
            if (memberData.Project1Title) {
              setOtherProject({
                title: memberData.Project1Title,
                pictures: memberData.Project1Pictures || [],
                picturesAltText: memberData.Project1PicturesAltText,
              })
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error)
      }
    }

    fetchMemberAndProject()
  }, [memberSlug, projectName])

  if (!member || !projectData) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex items-center justify-center">
        <p className="dark:text-gray-200">Φόρτωση...</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                {projectData.title}
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

      {/* Back Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-4">
        <div className="flex gap-3">
          <Link
            href={`/members/${member?.Slug || memberSlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium hover:text-coral dark:hover:text-coral-light transition-colors bg-white/90 dark:bg-gray-800/90 dark:text-gray-200 px-4 py-2 rounded-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Πίσω στο μέλος {member?.Name || ''}
          </Link>
          <Link
            href="/members"
            className="inline-flex items-center gap-2 text-sm font-medium hover:text-coral dark:hover:text-coral-light transition-colors bg-white/90 dark:bg-gray-800/90 dark:text-gray-200 px-4 py-2 rounded-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Πίσω στην αναζήτηση
          </Link>
        </div>
      </div>

      {/* Project Details Section */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {projectData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium dark:text-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Project Image Carousel */}
            {projectData.pictures && projectData.pictures.length > 0 && (
              <div className="mb-12">
                <div className="aspect-[16/9] relative rounded-3xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                  <Image
                    src={projectData.pictures[currentImageIndex].url}
                    alt={projectData.picturesAltText || projectData.title}
                    fill
                    className="object-cover"
                  />

                  {/* Navigation Arrows - only show if more than 1 image */}
                  {projectData.pictures.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) =>
                          prev === 0 ? projectData.pictures!.length - 1 : prev - 1
                        )}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                      >
                        <svg className="w-6 h-6 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) =>
                          prev === projectData.pictures!.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                      >
                        <svg className="w-6 h-6 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 right-4 bg-black/60 dark:bg-black/80 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {projectData.pictures.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail Strip - only show if more than 1 image */}
                {projectData.pictures.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {projectData.pictures.map((picture, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentImageIndex ? 'border-coral dark:border-coral-light' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="relative w-full h-full bg-gray-200 dark:bg-gray-700">
                          <Image
                            src={picture.url}
                            alt={projectData.picturesAltText || `${projectData.title} ${index + 1}`}
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

            {/* Member Info and Description */}
            <div className="grid md:grid-cols-[120px,1fr] gap-8">
              {/* Member Thumbnail */}
              <div>
                {member.Image && member.Image.length > 0 && member.Image[0].url ? (
                  <Link href={`/members/${member.Slug}`}>
                    <div className="aspect-square relative rounded-full overflow-hidden hover:opacity-80 transition-opacity bg-gray-200 dark:bg-gray-700">
                      <Image
                        src={member.Image[0].url}
                        alt={member.ProfileImageAltText || member.Name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>
                ) : (
                  <Link href={`/members/${member.Slug}`}>
                    <div className="aspect-square rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:opacity-80 transition-opacity">
                      <span className="text-gray-400 dark:text-gray-500 text-4xl">{member.Name.charAt(0)}</span>
                    </div>
                  </Link>
                )}
                <Link
                  href={`/members/${member.Slug}`}
                  className="block text-center mt-2 text-sm font-bold hover:text-coral dark:hover:text-coral-light dark:text-gray-200 transition-colors"
                >
                  {member.Name}
                </Link>
              </div>

              {/* Description */}
              <div>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {renderBlocks(projectData.description)}
                </div>

                {/* Project Links */}
                {projectData.links.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-bold text-charcoal dark:text-gray-200 mb-3 uppercase tracking-wide">Links</h4>
                    <div className="flex flex-wrap gap-3">
                      {projectData.links.map((link, index) => {
                        const fullUrl = link.startsWith('http') ? link : `https://${link}`
                        const { label, icon } = getWebsiteDisplay(link)
                        return (
                          <a
                            key={index}
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-charcoal dark:text-gray-200 hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors"
                          >
                            {icon}
                            {label}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Projects Section */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-coral dark:text-coral-light text-sm mb-2 uppercase">Άλλα Έργα</p>
            <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
              ΕΡΓΑ ΑΠΟ ΤΑ ΙΔΙΑ ΜΕΛΗ
            </h2>
          </div>

          {otherProject ? (
            <div className="grid md:grid-cols-2 gap-8">
              <Link
                href={`/members/${member.Slug}/${encodeURIComponent(otherProject.title)}`}
                className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow"
              >
                {otherProject.pictures && otherProject.pictures[0] && (
                  <div className="aspect-[4/3] relative bg-gray-200 dark:bg-gray-700">
                    <Image
                      src={otherProject.pictures[0].url}
                      alt={otherProject.picturesAltText || otherProject.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold dark:text-gray-100">{otherProject.title}</h3>
                </div>
              </Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Δεν βρέθηκαν άλλα έργα από αυτό το μέλος.</p>
            </div>
          )}
        </div>
      </section>
      </main>
      <Footer variant="members" />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
