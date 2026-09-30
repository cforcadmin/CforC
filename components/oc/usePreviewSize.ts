'use client'

// Το μέγεθος της προεπισκόπησης του γράμματος, ρυθμιζόμενο και αποθηκευμένο.
//
// ΙΔΙΟ σημείο αποθήκευσης με τα πλάτη των στηλών (useColumnWidths): το
// `colWidths` του OcPrefs, με κλειδί πίνακα `campaigns-preview` και δύο
// «στήλες», `w` και `h`. Κανένα νέο endpoint, καμία νέα ρύθμιση — και το
// «Επαναφορά διάταξης παντού» των Ρυθμίσεων τα σβήνει κιόλας, επειδή
// στέλνει reset:'all' στο ίδιο πεδίο.
//
// ΠΡΟΣΟΧΗ: η διαδρομή κρατά μόνο αριθμούς 40–1200 (cleanWidths). Ό,τι
// ξεπερνά το 1200 ζει στην οθόνη αλλά ΔΕΝ αποθηκεύεται — γι' αυτό η
// «Μεγέθυνση» είναι στιγμιαία κατάσταση και όχι προτίμηση.

import { useCallback, useEffect, useState } from 'react'

const TABLE_ID = 'campaigns-preview'

/** Όρια που δέχεται και η διαδρομή αποθήκευσης */
export const PV_MIN_W = 320
export const PV_MIN_H = 240
export const PV_MAX_STORED = 1200

/** Απόσταση από την άκρη της οθόνης όταν ανοίγει δεξιά */
export const PV_EDGE_GAP = 16

export interface PreviewSize {
  w: number | undefined
  h: number
  setW: (w: number) => void
  setH: (h: number) => void
  /** Γράψιμο στον server — στο ΤΕΛΟΣ του συρσίματος, όχι σε κάθε κίνηση.
   *  Παίρνει ΡΗΤΑ τις τελικές τιμές: το σύρσιμο τελειώνει πριν προλάβει η
   *  React να ξανασχεδιάσει, οπότε μια persist() χωρίς ορίσματα θα έγραφε
   *  το μέγεθος ΠΡΙΝ το σύρσιμο. */
  persist: (next?: { w?: number; h?: number }) => void
  hasCustom: boolean
  reset: () => void
}

export function usePreviewSize(defaultH: number): PreviewSize {
  const [w, setW] = useState<number | undefined>(undefined)
  const [h, setH] = useState(defaultH)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/oc/ui-prefs')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive) return
        const saved = d?.colWidths?.[TABLE_ID]
        if (saved?.w) setW(saved.w)
        if (saved?.h) setH(saved.h)
        setLoaded(true)
      })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  const write = useCallback((next: { w?: number; h?: number }) => {
    fetch('/api/oc/ui-prefs', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colWidths: { [TABLE_ID]: next } }), keepalive: true,
    }).catch(() => { /* μη κρίσιμο: το μέγεθος είναι διακοσμητικό */ })
  }, [])

  const persist = useCallback((explicit?: { w?: number; h?: number }) => {
    const useW = explicit?.w ?? w
    const useH = explicit?.h ?? h
    // Μόνο ό,τι χωρά στα όρια της διαδρομής — τα υπόλοιπα απλώς δεν γράφονται
    const next: { w?: number; h?: number } = {}
    if (useW && useW <= PV_MAX_STORED) next.w = Math.round(useW)
    if (useH && useH <= PV_MAX_STORED) next.h = Math.round(useH)
    if (Object.keys(next).length) write(next)
  }, [w, h, write])

  const reset = useCallback(() => {
    setW(undefined)
    setH(defaultH)
    write({})
  }, [defaultH, write])

  return { w, h, setW, setH, persist, hasCustom: loaded && (w !== undefined || h !== defaultH), reset }
}
