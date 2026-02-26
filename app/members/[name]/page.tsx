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

interface Member {
  id: number
  documentId: string
  Name: string
  Slug: string
  Bio: any
  FieldsOfWork: string
  City: string
  Province: string
  Email: string
  Phone: string
  Websites: string
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
  Project2Title?: string
  Project2Description?: string
  Project2Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project2PicturesAltText?: string  // Accessibility alt text for project 2 images
  Project2Tags?: string
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

function getHeroName(name: string): string {
  if (!name) return ''
  // Remove punctuation we don't want emphasized in the hero
  const withoutPunctuation = name.replace(/[.,;:!?"'«»·()\-–—]/g, '')
  // Uppercase using Greek locale so tonos is handled appropriately
  return withoutPunctuation.toLocaleUpperCase('el-GR')
}

export default function MemberDetailPage() {
  const params = useParams()
  const [member, setMember] = useState<Member | null>(null)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)
  const [emailCopied, setEmailCopied] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const memberSlug = params.name as string

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
    const fetchMember = async () => {
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
          setMember(data.data[0])
        }
      } catch (error) {
        console.error('Error fetching member:', error)
      }
    }

    fetchMember()
  }, [memberSlug])

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newsletterEmail && agreedToTerms && !isSubmitting) {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newsletterEmail, website: honeypot }),
        })
        if (response.ok) {
          setShowPopup(true)
          setNewsletterEmail('')
          setTimeout(() => setShowPopup(false), 4000)
        }
      } catch (error) {
        console.error('Subscription error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex items-center justify-center">
        <p className="dark:text-gray-200">Φόρτωση...</p>
      </main>
    )
  }

  const fieldsOfWork = member.FieldsOfWork?.split(',').map((f) => f.trim()).filter((f) => f && f !== '-') || []
  const websites = member.Websites?.split(',').map((w) => w.trim()).filter((w) => w && w !== '-') || []
  const hasProjects = member.Project1Title || member.Project2Title

  // Safely extract bio text (in case it's a rich text object)
  const getBioText = (bio: any): string => {
    if (typeof bio === 'string') return bio
    if (Array.isArray(bio)) {
      return bio.map(block => {
        if (block.type === 'paragraph' && block.children) {
          return block.children.map((child: any) => child.type === 'link' && child.children ? child.children.map((c: any) => c.text || '').join('') : child.text || '').join('')
        }
        return ''
      }).join('\n')
    }
    return ''
  }

  const bioText = getBioText(member.Bio)

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation variant="members" />
      <main>
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              {/* Hero: name in Greek ALL CAPS, without punctuation */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                {getHeroName(member.Name)}
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

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-4">
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

      {/* Member Info Section */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12">
            <div className="grid md:grid-cols-[300px,1fr] gap-12">
              {/* Profile Image */}
              <div>
                {member.Image && member.Image.length > 0 && member.Image[0].url ? (
                  <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <Image
                      src={member.Image[0].url}
                      alt={member.ProfileImageAltText || member.Name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-6xl">{member.Name.charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 dark:text-gray-100">{member.Name}</h2>

                <div className="mb-8">
                  <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase">Βιογραφικό</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{bioText}</p>
                </div>

                <div className="mb-8">
                  <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase">Επικοινωνία</h3>
                  <div className="space-y-2">
                    {member.Email && (
                      <p className="flex items-center gap-2 dark:text-gray-300">
                        <span className="text-coral dark:text-coral-light">✉</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(member.Email)
                            setEmailCopied(true)
                            setTimeout(() => setEmailCopied(false), 2000)
                          }}
                          className="hover:text-coral dark:hover:text-coral-light transition-colors cursor-pointer text-left"
                        >
                          {member.Email}
                        </button>
                        {emailCopied && (
                          <span className="text-xs text-coral dark:text-coral-light animate-pulse">
                            Copied!
                          </span>
                        )}
                      </p>
                    )}
                    {member.Phone && member.Phone.trim() !== '-' && member.Phone.trim() !== '' && (
                      <p className="flex items-center gap-2 dark:text-gray-300">
                        <span className="text-coral dark:text-coral-light">📱</span>
                        <a href={`tel:${member.Phone}`} className="hover:text-coral dark:hover:text-coral-light transition-colors">
                          {member.Phone}
                        </a>
                      </p>
                    )}
                    {websites.map((website, index) => {
                      const { label, icon } = getWebsiteDisplay(website)
                      return (
                        <p key={index} className="flex items-center gap-2 dark:text-gray-300">
                          {icon}
                          <a
                            href={website.startsWith('http') ? website : `https://${website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-coral dark:hover:text-coral-light transition-colors"
                          >
                            {label}
                          </a>
                        </p>
                      )
                    })}
                  </div>
                </div>

                {fieldsOfWork.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase">Πεδία Πρακτικής</h3>
                    <div className="flex flex-wrap gap-2">
                      {fieldsOfWork.map((field, index) => (
                        <Link
                          key={index}
                          href={`/members?field=${encodeURIComponent(field)}`}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm dark:text-gray-200 hover:bg-coral hover:text-white hover:border-coral dark:hover:bg-coral-light dark:hover:text-gray-900 dark:hover:border-coral-light cursor-pointer transition-colors"
                        >
                          {field}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Section */}
                {(() => {
                  const cities = member.City?.split(',').map(c => c.trim()).filter(c => c && c !== '-') || []
                  const provinces = member.Province?.split(',').map(p => p.trim()).filter(p => p && p !== '-') || []
                  if (cities.length === 0 && provinces.length === 0) return null
                  return (
                    <div>
                      <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase">Τοποθεσία</h3>
                      <div className="space-y-3">
                        {cities.length > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-coral dark:text-coral-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="flex flex-wrap gap-2">
                              {cities.map((city, index) => (
                                <Link
                                  key={`city-${index}`}
                                  href={`/members?city=${encodeURIComponent(city)}`}
                                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm dark:text-gray-200 hover:bg-coral hover:text-white hover:border-coral dark:hover:bg-coral-light dark:hover:text-gray-900 dark:hover:border-coral-light cursor-pointer transition-colors"
                                >
                                  {city}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                        {provinces.length > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-coral dark:text-coral-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex flex-wrap gap-2">
                              {provinces.map((province, index) => (
                                <Link
                                  key={`province-${index}`}
                                  href={`/members?province=${encodeURIComponent(province)}`}
                                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm dark:text-gray-200 hover:bg-coral hover:text-white hover:border-coral dark:hover:bg-coral-light dark:hover:text-gray-900 dark:hover:border-coral-light cursor-pointer transition-colors"
                                >
                                  {province}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      {hasProjects ? (
        <section className="pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <p className="text-coral dark:text-coral-light text-sm mb-2 uppercase">Έργα</p>
              <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
                Έργα από {member.Name}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {member.Project1Title && (
                <Link
                  href={`/members/${member.Slug}/${encodeURIComponent(member.Project1Title)}`}
                  className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow"
                >
                  {member.Project1Pictures && member.Project1Pictures[0] && (
                    <div className="aspect-[4/3] relative bg-gray-200 dark:bg-gray-700">
                      <Image
                        src={member.Project1Pictures[0].url}
                        alt={member.Project1PicturesAltText || member.Project1Title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold dark:text-gray-100">{member.Project1Title}</h3>
                  </div>
                </Link>
              )}

              {member.Project2Title && (
                <Link
                  href={`/members/${member.Slug}/${encodeURIComponent(member.Project2Title)}`}
                  className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow"
                >
                  {member.Project2Pictures && member.Project2Pictures[0] && (
                    <div className="aspect-[4/3] relative bg-gray-200 dark:bg-gray-700">
                      <Image
                        src={member.Project2Pictures[0].url}
                        alt={member.Project2PicturesAltText || member.Project2Title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold dark:text-gray-100">{member.Project2Title}</h3>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <p className="text-coral dark:text-coral-light text-sm mb-2 uppercase">Έργα</p>
              <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
                Έργα από {member.Name}
              </h2>
            </div>
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Δεν βρέθηκαν σχετικά έργα.</p>
            </div>
          </div>
        </section>
      )}

      {/* Combined: Become a Member + Newsletter */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden grid md:grid-cols-2">
            {/* Left: Become a Member */}
            <div className="bg-gradient-to-br from-coral to-orange-400 dark:from-gray-700 dark:to-gray-800 p-10 md:p-12 flex flex-col justify-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-gray-100">
                Θες να γίνεις μέλος;
              </h2>
              <p className="text-white/90 dark:text-gray-300 mb-8 leading-relaxed">
                Συμπλήρωσε τη φόρμα εγγραφής και θα επικοινωνήσουμε μαζί σου σύντομα για τα επόμενα βήματα!
              </p>
              <div>
                <Link
                  href="/participation"
                  className="inline-block bg-charcoal dark:bg-gray-600 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-8 py-4 rounded-full text-lg font-bold hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  ΜΑΘΕ ΠΕΡΙΣΣΟΤΕΡΑ
                </Link>
              </div>
            </div>

            {/* Right: Newsletter */}
            <div className="bg-white dark:bg-gray-800 p-10 md:p-12 flex flex-col justify-center">
              <span className="inline-block self-start bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-xs font-medium mb-4">
                ΟΛΑ TA NEA ΣTO EMAIL ΣΟΥ!
              </span>
              <h3 className="text-xl font-bold mb-6 dark:text-gray-100 leading-tight">
                Γράψου στο newsletter μας για δράσεις, ευκαιρίες και νέα.
              </h3>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                {/* Honeypot */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Το email σας: *"
                    required
                    className="w-full px-5 py-3 pr-14 rounded-full border-2 border-gray-300 dark:border-gray-600 focus:border-coral focus:outline-none text-gray-700 dark:text-gray-200 dark:bg-gray-700 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !agreedToTerms}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-coral hover:bg-coral/90 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Εγγραφή στο newsletter"
                  >
                    {isSubmitting ? (
                      <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms-checkbox-member"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-coral bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-coral focus:ring-2 cursor-pointer"
                  />
                  <label htmlFor="terms-checkbox-member" className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                    Συμφωνώ με τους{' '}
                    <Link href="/terms" className="text-charcoal dark:text-gray-200 font-medium hover:text-coral transition-colors underline">
                      όρους και τις προϋποθέσεις
                    </Link>
                  </label>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPopup(false)} aria-hidden="true" />
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full animate-[scale-in_0.3s_ease-out]">
            <div className="text-center">
              <div className="w-16 h-16 bg-coral/10 dark:bg-coral/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-3">
                Καλώς ήρθες στην κοινότητα του CforC!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Ευχαριστούμε για το ενδιαφέρον στην κοινότητά μας :-)
              </p>
              <button
                onClick={() => setShowPopup(false)}
                className="mt-6 px-8 py-3 bg-coral hover:bg-coral/90 text-white font-medium rounded-full transition-colors"
              >
                Εντάξει
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
      <Footer variant="members" />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
