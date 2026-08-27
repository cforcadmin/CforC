'use client'

// Το ενεργό στυλ μενού (modern | classic | cool) χωρίς provider στο layout:
// localStorage + custom event, ώστε κάθε instance του Navigation (και οι
// γυάλινες λωρίδες profile/OC) να συγχρονίζονται αμέσως στην αλλαγή.

import { useCallback, useEffect, useState } from 'react'
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

export function useNavMode() {
  // SSR αποδίδει πάντα το προεπιλεγμένο (modern)· η αποθηκευμένη επιλογή
  // εφαρμόζεται στο mount — ίδιο μοτίβο με το θέμα.
  const [mode, setModeState] = useState<NavMode>('modern')

  useEffect(() => {
    const sync = () => setModeState(readStored())
    sync()
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setMode = useCallback((m: NavMode) => {
    try { localStorage.setItem(KEY, m) } catch {}
    window.dispatchEvent(new Event(EVT))
  }, [])

  return { mode, setMode }
}
