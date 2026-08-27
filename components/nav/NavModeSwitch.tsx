'use client'

// Ο διακόπτης στυλ μενού: Modern (κάψουλα 1b) · Classic (τρέχον) · Cool (1a).
// Στο hover ανοίγουν οι τρεις επιλογές· το κλικ αλλάζει την εμφάνιση του site.

import { NAV_MODES } from './navItems'
import { useNavMode } from './useNavMode'

interface NavModeSwitchProps {
  /** Πού αγκυρώνει το αναδυόμενο (προεπιλογή δεξιά) */
  align?: 'left' | 'right'
  /** Κλάσεις του κουμπιού — προεπιλογή για σκούρες φούσκες */
  buttonClassName?: string
}

export default function NavModeSwitch({
  align = 'right',
  buttonClassName = 'w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors',
}: NavModeSwitchProps) {
  const { mode, setMode } = useNavMode()

  return (
    <div className="hover-reveal">
      <button
        type="button"
        aria-label="Στυλ μενού"
        aria-haspopup="true"
        className={buttonClassName}
      >
        {/* Τρία επίπεδα — «στοίβα» εμφανίσεων */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />
        </svg>
      </button>
      <div className={`reveal-panel absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-3 w-44 menu-glass rounded-2xl py-1.5 z-50`}>
        <p className="px-4 pt-1 pb-1.5 text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400">
          ΣΤΥΛ ΜΕΝΟΥ
        </p>
        {NAV_MODES.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            aria-pressed={mode === m.key}
            className={`notranslate flex items-center justify-between w-full px-4 py-2.5 text-sm text-left transition-colors ${
              mode === m.key
                ? 'text-coral dark:text-coral-light font-bold'
                : 'text-charcoal dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {m.label}
            {mode === m.key && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
