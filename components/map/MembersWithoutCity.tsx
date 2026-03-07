'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { type MapMember, getMemberThumbnail } from '@/lib/mapUtils'

interface MembersWithoutCityProps {
  members: MapMember[]
}

export default function MembersWithoutCity({ members }: MembersWithoutCityProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-charcoal dark:border-gray-600 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-charcoal dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span>
          {members.length} {members.length === 1 ? 'μέλος' : 'μέλη'} χωρίς καταχωρημένη πόλη
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
          {members.map((member) => {
            const thumb = getMemberThumbnail(member)
            return (
              <Link
                key={member.id}
                href={`/members/${member.Slug || member.documentId}`}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-coral/10 dark:bg-coral/20 flex-shrink-0">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={member.Name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-coral text-[10px] font-bold">
                      {member.Name?.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-sm text-charcoal dark:text-gray-300 truncate">
                  {member.Name}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
