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

/**
 * Πού κολλά η δεξιά στήλη όταν κυλάς.
 *
 * ΜΕΤΡΗΜΕΝΟ, όχι στο περίπου: η γυάλινη λωρίδα του OC κάθεται στα 5.1rem
 * (81,6px) όταν η σελίδα έχει κυλήσει, και το ύψος της είναι 48px — τα
 * chips είναι text-xs με py-1.5 (16+12=28) μέσα σε pt-3/pb-2 (12+8=20).
 * Άρα τελειώνει στα ~130px. Το παλιό top-24 (96px) έκρυβε 34px της κάρτας
 * κάτω από τη λωρίδα. Τα 144 αφήνουν μια ανάσα από κάτω της.
 *
 * Η ΙΔΙΑ τιμή ορίζει και το ύψος της «Μεγέθυνσης» — αν αλλάξει εδώ,
 * αλλάζει παντού, χωρίς δεύτερο νούμερο να ξεμείνει πίσω.
 */
export const PV_STICKY_TOP = 144

/** Το φυσικό πλάτος της στήλης, ΙΔΙΟ με το 30rem του grid-cols στο JSX.
 *  Χρειάζεται για να ξεχωρίσουμε τι χωρά ΜΕΣΑ στο πλέγμα (και άρα
 *  μετακινεί τα μπλοκ) από το τι ξεχειλίζει δεξιά στο περιθώριο. */
export const PV_BASE_TRACK = 480

export interface PreviewSize {
  w: number | undefined
  h: number
  /** Πόσο έχει σπρωχτεί ΑΡΙΣΤΕΡΑ ολόκληρος ο συνθέτης, σε px. Η δεξιά άκρη
   *  της προεπισκόπησης μένει καρφωμένη· μεγαλώνοντας προς τα αριστερά,
   *  τα μπλοκ του γράμματος μετακινούνται στο αχρησιμοποίητο περιθώριο
   *  της σελίδας αντί να στριμώχνονται. */
  l: number
  setW: (w: number) => void
  setH: (h: number) => void
  setL: (l: number) => void
  /** Γράψιμο στον server — στο ΤΕΛΟΣ του συρσίματος, όχι σε κάθε κίνηση.
   *  Παίρνει ΡΗΤΑ τις τελικές τιμές: το σύρσιμο τελειώνει πριν προλάβει η
   *  React να ξανασχεδιάσει, οπότε μια persist() χωρίς ορίσματα θα έγραφε
   *  το μέγεθος ΠΡΙΝ το σύρσιμο. */
  persist: (next?: { w?: number; h?: number; l?: number }) => void
  hasCustom: boolean
  reset: () => void
}

export function usePreviewSize(defaultH: number): PreviewSize {
  const [w, setW] = useState<number | undefined>(undefined)
  const [h, setH] = useState(defaultH)
  const [l, setL] = useState(0)
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
        if (saved?.l) setL(saved.l)
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

  const persist = useCallback((explicit?: { w?: number; h?: number; l?: number }) => {
    const useW = explicit?.w ?? w
    const useH = explicit?.h ?? h
    const useL = explicit?.l ?? l
    // Μόνο ό,τι χωρά στα όρια της διαδρομής — τα υπόλοιπα απλώς δεν γράφονται.
    // Το `l` κάτω από 40 το κόβει το cleanWidths· μικρή σπρωξιά δεν σώζεται,
    // που είναι αμελητέο μπροστά στο να μην αγγίξουμε καθόλου τη διαδρομή.
    const next: { w?: number; h?: number; l?: number } = {}
    if (useW && useW <= PV_MAX_STORED) next.w = Math.round(useW)
    if (useH && useH <= PV_MAX_STORED) next.h = Math.round(useH)
    if (useL && useL <= PV_MAX_STORED) next.l = Math.round(useL)
    if (Object.keys(next).length) write(next)
  }, [w, h, l, write])

  const reset = useCallback(() => {
    setW(undefined)
    setH(defaultH)
    setL(0)
    write({})
  }, [defaultH, write])

  return {
    w, h, l, setW, setH, setL, persist, reset,
    hasCustom: loaded && (w !== undefined || h !== defaultH || l !== 0),
  }
}
