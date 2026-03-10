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
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Sync inputValue when value prop changes externally (e.g., discard)
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

    // Clean and commit value
    const allCities = newValue.split(',').map(c => c.trim()).filter(c => c)
    const cleanedValue = allCities.join(', ')
    onChange(cleanedValue)

    // Derive provinces
    const provinces = new Set<string>()
    for (const c of allCities) {
      getProvincesForCity(c).forEach(p => provinces.add(p))
    }
    onProvinceChange(Array.from(provinces).join(', '))

    inputRef.current?.focus()
  }

  // Commit value on blur (clean up and derive provinces)
  const handleBlur = () => {
    // Small delay to allow click on suggestion to fire first
    setTimeout(() => {
      setSuggestions([])
      const cities = inputValue.split(',').map(c => c.trim()).filter(c => c)
      const cleanedValue = cities.join(', ')
      if (cleanedValue !== value) {
        onChange(cleanedValue)
        // Derive provinces
        const provinces = new Set<string>()
        for (const city of cities) {
          getProvincesForCity(city).forEach(p => provinces.add(p))
        }
        onProvinceChange(Array.from(provinces).join(', '))
      }
    }, 200)
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
      }
    } else if (e.key === ',' && suggestions.length > 0) {
      const currentToken = getCurrentToken(inputValue)
      if (currentToken.length > 0 && suggestions.length > 0) {
        e.preventDefault()
        selectCity(suggestions[0])
        setInputValue(prev => prev + ', ')
      }
    }
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

      {/* Helper text */}
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
        Πληκτρολόγησε και επέλεξε πόλη. Χώρισε με κόμμα (,) για πολλαπλές πόλεις. Η περιφέρεια συμπληρώνεται αυτόματα.
      </p>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="π.χ. Αθήνα, Θεσσαλονίκη"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent bg-white"
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
    </div>
  )
}
