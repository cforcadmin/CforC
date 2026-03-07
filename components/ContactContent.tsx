'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { getCoordinationTeams } from '@/lib/strapi'
import type { StrapiResponse, CoordinationTeam, WorkingGroupMemberRef } from '@/lib/types'

// Role mapping: Coordinator = President, then Members by index
const ROLE_MAP: Record<number, { title: string; email: string; description: string }> = {
  0: { title: 'Υπεύθυνη Κοινότητας', email: 'community@cultureforchange.net', description: 'Εγγραφές μελών, διαχείριση κοινότητας και θέματα συνδρομών.' },
  1: { title: 'Υπεύθυνη Επικοινωνίας', email: 'communication@cultureforchange.net', description: 'Εξωτερική επικοινωνία, δημόσια εικόνα και προβολή του δικτύου.' },
  2: { title: 'Υπεύθυνος Οικονομικών & IT', email: 'finance@cultureforchange.net', description: 'Οικονομική διαχείριση, τεχνική υποστήριξη, ανάπτυξη και λειτουργία website.' },
  3: { title: 'Αντιπρόεδρος', email: 'outreach@cultureforchange.net', description: 'Υποστήριξη και αναπλήρωση της Προέδρου, εξωτερικές σχέσεις.' },
}

const PRESIDENT_ROLE = {
  title: 'Πρόεδρος',
  email: 'coordinator@cultureforchange.net',
  description: 'Γενική εποπτεία λειτουργίας του δικτύου και συντονισμός δράσεων.',
}

const ADMIN_ROLE = {
  title: 'Διαχειρίστρια',
  email: 'hello@cultureforchange.net',
  description: 'Διοικητική υποστήριξη και διαχείριση γραφείου.',
}

// ── Shared contact row component ──

function ContactRow({ member, role }: { member: WorkingGroupMemberRef; role: { title: string; email: string; description: string } }) {
  const imageUrl = getImageUrl(member.Image)
  return (
    <div className="flex gap-3">
      <Link href={`/members/${member.Slug}`} className="flex-shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={member.ProfileImageAltText || member.Name}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light transition-colors"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-coral/20 dark:bg-coral/30 flex items-center justify-center text-coral dark:text-coral-light font-bold border-2 border-gray-200 dark:border-gray-600">
            {member.Name.charAt(0)}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/members/${member.Slug}`}
            className="text-sm font-bold text-charcoal dark:text-gray-100 hover:text-coral dark:hover:text-coral-light transition-colors"
          >
            {member.Name}
          </Link>
          <span className="text-[10px] bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-200 border border-charcoal/30 dark:border-gray-500 px-2 py-0.5 rounded-full">
            {role.title}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
          {role.description}
        </p>
        <a
          href={`mailto:${role.email}`}
          className="text-xs text-coral dark:text-coral-light hover:underline mt-1 inline-block"
        >
          {role.email}
        </a>
      </div>
    </div>
  )
}

function getImageUrl(image: WorkingGroupMemberRef['Image']): string | null {
  if (!image) return null
  if (Array.isArray(image) && image.length > 0) {
    const url = image[0].url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  if (typeof image === 'object' && !Array.isArray(image) && 'url' in image) {
    const url = (image as { url: string }).url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  return null
}

export default function ContactContent() {
  const { user } = useAuth()
  const [currentTeam, setCurrentTeam] = useState<CoordinationTeam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTeam() {
      try {
        const response: StrapiResponse<CoordinationTeam[]> = await getCoordinationTeams()
        const current = response.data?.find(t => t.IsCurrent)
        setCurrentTeam(current || null)
      } catch (err) {
        console.error('Error fetching coordination team:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeam()
  }, [])

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      {/* Non-member contact card */}
      <GeneralContactCard />

      {/* Member contact card */}
      <MemberContactCard user={user} currentTeam={currentTeam} loading={loading} />
    </div>
  )
}

// ── General Contact (Non-member) Flip Card ──

function GeneralContactCard() {
  const [isFlipped, setIsFlipped] = useState(false)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    flipTimeout.current = setTimeout(() => setIsFlipped(true), 300)
  }
  const handleMouseLeave = () => {
    if (flipTimeout.current) clearTimeout(flipTimeout.current)
    setIsFlipped(false)
  }
  const handleTap = () => {
    setIsFlipped(prev => !prev)
  }

  return (
    <div
      className="[perspective:1200px] min-h-[420px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
    >
      <div
        className="relative w-full transition-transform duration-500 [transform-style:preserve-3d] min-h-[420px]"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light transition-all h-full flex flex-col items-center justify-center p-10 cursor-pointer">
            <div className="w-20 h-20 bg-coral/10 dark:bg-coral/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-2">Γενική Επικοινωνία</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
              Στοιχεία επικοινωνίας για εξωτερικούς συνεργάτες, οργανισμούς και ενδιαφερόμενους.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Hover ή πατήστε για στοιχεία</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-l-4 border-coral dark:border-coral-light h-full flex flex-col p-8">
            <h3 className="text-lg font-bold text-coral dark:text-coral-light mb-5">Στοιχεία Επικοινωνίας</h3>

            <div className="space-y-4 flex-1">
              {/* Address */}
              <a
                href="https://www.google.com/maps/place/Leof.+Alexandras+48,+Athina+114+73"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-9 h-9 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal dark:text-gray-200 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">Λ. Αλεξάνδρας 48</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">114 73, Αθήνα</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:hello@cultureforchange.net"
                className="flex items-center gap-3 group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-9 h-9 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-charcoal dark:text-gray-200 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">hello@cultureforchange.net</p>
              </a>

              {/* Phone */}
              <a
                href="tel:+306976225704"
                className="flex items-center gap-3 group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-9 h-9 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-charcoal dark:text-gray-200 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">+30 697 622 5704</p>
              </a>

              {/* Social Media */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Social Media</p>
                <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                  <a href="https://www.linkedin.com/company/culture-for-change-gr/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/linkedin-icon-lg.png" alt="LinkedIn" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://www.facebook.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/facebook-icon-lg.png" alt="Facebook" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://www.instagram.com/culture_for_change/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/instagram-icon-lg.png" alt="Instagram" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://www.youtube.com/channel/UCKFq7TQlenx36UPc3F63Opw" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/youtube-icon-lg.png" alt="YouTube" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://vimeo.com/user165582483" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/vimeo-square-icon-md.png" alt="Vimeo" width={18} height={18} className="dark:invert" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Member Contact Flip Card ──

function MemberContactCard({
  user,
  currentTeam,
  loading,
}: {
  user: ReturnType<typeof useAuth>['user']
  currentTeam: CoordinationTeam | null
  loading: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    flipTimeout.current = setTimeout(() => setIsFlipped(true), 300)
  }
  const handleMouseLeave = () => {
    if (flipTimeout.current) clearTimeout(flipTimeout.current)
    setIsFlipped(false)
  }
  const handleTap = () => {
    setIsFlipped(prev => !prev)
  }

  // Build team contact list from coordination team data
  const teamContacts: { member: WorkingGroupMemberRef; role: typeof PRESIDENT_ROLE }[] = []
  if (currentTeam) {
    if (currentTeam.Coordinator && !currentTeam.Coordinator.HideProfile) {
      teamContacts.push({ member: currentTeam.Coordinator, role: PRESIDENT_ROLE })
    }
    const members = currentTeam.Members?.filter(m => !m.HideProfile) || []
    members.forEach((member, index) => {
      const role = ROLE_MAP[index]
      if (role) {
        teamContacts.push({ member, role })
      }
    })
  }

  // When not logged in, the back shows a members-only prompt
  const showMembersOnly = !user

  return (
    <div
      className="[perspective:1200px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
    >
      <div
        className="relative w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: isFlipped && !showMembersOnly ? '650px' : '420px',
          transition: 'transform 0.5s, min-height 0.4s ease',
        }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden]" style={{ minHeight: '420px' }}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light transition-all h-full flex flex-col items-center justify-center p-10 cursor-pointer" style={{ minHeight: '420px' }}>
            <div className="w-20 h-20 bg-coral/10 dark:bg-coral/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-2">Επικοινωνία Μέλους</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
              Άμεση επικοινωνία με την Ομάδα Συντονισμού του δικτύου.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Hover ή πατήστε για στοιχεία</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {showMembersOnly ? (
            /* Logged out: members-only prompt */
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-l-4 border-coral dark:border-coral-light h-full flex flex-col items-center justify-center p-8" style={{ minHeight: '420px' }}>
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-coral dark:text-coral-light mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 dark:text-gray-100">Περιεχόμενο Μελών</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                  Τα στοιχεία επικοινωνίας της Ομάδας Συντονισμού είναι διαθέσιμα μόνο για εγγεγραμμένα μέλη.
                </p>
                <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href="/participation"
                    className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
                  >
                    Εγγραφή
                  </Link>
                  <Link
                    href="/login"
                    className="bg-white dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-white transition-colors"
                  >
                    Σύνδεση
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Logged in: team contacts */
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-l-4 border-coral dark:border-coral-light flex flex-col p-6 overflow-hidden" style={{ minHeight: '650px' }}>
              <h3 className="text-lg font-bold text-coral dark:text-coral-light mb-4">Ομάδα Συντονισμού</h3>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                </div>
              ) : teamContacts.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Δεν βρέθηκαν στοιχεία ομάδας.</p>
              ) : (
                <div className="space-y-4 flex-1" onClick={(e) => e.stopPropagation()}>
                  {teamContacts.map(({ member, role }) => (
                    <ContactRow key={member.id} member={member} role={role} />
                  ))}

                  {/* Admin separator + entry */}
                  {currentTeam?.Admin && !currentTeam.Admin.HideProfile && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
                      <ContactRow member={currentTeam.Admin} role={ADMIN_ROLE} />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
