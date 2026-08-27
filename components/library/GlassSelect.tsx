'use client'

import { useEffect, useRef, useState } from 'react'
import { useEscape } from '@/hooks/useEscape'

/**
 * Το κοινό «γυάλινο» dropdown μίας επιλογής — η αισθητική που χτίσαμε για
 * το φίλτρο πεδίων, ως επαναχρησιμοποιήσιμο χειριστήριο.
 *
 * Αντικαθιστά τα native <select>: το ανοιχτό μενού τους το ζωγραφίζει το
 * λειτουργικό και δεν ομοιογενοποιείται — άλλο σε Mac, άλλο σε Windows,
 * και πάντα διαφορετικό από τα δικά μας πάνελ. Συνειδητό κόστος: χάνεται
 * ο native τροχός επιλογής στα κινητά — αποδεκτό για σελίδα μελών με
 * μικρές λίστες.
 *
 * Οι μηχανισμοί διάταξης inline — οι κλάσεις έχουν αποτύχει ξανά εδώ.
 */

export interface GlassOption { value: string; label: string }

export default function GlassSelect({
  value, onChange, options, placeholder, ariaLabel,
  clearable = false, variant = 'pill', id,
}: {
  value: string
  onChange: (v: string) => void
  options: GlassOption[]
  placeholder: string
  ariaLabel?: string
  /** true στη σειρά φίλτρων: με τιμή, το κουμπί γεμίζει και δείχνει × */
  clearable?: boolean
  /** pill = στρογγυλό h-9 (φίλτρα) · field = σαν πεδίο φόρμας */
  variant?: 'pill' | 'field'
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEscape(() => { setOpen(false); triggerRef.current?.focus() }, open)

  // Η επιλεγμένη γραμμή στο οπτικό πεδίο μόλις ανοίξει
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open])

  const selected = options.find(o => o.value === value) || null
  const filled = clearable && !!value

  // Ίδιο σήμα με το φίλτρο πεδίων: κοραλί δαχτυλίδι όσο το μενού είναι ανοιχτό
  const openRing = open ? 'ring-2 ring-coral ' : ''
  const trigger = variant === 'pill'
    ? `${openRing}h-9 rounded-full pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-coral text-left border transition-colors ${
        filled
          ? 'border-charcoal dark:border-gray-100 bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100'
      }`
    : `${openRing}rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 text-left focus:outline-none focus:ring-2 focus:ring-coral`

  // Πρώτο γράμμα → άλμα στην επόμενη επιλογή που αρχίζει έτσι (όπως το native)
  function typeAhead(e: React.KeyboardEvent) {
    if (e.key.length !== 1 || !/\p{L}|\p{N}/u.test(e.key)) return
    const k = e.key.toLocaleLowerCase('el')
    const start = Math.max(0, options.findIndex(o => o.value === value) + 1)
    const seq = [...options.slice(start), ...options.slice(0, start)]
    const hit = seq.find(o => o.label.toLocaleLowerCase('el').startsWith(k))
    if (hit) onChange(hit.value)
  }

  return (
    <div style={{ position: 'relative', display: variant === 'field' ? 'block' : 'inline-block', width: variant === 'field' ? '100%' : undefined, minWidth: 0 }}>
      <button
        ref={triggerRef} type="button" id={id}
        onClick={() => setOpen(v => !v)} onKeyDown={typeAhead}
        aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel || placeholder}
        className={trigger}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', paddingRight: '2rem', position: 'relative', cursor: 'pointer' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? selected.label : placeholder}
        </span>
        {filled ? (
          <span
            role="button" tabIndex={0} aria-label="Καθαρισμός φίλτρου"
            onClick={e => { e.stopPropagation(); onChange('') }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange('') } }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 dark:bg-gray-900/20 hover:bg-white hover:text-charcoal dark:hover:bg-gray-900 dark:hover:text-gray-100 text-white/80 dark:text-gray-900/80 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <span aria-hidden="true" className="text-gray-400 text-[10px]"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>▼</span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setOpen(false)} aria-hidden="true" />
          {/* Πάνω στο κουμπί, όπως το native menu και το φίλτρο πεδίων */}
          <div ref={listRef} role="listbox" aria-label={ariaLabel || placeholder}
            className="menu-glass-dense glass-rim rounded-xl py-1.5"
            style={{ position: 'absolute', top: -6, left: -6, minWidth: 'calc(100% + 12px)', maxWidth: '20rem', maxHeight: 260, overflowY: 'auto', zIndex: 56 }}>
            {[{ value: '', label: placeholder }, ...options].map(o => {
              const on = o.value === value
              return (
                <button key={o.value || '∅'} type="button" role="option" aria-selected={on}
                  onClick={() => { onChange(o.value); setOpen(false); triggerRef.current?.focus() }}
                  className={`text-sm ${on ? 'menu-row-on' : 'menu-row-off text-charcoal dark:text-gray-100'}`}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box', textAlign: 'left', border: 'none', background: on ? undefined : 'none', padding: '6px 12px 6px 32px', position: 'relative', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span aria-hidden="true" style={{ position: 'absolute', left: 12, fontSize: 11 }}>{on ? '✓' : ''}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
