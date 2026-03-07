'use client'

import { useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { type CityCluster } from '@/lib/mapUtils'
import { getMemberThumbnail } from '@/lib/mapUtils'

interface CityMemberPanelProps {
  cluster: CityCluster
  onClose: () => void
}

export default function CityMemberPanel({ cluster, onClose }: CityMemberPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const sortedMembers = useMemo(
    () => [...cluster.members].sort((a, b) => a.Name.localeCompare(b.Name, 'el')),
    [cluster.members]
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to prevent the click that opened the panel from immediately closing it
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" />

      {/* Desktop: side panel */}
      <div
        ref={panelRef}
        className="fixed z-50 bg-white dark:bg-gray-800 shadow-2xl
          lg:right-0 lg:top-0 lg:bottom-0 lg:w-96 lg:rounded-l-2xl
          bottom-0 left-0 right-0 lg:left-auto max-h-[70vh] lg:max-h-full
          rounded-t-2xl lg:rounded-t-none
          overflow-hidden flex flex-col
          animate-[flyIn_0.3s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg text-charcoal dark:text-gray-100">
              {cluster.city}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {cluster.province} &middot; {cluster.members.length} {cluster.members.length === 1 ? 'μέλος' : 'μέλη'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Κλείσιμο"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile drag handle */}
        <div className="lg:hidden flex justify-center py-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Member list */}
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {sortedMembers.map((member) => {
            const thumb = getMemberThumbnail(member)
            const fields = member.FieldsOfWork
              ? member.FieldsOfWork.split(',').map(f => f.trim()).filter(Boolean).slice(0, 3)
              : []

            return (
              <Link
                key={member.id}
                href={`/members/${member.Slug || member.documentId}?from=map&city=${encodeURIComponent(cluster.city)}`}
                className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-coral/10 dark:bg-coral/20 flex-shrink-0">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={member.Name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-coral font-bold text-lg">
                      {member.Name?.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-charcoal dark:text-gray-100 truncate">
                    {member.Name}
                  </p>
                  {fields.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {fields.join(', ')}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
