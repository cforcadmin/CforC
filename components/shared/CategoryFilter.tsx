'use client'

import { useState, useRef, useEffect } from 'react'

interface CategoryFilterProps {
  categories: string[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  label?: string
}

export default function CategoryFilter({ categories, selectedCategory, onCategoryChange, label = 'Κατηγορία' }: CategoryFilterProps) {
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

  const hasSelection = selectedCategory !== ''

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full border text-sm font-medium transition-colors whitespace-nowrap ${
          hasSelection
            ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 border-charcoal dark:border-gray-100'
            : 'border-charcoal dark:border-gray-400 text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
        }`}
        aria-label={`${label}: ${selectedCategory || 'Όλες'}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="max-w-[140px] truncate">{hasSelection ? selectedCategory : label}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {hasSelection && (
          <button
            onClick={(e) => { e.stopPropagation(); onCategoryChange('') }}
            className="ml-1 hover:text-coral"
            aria-label={`Καθαρισμός φίλτρου ${label.toLowerCase()}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600 z-50 min-w-[220px] py-2 max-h-[300px] overflow-y-auto" role="listbox" aria-label={label}>
          <button
            onClick={() => { onCategoryChange(''); setIsOpen(false) }}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              !hasSelection
                ? 'bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            role="option"
            aria-selected={!hasSelection}
          >
            Όλες οι κατηγορίες
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { onCategoryChange(cat); setIsOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                selectedCategory === cat
                  ? 'bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              role="option"
              aria-selected={selectedCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
