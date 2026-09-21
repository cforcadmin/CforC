'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { normaliseGreek } from '@/lib/greekText'

/**
 * «Μετακίνηση μαζί με μέλη» — επιλογή από το μητρώο, με τσιπάκια.
 *
 * Η αναζήτηση περνά από το normaliseGreek: «μακεδωνα» βρίσκει τη
 * «Μακεδώνα», «ΣΤΕΛΛΑ» τη «Στέλλα». Δέχεται και ελεύθερο κείμενο, γιατί
 * σε μια μετακίνηση μπορεί να συμμετέχει και κάποιος εκτός δικτύου.
 */
export default function MemberPicker({
  value, onChange, options,
}: { value: string[]; onChange: (v: string[]) => void; options: string[] }) {
  const [query, setQuery] = useState('')
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

  const matches = useMemo(() => {
    const q = normaliseGreek(query.trim())
    if (q.length < 2) return []
    return options
      .filter(n => !value.includes(n) && normaliseGreek(n).includes(q))
      .slice(0, 8)
  }, [query, options, value])

  function add(name: string) {
    const n = name.trim()
    if (!n || value.includes(n)) return
    onChange([...value, n])
    setQuery('')
    setOpen(false)
    setHighlighted(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      add(highlighted >= 0 && matches[highlighted] ? matches[highlighted] : query)
    } else if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault(); setHighlighted(i => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault(); setHighlighted(i => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Backspace' && !query && value.length) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-coral">
        {value.map(name => (
          <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light text-sm font-medium pl-3 pr-1.5 py-1">
            {name}
            <button type="button" onClick={() => onChange(value.filter(v => v !== name))}
              aria-label={`Αφαίρεση ${name}`}
              className="w-5 h-5 rounded-full hover:bg-coral/20 flex items-center justify-center leading-none">×</button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(-1) }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={value.length ? '' : 'Γράψε ένα όνομα…'}
          autoComplete="off"
          className="flex-1 min-w-[10rem] bg-transparent px-1 py-1.5 text-charcoal dark:text-gray-100 focus:outline-none"
        />
      </div>

      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          {matches.map((name, i) => (
            <button
              key={name}
              type="button"
              onMouseDown={e => { e.preventDefault(); add(name) }}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full text-left px-4 py-2 text-sm ${
                i === highlighted
                  ? 'bg-coral/10 text-coral dark:text-coral-light'
                  : 'text-charcoal dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
