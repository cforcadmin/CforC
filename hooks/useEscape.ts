'use client'

import { useEffect, useRef } from 'react'

/**
 * Escape κλείνει το πάνω-πάνω ανοιχτό παράθυρο — και ΜΟΝΟ αυτό.
 *
 * Με σκέτους listeners, ένα Escape με τις «Οδηγίες» ανοιχτές ΠΑΝΩ από τη
 * φόρμα θα έκλεινε και τα δύο μαζί: οι listeners τρέχουν με σειρά εγγραφής
 * και δεν ξέρουν ποιος είναι από πάνω. Η στοίβα εδώ το ξέρει — απαντά μόνο
 * όποιος γράφτηκε τελευταίος και είναι ακόμη ενεργός.
 */
const stack: symbol[] = []

export function useEscape(onEscape: () => void, active = true) {
  const handlerRef = useRef(onEscape)
  handlerRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const id = Symbol('escape-layer')
    stack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (stack[stack.length - 1] !== id) return
      e.stopPropagation()
      handlerRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      const i = stack.indexOf(id)
      if (i !== -1) stack.splice(i, 1)
      window.removeEventListener('keydown', onKey)
    }
  }, [active])
}
