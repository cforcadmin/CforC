'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type TextSize = 'small' | 'medium' | 'large'

interface TextSizeContextType {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined)

// Scale factors for each size
const TEXT_SCALE_VALUES: Record<TextSize, number> = {
  small: 1,      // 100% - default
  medium: 1.125, // 112.5%
  large: 1.25,   // 125%
}

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>('small')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check localStorage for saved text size preference
    const savedTextSize = localStorage.getItem('textSize') as TextSize | null
    if (savedTextSize && TEXT_SCALE_VALUES[savedTextSize] !== undefined) {
      setTextSizeState(savedTextSize)
      applyTextScale(savedTextSize)
    }
  }, [])

  const applyTextScale = (size: TextSize) => {
    const scale = TEXT_SCALE_VALUES[size]
    document.documentElement.style.setProperty('--text-scale', scale.toString())
    document.documentElement.setAttribute('data-text-size', size)
  }

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size)
    localStorage.setItem('textSize', size)
    applyTextScale(size)
  }

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize }}>
      {children}
    </TextSizeContext.Provider>
  )
}

export function useTextSize() {
  const context = useContext(TextSizeContext)
  if (context === undefined) {
    throw new Error('useTextSize must be used within a TextSizeProvider')
  }
  return context
}
