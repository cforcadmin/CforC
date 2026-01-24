'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccessibility } from './AccessibilityProvider'

// Icon components for each accessibility option

// Contrast icons for different modes
const ContrastNormalIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 2a10 10 0 0 1 0 20V2z" />
  </svg>
)

const ContrastInvertIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="currentColor" strokeWidth="2" />
    <path d="M12 2a10 10 0 0 0 0 20V2z" fill="white" />
  </svg>
)

const ContrastDarkIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" fill="white" />
  </svg>
)

const ContrastLightIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
)

const LinksIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const LargeTextIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <text x="2" y="18" fontSize="12" fontWeight="bold">T</text>
    <text x="12" y="20" fontSize="16" fontWeight="bold">T</text>
  </svg>
)

// Text spacing icons for different levels
// Default (0): ◀ ▶ (just arrows, no dash between)
const TextSpacingIcon0 = () => (
  <svg viewBox="0 0 48 24" className="w-8 h-8" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {/* Left arrow ◀ */}
    <path d="M8 12l10-8v16z" fill="currentColor" stroke="none" />
    {/* Right arrow ▶ */}
    <path d="M40 12l-10-8v16z" fill="currentColor" stroke="none" />
  </svg>
)

// Level 1 (1/3): ◀ ▶ (arrows slightly apart)
const TextSpacingIcon1 = () => (
  <svg viewBox="0 0 48 24" className="w-8 h-8" fill="currentColor" stroke="none" aria-hidden="true">
    {/* Left arrow ◀ */}
    <path d="M5 12l10-8v16z" fill="currentColor" />
    {/* Right arrow ▶ */}
    <path d="M43 12l-10-8v16z" fill="currentColor" />
  </svg>
)

// Level 2 (2/3): ◀  ▶ (arrows medium apart)
const TextSpacingIcon2 = () => (
  <svg viewBox="0 0 48 24" className="w-8 h-8" fill="currentColor" stroke="none" aria-hidden="true">
    {/* Left arrow ◀ */}
    <path d="M2 12l10-8v16z" fill="currentColor" />
    {/* Right arrow ▶ */}
    <path d="M46 12l-10-8v16z" fill="currentColor" />
  </svg>
)

// Level 3 (3/3): ◀   ▶ (arrows at edges)
const TextSpacingIcon3 = () => (
  <svg viewBox="0 0 48 24" className="w-8 h-8" fill="currentColor" stroke="none" aria-hidden="true">
    {/* Left arrow ◀ */}
    <path d="M-1 12l10-8v16z" fill="currentColor" />
    {/* Right arrow ▶ */}
    <path d="M49 12l-10-8v16z" fill="currentColor" />
  </svg>
)

const PauseAnimationsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="9" y="8" width="2" height="8" />
    <rect x="13" y="8" width="2" height="8" />
  </svg>
)

const PlayAnimationsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M10 8l6 4-6 4V8z" />
  </svg>
)

const HideImagesIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path d="M21 15l-5-5L5 21" />
    <path d="M2 2l20 20" strokeWidth="2.5" />
  </svg>
)

// Dyslexia icons - default shows dyslexia-style font, level 2 shows clean font
const DyslexiaIcon0 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <text x="4" y="18" fontSize="14" fontFamily="'OpenDyslexic', 'Comic Sans MS', cursive" fontWeight="bold" style={{ letterSpacing: '0.05em' }}>Df</text>
  </svg>
)

const DyslexiaIcon1 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <text x="4" y="18" fontSize="14" fontFamily="'OpenDyslexic', 'Comic Sans MS', cursive" fontWeight="bold" style={{ letterSpacing: '0.05em' }}>Df</text>
  </svg>
)

const DyslexiaIcon2 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <text x="4" y="18" fontSize="14" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold">Df</text>
  </svg>
)

// Cursor icons for different modes
const CursorIcon0 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
    <path d="M4 4l7 17 2.5-6.5L20 12 4 4z" />
  </svg>
)

// Large cursor icon (bigger arrow)
const CursorIcon1 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="M3 3l8 19 3-7 7-3L3 3z" />
  </svg>
)

// Reading mask icon (horizontal lines)
const CursorIcon2 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="2" y1="8" x2="22" y2="8" />
    <line x1="2" y1="16" x2="22" y2="16" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)

// Reading guide icon (triangle pointer with line)
const CursorIcon3 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="M12 4l-4 6h8l-4-6z" />
    <line x1="12" y1="10" x2="12" y2="20" strokeWidth="2" />
  </svg>
)

// Line height icons for different levels - double arrow on left, lines showing spacing
// Default (0): Lines close together
const LineHeightIcon0 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M8 7h14" />
    <path d="M8 12h14" />
    <path d="M8 17h14" />
    <path d="M3 9l0 6" />
    <path d="M2 10l1-1 1 1" />
    <path d="M2 14l1 1 1-1" />
  </svg>
)

// Level 1 (1.5): Lines slightly apart
const LineHeightIcon1 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M8 5h14" />
    <path d="M8 12h14" />
    <path d="M8 19h14" />
    <path d="M3 8l0 8" />
    <path d="M2 9l1-1 1 1" />
    <path d="M2 15l1 1 1-1" />
  </svg>
)

// Level 2 (1.75): Lines medium apart
const LineHeightIcon2 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M8 4h14" />
    <path d="M8 12h14" />
    <path d="M8 20h14" />
    <path d="M3 7l0 10" />
    <path d="M2 8l1-1 1 1" />
    <path d="M2 16l1 1 1-1" />
  </svg>
)

// Level 3 (2.0): Lines far apart
const LineHeightIcon3 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M8 2h14" />
    <path d="M8 12h14" />
    <path d="M8 22h14" />
    <path d="M3 5l0 14" />
    <path d="M2 6l1-1 1 1" />
    <path d="M2 18l1 1 1-1" />
  </svg>
)

// Text alignment icons for different modes
// Default (0): Mixed alignment lines
const TextAlignIcon0 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M3 10h12" />
    <path d="M3 14h18" />
    <path d="M3 18h8" />
  </svg>
)

// Left align (1): All lines start from left
const TextAlignIcon1 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M3 10h12" />
    <path d="M3 14h16" />
    <path d="M3 18h10" />
  </svg>
)

// Right align (2): All lines end at right
const TextAlignIcon2 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M9 10h12" />
    <path d="M5 14h16" />
    <path d="M11 18h10" />
  </svg>
)

// Center align (3): Lines centered
const TextAlignIcon3 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M6 10h12" />
    <path d="M4 14h16" />
    <path d="M7 18h10" />
  </svg>
)

// Justify (4): All lines full width
const TextAlignIcon4 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M3 10h18" />
    <path d="M3 14h18" />
    <path d="M3 18h18" />
  </svg>
)

// Saturation icons - droplet shape
// Default (normal): Half full droplet
const SaturationIcon0 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="none" />
    <clipPath id="clip50default">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </clipPath>
    <rect x="0" y="12" width="24" height="12" clipPath="url(#clip50default)" fill="currentColor" />
  </svg>
)

// High saturation (1/3): Droplet ~60% full (a little less than half)
const SaturationIcon1 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="none" />
    <clipPath id="clip60high">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </clipPath>
    <rect x="0" y="10" width="24" height="14" clipPath="url(#clip60high)" fill="currentColor" />
  </svg>
)

// Low saturation (2/3): Droplet 1/4 full
const SaturationIcon2 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="none" />
    <clipPath id="clip25low">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </clipPath>
    <rect x="0" y="17" width="24" height="7" clipPath="url(#clip25low)" fill="currentColor" />
  </svg>
)

// Grayscale (3/3): Empty droplet with 4 tiny dots inside
const SaturationIcon3 = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="none" />
    {/* 4 tiny dots */}
    <circle cx="12" cy="11" r="0.7" />
    <circle cx="9" cy="15" r="0.7" />
    <circle cx="15" cy="15" r="0.7" />
    <circle cx="12" cy="18" r="0.7" />
  </svg>
)

const ResetIcon = ({ size = 'default' }: { size?: 'default' | 'large' }) => (
  <svg viewBox="0 0 24 24" className={size === 'large' ? 'w-7 h-7' : 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const CloseIcon = ({ size = 'default' }: { size?: 'default' | 'large' }) => (
  <svg viewBox="0 0 24 24" className={size === 'large' ? 'w-8 h-8' : 'w-6 h-6'} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

// Menu item button component
interface MenuItemProps {
  icon: React.ReactNode
  label: React.ReactNode
  active: boolean
  onClick: () => void
  oversized?: boolean
}

function MenuItem({ icon, label, active, onClick, oversized = false }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-xl border-2 transition-all duration-200
        grid place-items-center
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2
        ${oversized ? 'p-8 min-h-[160px]' : 'p-4'}
        ${active
          ? 'bg-coral/10 border-coral text-coral dark:bg-coral/20'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-charcoal dark:text-gray-200 hover:border-coral/50 hover:bg-coral/5'
        }
      `}
      aria-pressed={active}
    >
      {/* Active indicator */}
      {active && (
        <div className={`absolute bg-coral rounded-full flex items-center justify-center ${oversized ? 'top-3 right-3 w-8 h-8' : 'top-2 right-2 w-5 h-5'}`}>
          <svg className={`text-white ${oversized ? 'w-5 h-5' : 'w-3 h-3'}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <div className="grid place-items-center">
        <div className={`${oversized ? 'mb-4 [&>svg]:w-14 [&>svg]:h-14' : 'mb-2 [&>svg]:w-8 [&>svg]:h-8'}`}>{icon}</div>
        <span className={`font-medium leading-tight text-center ${oversized ? 'text-lg' : 'text-xs'}`}>{label}</span>
      </div>
    </button>
  )
}

// Toggle switch component for oversized widget
interface ToggleSwitchProps {
  enabled: boolean
  onChange: () => void
  label: string
}

function ToggleSwitch({ enabled, onChange, label, oversized = false }: ToggleSwitchProps & { oversized?: boolean }) {
  return (
    <div className={`flex items-center justify-between bg-gray-200 dark:bg-gray-800 rounded-xl ${oversized ? 'py-5 px-6' : 'py-3 px-4'}`}>
      <span className={`font-medium text-charcoal dark:text-gray-200 ${oversized ? 'text-xl' : 'text-base'}`}>{label}</span>
      <button
        onClick={onChange}
        className={`
          relative rounded-full transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2
          ${oversized ? 'w-20 h-11' : 'w-14 h-8'}
          ${enabled ? 'bg-charcoal dark:bg-coral' : 'bg-gray-400 dark:bg-gray-600'}
        `}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span
          className={`
            absolute bg-white rounded-full shadow transition-transform duration-200
            flex items-center justify-center
            ${oversized ? 'top-1.5 w-8 h-8' : 'top-1 w-6 h-6'}
            ${enabled ? (oversized ? 'translate-x-10' : 'translate-x-7') : 'translate-x-1'}
          `}
        >
          {enabled ? (
            <svg className={`text-charcoal ${oversized ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className={`text-gray-400 ${oversized ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
      </button>
    </div>
  )
}

export default function AccessibilityMenu() {
  const { settings, toggleSetting, updateSetting, resetSettings, isMenuOpen, setIsMenuOpen, hideWidget } = useAccessibility()
  const menuRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [isWidgetDropdownOpen, setIsWidgetDropdownOpen] = useState(false)
  const [selectedHideDuration, setSelectedHideDuration] = useState<'session' | 'day' | 'week' | 'month' | 'forever'>('session')

  // Focus trap and focus management
  useEffect(() => {
    if (isMenuOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isMenuOpen])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen, setIsMenuOpen])

  // Cycle through saturation options
  const cycleSaturation = () => {
    const order: typeof settings.saturation[] = ['normal', 'high', 'low', 'grayscale']
    const currentIndex = order.indexOf(settings.saturation)
    const nextIndex = (currentIndex + 1) % order.length
    updateSetting('saturation', order[nextIndex])
  }

  const getSaturationLabel = () => {
    if (settings.saturation === 'normal') {
      return 'Κορεσμός'
    }

    // Create dots indicator (3 dots for 3 levels)
    const levelMap: Record<string, number> = { 'high': 1, 'low': 2, 'grayscale': 3 }
    const level = levelMap[settings.saturation] || 0

    const dots = []
    for (let i = 1; i <= 3; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
            i <= level ? 'bg-black' : 'border border-black bg-transparent'
          }`}
        />
      )
    }

    let labelText = ''
    switch (settings.saturation) {
      case 'high': labelText = 'Κορεσμός (Υψηλός)'; break
      case 'low': labelText = 'Κορεσμός (Χαμηλός)'; break
      case 'grayscale': labelText = 'Ασπρόμαυρο'; break
    }

    return (
      <>
        {labelText}
        <div className="flex justify-center mt-1">{dots}</div>
      </>
    )
  }

  const getSaturationIcon = () => {
    switch (settings.saturation) {
      case 'high': return <SaturationIcon1 />
      case 'low': return <SaturationIcon2 />
      case 'grayscale': return <SaturationIcon3 />
      default: return <SaturationIcon0 />
    }
  }

  // Cycle through contrast options
  const cycleContrast = () => {
    const order: typeof settings.contrast[] = ['normal', 'invert', 'dark', 'light']
    const currentIndex = order.indexOf(settings.contrast)
    const nextIndex = (currentIndex + 1) % order.length
    updateSetting('contrast', order[nextIndex])
  }

  const getContrastLabel = () => {
    switch (settings.contrast) {
      case 'invert': return <>Αντιστροφή<br />Χρωμάτων</>
      case 'dark': return 'Σκούρα Αντίθεση'
      case 'light': return 'Ανοιχτή Αντίθεση'
      default: return 'Αντίθεση +'
    }
  }

  const getContrastIcon = () => {
    switch (settings.contrast) {
      case 'invert': return <ContrastInvertIcon />
      case 'dark': return <ContrastDarkIcon />
      case 'light': return <ContrastLightIcon />
      default: return <ContrastNormalIcon />
    }
  }

  // Cycle through large text options (0 -> 1 -> 2 -> 3 -> 4 -> 0)
  const cycleLargeText = () => {
    const nextValue = ((settings.largeText + 1) % 5) as 0 | 1 | 2 | 3 | 4
    updateSetting('largeText', nextValue)
  }

  const getLargeTextLabel = () => {
    const level = settings.largeText
    if (level === 0) {
      return 'Μεγάλο Κείμενο'
    }

    // Create dots indicator
    const dots = []
    for (let i = 1; i <= 4; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
            i <= level ? 'bg-black' : 'border border-black bg-transparent'
          }`}
        />
      )
    }

    return (
      <>
        Μεγάλο Κείμενο
        <div className="flex justify-center mt-1">{dots}</div>
      </>
    )
  }

  // Cycle through text spacing options (0 -> 1 -> 2 -> 3 -> 0)
  const cycleTextSpacing = () => {
    const nextValue = ((settings.textSpacing + 1) % 4) as 0 | 1 | 2 | 3
    updateSetting('textSpacing', nextValue)
  }

  const getTextSpacingLabel = () => {
    const level = settings.textSpacing
    if (level === 0) {
      return <>Αύξηση απόστασης<br />κειμένου</>
    }

    // Create dots indicator (3 dots for 3 levels)
    const dots = []
    for (let i = 1; i <= 3; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
            i <= level ? 'bg-black' : 'border border-black bg-transparent'
          }`}
        />
      )
    }

    // Different labels for each level
    const labelText = level === 1 ? 'Μικρή απόσταση' : level === 2 ? 'Μέτρια απόσταση' : 'Μεγίστη απόσταση'

    return (
      <>
        {labelText}
        <div className="flex justify-center mt-1">{dots}</div>
      </>
    )
  }

  const getTextSpacingIcon = () => {
    switch (settings.textSpacing) {
      case 1: return <TextSpacingIcon1 />
      case 2: return <TextSpacingIcon2 />
      case 3: return <TextSpacingIcon3 />
      default: return <TextSpacingIcon0 />
    }
  }

  // Cycle through dyslexia options (0 -> 1 -> 2 -> 0)
  const cycleDyslexia = () => {
    const nextValue = ((settings.dyslexiaFriendly + 1) % 3) as 0 | 1 | 2
    updateSetting('dyslexiaFriendly', nextValue)
  }

  const getDyslexiaLabel = () => {
    const level = settings.dyslexiaFriendly
    if (level === 0) {
      return 'Φιλικό προς δυσλεξία'
    }

    // Create dots indicator (2 dots for 2 levels)
    const dots = []
    for (let i = 1; i <= 2; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
            i <= level ? 'bg-black' : 'border border-black bg-transparent'
          }`}
        />
      )
    }

    const labelText = level === 1 ? 'Φιλικό προς δυσλεξία' : 'Ευανάγνωστη γρ.'

    return (
      <>
        {labelText}
        <div className="flex justify-center mt-1">{dots}</div>
      </>
    )
  }

  const getDyslexiaIcon = () => {
    switch (settings.dyslexiaFriendly) {
      case 1: return <DyslexiaIcon1 />
      case 2: return <DyslexiaIcon2 />
      default: return <DyslexiaIcon0 />
    }
  }

  // Cycle through cursor options (0 -> 1 -> 2 -> 3 -> 0)
  const cycleCursor = () => {
    const nextValue = ((settings.largeCursor + 1) % 4) as 0 | 1 | 2 | 3
    updateSetting('largeCursor', nextValue)
  }

  const getCursorLabel = () => {
    const level = settings.largeCursor
    if (level === 0) {
      return 'Δρομέας'
    }

    // Create dots indicator (3 dots for 3 levels)
    const dots = []
    for (let i = 1; i <= 3; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
            i <= level ? 'bg-black' : 'border border-black bg-transparent'
          }`}
        />
      )
    }

    let labelText = ''
    switch (level) {
      case 1: labelText = 'Μεγάλος Δρομέας'; break
      case 2: labelText = 'Μάσκα ανάγνωσης'; break
      case 3: labelText = 'Οδηγός ανάγνωσης'; break
    }

    return (
      <>
        {labelText}
        <div className="flex justify-center mt-1">{dots}</div>
      </>
    )
  }

  const getCursorIcon = () => {
    switch (settings.largeCursor) {
      case 1: return <CursorIcon1 />
      case 2: return <CursorIcon2 />
      case 3: return <CursorIcon3 />
      default: return <CursorIcon0 />
    }
  }

  // Cycle through line height options (0 -> 1 -> 2 -> 3 -> 0)
  const cycleLineHeight = () => {
    const nextValue = ((settings.lineHeight + 1) % 4) as 0 | 1 | 2 | 3
    updateSetting('lineHeight', nextValue)
  }

  const getLineHeightLabel = () => {
    const level = settings.lineHeight
    if (level === 0) {
      return 'Ύψος γραμμής'
    }

    // Create dots indicator (3 dots for 3 levels)
    const dots = []
    for (let i = 1; i <= 3; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
            i <= level ? 'bg-black' : 'border border-black bg-transparent'
          }`}
        />
      )
    }

    let labelText = ''
    switch (level) {
      case 1: labelText = 'Ύψος γραμμής 2'; break
      case 2: labelText = 'Ύψος γραμμής 2.5'; break
      case 3: labelText = 'Ύψος γραμμής 3'; break
    }

    return (
      <>
        {labelText}
        <div className="flex justify-center mt-1">{dots}</div>
      </>
    )
  }

  const getLineHeightIcon = () => {
    switch (settings.lineHeight) {
      case 1: return <LineHeightIcon1 />
      case 2: return <LineHeightIcon2 />
      case 3: return <LineHeightIcon3 />
      default: return <LineHeightIcon0 />
    }
  }

  // Cycle through text alignment options (0 -> 1 -> 2 -> 3 -> 4 -> 0)
  const cycleTextAlignment = () => {
    const nextValue = ((settings.textAlignment + 1) % 5) as 0 | 1 | 2 | 3 | 4
    updateSetting('textAlignment', nextValue)
  }

  const getTextAlignmentLabel = () => {
    const level = settings.textAlignment
    if (level === 0) {
      return 'Στοίχηση κειμένου'
    }

    // Create dots indicator (4 dots for 4 levels)
    const dots = []
    for (let i = 1; i <= 4; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
            i <= level ? 'bg-black' : 'border border-black bg-transparent'
          }`}
        />
      )
    }

    let labelText = ''
    switch (level) {
      case 1: labelText = 'Στοίχηση αριστερά'; break
      case 2: labelText = 'Στοίχηση δεξιά'; break
      case 3: labelText = 'Στοίχηση στο κέντρο'; break
      case 4: labelText = 'Πλήρης στοίχηση'; break
    }

    return (
      <>
        {labelText}
        <div className="flex justify-center mt-1">{dots}</div>
      </>
    )
  }

  const getTextAlignmentIcon = () => {
    switch (settings.textAlignment) {
      case 1: return <TextAlignIcon1 />
      case 2: return <TextAlignIcon2 />
      case 3: return <TextAlignIcon3 />
      case 4: return <TextAlignIcon4 />
      default: return <TextAlignIcon0 />
    }
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300
          ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        aria-hidden="true"
      />

      {/* Slide-in menu panel */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Μενού Προσβασιμότητας"
        className={`
          fixed top-0 h-full w-full bg-gray-100 dark:bg-gray-900
          z-[101] shadow-2xl transform transition-all duration-300 ease-in-out
          ${settings.oversizedWidget ? 'max-w-xl' : 'max-w-md'}
          ${settings.widgetPosition === 'left' ? 'left-0' : 'right-0'}
          ${isMenuOpen
            ? 'translate-x-0'
            : settings.widgetPosition === 'left'
              ? '-translate-x-full'
              : 'translate-x-full'
          }
        `}
      >
        {/* Header */}
        <div className={`sticky top-0 bg-coral dark:bg-charcoal text-white flex items-center justify-between z-10 ${settings.oversizedWidget ? 'px-6 py-6' : 'px-4 py-4'}`}>
          <h2 className={`font-bold ${settings.oversizedWidget ? 'text-2xl' : 'text-lg'}`}>
            Μενού Προσβασιμότητας
            <span className={`font-normal ml-2 opacity-80 ${settings.oversizedWidget ? 'text-lg' : 'text-sm'}`}>(CTRL+U)</span>
          </h2>
          <button
            ref={closeButtonRef}
            onClick={() => setIsMenuOpen(false)}
            className={`bg-charcoal dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-charcoal/80 dark:hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-coral ${settings.oversizedWidget ? 'w-14 h-14' : 'w-10 h-10'}`}
            aria-label="Κλείσιμο μενού προσβασιμότητας"
          >
            <CloseIcon size={settings.oversizedWidget ? 'large' : 'default'} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className={`overflow-y-auto pb-8 ${settings.oversizedWidget ? 'h-[calc(100%-96px)]' : 'h-[calc(100%-64px)]'}`}>
          {/* Oversized widget toggle */}
          <div className={`pb-0 ${settings.oversizedWidget ? 'p-6' : 'p-4'}`}>
            <ToggleSwitch
              enabled={settings.oversizedWidget}
              onChange={() => toggleSetting('oversizedWidget')}
              label="Υπερμεγέθη widget"
              oversized={settings.oversizedWidget}
            />
          </div>

          {/* Menu items grid */}
          <div className={settings.oversizedWidget ? 'p-6 pt-4' : 'p-4'}>
            <div className={`grid grid-cols-2 ${settings.oversizedWidget ? 'gap-5' : 'gap-3'}`}>
              <MenuItem
                icon={getContrastIcon()}
                label={getContrastLabel()}
                active={settings.contrast !== 'normal'}
                onClick={cycleContrast}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={<LinksIcon />}
                label="Σύνδεσμοι"
                active={settings.highlightLinks}
                onClick={() => toggleSetting('highlightLinks')}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={<LargeTextIcon />}
                label={getLargeTextLabel()}
                active={settings.largeText > 0}
                onClick={cycleLargeText}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={getTextSpacingIcon()}
                label={getTextSpacingLabel()}
                active={settings.textSpacing > 0}
                onClick={cycleTextSpacing}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={settings.pauseAnimations ? <PlayAnimationsIcon /> : <PauseAnimationsIcon />}
                label={settings.pauseAnimations ? <>Συνέχιση κινουμένων<br />στοιχείων</> : <>Παύση κινουμένων<br />στοιχείων</>}
                active={settings.pauseAnimations}
                onClick={() => toggleSetting('pauseAnimations')}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={<HideImagesIcon />}
                label="Απόκρυψη εικόνων"
                active={settings.hideImages}
                onClick={() => toggleSetting('hideImages')}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={getDyslexiaIcon()}
                label={getDyslexiaLabel()}
                active={settings.dyslexiaFriendly > 0}
                onClick={cycleDyslexia}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={getCursorIcon()}
                label={getCursorLabel()}
                active={settings.largeCursor > 0}
                onClick={cycleCursor}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={getLineHeightIcon()}
                label={getLineHeightLabel()}
                active={settings.lineHeight > 0}
                onClick={cycleLineHeight}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={getTextAlignmentIcon()}
                label={getTextAlignmentLabel()}
                active={settings.textAlignment > 0}
                onClick={cycleTextAlignment}
                oversized={settings.oversizedWidget}
              />
              <MenuItem
                icon={getSaturationIcon()}
                label={getSaturationLabel()}
                active={settings.saturation !== 'normal'}
                onClick={cycleSaturation}
                oversized={settings.oversizedWidget}
              />
              {/* Info box - fills the empty cell next to Κορεσμός */}
              <div className={`
                rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600
                flex items-center justify-center text-center
                text-gray-500 dark:text-gray-400
                ${settings.oversizedWidget ? 'p-6 min-h-[160px]' : 'p-4'}
              `}>
                <div className="flex flex-col items-center gap-2">
                  <svg className={`${settings.oversizedWidget ? 'w-8 h-8' : 'w-5 h-5'} text-green-500`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={`${settings.oversizedWidget ? 'text-base' : 'text-xs'} font-medium leading-tight`}>
                    Οι ρυθμίσεις<br />αποθηκεύονται<br />αυτόματα
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div className={settings.oversizedWidget ? 'px-6 mt-1.5' : 'px-4 mt-1'}>
            <button
              onClick={resetSettings}
              className={`w-full bg-coral hover:bg-coral-dark text-white font-medium rounded-xl flex items-center justify-center gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${settings.oversizedWidget ? 'py-5 px-6 text-lg' : 'py-3 px-4'}`}
            >
              <ResetIcon size={settings.oversizedWidget ? 'large' : 'default'} />
              <span>Επαναφορά όλων των ρυθμίσεων προσβασιμότητας</span>
            </button>
          </div>

          {/* Widget Position/Hide Dropdown */}
          <div className={settings.oversizedWidget ? 'px-6 mt-4' : 'px-4 mt-3'}>
            <button
              onClick={() => setIsWidgetDropdownOpen(!isWidgetDropdownOpen)}
              className={`w-full bg-gray-200 dark:bg-gray-700 text-charcoal dark:text-gray-200 font-medium rounded-xl flex items-center justify-between transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${settings.oversizedWidget ? 'py-4 px-5 text-base' : 'py-3 px-4 text-sm'}`}
            >
              <div className="flex items-center gap-3">
                <svg className={settings.oversizedWidget ? 'w-6 h-6' : 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>μετακίνηση/απόκρυψη γραφικού στοιχείου</span>
              </div>
              <svg className={`transition-transform duration-200 ${isWidgetDropdownOpen ? 'rotate-180' : ''} ${settings.oversizedWidget ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Content */}
            {isWidgetDropdownOpen && (
              <div className={`mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${settings.oversizedWidget ? 'text-base' : 'text-sm'}`}>
                {/* Position Options */}
                <div className="p-4 space-y-3">
                  {/* Left Option */}
                  <label className="flex items-center justify-between cursor-pointer py-2">
                    <span className="text-charcoal dark:text-gray-200">Αριστερά</span>
                    <div
                      onClick={() => updateSetting('widgetPosition', 'left')}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        settings.widgetPosition === 'left' && !settings.widgetHidden
                          ? 'border-charcoal dark:border-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {settings.widgetPosition === 'left' && !settings.widgetHidden && (
                        <div className="w-3 h-3 rounded-full bg-charcoal dark:bg-white" />
                      )}
                    </div>
                  </label>

                  {/* Right Option */}
                  <label className="flex items-center justify-between cursor-pointer py-2">
                    <span className="text-charcoal dark:text-gray-200">Δεξιά</span>
                    <div
                      onClick={() => updateSetting('widgetPosition', 'right')}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        settings.widgetPosition === 'right' && !settings.widgetHidden
                          ? 'border-charcoal dark:border-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {settings.widgetPosition === 'right' && !settings.widgetHidden && (
                        <div className="w-3 h-3 rounded-full bg-charcoal dark:bg-white" />
                      )}
                    </div>
                  </label>

                  {/* Hide Option */}
                  <label className="flex items-center justify-between cursor-pointer py-2">
                    <span className="text-charcoal dark:text-gray-200">Κρύψε το εικονίδιο για...</span>
                    <div
                      onClick={() => updateSetting('widgetHidden', !settings.widgetHidden)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        settings.widgetHidden
                          ? 'border-charcoal dark:border-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {settings.widgetHidden && (
                        <div className="w-3 h-3 rounded-full bg-charcoal dark:bg-white" />
                      )}
                    </div>
                  </label>
                </div>

                {/* Hide Duration Section - Only shown when "Κρύβω" is selected */}
                {settings.widgetHidden && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="space-y-3">
                      {[
                        { value: 'session', label: 'Την τρέχουσα συνεδρία' },
                        { value: 'day', label: 'Μια μέρα' },
                        { value: 'week', label: 'Μια εβδομάδα' },
                        { value: 'month', label: 'Έναν μήνα' },
                        { value: 'forever', label: 'Πάντα' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center justify-between cursor-pointer py-2">
                          <span className="text-charcoal dark:text-gray-200">{option.label}</span>
                          <div
                            onClick={() => setSelectedHideDuration(option.value as typeof selectedHideDuration)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedHideDuration === option.value
                                ? 'border-charcoal dark:border-white'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {selectedHideDuration === option.value && (
                              <div className="w-3 h-3 rounded-full bg-charcoal dark:bg-white" />
                            )}
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          updateSetting('widgetHidden', false)
                          setSelectedHideDuration('session')
                        }}
                        className={`flex-1 bg-charcoal dark:bg-gray-800 border-2 border-coral text-coral font-medium rounded-full transition-colors hover:bg-charcoal/90 dark:hover:bg-gray-700 text-center flex items-center justify-center ${settings.oversizedWidget ? 'py-4 text-base' : 'py-3 text-sm'}`}
                      >
                        ΑΚΥΡΩΣΗ
                      </button>
                      <button
                        onClick={() => {
                          hideWidget(selectedHideDuration)
                          setIsMenuOpen(false)
                        }}
                        className={`flex-1 bg-coral hover:bg-coral-dark text-white font-medium rounded-full transition-colors text-center flex items-center justify-center ${settings.oversizedWidget ? 'py-4 text-base' : 'py-3 text-sm'}`}
                      >
                        ΑΠΟΚΡΥΨΗ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Accessibility trigger button component (to be placed in hero section or navbar)
interface AccessibilityButtonProps {
  size?: 'default' | 'small'
}

export function AccessibilityButton({ size = 'default' }: AccessibilityButtonProps) {
  const { setIsMenuOpen } = useAccessibility()

  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-12 h-12'

  return (
    <button
      onClick={() => setIsMenuOpen(true)}
      className={`
        ${sizeClasses} rounded-full overflow-hidden
        hover:scale-110 hover:shadow-xl transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral dark:focus-visible:ring-white focus-visible:ring-offset-2
      `}
      aria-label="Άνοιγμα μενού προσβασιμότητας (CTRL+U)"
      title="Μενού Προσβασιμότητας"
    >
      {/* Light mode icon */}
      <img
        src="/Accessibility_light.jpg"
        alt=""
        className="w-full h-full object-cover dark:hidden accessibility-button-img"
        aria-hidden="true"
      />
      {/* Dark mode icon */}
      <img
        src="/Accessibility_dark.jpg"
        alt=""
        className="w-full h-full object-cover hidden dark:block accessibility-button-img"
        aria-hidden="true"
      />
    </button>
  )
}

// Floating accessibility button that appears on all pages
export function FloatingAccessibilityButton() {
  const { setIsMenuOpen, settings, isWidgetVisible } = useAccessibility()

  // Don't render if widget is hidden
  if (!isWidgetVisible()) {
    return null
  }

  const positionClass = settings.widgetPosition === 'left' ? 'left-6' : 'right-6'

  return (
    <button
      onClick={() => setIsMenuOpen(true)}
      className={`
        fixed bottom-6 ${positionClass} z-50
        w-14 h-14 rounded-full overflow-hidden
        shadow-lg hover:shadow-xl
        hover:scale-110 transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral dark:focus-visible:ring-white focus-visible:ring-offset-2
        border-2 border-white dark:border-gray-700
      `}
      aria-label="Άνοιγμα μενού προσβασιμότητας (CTRL+U)"
      title="Μενού Προσβασιμότητας"
    >
      {/* Light mode icon */}
      <img
        src="/Accessibility_light.jpg"
        alt=""
        className="w-full h-full object-cover dark:hidden accessibility-button-img"
        aria-hidden="true"
      />
      {/* Dark mode icon */}
      <img
        src="/Accessibility_dark.jpg"
        alt=""
        className="w-full h-full object-cover hidden dark:block accessibility-button-img"
        aria-hidden="true"
      />
    </button>
  )
}
