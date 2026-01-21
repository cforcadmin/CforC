'use client'

import { useTextSize } from './TextSizeProvider'
import { useTheme } from './ThemeProvider'

interface TextSizeToggleProps {
  variant?: 'default' | 'members'
  className?: string
}

type TextSize = 'small' | 'medium' | 'large'

const sizes: { size: TextSize; fontSize: number; label: string }[] = [
  { size: 'large', fontSize: 18, label: 'Μεγάλο μέγεθος κειμένου' },
  { size: 'medium', fontSize: 16, label: 'Μεσαίο μέγεθος κειμένου' },
  { size: 'small', fontSize: 14, label: 'Κανονικό μέγεθος κειμένου' },
]

export default function TextSizeToggle({ variant = 'default', className = '' }: TextSizeToggleProps) {
  const { textSize, setTextSize } = useTextSize()
  const { theme } = useTheme()

  return (
    <div
      className={`flex items-center relative ${className}`}
      role="group"
      aria-label="Επιλογή μεγέθους κειμένου"
      style={{ gap: '12px' }}
    >
      {sizes.map(({ size, fontSize, label }) => {
        const isActive = textSize === size
        // In dark mode: inactive = white, active = black
        // In light mode: all black
        const textColor = isActive ? '#000000' : (theme === 'dark' ? '#FFFFFF' : '#000000')

        return (
          <button
            key={size}
            onClick={() => setTextSize(size)}
            className="relative w-8 h-8 flex items-center justify-center z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
            aria-label={label}
            aria-pressed={isActive}
          >
            {/* Circle behind button - always rendered, opacity toggled */}
            <div
              className="absolute inset-0 w-8 h-8 rounded-full bg-white pointer-events-none"
              style={{
                boxShadow: variant === 'members' ? '0 0 0 2px #FF8B6A' : 'none',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 300ms ease-in-out',
              }}
              aria-hidden="true"
            />
            <span
              className="font-bold notranslate relative z-10"
              style={{
                fontSize: `${fontSize}px`,
                color: textColor,
                transition: 'color 300ms ease-in-out',
              }}
            >
              A
            </span>
          </button>
        )
      })}
    </div>
  )
}
