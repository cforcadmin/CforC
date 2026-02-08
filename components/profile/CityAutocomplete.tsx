'use client'

import { useState, useEffect, useRef } from 'react'
import { searchCities, getProvincesForCity } from '@/lib/greekCities'

interface CityAutocompleteProps {
  value: string
  onChange: (cities: string) => void
  onProvinceChange: (provinces: string) => void
  required?: boolean
}

export default function CityAutocomplete({
  value,
  onChange,
  onProvinceChange,
  required = false,
}: CityAutocompleteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Get the current token being typed (after last comma)
  const getCurrentToken = (text: string): string => {
    const parts = text.split(',')
    return parts[parts.length - 1].trim()
  }

  // Get already-confirmed cities (everything before the last comma)
  const getConfirmedPart = (text: string): string => {
    const parts = text.split(',')
    if (parts.length <= 1) return ''
    return parts.slice(0, -1).join(',') + ', '
  }

  const handleInputChange = (text: string) => {
    setInputValue(text)
    const currentToken = getCurrentToken(text)

    if (currentToken.length > 0) {
      const results = searchCities(currentToken)
      setSuggestions(results.slice(0, 8))
      setHighlightedIndex(-1)
    } else {
      setSuggestions([])
    }
  }

  const selectCity = (city: string) => {
    const confirmedPart = getConfirmedPart(inputValue)
    const newValue = confirmedPart + city
    setInputValue(newValue)
    setSuggestions([])
    setHighlightedIndex(-1)

    // Derive provinces from the full value
    const allCities = newValue.split(',').map(c => c.trim()).filter(c => c)
    const provinces = new Set<string>()
    for (const c of allCities) {
      getProvincesForCity(c).forEach(p => provinces.add(p))
    }
    onProvinceChange(Array.from(provinces).join(', '))

    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        selectCity(suggestions[highlightedIndex])
      } else if (suggestions.length === 1) {
        selectCity(suggestions[0])
      } else {
        handleSave()
      }
    } else if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === ',' && suggestions.length > 0) {
      // If typing comma and there's a top suggestion, auto-select it
      const currentToken = getCurrentToken(inputValue)
      if (currentToken.length > 0 && suggestions.length > 0) {
        e.preventDefault()
        selectCity(suggestions[0])
        // Add comma for next entry
        setInputValue(prev => prev + ', ')
      }
    }
  }

  const handleSave = () => {
    // Clean up: only keep valid cities
    const cities = inputValue.split(',').map(c => c.trim()).filter(c => c)
    const cleanedValue = cities.join(', ')
    onChange(cleanedValue)

    // Derive provinces
    const provinces = new Set<string>()
    for (const city of cities) {
      getProvincesForCity(city).forEach(p => provinces.add(p))
    }
    onProvinceChange(Array.from(provinces).join(', '))

    setIsEditing(false)
    setSuggestions([])
  }

  const handleCancel = () => {
    setInputValue(value)
    setIsEditing(false)
    setSuggestions([])
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
        Πόλη
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {isEditing ? (
        <div className="space-y-2">
          {/* Helper text */}
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Πληκτρολόγησε και επέλεξε πόλη. Χώρισε με κόμμα (,) για πολλαπλές πόλεις.
          </p>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="π.χ. Αθήνα, Θεσσαλονίκη"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent"
              autoFocus
            />

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-lg overflow-hidden"
              >
                {suggestions.map((city, index) => {
                  const provinces = getProvincesForCity(city)
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => selectCity(city)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex justify-between items-center ${
                        index === highlightedIndex
                          ? 'bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light'
                          : 'text-charcoal dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="font-medium">{city}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {provinces.join(', ')}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Αποθήκευση
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Ακύρωση
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsEditing(true)
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Πόλη επεξεργασία${value ? `: ${value}` : ''}`}
          className="group relative flex items-start gap-2 px-4 py-3 rounded-2xl transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light"
        >
          <div className="flex-1">
            {value ? (
              <p className="text-charcoal dark:text-gray-200">{value}</p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                π.χ. Αθήνα, Θεσσαλονίκη
              </p>
            )}
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-coral dark:group-hover:text-coral-light transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          {/* Hover tooltip */}
          <div className="absolute bottom-full left-4 mb-2 hidden group-hover:block z-10">
            <div className="bg-charcoal dark:bg-gray-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
              Χρησιμοποίησε κόμμα (,) για πολλαπλές πόλεις. Η περιφέρεια συμπληρώνεται αυτόματα.
              <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-charcoal dark:border-t-gray-600"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
