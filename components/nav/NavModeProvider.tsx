'use client'

// ΕΝΑΣ φορέας αλήθειας για το στυλ μενού, στη ρίζα του layout: όλα τα
// components (headers, flyout, σελίδες, λωρίδες, footer) διαβάζουν το ΙΔΙΟ
// React state — είναι αδύνατο πια ο επιλογέας να δείχνει «Modern» ενώ η
// σελίδα δείχνει το Cool σώμα (το bug της 28/8: κάθε component διάβαζε το
// localStorage μόνο του, με δικό του χρονισμό hydration, και μπορούσαν να
// διαφωνούν). Ο provider επιζεί των πλοηγήσεων, οπότε ούτε αναβοσβήνει
// στυλ στις αλλαγές σελίδας.

import { createContext, useContext, useEffect, useState } from 'react'
import type { NavMode } from './navItems'

const KEY = 'cforc-nav-mode'

const NavModeContext = createContext<{ mode: NavMode; setMode: (m: NavMode) => void }>({
  mode: 'modern',
  setMode: () => {},
})

export function NavModeProvider({ children }: { children: React.ReactNode }) {
  // SSR/πρώτο render: προεπιλογή — η αποθηκευμένη επιλογή εφαρμόζεται στο
  // mount, ΜΙΑ φορά για όλη τη ζωή της εφαρμογής (ο provider δεν ξαναμπαίνει)
  const [mode, setModeState] = useState<NavMode>('modern')

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v === 'classic' || v === 'cool') setModeState(v)
    } catch { /* κρατά την προεπιλογή */ }
  }, [])

  const setMode = (m: NavMode) => {
    setModeState(m)
    try { localStorage.setItem(KEY, m) } catch { /* το state ισχύει ούτως ή άλλως */ }
  }

  return <NavModeContext.Provider value={{ mode, setMode }}>{children}</NavModeContext.Provider>
}

export function useNavModeContext() {
  return useContext(NavModeContext)
}
