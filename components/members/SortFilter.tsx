'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type SortMode = 'none' | 'alpha-asc' | 'alpha-desc' | 'random'

interface SortOption {
  value: SortMode
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'random', label: 'Τυχαία σειρά' },
  { value: 'alpha-asc', label: 'Α → Ω' },
  { value: 'alpha-desc', label: 'Ω → Α' },
  { value: 'none', label: 'Χωρίς ταξινόμηση' },
]

interface SortFilterProps {
  sortMode: SortMode
  onSortChange: (mode: SortMode) => void
}

export default function SortFilter({ sortMode, onSortChange }: SortFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const closePanel = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePanel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closePanel])

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closePanel])

  const currentLabel = SORT_OPTIONS.find(o => o.value === sortMode)?.label ?? 'Τυχαία σειρά'

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-3 border border-charcoal dark:border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral text-left flex items-center gap-2 w-auto min-w-0 whitespace-nowrap transition-colors dark:bg-gray-700 text-charcoal dark:text-gray-200"
      >
        <span className="flex-1 truncate">{currentLabel}</span>
        <svg className={`w-4 h-4 text-coral dark:text-coral-light transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-2 w-52">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wider">Ταξινόμηση</p>
            </div>

            {/* Options */}
            {SORT_OPTIONS.map((option) => {
              const isSelected = sortMode === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value)
                    closePanel()
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-charcoal dark:bg-coral text-white'
                      : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600 hover:text-charcoal dark:hover:text-white'
                  }`}
                >
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
