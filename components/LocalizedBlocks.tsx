'use client'

/**
 * LocalizedBlocks Component
 *
 * Like LocalizedText but for Strapi blocks (rich text) content.
 * Renders BOTH Greek and English versions in the DOM, toggling visibility
 * based on Google Translate state. This avoids race conditions where
 * Google Translate overwrites React-swapped content.
 *
 * Usage:
 *   <LocalizedBlocks blocks={member.Bio} engBlocks={member.EngBio} className="text-gray-700" />
 */

import { useState, useEffect } from 'react'
import { isEnglishMode } from '@/lib/translation'
import { renderBlocks } from '@/lib/renderBlocks'

interface LocalizedBlocksProps {
  /** The original (Greek) blocks content */
  blocks: any
  /** Optional English blocks content */
  engBlocks?: any
  /** CSS classes for the wrapper div */
  className?: string
}

export default function LocalizedBlocks({
  blocks,
  engBlocks,
  className,
}: LocalizedBlocksProps) {
  const [isEnglish, setIsEnglish] = useState(false)

  useEffect(() => {
    setIsEnglish(isEnglishMode())

    const observer = new MutationObserver(() => {
      setIsEnglish(isEnglishMode())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang'],
    })

    return () => observer.disconnect()
  }, [])

  // No English version — just render Greek normally
  if (!engBlocks) {
    return (
      <div className={className}>
        {renderBlocks(blocks)}
      </div>
    )
  }

  // Render both versions, toggle visibility via display style.
  // Greek version: visible when NOT in English mode, hidden when English.
  // English version: visible when in English mode, hidden otherwise.
  // Both stay in DOM so Google Translate doesn't cause flicker on re-render.
  return (
    <>
      <div
        className={className}
        style={{ display: isEnglish ? 'none' : undefined }}
      >
        {renderBlocks(blocks)}
      </div>
      <div
        className={`notranslate ${className || ''}`}
        style={{ display: isEnglish ? undefined : 'none' }}
      >
        {renderBlocks(engBlocks)}
      </div>
    </>
  )
}
