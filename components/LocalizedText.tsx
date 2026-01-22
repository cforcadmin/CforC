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

  // Determine which text to display
  let displayText = text || ''

  // If in English mode and English text is available, use it
  // The English text should be wrapped in notranslate to prevent double-translation
  // Also process {word} syntax in English text
  if (mounted && isEnglish && engText) {
    const processedEng = processEscape ? parseNoTranslate(engText) : engText
    return (
      <Component className={`notranslate ${className || ''}`}>
        {processedEng}
      </Component>
    )
  }

  // Process {word} escape syntax if enabled
  if (processEscape && displayText) {
    const processed = parseNoTranslate(displayText)

    if (className) {
      return <Component className={className}>{processed}</Component>
    }

    // If no wrapper needed and it's just a span with no class
    if (Component === 'span' && !className) {
      return <>{processed}</>
    }

    return <Component className={className}>{processed}</Component>
  }

  // Plain text, no processing needed
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

  if (isEnglish && engText) {
    return engText
  }

  return text || ''
}
