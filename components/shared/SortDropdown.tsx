'use client'

import { useState, useRef, useEffect } from 'react'

interface SortOption {
  value: string
  label: string
}

interface SortDropdownProps {
  options: SortOption[]
  selected: string
  onSortChange: (value: string) => void
}

export default function SortDropdown({ options, selected, onSortChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const selectedLabel = options.find(o => o.value === selected)?.label || 'Ταξινόμηση'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${isOpen ? 'ring-2 ring-coral ' : ''}flex items-center gap-2 px-4 py-3 rounded-full border border-charcoal dark:border-gray-400 text-sm font-medium text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600 transition-colors whitespace-nowrap`}
        aria-label={`Ταξινόμηση: ${selectedLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span>{selectedLabel}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 menu-glass rounded-xl z-50 min-w-[180px] py-2" role="listbox" aria-label="Ταξινόμηση">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSortChange(opt.value); setIsOpen(false) }}
              className={`w-full text-left pl-8 pr-3 py-1.5 text-sm transition-colors relative ${
                selected === opt.value
                  ? 'menu-row-on'
                  : 'menu-row-off text-charcoal dark:text-gray-100'
              }`}
              role="option"
              aria-selected={selected === opt.value}
            >
              <span aria-hidden="true" className="absolute left-3 text-xs">{(selected === opt.value) ? '✓' : ''}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
