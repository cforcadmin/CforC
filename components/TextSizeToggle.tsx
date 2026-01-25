'use client'

import { useId } from 'react'
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
  const baseId = useId()

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
      <fieldset
        className={`flex items-center relative ${className}`}
        style={{ gap: '12px', border: 'none', padding: 0, margin: 0 }}
      >
        <legend className="sr-only">Επιλογή μεγέθους κειμένου</legend>
        {sizes.map(({ size, fontSize, label }) => {
          const isActive = textSize === size
          const inputId = `${baseId}-${size}`
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
            <label
              key={size}
              htmlFor={inputId}
              className={`relative w-8 h-8 flex items-center justify-center z-10 cursor-pointer rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-coral has-[:focus-visible]:ring-offset-2 ${!isActive ? 'inactive-a' : ''}`}
              style={{
                backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                boxShadow: isActive && variant === 'members' ? '0 0 0 2px #FF8B6A' : 'none',
                transition: 'background-color 300ms ease-in-out, box-shadow 300ms ease-in-out',
              }}
            >
              <input
                type="radio"
                id={inputId}
                name={`text-size-${baseId}`}
                value={size}
                checked={isActive}
                onChange={() => setTextSize(size)}
                className="sr-only peer"
              />
              <span
                className="font-bold notranslate"
                style={{
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  transition: 'color 300ms ease-in-out',
                }}
                aria-hidden="true"
              >
                A
              </span>
              <span className="sr-only">{label}</span>
            </label>
          )
        })}
      </fieldset>
    </>
  )
}
