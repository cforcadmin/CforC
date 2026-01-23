'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Accessibility settings interface
export interface AccessibilitySettings {
  oversizedWidget: boolean
  contrast: 'normal' | 'invert' | 'dark' | 'light'
  highlightLinks: boolean
  largeText: 0 | 1 | 2 | 3 | 4  // 0 = normal, 1-4 = increasing sizes
  textSpacing: 0 | 1 | 2 | 3  // 0 = normal, 1-3 = increasing spacing
  pauseAnimations: boolean
  hideImages: boolean
  dyslexiaFriendly: 0 | 1 | 2  // 0 = normal, 1 = dyslexia font, 2 = clean readable font
  largeCursor: 0 | 1 | 2 | 3  // 0 = normal, 1 = large cursor, 2 = reading mask, 3 = reading guide
  lineHeight: 0 | 1 | 2 | 3  // 0 = normal, 1 = 2.0, 2 = 2.5, 3 = 3.0
  textAlignment: 0 | 1 | 2 | 3 | 4  // 0 = normal, 1 = left, 2 = right, 3 = center, 4 = justify
  saturation: 'normal' | 'high' | 'low' | 'grayscale'
  widgetPosition: 'left' | 'right'  // Position of floating accessibility button
  widgetHidden: boolean  // Whether widget is hidden
  widgetHiddenUntil: number | null  // Timestamp when widget should reappear (null = indefinitely)
}

// Default settings
const defaultSettings: AccessibilitySettings = {
  oversizedWidget: false,
  contrast: 'normal',
  highlightLinks: false,
  largeText: 0,
  textSpacing: 0,
  pauseAnimations: false,
  hideImages: false,
  dyslexiaFriendly: 0,
  largeCursor: 0,
  lineHeight: 0,
  textAlignment: 0,
  saturation: 'normal',
  widgetPosition: 'right',
  widgetHidden: false,
  widgetHiddenUntil: null,
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void
  toggleSetting: (key: keyof Omit<AccessibilitySettings, 'saturation' | 'contrast' | 'largeText' | 'textSpacing' | 'dyslexiaFriendly' | 'largeCursor' | 'lineHeight' | 'textAlignment'>) => void
  resetSettings: () => void
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
  hideWidget: (duration: 'session' | 'day' | 'week' | 'month' | 'forever') => void
  isWidgetVisible: () => boolean
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('accessibility-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Migrate old boolean contrast to new string format
        if (typeof parsed.contrast === 'boolean') {
          parsed.contrast = parsed.contrast ? 'invert' : 'normal'
        }
        // Migrate old boolean largeText to new number format
        if (typeof parsed.largeText === 'boolean') {
          parsed.largeText = parsed.largeText ? 2 : 0
        }
        // Migrate old boolean textSpacing to new number format
        if (typeof parsed.textSpacing === 'boolean') {
          parsed.textSpacing = parsed.textSpacing ? 2 : 0
        }
        // Migrate old boolean dyslexiaFriendly to new number format
        if (typeof parsed.dyslexiaFriendly === 'boolean') {
          parsed.dyslexiaFriendly = parsed.dyslexiaFriendly ? 1 : 0
        }
        // Migrate old boolean largeCursor to new number format
        if (typeof parsed.largeCursor === 'boolean') {
          parsed.largeCursor = parsed.largeCursor ? 1 : 0
        }
        // Migrate old boolean lineHeight to new number format
        if (typeof parsed.lineHeight === 'boolean') {
          parsed.lineHeight = parsed.lineHeight ? 2 : 0
        }
        // Migrate old fullWidthText boolean to new textAlignment number format
        if (typeof parsed.fullWidthText === 'boolean') {
          parsed.textAlignment = parsed.fullWidthText ? 4 : 0
          delete parsed.fullWidthText
        }
        // Migrate old textAlignment boolean to number format (if somehow stored as boolean)
        if (typeof parsed.textAlignment === 'boolean') {
          parsed.textAlignment = parsed.textAlignment ? 4 : 0
        }
        setSettings({ ...defaultSettings, ...parsed })
      } catch (e) {
        console.error('Failed to parse accessibility settings:', e)
      }
    }
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('accessibility-settings', JSON.stringify(settings))
      applySettings(settings)
    }
  }, [settings, mounted])

  // Apply CSS classes/variables based on settings
  const applySettings = (s: AccessibilitySettings) => {
    const html = document.documentElement
    const body = document.body

    // Contrast modes
    html.classList.remove('accessibility-contrast-invert', 'accessibility-contrast-dark', 'accessibility-contrast-light')
    if (s.contrast !== 'normal') {
      html.classList.add(`accessibility-contrast-${s.contrast}`)
    }

    // Highlight links
    html.classList.toggle('accessibility-highlight-links', s.highlightLinks)

    // Large text - 4 levels (remove all first, then add the appropriate one)
    html.classList.remove('accessibility-large-text-1', 'accessibility-large-text-2', 'accessibility-large-text-3', 'accessibility-large-text-4')
    if (s.largeText > 0) {
      html.classList.add(`accessibility-large-text-${s.largeText}`)
    }

    // Text spacing - 3 levels (remove all first, then add the appropriate one)
    html.classList.remove('accessibility-text-spacing-1', 'accessibility-text-spacing-2', 'accessibility-text-spacing-3')
    if (s.textSpacing > 0) {
      html.classList.add(`accessibility-text-spacing-${s.textSpacing}`)
    }

    // Pause animations and videos
    html.classList.toggle('accessibility-pause-animations', s.pauseAnimations)

    // Pause/play all videos
    const videos = document.querySelectorAll('video')
    videos.forEach(video => {
      if (s.pauseAnimations) {
        video.pause()
      } else {
        // Only autoplay if video has autoplay attribute
        if (video.hasAttribute('autoplay')) {
          video.play().catch(() => {})
        }
      }
    })

    // Hide images
    html.classList.toggle('accessibility-hide-images', s.hideImages)

    // Dyslexia friendly font - 2 levels (remove all first, then add the appropriate one)
    html.classList.remove('accessibility-dyslexia-1', 'accessibility-dyslexia-2')
    if (s.dyslexiaFriendly > 0) {
      html.classList.add(`accessibility-dyslexia-${s.dyslexiaFriendly}`)
    }

    // Cursor modes - 3 levels (remove all first, then add the appropriate one)
    html.classList.remove('accessibility-large-cursor', 'accessibility-reading-mask', 'accessibility-reading-guide')
    if (s.largeCursor === 1) {
      html.classList.add('accessibility-large-cursor')
    } else if (s.largeCursor === 2) {
      html.classList.add('accessibility-reading-mask')
    } else if (s.largeCursor === 3) {
      html.classList.add('accessibility-reading-guide')
    }

    // Line height - 3 levels (remove all first, then add the appropriate one)
    html.classList.remove('accessibility-line-height-1', 'accessibility-line-height-2', 'accessibility-line-height-3')
    if (s.lineHeight > 0) {
      html.classList.add(`accessibility-line-height-${s.lineHeight}`)
    }

    // Text alignment - 4 levels (remove all first, then add the appropriate one)
    html.classList.remove('accessibility-align-left', 'accessibility-align-right', 'accessibility-align-center', 'accessibility-align-justify')
    if (s.textAlignment === 1) {
      html.classList.add('accessibility-align-left')
    } else if (s.textAlignment === 2) {
      html.classList.add('accessibility-align-right')
    } else if (s.textAlignment === 3) {
      html.classList.add('accessibility-align-center')
    } else if (s.textAlignment === 4) {
      html.classList.add('accessibility-align-justify')
    }

    // Saturation
    html.classList.remove('accessibility-saturation-high', 'accessibility-saturation-low', 'accessibility-grayscale')
    if (s.saturation !== 'normal') {
      html.classList.add(`accessibility-${s.saturation === 'grayscale' ? 'grayscale' : `saturation-${s.saturation}`}`)
    }
  }

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const toggleSetting = (key: keyof Omit<AccessibilitySettings, 'saturation' | 'contrast' | 'largeText' | 'textSpacing' | 'dyslexiaFriendly' | 'largeCursor' | 'lineHeight' | 'textAlignment'>) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  const hideWidget = (duration: 'session' | 'day' | 'week' | 'month' | 'forever') => {
    let hiddenUntil: number | null = null
    const now = Date.now()

    switch (duration) {
      case 'session':
        // Session-only hiding is handled by sessionStorage
        sessionStorage.setItem('accessibility-widget-hidden-session', 'true')
        break
      case 'day':
        hiddenUntil = now + 24 * 60 * 60 * 1000
        break
      case 'week':
        hiddenUntil = now + 7 * 24 * 60 * 60 * 1000
        break
      case 'month':
        hiddenUntil = now + 30 * 24 * 60 * 60 * 1000
        break
      case 'forever':
        hiddenUntil = null // null means forever
        break
    }

    setSettings(prev => ({
      ...prev,
      widgetHidden: true,
      widgetHiddenUntil: duration === 'session' ? -1 : hiddenUntil // -1 indicates session-only
    }))
  }

  const isWidgetVisible = () => {
    if (!settings.widgetHidden) return true

    // Check session-only hiding
    if (settings.widgetHiddenUntil === -1) {
      return sessionStorage.getItem('accessibility-widget-hidden-session') !== 'true'
    }

    // Check timed hiding
    if (settings.widgetHiddenUntil !== null && settings.widgetHiddenUntil > 0) {
      if (Date.now() > settings.widgetHiddenUntil) {
        // Time expired, show widget again
        setSettings(prev => ({ ...prev, widgetHidden: false, widgetHiddenUntil: null }))
        return true
      }
    }

    return false
  }

  // Handle keyboard shortcut (Ctrl+U)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault()
        setIsMenuOpen(prev => !prev)
      }
      // Also close on Escape
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSetting,
        toggleSetting,
        resetSettings,
        isMenuOpen,
        setIsMenuOpen,
        hideWidget,
        isWidgetVisible,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}
