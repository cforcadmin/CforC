'use client'

// Εξαγωγή του Μητρώου Μελών — ο χρήστης διαλέγει ΠΟΙΕΣ στήλες θέλει και
// κατεβάζει αρχείο μόνο με αυτές. Εξάγονται οι γραμμές που βλέπει (ίδια
// αναζήτηση και ταξινόμηση με τον πίνακα), όχι όλη η βάση.

import { useEffect, useMemo, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { OcMemberRow } from '@/lib/ocOverview'
import { buildExportFields, buildMembersCsv, countExportColumns } from '@/lib/membersExport'

export default function OcExportModal({ isOpen, onClose, rows, currentYear, years, visibleCols }: {
  isOpen: boolean
  onClose: () => void
  /** Οι γραμμές όπως φιλτραρίστηκαν/ταξινομήθηκαν στον πίνακα */
  rows: OcMemberRow[]
  currentYear: number
  years: number[]
  /** Οι στήλες που είναι ήδη ορατές — αρχική επιλογή */
  visibleCols: string[]
}) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)
  const fields = useMemo(() => buildExportFields(currentYear, years), [currentYear, years])
  const [picked, setPicked] = useState<string[]>([])
  const [done, setDone] = useState(false)

  // Αρχική επιλογή: ό,τι θυμόμαστε από την προηγούμενη φορά, αλλιώς
  // ΑΜ + Όνομα + οι στήλες που βλέπει τώρα
  useEffect(() => {
    if (!isOpen) return
    setDone(false)
    let stored: string[] | null = null
    try {
      const s = localStorage.getItem('oc-export-cols')
      if (s) stored = JSON.parse(s)
    } catch { /* ιδιωτική περιήγηση */ }
    const valid = new Set(fields.map(f => f.key))
    setPicked(
      stored && stored.length ? stored.filter(k => valid.has(k))
        : ['am', 'name', ...visibleCols.filter(k => valid.has(k))],
    )
  }, [isOpen, fields, visibleCols])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const chosen = fields.filter(f => picked.includes(f.key))
  const columnCount = countExportColumns(chosen, years)

  function toggle(key: string) {
    setPicked(p => {
      const next = p.includes(key) ? p.filter(k => k !== key) : [...p, key]
      try { localStorage.setItem('oc-export-cols', JSON.stringify(next)) } catch { /* ok */ }
      return next
    })
    setDone(false)
  }

  function download() {
    // BOM: χωρίς αυτό το Excel διαβάζει τα ελληνικά ως σύμβολα
    const blob = new Blob(['﻿' + buildMembersCsv(rows, chosen, years)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    a.href = url
    a.download = `CforC-μέλη-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="oc-export-title">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div ref={modalRef} className="relative menu-glass glass-rim rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 menu-glass-dense p-6 border-b border-black/10 dark:border-white/10 rounded-t-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="oc-export-title" className="text-xl font-bold text-charcoal dark:text-gray-100">
                Εξαγωγή μελών
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Διάλεξε στήλες — κατεβαίνει αρχείο CSV μόνο με αυτές
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Κλείσιμο">
              <svg className="w-5 h-5 text-charcoal dark:text-gray-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Στήλες προς εξαγωγή</p>
            <span className="flex gap-3">
              <button type="button"
                onClick={() => { const all = fields.map(f => f.key); setPicked(all); setDone(false); try { localStorage.setItem('oc-export-cols', JSON.stringify(all)) } catch { /* ok */ } }}
                className="text-[11px] text-coral hover:underline">Όλες</button>
              <button type="button"
                onClick={() => { setPicked([]); setDone(false) }}
                className="text-[11px] text-coral hover:underline">Καμία</button>
            </span>
          </div>

          <div className="space-y-1.5 mb-5">
            {fields.map(f => (
              <label key={f.key} className="flex items-center gap-2.5 text-sm text-charcoal dark:text-gray-100 cursor-pointer">
                <input type="checkbox" checked={picked.includes(f.key)} onChange={() => toggle(f.key)}
                  className="accent-[#FF8B6A] w-4 h-4" />
                {f.label}
                {f.expandYears && <span className="text-xs text-gray-500 dark:text-gray-400">(μία στήλη ανά έτος)</span>}
              </label>
            ))}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 rounded-2xl menu-glass-dense px-4 py-3">
            <strong className="notranslate">{rows.length}</strong> {rows.length === 1 ? 'μέλος' : 'μέλη'} ·{' '}
            <strong className="notranslate">{columnCount}</strong> {columnCount === 1 ? 'στήλη' : 'στήλες'}
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
              Εξάγεται ό,τι δείχνει τώρα ο πίνακας — με την ίδια αναζήτηση και ταξινόμηση.
            </span>
          </p>

          {done && (
            <p className="text-sm text-green-700 dark:text-green-300 mt-3">Το αρχείο κατέβηκε ✓</p>
          )}

          <div className="flex items-center gap-3 mt-6">
            <button type="button" onClick={download} disabled={picked.length === 0}
              className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Κατέβασμα CSV
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-black/15 dark:border-white/25 text-sm text-charcoal dark:text-gray-200 hover:border-coral">
              Κλείσιμο
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
