'use client'

interface ViewToggleProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-full border border-charcoal dark:border-gray-400 overflow-hidden" role="radiogroup" aria-label="Εναλλαγή προβολής">
      <button
        onClick={() => onViewChange('grid')}
        className={`p-3 transition-colors ${
          view === 'grid'
            ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
            : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
        }`}
        role="radio"
        aria-checked={view === 'grid'}
        aria-label="Προβολή πλέγματος"
        title="Πλέγμα"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={`p-3 transition-colors border-l border-charcoal dark:border-gray-400 ${
          view === 'list'
            ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
            : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
        }`}
        role="radio"
        aria-checked={view === 'list'}
        aria-label="Προβολή λίστας"
        title="Λίστα"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="1" width="14" height="3" rx="1" />
          <rect x="1" y="6.5" width="14" height="3" rx="1" />
          <rect x="1" y="12" width="14" height="3" rx="1" />
        </svg>
      </button>
    </div>
  )
}
