/**
 * Translation Utilities for Culture for Change
 *
 * Provides utilities for controlling Google Translate behavior:
 * 1. {word} syntax - prevents translation of specific words
 * 2. {greek-english} syntax - provides manual translation override (future)
 * 3. Language detection for optional English fields
 */

import React, { ReactNode } from 'react'

/**
 * Parses text with {word} escape syntax and returns JSX with notranslate spans.
 *
 * Usage:
 *   parseNoTranslate("This is {cool} stuff")
 *   → <>This is <span className="notranslate">cool</span> stuff</>
 *
 * @param text - Text containing {word} patterns to escape from translation
 * @returns ReactNode with escaped words wrapped in notranslate spans
 */
export function parseNoTranslate(text: string | null | undefined): ReactNode {
  if (!text) return text

  // Regex to match {word} or {multiple words} patterns
  // Captures content between curly braces
  const pattern = /\{([^}]+)\}/g

  const parts: ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Add the escaped word wrapped in notranslate span
    parts.push(
      <span key={key++} className="notranslate">
        {match[1]}
      </span>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  // If no matches found, return original text
  if (parts.length === 0) {
    return text
  }

  return <>{parts}</>
}

/**
 * Component wrapper for parseNoTranslate
 *
 * Usage:
 *   <NoTranslate text="This is {cool} stuff" />
 *   <NoTranslate>This is {cool} stuff</NoTranslate>
 */
interface NoTranslateProps {
  text?: string | null
  children?: string
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export function NoTranslate({ text, children, className, as: Component = 'span' }: NoTranslateProps) {
  const content = text || children || ''
  const parsed = parseNoTranslate(content)

  if (className || Component !== 'span') {
    return <Component className={className}>{parsed}</Component>
  }

  return <>{parsed}</>
}

/**
 * Strips {word} syntax from text, returning plain text.
 * Useful for meta tags, alt text, etc. where JSX isn't supported.
 *
 * Usage:
 *   stripNoTranslateSyntax("This is {cool} stuff") → "This is cool stuff"
 */
export function stripNoTranslateSyntax(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\{([^}]+)\}/g, '$1')
}

/**
 * Checks if the page is currently being viewed in a translated state
 * by detecting Google Translate's modifications to the DOM.
 *
 * Google Translate adds:
 * - class="translated-ltr" or "translated-rtl" to <html>
 * - A cookie named "googtrans"
 *
 * @returns The detected language code or null if in original language
 */
export function getGoogleTranslateLanguage(): string | null {
  if (typeof window === 'undefined') return null

  // Check for Google Translate class on html element
  const htmlElement = document.documentElement
  const isTranslated = htmlElement.classList.contains('translated-ltr') ||
                       htmlElement.classList.contains('translated-rtl')

  if (!isTranslated) return null

  // Try to get language from Google Translate cookie
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'googtrans') {
      // Cookie format: /el/en (from/to)
      const match = value.match(/\/\w+\/(\w+)/)
      if (match) return match[1]
    }
  }

  // Fallback: check lang attribute
  const lang = htmlElement.getAttribute('lang')
  if (lang && lang !== 'el') return lang

  return 'en' // Default assumption if translated but can't determine language
}

/**
 * Checks if the page is currently being viewed in English
 */
export function isEnglishMode(): boolean {
  const lang = getGoogleTranslateLanguage()
  return lang === 'en'
}

/**
 * Returns the appropriate field value based on current language.
 * If in English mode and English version exists, returns English version.
 * Otherwise returns the original (Greek) version.
 *
 * Usage:
 *   const title = getLocalizedField(activity.Title, activity.EngTitle)
 *
 * @param original - The original Greek field value
 * @param english - The optional English field value
 * @returns The appropriate value for the current language
 */
export function getLocalizedField(
  original: string | null | undefined,
  english: string | null | undefined
): string {
  if (isEnglishMode() && english) {
    return english
  }
  return original || ''
}

/**
 * React hook version of getLocalizedField with reactivity to language changes.
 * Re-renders component when Google Translate state changes.
 */
import { useState, useEffect } from 'react'

export function useLocalizedField(
  original: string | null | undefined,
  english: string | null | undefined
): string {
  const [isEnglish, setIsEnglish] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsEnglish(isEnglishMode())

    // Set up observer for Google Translate class changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsEnglish(isEnglishMode())
        }
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  if (isEnglish && english) {
    return english
  }
  return original || ''
}

/**
 * Hook that returns the current Google Translate language
 */
export function useCurrentLanguage(): string {
  const [language, setLanguage] = useState<string>('el')

  useEffect(() => {
    const checkLanguage = () => {
      const lang = getGoogleTranslateLanguage()
      setLanguage(lang || 'el')
    }

    // Check initial state
    checkLanguage()

    // Set up observer for changes
    const observer = new MutationObserver(checkLanguage)

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang']
    })

    return () => observer.disconnect()
  }, [])

  return language
}
