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
import { blocksToPlainText } from '@/lib/richTextConvert'

interface LocalizedBlocksProps {
  /** The original (Greek) blocks content */
  blocks: any
  /** Optional English blocks content */
  engBlocks?: any
  /** CSS classes for the wrapper div */
  className?: string
}

// Treat null/undefined/empty array AND structurally non-empty blocks that
// contain no actual text (e.g. a single empty paragraph) as "empty" so the
// fallback can kick in.
function isBlocksEmpty(blocks: any): boolean {
  if (!blocks) return true
  if (Array.isArray(blocks) && blocks.length === 0) return true
  return blocksToPlainText(blocks).trim() === ''
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

  const grEmpty = isBlocksEmpty(blocks)
  const enEmpty = isBlocksEmpty(engBlocks)

  // Both empty — render nothing
  if (grEmpty && enEmpty) {
    return null
  }

  // Only English content exists — show English in BOTH language modes,
  // marked notranslate so Google Translate does not double-process it.
  if (grEmpty && !enEmpty) {
    return (
      <div className={`notranslate ${className || ''}`}>
        {renderBlocks(engBlocks)}
      </div>
    )
  }

  // Only Greek content exists — render Greek and let Google Translate
  // handle it for English visitors.
  if (!grEmpty && enEmpty) {
    return (
      <div className={className}>
        {renderBlocks(blocks)}
      </div>
    )
  }

  // Both versions exist — render both, toggle visibility via display style.
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
