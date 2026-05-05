'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import BlurredImage from './shared/BlurredImage'
import LoadingIndicator from './LoadingIndicator'
import LocalizedText from './LocalizedText'
import { useTranslation } from './TranslationProvider'
import { getOpenCalls } from '@/lib/strapi'
import type { StrapiResponse, OpenCall } from '@/lib/types'
import { useAuth } from './AuthProvider'

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
      .join(' ')
  }

  return ''
}

function getImageUrl(call: OpenCall): string | null {
  if (!call.Image) return null
  if (Array.isArray(call.Image) && call.Image.length > 0) {
    const url = call.Image[0].url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  if (typeof call.Image === 'object' && !Array.isArray(call.Image) && 'url' in call.Image) {
    const url = call.Image.url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  return null
}

function FlipCard({ call, expired, onClick }: { call: OpenCall; expired?: boolean; onClick?: () => void }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const [hoverHeight, setHoverHeight] = useState<number | null>(null)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)

  const descriptionText = extractTextFromBlocks(call.Description)
  const engDescriptionText = call.EngDescription ? extractTextFromBlocks(call.EngDescription) : null
  const imageUrl = getImageUrl(call)

  const handleMouseEnter = () => {
    flipTimeout.current = setTimeout(() => {
      const containerH = containerRef.current?.offsetHeight || 0
      const backH = backRef.current?.scrollHeight || 0
      setHoverHeight(backH > containerH ? backH : null)
      setIsFlipped(true)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (flipTimeout.current) clearTimeout(flipTimeout.current)
    setIsFlipped(false)
    setHoverHeight(null)
  }

  const Wrapper = onClick ? 'button' : 'a'
  const wrapperProps = onClick
    ? { type: 'button' as const, onClick }
    : { href: call.Link, target: '_blank', rel: 'noopener noreferrer' }

  return (
    <div
      ref={containerRef}
      className="[perspective:1200px]"
      style={{
        height: hoverHeight ? `${hoverHeight}px` : undefined,
        transition: 'height 0.4s ease',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div className="[backface-visibility:hidden] w-full h-full">
          <Wrapper
            {...wrapperProps as any}
            className={`bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow duration-300 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light flex flex-col h-full text-left ${expired ? 'opacity-75' : ''}`}
            aria-label={`${call.Title}${onClick ? '' : ' (ανοίγει σε νέα καρτέλα)'}`}
          >
            {imageUrl ? (
              <div className={`relative ${expired ? 'grayscale' : ''}`}>
                <BlurredImage
                  src={imageUrl}
                  alt={call.ImageAltText || call.Title}
                />
                {expired && (
                  <div className="absolute top-3 right-3 z-20">
                    <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-xs font-bold shadow-md">
                      ΕΛΗΞΕ
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {expired && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-xs font-bold shadow-md">ΕΛΗΞΕ</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <time
                  dateTime={call.Deadline}
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${expired ? 'bg-gray-500 text-white' : 'bg-charcoal dark:bg-gray-600 text-white'}`}
                >
                  {new Date(call.Deadline).toLocaleDateString('el-GR')}
                </time>
                {call.Category && (
                  <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full">
                    {call.Category}
                  </span>
                )}
              </div>

              <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${expired ? 'text-gray-500 dark:text-gray-400' : 'text-charcoal dark:text-gray-100'}`}>
                <LocalizedText text={call.Title} engText={call.EngTitle} />
              </h3>

              <p className={`text-sm line-clamp-3 mb-3 ${expired ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                <LocalizedText text={descriptionText} engText={engDescriptionText} />
              </p>

              <div className="flex-1" />
              <div className="flex items-center justify-end pt-2">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </Wrapper>
        </div>

        {/* Back */}
        <div ref={backRef} className="absolute top-0 left-0 w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Wrapper
            {...wrapperProps as any}
            className={`bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl dark:shadow-gray-700/50 border-l-4 border-coral dark:border-coral-light flex flex-col text-left ${expired ? 'opacity-75' : ''}`}
            aria-label={`${call.Title} — πλήρης περιγραφή`}
          >
            <div className="p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <time
                  dateTime={call.Deadline}
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${expired ? 'bg-gray-500 text-white' : 'bg-charcoal dark:bg-gray-600 text-white'}`}
                >
                  {new Date(call.Deadline).toLocaleDateString('el-GR')}
                </time>
                {call.Category && (
                  <span className={`inline-block text-xs px-3 py-1 rounded-full ${expired ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border border-gray-400 dark:border-gray-500' : 'bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400'}`}>
                    {call.Category}
                  </span>
                )}
                {expired && (
                  <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-xs font-bold">
                    ΕΛΗΞΕ
                  </span>
                )}
              </div>

              <h3 className={`text-base font-bold mb-3 line-clamp-1 ${expired ? 'text-gray-500 dark:text-gray-400' : 'text-coral dark:text-coral-light'}`}>
                <LocalizedText text={call.Title} engText={call.EngTitle} />
              </h3>

              <p className={`text-sm leading-relaxed mb-4 ${expired ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                <LocalizedText text={descriptionText} engText={engDescriptionText} />
              </p>

              <div className={`flex items-center justify-between mt-auto pt-3 border-t ${expired ? 'border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-600'}`}>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {onClick ? 'Κάνε κλικ για εγγραφή' : 'Κάνε κλικ για περισσότερα'}
                </span>
                <svg className={`w-5 h-5 ${expired ? 'text-gray-400 dark:text-gray-500' : 'text-coral dark:text-coral-light'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </Wrapper>
        </div>
      </div>
    </div>
  )
}

export default function OpenCallsSection() {
  const { user } = useAuth()
  const [activeCalls, setActiveCalls] = useState<OpenCall[]>([])
  const [expiredCalls, setExpiredCalls] = useState<OpenCall[]>([])
  const [totalActiveCalls, setTotalActiveCalls] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const { isEnglish } = useTranslation()

  useEffect(() => {
    async function fetchOpenCalls() {
      try {
        setLoading(true)

        if (user) {
          // Authenticated members get the full member-only listing through
          // the gated proxy, then split it into active + expired.
          const response: StrapiResponse<OpenCall[]> = await getOpenCalls()
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const active = response.data
            .filter(call => new Date(call.Deadline) >= today)
            .sort((a, b) => new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime())

          const expired = response.data
            .filter(call => new Date(call.Deadline) < today)
            .sort((a, b) => new Date(b.Deadline).getTime() - new Date(a.Deadline).getTime())
            .slice(0, 3)

          setTotalActiveCalls(active.length)
          setActiveCalls(active.slice(0, 6))
          setExpiredCalls(expired)
        } else {
          // Public visitors only get a teaser of recent expired calls — the
          // active member-only listing is never shipped to the client.
          const teaserResp = await fetch('/api/open-calls/teaser')
          const teaserData: StrapiResponse<OpenCall[]> = await teaserResp.json()
          setTotalActiveCalls(0)
          setActiveCalls([])
          setExpiredCalls(teaserData.data || [])
        }
      } catch (err) {
        setError('Failed to load open calls')
        console.error('Error fetching open calls:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOpenCalls()
  }, [user])

  if (loading) {
    return (
      <section id="open-calls" className="py-24 bg-orange-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingIndicator />
        </div>
      </section>
    )
  }

  // Show section even if no active calls (expired cards for non-logged-in)
  if (error || (activeCalls.length === 0 && expiredCalls.length === 0)) {
    return (
      <section id="open-calls" className="py-24 bg-orange-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium mb-2 shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]">{isEnglish ? <span className="notranslate">OPEN CALLS</span> : 'ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ'}</span>
            <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
              {isEnglish ? <><span className="notranslate">OPEN CALLS OF</span><br /></> : <>ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ ΤΟΥ<br /></>}
              CULTURE FOR CHANGE
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-2xl p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">
              {error || 'Δεν υπάρχουν διαθέσιμες προσκλήσεις αυτή τη στιγμή.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  const handleViewAllClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      setShowMemberModal(true)
    }
  }

  // Determine which calls to show
  const displayCalls = user ? activeCalls : expiredCalls

  return (
    <>
      {/* Member-Only Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 relative">
            <button
              type="button"
              onClick={() => setShowMemberModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Κλείσιμο"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-coral dark:text-coral-light mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 dark:text-gray-100">Περιεχόμενο Μελών</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {isEnglish ? <span className="notranslate">Open calls are available only to registered members. Register for access.</span> : 'Οι ανοιχτές προσκλήσεις είναι διαθέσιμες μόνο για εγγεγραμμένα μέλη. Εγγραφείτε για πρόσβαση.'}
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/participation"
                  className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
                  onClick={() => setShowMemberModal(false)}
                >
                  Εγγραφή
                </Link>
                <Link
                  href="/login"
                  className="bg-white dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-white transition-colors"
                  onClick={() => setShowMemberModal(false)}
                >
                  Σύνδεση
                </Link>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section id="open-calls" className="py-24 bg-orange-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
            <div>
              <span className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium mb-2 shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]">{isEnglish ? <span className="notranslate">OPEN CALLS</span> : 'ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ'}</span>
              <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
                {isEnglish ? <><span className="notranslate">OPEN CALLS OF</span><br /></> : <>ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ ΤΟΥ<br /></>}
                CULTURE FOR CHANGE
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-2xl text-base leading-relaxed">
                {isEnglish ? (
                  <span className="notranslate">Discover opportunities for funding, collaboration and participation in cultural programs in Greece and abroad. Open calls are updated regularly and are available exclusively to members of the Network.</span>
                ) : (
                  <>Ανακάλυψε ευκαιρίες χρηματοδότησης, συνεργασίας και συμμετοχής σε πολιτιστικά προγράμματα στην Ελλάδα και το εξωτερικό. Οι ανοιχτές προσκλήσεις ανανεώνονται τακτικά και είναι διαθέσιμες αποκλειστικά για τα μέλη του Δικτύου.</>
                )}
              </p>
              {user && totalActiveCalls > 0 && (
                <p className="mt-3 text-sm font-medium text-coral dark:text-coral-light">
                  {isEnglish ? <span className="notranslate">{totalActiveCalls} active open calls</span> : <>{totalActiveCalls} ενεργές προσκλήσεις</>}
                </p>
              )}
            </div>
            {user ? (
              <Link href="/open-calls" className="hidden md:block flex-shrink-0 bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors">
                {isEnglish ? <span className="notranslate">ALL OPEN CALLS</span> : <>ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ</>}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleViewAllClick}
                className="hidden md:block flex-shrink-0 bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
              >
                {isEnglish ? <span className="notranslate">ALL OPEN CALLS</span> : <>ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ</>}
              </button>
            )}
          </div>

          {/* Non-logged-in: subtitle for expired calls */}
          {!user && expiredCalls.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl md:text-3xl font-bold dark:text-gray-100">
                {isEnglish ? <span className="notranslate">Recent Open Calls</span> : 'Πρόσφατες Προσκλήσεις'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {isEnglish ? <span className="notranslate">See some of the past open calls. The full list of open calls is accessible only to members.</span> : 'Δες ενδεικτικά κάποιες από τις παρελθούσες ανοιχτές προσκλήσεις. Το σύνολο των ανοιχτών προσκλήσεων είναι προσβάσιμο μόνο για μέλη.'}
              </p>
            </div>
          )}

          {/* Card Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCalls.map((call) => (
              <FlipCard
                key={call.id}
                call={call}
                expired={!user}
                onClick={!user ? () => setShowMemberModal(true) : undefined}
              />
            ))}
          </div>

          {/* Mobile CTA */}
          {user ? (
            <Link href="/open-calls" className="md:hidden w-full mt-8 bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium text-center block hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors">
              {isEnglish ? <span className="notranslate">ALL OPEN CALLS</span> : <>ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ</>}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowMemberModal(true)}
              className="md:hidden w-full mt-8 bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium text-center block hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
            >
              {isEnglish ? <span className="notranslate">ALL OPEN CALLS</span> : <>ΟΛΕΣ ΟΙ ΠΡΟΣΚΛΗΣΕΙΣ</>}
            </button>
          )}
        </div>
      </section>
    </>
  )
}
