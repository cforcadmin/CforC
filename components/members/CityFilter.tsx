'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface CityFilterProps {
  cities: string[]
  selectedCities: string[]
  onSelectionChange: (cities: string[]) => void
}

export default function CityFilter({ cities, selectedCities, onSelectionChange }: CityFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const toggleSelection = (city: string) => {
    if (selectedCities.includes(city)) {
      onSelectionChange(selectedCities.filter(c => c !== city))
    } else {
      onSelectionChange([...selectedCities, city])
    }
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const closePanel = useCallback(() => {
    setIsOpen(false)
    setSearch('')
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

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus()
    }
  }, [isOpen])

  const filteredCities = search
    ? cities.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : cities

  const getTriggerLabel = () => {
    if (selectedCities.length === 0) return 'Όλες οι πόλεις'
    if (selectedCities.length === 1) return selectedCities[0]
    if (selectedCities.length === 2) return selectedCities.join(', ')
    return `${selectedCities.length} πόλεις επιλεγμένες`
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-3 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral text-left flex items-center gap-2 w-40 md:w-48 transition-colors ${
          selectedCities.length > 0
            ? 'border-charcoal dark:border-gray-100 bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
            : 'border-charcoal dark:border-gray-400 dark:bg-gray-700 text-charcoal dark:text-gray-200'
        }`}
      >
        <span className="flex-1 truncate">{getTriggerLabel()}</span>
        {selectedCities.length > 0 && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 dark:bg-gray-900/20 hover:bg-white hover:text-charcoal dark:hover:bg-gray-900 dark:hover:text-gray-100 text-white/80 dark:text-gray-900/80 transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Καθαρισμός φίλτρων πόλεων"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
        {selectedCities.length === 0 && (
          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Popover panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-2 w-64 max-h-80 flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wider">Πόλεις</p>
              {selectedCities.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-coral dark:text-coral-light hover:underline"
                >
                  Καθαρισμός
                </button>
              )}
            </div>

            {/* Search within list */}
            {cities.length > 8 && (
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Αναζήτηση πόλης..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 border border-charcoal dark:border-gray-400 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 placeholder-charcoal dark:placeholder-gray-200"
                />
              </div>
            )}

            {/* City list */}
            <div className="overflow-y-auto flex-1">
              {filteredCities.map((city) => {
                const isSelected = selectedCities.includes(city)
                return (
                  <button
                    key={city}
                    onClick={() => toggleSelection(city)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-charcoal dark:bg-coral text-white'
                        : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600 hover:text-charcoal dark:hover:text-white'
                    }`}
                  >
                    <span>{city}</span>
                  </button>
                )
              })}
              {filteredCities.length === 0 && (
                <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 italic">Δεν βρέθηκαν πόλεις</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
