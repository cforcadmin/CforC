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
    <>
      {/* Shake animation styles */}
      <style jsx>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(8deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(6deg); }
          40% { transform: rotate(-6deg); }
          50% { transform: rotate(4deg); }
          60% { transform: rotate(-4deg); }
          70% { transform: rotate(2deg); }
          80% { transform: rotate(-2deg); }
          90% { transform: rotate(1deg); }
        }
        .inactive-a:hover {
          animation: bellShake 1s ease-in-out;
        }
      `}</style>
      <div
        className={`flex items-center relative ${className}`}
        role="radiogroup"
        aria-label="Επιλογή μεγέθους κειμένου"
        style={{ gap: '12px' }}
      >
        {sizes.map(({ size, fontSize, label }) => {
          const isActive = textSize === size
          // Active: black text on white circle background
          // Inactive: depends on background color
          //   - default variant (coral bg): white text
          //   - members variant (light beige bg): charcoal text in light mode, white in dark
          let textColor: string
          if (isActive) {
            textColor = '#000000' // Black on white circle
          } else if (variant === 'members' && theme === 'light') {
            textColor = '#2D2D2D' // Charcoal on light beige
          } else {
            textColor = '#FFFFFF' // White on coral or dark backgrounds
          }

          return (
            <button
              key={size}
              type="button"
              onClick={() => setTextSize(size)}
              className={`relative w-8 h-8 flex items-center justify-center z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 rounded-full ${!isActive ? 'inactive-a' : ''}`}
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              style={{
                backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                boxShadow: isActive && variant === 'members' ? '0 0 0 2px #FF8B6A' : 'none',
                transition: 'background-color 300ms ease-in-out, box-shadow 300ms ease-in-out',
              }}
            >
              <span
                className="font-bold notranslate"
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
    </>
  )
}
