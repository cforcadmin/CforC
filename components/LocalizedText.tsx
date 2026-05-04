'use client'

/**
 * LocalizedText Component
 *
 * A smart text component that:
 * 1. Uses English field when available AND user is viewing in English
 * 2. Processes {word} syntax to prevent translation of specific words
 * 3. Falls back to Google Translate for everything else
 *
 * Usage:
 *   <LocalizedText text={activity.Title} engText={activity.EngTitle} />
 *   <LocalizedText text="This is {cool} stuff" />
 */

import { ReactNode, useState, useEffect } from 'react'
import { parseNoTranslate, isEnglishMode } from '@/lib/translation'

interface LocalizedTextProps {
  /** The original (Greek) text */
  text: string | null | undefined
  /** Optional English override text */
  engText?: string | null
  /** HTML element to render as (default: span) */
  as?: keyof JSX.IntrinsicElements
  /** Additional CSS classes */
  className?: string
  /** Whether to process {word} no-translate syntax (default: true) */
  processEscape?: boolean
}

export default function LocalizedText({
  text,
  engText,
  as: Component = 'span',
  className,
  processEscape = true,
}: LocalizedTextProps) {
  const [isEnglish, setIsEnglish] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check initial state
    setIsEnglish(isEnglishMode())

    // Set up observer for Google Translate class changes
    const observer = new MutationObserver(() => {
      setIsEnglish(isEnglishMode())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang']
    })

    return () => observer.disconnect()
  }, [])

  // Treat null/undefined/whitespace-only as empty so missing-Greek triggers
  // fallback to English (and vice versa).
  const grEmpty = !text || text.trim() === ''
  const enEmpty = !engText || engText.trim() === ''

  // English mode AND English available → render English (no GT translation)
  if (mounted && isEnglish && !enEmpty) {
    const processedEng = processEscape ? parseNoTranslate(engText!) : engText!
    return (
      <Component className={`notranslate ${className || ''}`}>
        {processedEng}
      </Component>
    )
  }

  // Greek mode (or not yet hydrated) AND Greek empty AND English exists →
  // fall back to English so visitors do not see a blank field. Mark
  // notranslate so Google Translate does not double-process it.
  if (grEmpty && !enEmpty) {
    const processedEng = processEscape ? parseNoTranslate(engText!) : engText!
    return (
      <Component className={`notranslate ${className || ''}`}>
        {processedEng}
      </Component>
    )
  }

  // Default: render Greek (Google Translate will handle EN visitors when
  // English is empty — already excluded by the EN-mode branch above).
  const displayText = text || ''

  if (processEscape && displayText) {
    const processed = parseNoTranslate(displayText)

    if (className) {
      return <Component className={className}>{processed}</Component>
    }

    if (Component === 'span' && !className) {
      return <>{processed}</>
    }

    return <Component className={className}>{processed}</Component>
  }

  if (className) {
    return <Component className={className}>{displayText}</Component>
  }

  return <>{displayText}</>
}

/**
 * Hook version for when you need the localized string value
 * (e.g., for attributes, meta tags, etc.)
 */
export function useLocalizedText(
  text: string | null | undefined,
  engText?: string | null
): string {
  const [isEnglish, setIsEnglish] = useState(false)

  useEffect(() => {
    setIsEnglish(isEnglishMode())

    const observer = new MutationObserver(() => {
      setIsEnglish(isEnglishMode())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang']
    })

    return () => observer.disconnect()
  }, [])

  const grEmpty = !text || text.trim() === ''
  const enEmpty = !engText || engText.trim() === ''

  if (isEnglish && !enEmpty) return engText!
  if (grEmpty && !enEmpty) return engText!
  return text || ''
}
