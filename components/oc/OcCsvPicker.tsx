'use client'

/**
 * ΔΙΑΛΕΞΕ ΣΤΗΛΕΣ ΚΑΙ ΚΑΤΕΒΑΣΕ — ένα παράθυρο για ΚΑΘΕ εξαγωγή του OC.
 *
 * Το μοτίβο υπήρχε ήδη στο Μητρώο Μελών (OcExportModal) και ήταν καλό· έλειπε
 * παντού αλλού, όπου η εξαγωγή κατέβαζε ό,τι τύχαινε να είναι ορατό. Εδώ
 * βγαίνει το ΚΕΛΥΦΟΣ — ίδια εμφάνιση, ίδιες συντομεύσεις, ίδια συμπεριφορά —
 * και κάθε πίνακας δίνει μόνο τις δικές του στήλες.
 *
 * ΔΕΝ αντικαθιστά το OcExportModal: εκείνο έχει δικό του βάρος (στήλες ανά
 * έτος, που πολλαπλασιάζονται). Μια βεβιασμένη ενοποίηση θα έφερνε τη
 * λογική των ετών σε κάθε άλλη εξαγωγή χωρίς λόγο.
 */

import { useEffect, useMemo, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

export interface CsvPickerColumn {
  key: string
  label: string
  /** Μικρή διευκρίνιση δίπλα στην ετικέτα */
  hint?: string
}

export default function OcCsvPicker({
  isOpen, onClose, title, subtitle, columns, defaultKeys, storageKey,
  rowCount, rowNoun, scopeNote, onDownload,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  columns: CsvPickerColumn[]
  /** Αρχική επιλογή όταν δεν υπάρχει αποθηκευμένη */
  defaultKeys: string[]
  /** Πού θυμόμαστε την επιλογή — ένα κλειδί ανά πίνακα */
  storageKey: string
  rowCount: number
  /** [ενικός, πληθυντικός] π.χ. ['δήλωση', 'δηλώσεις'] */
  rowNoun: [string, string]
  /** Τι ακριβώς εξάγεται — λέγεται ρητά, γιατί δεν είναι πάντα «όλα» */
  scopeNote: string
  onDownload: (keys: string[]) => void
}) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)
  const [picked, setPicked] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const valid = useMemo(() => new Set(columns.map(c => c.key)), [columns])

  // Η προηγούμενη επιλογή επιβιώνει — αλλά μόνο όσες στήλες ΥΠΑΡΧΟΥΝ ακόμη:
  // μια στήλη που καταργήθηκε δεν πρέπει να ζει για πάντα στο localStorage.
  useEffect(() => {
    if (!isOpen) return
    setDone(false)
    let stored: string[] | null = null
    try {
      const s = localStorage.getItem(storageKey)
      if (s) stored = JSON.parse(s)
    } catch { /* ιδιωτική περιήγηση */ }
    const kept = stored?.filter(k => valid.has(k)) ?? []
    setPicked(kept.length ? kept : defaultKeys.filter(k => valid.has(k)))
  }, [isOpen, storageKey, valid, defaultKeys])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const remember = (next: string[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ok */ }
  }
  const set = (next: string[]) => { setPicked(next); remember(next); setDone(false) }
  const toggle = (key: string) =>
    set(picked.includes(key) ? picked.filter(k => k !== key) : [...picked, key])

  // Η ΣΕΙΡΑ ΤΩΝ ΣΤΗΛΩΝ ΕΙΝΑΙ ΤΟΥ ΠΙΝΑΚΑ, όχι της σειράς που τις τσέκαρε ο
  // χρήστης — αλλιώς δύο εξαγωγές με τις ίδιες στήλες θα έβγαζαν άλλη διάταξη.
  const orderedKeys = columns.filter(c => picked.includes(c.key)).map(c => c.key)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="oc-csv-title">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div ref={modalRef} className="relative menu-glass glass-rim rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 menu-glass-dense p-6 border-b border-black/10 dark:border-white/10 rounded-t-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="oc-csv-title" className="text-xl font-bold text-charcoal dark:text-gray-100">{title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle || 'Διάλεξε στήλες — κατεβαίνει αρχείο CSV μόνο με αυτές'}
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
              <button type="button" onClick={() => set(columns.map(c => c.key))}
                className="text-[11px] text-coral hover:underline">Όλες</button>
              <button type="button" onClick={() => set([])}
                className="text-[11px] text-coral hover:underline">Καμία</button>
            </span>
          </div>

          <div className="space-y-1.5 mb-5">
            {columns.map(c => (
              <label key={c.key} className="flex items-center gap-2.5 text-sm text-charcoal dark:text-gray-100 cursor-pointer">
                <input type="checkbox" checked={picked.includes(c.key)} onChange={() => toggle(c.key)}
                  className="accent-[#FF8B6A] w-4 h-4" />
                {c.label}
                {c.hint && <span className="text-xs text-gray-500 dark:text-gray-400">{c.hint}</span>}
              </label>
            ))}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 rounded-2xl menu-glass-dense px-4 py-3">
            <strong className="notranslate">{rowCount}</strong> {rowCount === 1 ? rowNoun[0] : rowNoun[1]} ·{' '}
            <strong className="notranslate">{orderedKeys.length}</strong> {orderedKeys.length === 1 ? 'στήλη' : 'στήλες'}
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{scopeNote}</span>
          </p>

          {done && <p className="text-sm text-green-700 dark:text-green-300 mt-3">Το αρχείο κατέβηκε ✓</p>}

          <div className="flex items-center gap-3 mt-6">
            <button type="button" disabled={orderedKeys.length === 0 || rowCount === 0}
              onClick={() => { onDownload(orderedKeys); setDone(true) }}
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
