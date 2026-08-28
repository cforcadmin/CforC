'use client'

// Το ενεργό στυλ μενού (modern | classic | cool) χωρίς provider στο layout:
// localStorage + custom event, ώστε κάθε instance (headers, footer, λωρίδες,
// σελίδες Σχετικά) να συγχρονίζεται αμέσως στην αλλαγή.
//
// useSyncExternalStore ΚΑΙ ΟΧΙ useState+useEffect: με το effect, κάθε νέα
// σελίδα ξεκινούσε ως «modern» και γύριζε σε «cool» ΜΕΤΑ το mount — στο dev
// (compile-on-demand + hydration) το κενό κρατούσε δευτερόλεπτα και οι
// πλοηγήσεις προσγειώνονταν στο λάθος στυλ σώματος (αναφορά 28/8). Εδώ το
// snapshot διαβάζεται σύγχρονα σε κάθε client render· στο SSR/hydration
// ισχύει το server snapshot («modern») και ο React το διορθώνει αμέσως μετά.

import { useCallback, useSyncExternalStore } from 'react'
import type { NavMode } from './navItems'

const KEY = 'cforc-nav-mode'
const EVT = 'cforc:nav-mode'

function readStored(): NavMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'classic' || v === 'cool' ? v : 'modern'
  } catch {
    return 'modern'
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useNavMode() {
  const mode = useSyncExternalStore(subscribe, readStored, () => 'modern' as NavMode)

  const setMode = useCallback((m: NavMode) => {
    try { localStorage.setItem(KEY, m) } catch {}
    window.dispatchEvent(new Event(EVT))
  }, [])

  return { mode, setMode }
}
