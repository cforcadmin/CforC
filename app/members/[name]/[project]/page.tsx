'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import Link from 'next/link'
import Image from 'next/image'

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
  Project2Title?: string
  Project2Description?: string
  Project2Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project2PicturesAltText?: string  // Accessibility alt text for project 2 images
  Project2Tags?: string
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
  } | null>(null)
  const [otherProject, setOtherProject] = useState<{
    title: string
    pictures: Array<{ url: string; alternativeText?: string }>
    picturesAltText?: string  // Accessibility alt text for project images
  } | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const memberSlug = params.name as string
  const projectName = decodeURIComponent(params.project as string)

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

  // Safely extract description text (in case it's a rich text object)
  const getDescriptionText = (description: any): string => {
    if (typeof description === 'string') return description
    if (Array.isArray(description)) {
      return description.map(block => {
        if (block.type === 'paragraph' && block.children) {
          return block.children.map((child: any) => child.text || '').join('')
        }
        return ''
      }).join('\n')
    }
    return ''
  }

  const descriptionText = getDescriptionText(projectData.description)

  return (
    <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation variant="members" />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
              {projectData.title}
            </h1>
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
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {descriptionText}
                </p>
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

      <Footer variant="members" />
      <CookieConsent />
      <ScrollToTop />
    </main>
  )
}
