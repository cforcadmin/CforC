'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import Link from 'next/link'
import Image from 'next/image'

interface Member {
  id: number
  documentId: string
  Name: string
  Image?: Array<{
    url: string
    alternativeText?: string
  }>
  Project1Title?: string
  Project1Description?: string
  Project1Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project1Tags?: string
  Project2Title?: string
  Project2Description?: string
  Project2Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project2Tags?: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [member, setMember] = useState<Member | null>(null)
  const [projectData, setProjectData] = useState<{
    title: string
    description: string
    pictures: Array<{ url: string; alternativeText?: string }>
    tags: string[]
  } | null>(null)
  const [otherProject, setOtherProject] = useState<{
    title: string
    pictures: Array<{ url: string; alternativeText?: string }>
  } | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const memberName = decodeURIComponent(params.name as string)
  const projectName = decodeURIComponent(params.project as string)

  useEffect(() => {
    const fetchMemberAndProject = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/members?populate=*&filters[Name][$eq]=${encodeURIComponent(memberName)}`,
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
              tags: memberData.Project1Tags?.split(',').map((t: string) => t.trim()) || [],
            })
            if (memberData.Project2Title) {
              setOtherProject({
                title: memberData.Project2Title,
                pictures: memberData.Project2Pictures || [],
              })
            }
          } else if (memberData.Project2Title === projectName) {
            setProjectData({
              title: memberData.Project2Title,
              description: memberData.Project2Description || '',
              pictures: memberData.Project2Pictures || [],
              tags: memberData.Project2Tags?.split(',').map((t: string) => t.trim()) || [],
            })
            if (memberData.Project1Title) {
              setOtherProject({
                title: memberData.Project1Title,
                pictures: memberData.Project1Pictures || [],
              })
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error)
      }
    }

    fetchMemberAndProject()
  }, [memberName, projectName])

  if (!member || !projectData) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <p>Φόρτωση...</p>
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
    <main className="min-h-screen bg-[#F5F0EB]">
      <Navigation variant="members" />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="relative h-[25vh] flex items-center rounded-b-3xl overflow-hidden z-10">
          <div className="absolute inset-0 bg-coral opacity-20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
            {/* Back Buttons */}
            <div className="flex gap-3 mb-4">
              <Link
                href={`/members/${encodeURIComponent(memberName)}`}
                className="inline-flex items-center gap-2 text-sm font-medium hover:text-coral transition-colors bg-white/90 px-4 py-2 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Πίσω στο Μέλος
              </Link>
              <Link
                href="/members"
                className="inline-flex items-center gap-2 text-sm font-medium hover:text-coral transition-colors bg-white/90 px-4 py-2 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Πίσω στα Μέλη
              </Link>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none">
              {projectData.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Project Details Section */}
      <section className="pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {projectData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-gray-100 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Project Image Carousel */}
            {projectData.pictures && projectData.pictures.length > 0 && (
              <div className="mb-12">
                <div className="aspect-[16/9] relative rounded-3xl overflow-hidden bg-gray-200">
                  <Image
                    src={projectData.pictures[currentImageIndex].url}
                    alt={projectData.pictures[currentImageIndex].alternativeText || projectData.title}
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
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) =>
                          prev === projectData.pictures!.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
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
                          index === currentImageIndex ? 'border-coral' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="relative w-full h-full">
                          <Image
                            src={picture.url}
                            alt={picture.alternativeText || `${projectData.title} ${index + 1}`}
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
                  <Link href={`/members/${encodeURIComponent(member.Name)}`}>
                    <div className="aspect-square relative rounded-full overflow-hidden hover:opacity-80 transition-opacity bg-gray-200">
                      <Image
                        src={member.Image[0].url}
                        alt={member.Image[0].alternativeText || member.Name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>
                ) : (
                  <Link href={`/members/${encodeURIComponent(member.Name)}`}>
                    <div className="aspect-square rounded-full bg-gray-200 flex items-center justify-center hover:opacity-80 transition-opacity">
                      <span className="text-gray-400 text-4xl">{member.Name.charAt(0)}</span>
                    </div>
                  </Link>
                )}
                <Link
                  href={`/members/${encodeURIComponent(member.Name)}`}
                  className="block text-center mt-2 text-sm font-bold hover:text-coral transition-colors"
                >
                  {member.Name}
                </Link>
              </div>

              {/* Description */}
              <div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
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
            <p className="text-coral text-sm mb-2 uppercase">Άλλα Έργα</p>
            <h2 className="text-4xl md:text-5xl font-bold">
              ΕΡΓΑ ΑΠΟ ΤΑ ΙΔΙΑ ΜΕΛΗ
            </h2>
          </div>

          {otherProject ? (
            <div className="grid md:grid-cols-2 gap-8">
              <Link
                href={`/members/${encodeURIComponent(member.Name)}/${encodeURIComponent(otherProject.title)}`}
                className="bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-shadow"
              >
                {otherProject.pictures && otherProject.pictures[0] && (
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={otherProject.pictures[0].url}
                      alt={otherProject.pictures[0].alternativeText || otherProject.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold">{otherProject.title}</h3>
                </div>
              </Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Δεν βρέθηκαν άλλα έργα από αυτό το μέλος.</p>
            </div>
          )}
        </div>
      </section>

      <Footer variant="members" />
      <CookieConsent />
    </main>
  )
}
