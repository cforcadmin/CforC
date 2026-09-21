'use client'

import { useEffect, useRef, useState } from 'react'
import { searchCities } from '@/lib/greekCities'

/**
 * Πόλη με υποδείξεις — ίδια πηγή με την αναζήτηση της σελίδας μελών.
 *
 * Δεν επαναχρησιμοποιώ το CityAutocomplete του προφίλ: εκείνο δουλεύει με
 * λίστες πόλεων χωρισμένες με κόμμα και συμπληρώνει και περιφέρεια. Εδώ
 * θέλουμε ΜΙΑ πόλη ανά πεδίο («από» / «προς»), και ο χρήστης μπορεί να
 * γράψει και κάτι εκτός λίστας (π.χ. Λονδίνο).
 */
export default function CityField({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function update(v: string) {
    onChange(v)
    const hits = v.trim().length >= 2 ? searchCities(v).slice(0, 8) : []
    setSuggestions(hits)
    setHighlighted(-1)
    setOpen(hits.length > 0)
  }

  function pick(city: string) {
    onChange(city)
    setOpen(false)
    setSuggestions([])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => (i + 1) % suggestions.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(i => (i - 1 + suggestions.length) % suggestions.length) }
    else if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); pick(suggestions[highlighted]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={value}
        onChange={e => update(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          {suggestions.map((city, i) => (
            <button
              key={city}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(city) }}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full text-left px-4 py-2 text-sm ${
                i === highlighted
                  ? 'bg-coral/10 text-coral dark:text-coral-light'
                  : 'text-charcoal dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
