'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Project } from '@/lib/types'
import BlurredImage from '@/components/shared/BlurredImage'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: 'Ενεργό', className: 'bg-white text-green-700 dark:bg-gray-900 dark:text-green-400' },
  in_progress: { label: 'Σε εξέλιξη', className: 'bg-white text-coral-dark dark:bg-gray-900 dark:text-coral-light' },
  completed: { label: 'Ολοκληρωμένο', className: 'bg-white text-charcoal dark:bg-gray-900 dark:text-gray-300' },
}

function extractTextFromBlocks(blocks: any): string {
  if (!blocks) return ''
  if (typeof blocks === 'string') return blocks
  if (Array.isArray(blocks)) {
    return blocks
      .map((block: any) => {
        if (block.type === 'paragraph' && block.children) {
          return block.children
            .map((child: any) =>
              child.type === 'link' && child.children
                ? child.children.map((c: any) => c.text || '').join('')
                : child.text || ''
            )
            .join('')
        }
        if (block.type === 'list' && block.children) {
          return block.children
            .map((item: any) =>
              item.children
                ?.map((p: any) =>
                  p.children?.map((c: any) => c.text || '').join('')
                )
                .join(' ')
            )
            .join(' ')
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

function formatDateRange(start?: string, end?: string): string | null {
  if (!start && !end) return null
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
  const startStr = start ? new Date(start).toLocaleDateString('el-GR', opts) : null
  const endStr = end ? new Date(end).toLocaleDateString('el-GR', opts) : null
  if (startStr && endStr) return `${startStr} — ${endStr}`
  if (startStr) return `${startStr} — σήμερα`
  return endStr || null
}

function getImageUrl(image: Project['cover_image']): string | null {
  if (!image) return null
  if (Array.isArray(image) && image.length > 0) {
    const url = image[0].url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  if (typeof image === 'object' && !Array.isArray(image) && 'url' in image) {
    const url = image.url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  return null
}

function getPartnerLogoUrl(logo: any): string | null {
  if (!logo) return null
  if (Array.isArray(logo) && logo.length > 0) {
    const url = logo[0].formats?.thumbnail?.url || logo[0].url
    return url?.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  if (typeof logo === 'object' && 'url' in logo) {
    const url = logo.formats?.thumbnail?.url || logo.url
    return url?.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  return null
}

export default function ProjectFlipCard({ project }: { project: Project }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)

  const imageUrl = getImageUrl(project.cover_image)
  const statusInfo = project.project_status ? STATUS_LABELS[project.project_status] : null
  const dateRange = formatDateRange(project.start_date, project.end_date)
  const descriptionText = extractTextFromBlocks(project.full_description)
  const categories = project.category
    ? project.category.split(',').map(c => c.trim()).filter(Boolean)
    : []
  const partners = project.partners || []
  const partnerNames = project.project_partners
    ? project.project_partners.split(',').map(p => p.trim()).filter(Boolean)
    : []
  const href = `/projects/${project.slug}`

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
        {/* ─── Front ─── */}
        <div className="[backface-visibility:hidden] w-full h-full">
          <Link
            href={href}
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-gray-700/50 transition-shadow duration-300 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light flex flex-col h-full"
          >
            {imageUrl ? (
              <BlurredImage src={imageUrl} alt={project.title} />
            ) : (
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
            )}

            <div className="p-5 flex flex-col flex-1">
              {/* Status + date row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {statusInfo && (
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm border border-gray-300 dark:border-gray-500 ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                )}
                {dateRange && (
                  <span className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {dateRange}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold mb-2 text-charcoal dark:text-gray-100 line-clamp-2">
                {project.title}
              </h3>

              {/* CforC role */}
              {project.CforC_project_role && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Ρόλος CforC: </span>
                  {project.CforC_project_role}
                </p>
              )}

              <div className="flex-1" />
              <div className="flex items-center justify-end pt-2">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* ─── Back ─── */}
        <div className="absolute top-0 left-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Link
            href={href}
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl dark:shadow-gray-700/50 border-l-4 border-coral dark:border-coral-light flex flex-col h-full"
          >
            <div className="p-6 flex flex-col h-full overflow-hidden">
              {/* Status + date */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {statusInfo && (
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm border border-gray-300 dark:border-gray-500 ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                )}
                {dateRange && (
                  <span className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {dateRange}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-base font-bold mb-3 text-coral dark:text-coral-light line-clamp-2">
                {project.title}
              </h3>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Description with fade */}
              <div className="relative flex-1 overflow-hidden">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {descriptionText}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
              </div>

              {/* Partner logos + project link */}
              {(partners.length > 0 || partnerNames.length > 0 || project.project_link) && (
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200 dark:border-gray-600">
                  {/* Partner logos */}
                  {partners.length > 0 ? (
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mr-1 flex-shrink-0">Εταίροι</span>
                      <div className="flex items-center -space-x-1.5">
                        {partners.slice(0, 5).map((partner) => {
                          const logoUrl = getPartnerLogoUrl(partner.logo)
                          return logoUrl ? (
                            <div
                              key={partner.id}
                              className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0"
                              title={partner.name}
                            >
                              <Image
                                src={logoUrl}
                                alt={partner.name}
                                width={28}
                                height={28}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              key={partner.id}
                              className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-gray-500 dark:text-gray-300"
                              title={partner.name}
                            >
                              {partner.name.charAt(0)}
                            </div>
                          )
                        })}
                        {partners.length > 5 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-gray-500 dark:text-gray-300">
                            +{partners.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : partnerNames.length > 0 ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
                      {partnerNames.join(' · ')}
                    </span>
                  ) : (
                    <div />
                  )}

                  {/* Project link icon */}
                  {project.project_link && (
                    <span
                      className="flex items-center gap-1 text-xs text-coral dark:text-coral-light flex-shrink-0 ml-2"
                      title={project.project_link}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Link
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
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
