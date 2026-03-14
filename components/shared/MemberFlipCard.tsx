'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface MemberFlipCardProps {
  member: {
    id: number
    Name: string
    Slug: string
    Bio?: string
    FieldsOfWork?: string
    City?: string
    Province?: string
    Image?: Array<{
      url: string
      alternativeText?: string
    }>
    ProfileImageAltText?: string
  }
  role?: string
}

function extractBioText(bio: any): string {
  if (!bio) return ''
  if (typeof bio === 'string') return bio
  if (Array.isArray(bio)) {
    return bio
      .map((block: any) => {
        if (block.type === 'paragraph' && block.children) {
          return block.children.map((child: any) => child.text || '').join('')
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-3.5 h-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

function LocationPill({ label, filterHref, mapHref }: { label: string; filterHref: string; mapHref: string }) {
  const [hovered, setHovered] = useState(false)
  const [globeHovered, setGlobeHovered] = useState(false)

  return (
    <span
      className="inline-flex items-center gap-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setGlobeHovered(false) }}
    >
      <Link
        href={filterHref}
        onClick={(e) => e.stopPropagation()}
        className="text-[10px] px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded-full text-charcoal dark:text-gray-200 hover:bg-coral hover:text-white hover:border-coral dark:hover:bg-coral-light dark:hover:text-gray-900 dark:hover:border-coral-light transition-colors"
      >
        {label}
      </Link>
      {hovered && (
        <Link
          href={mapHref}
          onClick={(e) => e.stopPropagation()}
          className="relative flex items-center justify-center w-5 h-5 rounded-full border border-charcoal dark:border-gray-400 text-charcoal dark:text-gray-200 hover:bg-charcoal hover:text-white dark:hover:bg-white dark:hover:text-charcoal transition-colors"
          onMouseEnter={() => setGlobeHovered(true)}
          onMouseLeave={() => setGlobeHovered(false)}
        >
          <GlobeIcon className="w-3 h-3" />
          {globeHovered && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 text-[8px] rounded shadow whitespace-nowrap z-10">
              Δες στον χάρτη
            </span>
          )}
        </Link>
      )}
    </span>
  )
}

export default function MemberFlipCard({ member, role }: MemberFlipCardProps) {
  const router = useRouter()
  const [isFlipped, setIsFlipped] = useState(false)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)

  const href = `/members/${member.Slug}`
  const imageUrl = member.Image && member.Image.length > 0 && member.Image[0].url
    ? member.Image[0].url
    : null

  const bioText = extractBioText(member.Bio)

  const cities = member.City?.split(',').map(c => c.trim()).filter(c => c && c !== '-') || []
  const provinces = member.Province?.split(',').map(p => p.trim()).filter(p => p && p !== '-') || []
  const hasLocation = cities.length > 0 || provinces.length > 0

  const handleMouseEnter = () => {
    flipTimeout.current = setTimeout(() => {
      setIsFlipped(true)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (flipTimeout.current) clearTimeout(flipTimeout.current)
    setIsFlipped(false)
  }

  return (
    <div
      className="[perspective:1200px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div className="[backface-visibility:hidden] w-full h-full">
          <Link
            href={href}
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow duration-300 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light flex flex-col h-full group"
          >
            {imageUrl ? (
              <div className="aspect-[10/12] relative bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={member.ProfileImageAltText || member.Name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {role && (
                  <span className="absolute top-2 right-2 bg-charcoal text-white dark:bg-white dark:text-charcoal text-[10px] font-medium px-2 py-1 rounded-full shadow-sm z-10">
                    {role}
                  </span>
                )}
              </div>
            ) : (
              <div className="aspect-[10/12] relative bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400 dark:text-gray-500 text-4xl">{member.Name.charAt(0)}</span>
                {role && (
                  <span className="absolute top-2 right-2 bg-charcoal text-white dark:bg-white dark:text-charcoal text-[10px] font-medium px-2 py-1 rounded-full shadow-sm z-10">
                    {role}
                  </span>
                )}
              </div>
            )}
            <div className="p-4">
              <h3 className="text-base font-light group-hover:font-bold text-charcoal dark:text-gray-100 mb-2 transition-all">{member.Name}</h3>
              {member.FieldsOfWork && (
                <div className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-2xl tracking-wide max-w-full">
                  <p className="line-clamp-2">{member.FieldsOfWork}</p>
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Back */}
        <div className="absolute top-0 left-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div
            onClick={() => router.push(href)}
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl dark:shadow-gray-700/50 border-l-4 border-coral dark:border-coral-light flex flex-col h-full cursor-pointer"
          >
            <div className="p-5 flex flex-col h-full overflow-hidden">
              <h3 className="text-lg font-bold text-coral dark:text-coral-light mb-2 line-clamp-2">{member.Name}</h3>

              {hasLocation && (
                <div className="flex items-start gap-1.5 mb-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex flex-wrap gap-1">
                    {cities.map((city, i) => (
                      <LocationPill
                        key={`city-${i}`}
                        label={city}
                        filterHref={`/members?city=${encodeURIComponent(city)}`}
                        mapHref={`/map?city=${encodeURIComponent(city)}`}
                      />
                    ))}
                    {provinces.map((province, i) => (
                      <LocationPill
                        key={`prov-${i}`}
                        label={province}
                        filterHref={`/members?province=${encodeURIComponent(province)}`}
                        mapHref={`/map?province=${encodeURIComponent(province)}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {member.FieldsOfWork && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {member.FieldsOfWork.split(',').map((field, i) => (
                      <Link
                        key={i}
                        href={`/members?field=${encodeURIComponent(field.trim())}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-[10px] px-2 py-0.5 rounded-full hover:bg-coral hover:text-white hover:border-coral dark:hover:bg-coral-light dark:hover:text-gray-900 dark:hover:border-coral-light transition-colors"
                      >
                        {field.trim()}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {bioText && (
                <div className="relative flex-1 overflow-hidden">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {bioText}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
                </div>
              )}

              {!bioText && <div className="flex-1" />}

              <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-500 dark:text-gray-400">Προφίλ μέλους</span>
                <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
