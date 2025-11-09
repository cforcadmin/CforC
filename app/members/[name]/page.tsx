'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import Link from 'next/link'
import Image from 'next/image'

interface Member {
  id: number
  documentId: string
  Name: string
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

export default function MemberDetailPage() {
  const params = useParams()
  const [member, setMember] = useState<Member | null>(null)
  const memberName = decodeURIComponent(params.name as string)

  useEffect(() => {
    const fetchMember = async () => {
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
          setMember(data.data[0])
        }
      } catch (error) {
        console.error('Error fetching member:', error)
      }
    }

    fetchMember()
  }, [memberName])

  if (!member) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <p>Φόρτωση...</p>
      </main>
    )
  }

  const fieldsOfWork = member.FieldsOfWork?.split(',').map((f) => f.trim()) || []
  const websites = member.Websites?.split(',').map((w) => w.trim()) || []
  const hasProjects = member.Project1Title || member.Project2Title

  // Safely extract bio text (in case it's a rich text object)
  const getBioText = (bio: any): string => {
    if (typeof bio === 'string') return bio
    if (Array.isArray(bio)) {
      return bio.map(block => {
        if (block.type === 'paragraph' && block.children) {
          return block.children.map((child: any) => child.text || '').join('')
        }
        return ''
      }).join('\n')
    }
    return ''
  }

  const bioText = getBioText(member.Bio)

  return (
    <main className="min-h-screen bg-[#F5F0EB]">
      <Navigation variant="members" />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="relative h-[25vh] flex items-center rounded-b-3xl overflow-hidden z-10">
          <div className="absolute inset-0 bg-coral opacity-20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
            {/* Back Button */}
            <Link
              href="/members"
              className="inline-flex items-center gap-2 text-sm font-medium mb-4 hover:text-coral transition-colors bg-white/90 px-4 py-2 rounded-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Πίσω στα Μέλη
            </Link>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none">
              {member.Name}
            </h1>
          </div>
        </div>
      </section>

      {/* Member Info Section */}
      <section className="pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12">
            <div className="grid md:grid-cols-[300px,1fr] gap-12">
              {/* Profile Image */}
              <div>
                {member.Image && member.Image.length > 0 && member.Image[0].url ? (
                  <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-gray-200">
                    <Image
                      src={member.Image[0].url}
                      alt={member.Image[0].alternativeText || member.Name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-gray-200 rounded-2xl flex items-center justify-center">
                    <span className="text-gray-400 text-6xl">{member.Name.charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">{member.Name}</h2>

                <div className="mb-8">
                  <h3 className="text-coral text-sm font-bold mb-4 uppercase">Βιογραφία</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{bioText}</p>
                </div>

                <div className="mb-8">
                  <h3 className="text-coral text-sm font-bold mb-4 uppercase">Επικοινωνία</h3>
                  <div className="space-y-2">
                    {member.Email && (
                      <p className="flex items-center gap-2">
                        <span className="text-coral">✉</span>
                        <a href={`mailto:${member.Email}`} className="hover:text-coral transition-colors">
                          {member.Email}
                        </a>
                      </p>
                    )}
                    {member.Phone && (
                      <p className="flex items-center gap-2">
                        <span className="text-coral">📱</span>
                        <a href={`tel:${member.Phone}`} className="hover:text-coral transition-colors">
                          {member.Phone}
                        </a>
                      </p>
                    )}
                    {member.City && (
                      <p className="flex items-center gap-2">
                        <span className="text-coral">📍</span>
                        {member.City}
                        {member.Province && `, ${member.Province}`}
                      </p>
                    )}
                    {websites.map((website, index) => (
                      <p key={index} className="flex items-center gap-2">
                        <span className="text-coral">🔗</span>
                        <a
                          href={website.startsWith('http') ? website : `https://${website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-coral transition-colors break-all"
                        >
                          {website}
                        </a>
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-coral text-sm font-bold mb-4 uppercase">Πεδία Πρακτικής</h3>
                  <div className="flex flex-wrap gap-2">
                    {fieldsOfWork.map((field, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 border border-gray-300 rounded-full text-sm"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
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
              <p className="text-coral text-sm mb-2 uppercase">Συναφή Έργα</p>
              <h2 className="text-4xl md:text-5xl font-bold">
                ΣΥΝΑΦΗ ΕΡΓΑ ΑΠΟ {member.Name.toUpperCase()}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {member.Project1Title && (
                <Link
                  href={`/members/${encodeURIComponent(member.Name)}/${encodeURIComponent(member.Project1Title)}`}
                  className="bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {member.Project1Pictures && member.Project1Pictures[0] && (
                    <div className="aspect-[4/3] relative">
                      <Image
                        src={member.Project1Pictures[0].url}
                        alt={member.Project1Pictures[0].alternativeText || member.Project1Title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold">{member.Project1Title}</h3>
                  </div>
                </Link>
              )}

              {member.Project2Title && (
                <Link
                  href={`/members/${encodeURIComponent(member.Name)}/${encodeURIComponent(member.Project2Title)}`}
                  className="bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {member.Project2Pictures && member.Project2Pictures[0] && (
                    <div className="aspect-[4/3] relative">
                      <Image
                        src={member.Project2Pictures[0].url}
                        alt={member.Project2Pictures[0].alternativeText || member.Project2Title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold">{member.Project2Title}</h3>
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
              <p className="text-coral text-sm mb-2 uppercase">Συναφή Έργα</p>
              <h2 className="text-4xl md:text-5xl font-bold">
                ΣΥΝΑΦΗ ΕΡΓΑ ΑΠΟ {member.Name.toUpperCase()}
              </h2>
            </div>
            <div className="text-center py-12">
              <p className="text-gray-600">Δεν βρέθηκαν σχετικά έργα.</p>
            </div>
          </div>
        </section>
      )}

      {/* Become a Member Section */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-coral to-orange-400 rounded-3xl p-12 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Έτοιμος να γίνεις μέλος;
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              Συμπλήρωσε τη φόρμα εγγραφής και θα επικοινωνήσουμε μαζί σου σύντομα για τα επόμενα βήματα!
            </p>
            <Link
              href="/participation"
              className="inline-block bg-white text-coral px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ΜΑΘΕ ΠΕΡΙΣΣΟΤΕΡΑ
            </Link>
          </div>
        </div>
      </section>

      <NewsletterSection variant="members" />
      <Footer variant="members" />
      <CookieConsent />
    </main>
  )
}
