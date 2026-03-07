'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LocalizedText from '@/components/LocalizedText'
import BlurredImage from '@/components/shared/BlurredImage'
import type { Activity } from '@/lib/types'

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

export default function NewsFlipCard({ activity, fromTab }: { activity: Activity; fromTab?: string }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const tags = activity.Tags ? activity.Tags.split(',').map(t => t.trim()).filter(Boolean) : []
  const visibleTags = tags.slice(0, 3)
  const extraTagCount = tags.length - 3

  // Determine which tab this activity belongs to (current or previous)
  const activityTab = fromTab || (new Date(activity.Date) >= new Date(new Date().toDateString()) ? 'current' : 'previous')

  const descriptionText = extractTextFromBlocks(activity.Description)
  const engDescriptionText = activity.EngDescription ? extractTextFromBlocks(activity.EngDescription) : null
  const href = `/news/${activity.Slug || activity.documentId || activity.id}${fromTab ? `?from=${fromTab}` : ''}`

  const imageUrl = activity.Visuals && activity.Visuals.length > 0
    ? (activity.Visuals[0].url.startsWith('http') ? activity.Visuals[0].url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[0].url}`)
    : null

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
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow duration-300 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light flex flex-col h-full"
          >
            {imageUrl ? (
              <BlurredImage
                src={imageUrl}
                alt={activity.ImageAltText || activity.Title}
              />
            ) : (
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400 dark:text-gray-500 text-4xl">{activity.Title.charAt(0)}</span>
              </div>
            )}

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <time
                  dateTime={activity.Date}
                  className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                >
                  {new Date(activity.Date).toLocaleDateString('el-GR')}
                </time>
                {activity.Category && (
                  <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full">
                    {activity.Category}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold mb-2 text-charcoal dark:text-gray-100 line-clamp-2">
                <LocalizedText text={activity.Title} engText={activity.EngTitle} />
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                <LocalizedText text={descriptionText} engText={engDescriptionText} />
              </p>

              <div className="flex-1" />
              <div className="flex items-center justify-end pt-2">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Back */}
        <div className="absolute top-0 left-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Link
            href={href}
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl dark:shadow-gray-700/50 border-l-4 border-coral dark:border-coral-light flex flex-col h-full"
          >
            <div className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <time
                  dateTime={activity.Date}
                  className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                >
                  {new Date(activity.Date).toLocaleDateString('el-GR')}
                </time>
                {activity.Category && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/news?from=${activityTab}&category=${encodeURIComponent(activity.Category!)}`) }}
                    className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full hover:bg-charcoal hover:text-white dark:hover:bg-white dark:hover:text-charcoal transition-colors"
                  >
                    {activity.Category}
                  </button>
                )}
              </div>

              <h3 className="text-base font-bold mb-3 text-coral dark:text-coral-light line-clamp-2">
                <LocalizedText text={activity.Title} engText={activity.EngTitle} />
              </h3>

              {visibleTags.length > 0 && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {visibleTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/news?from=${activityTab}&tag=${encodeURIComponent(tag)}`) }}
                      className="inline-block bg-gray-100 dark:bg-gray-700 text-charcoal dark:text-gray-200 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full hover:bg-charcoal hover:text-white dark:hover:bg-white dark:hover:text-charcoal transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                  {extraTagCount > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">+{extraTagCount}</span>
                  )}
                </div>
              )}

              <div className="relative flex-1 overflow-hidden">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  <LocalizedText text={descriptionText} engText={engDescriptionText} />
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
              </div>

              <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-500 dark:text-gray-400">Κάνε κλικ για περισσότερα</span>
                <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
