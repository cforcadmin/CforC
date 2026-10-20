'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  usePreviewSize, PV_MIN_W, PV_MIN_H, PV_EDGE_GAP, PV_STICKY_TOP, PV_BASE_TRACK,
  type PreviewSize,
} from './usePreviewSize'

/**
 * Η ΠΡΟΕΠΙΣΚΟΠΗΣΗ — ΜΙΑ ΦΟΡΑ, ΓΙΑ ΟΛΕΣ ΤΙΣ ΟΘΟΝΕΣ.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ (20/10/2026): ο συνθέτης περιεχομένου του site έφτιαξε δική
 * του προεπισκόπηση — δικό του κουτί, δική του κεφαλίδα, δικά του κουμπιά —
 * και χρειάστηκαν τέσσερις γύροι διορθώσεων για να μοιάσει σε κάτι που
 * ΥΠΗΡΧΕ ΗΔΗ και δούλευε. Το ύφος δεν αντιγράφεται· μοιράζεται.
 *
 * ΧΩΡΙΣΜΟΣ: το `usePreviewPane` κρατά τη ΣΥΜΠΕΡΙΦΟΡΑ (μέγεθος, σύρσιμο,
 * μεγέθυνση) και το `OcPreviewPane` τη ΜΟΡΦΗ. Έτσι μια οθόνη μπορεί να
 * βάλει δικά της κουμπιά στην κεφαλίδα χωρίς να ξαναγράψει τις λαβές.
 */

export interface PreviewPane {
  pv: PreviewSize
  asideRef: RefObject<HTMLElement | null>
  twoCol: boolean
  maximized: boolean
  toggleMaximize: () => void
  dragPreview: (axis: 'w' | 'h' | 'l') => (e: React.PointerEvent<HTMLElement>) => void
  keyPreview: (axis: 'w' | 'h' | 'l') => (e: React.KeyboardEvent) => void
  /** Πόσο έχει σπρωχτεί ο συνθέτης αριστερά — το χρειάζεται το πλέγμα γύρω */
  maxPreviewL: () => number
}

export function usePreviewPane(opts: {
  defaultH?: number
  /** Από πού και πάνω υπάρχουν δύο στήλες */
  minWidth?: number
  /**
   * Το στοιχείο που ΜΕΤΑΚΙΝΕΙΤΑΙ αριστερά όταν μεγαλώνει η προεπισκόπηση.
   * Χωρίς αυτό ο άξονας 'l' είναι ανενεργός — μια οθόνη που δεν σπρώχνει
   * τίποτα δεν χρειάζεται τρίτη λαβή.
   */
  sectionRef?: RefObject<HTMLElement | null>
} = {}): PreviewPane {
  const { defaultH = 520, minWidth = 768, sectionRef } = opts
  const pv = usePreviewSize(defaultH)
  const asideRef = useRef<HTMLElement>(null)
  const [maximized, setMaximized] = useState(false)
  const [twoCol, setTwoCol] = useState(false)

  /* Σε μονόστηλη διάταξη το πλάτος το ορίζει η οθόνη: ένα inline width θα
     κόλλαγε τη στήλη σε μέγεθος υπολογιστή μέσα σε κινητό. */
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    const sync = () => setTwoCol(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [minWidth])

  /** Μέχρι πού φτάνει δεξιά: ό,τι μένει ως την άκρη της οθόνης, με μια ανάσα */
  const maxPreviewW = useCallback(() => {
    const el = asideRef.current
    if (!el) return PV_MIN_W
    const left = el.getBoundingClientRect().left
    return Math.max(PV_MIN_W, Math.round(window.innerWidth - left - PV_EDGE_GAP))
  }, [])

  /**
   * Μέχρι πού φτάνει κάτω. ΟΧΙ η τωρινή κορυφή: αν δεν έχει κυλήσει κανείς,
   * το aside κάθεται χαμηλά και η αφαίρεση θα έβγαζε σχεδόν μηδέν — η
   * «Μεγέθυνση» θα ΜΙΚΡΑΙΝΕ την προεπισκόπηση. Μετριέται με την κορυφή που
   * θα έχει ΚΟΛΛΗΜΕΝΟ, δηλαδή με το ύψος που θα δει τελικά το μάτι.
   */
  const maxPreviewH = useCallback(() => {
    const el = asideRef.current
    if (!el) return PV_MIN_H
    const top = Math.min(el.getBoundingClientRect().top, PV_STICKY_TOP)
    return Math.max(PV_MIN_H, Math.round(window.innerHeight - top - 150))
  }, [])

  /** Πόσο ακόμη μπορεί να σπρωχτεί ο συνθέτης ΑΡΙΣΤΕΡΑ, στο αχρησιμοποίητο
   *  περιθώριο. Στο rect.left προστίθεται η ΤΩΡΙΝΗ σπρωξιά, γιατί το rect
   *  τη μετρά ήδη. */
  const maxPreviewL = useCallback(() => {
    const el = sectionRef?.current
    if (!el) return 0
    return Math.max(0, Math.round(el.getBoundingClientRect().left + pv.l - PV_EDGE_GAP))
  }, [sectionRef, pv.l])

  const dragPreview = useCallback((axis: 'w' | 'h' | 'l') => (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const el = asideRef.current
    if (!el) return
    const startX = e.clientX
    const startY = e.clientY
    const startW = Math.round(el.getBoundingClientRect().width)
    const startH = pv.h
    const startL = pv.l
    const limW = maxPreviewW()
    const limL = maxPreviewL()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    /* Η τελική τιμή ταξιδεύει σε ΤΟΠΙΚΗ μεταβλητή και δίνεται ρητά στην
       persist: το state της React δεν έχει προλάβει να ενημερωθεί όταν
       σηκώνεται το δάχτυλο. */
    let finalW = startW
    let finalH = startH
    let finalL = startL

    const move = (ev: PointerEvent) => {
      if (axis === 'w') {
        finalW = Math.min(limW, Math.max(PV_MIN_W, startW + ev.clientX - startX))
        pv.setW(finalW); setMaximized(false)
      } else if (axis === 'l') {
        /* Προς τα ΑΡΙΣΤΕΡΑ μεγαλώνει: το dx είναι αρνητικό, το γυρίζουμε.
           Ό,τι κερδίζει η προεπισκόπηση το παίρνει από το περιθώριο — τα
           μπλοκ ΜΕΤΑΚΙΝΟΥΝΤΑΙ, δεν στενεύουν. */
        finalL = Math.min(limL, Math.max(0, startL + (startX - ev.clientX)))
        finalW = Math.max(PV_MIN_W, startW + (finalL - startL))
        pv.setL(finalL); pv.setW(finalW); setMaximized(false)
      } else {
        finalH = Math.max(PV_MIN_H, startH + ev.clientY - startY)
        pv.setH(finalH)
      }
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      document.body.style.userSelect = ''
      pv.persist(
        axis === 'w' ? { w: finalW }
          : axis === 'l' ? { w: finalW, l: finalL }
            : { h: finalH })
    }
    document.body.style.userSelect = 'none'
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }, [pv, maxPreviewW, maxPreviewL])

  /** Πληκτρολόγιο: τα βέλη αλλάζουν μέγεθος κατά 24px — χωρίς ποντίκι */
  const keyPreview = useCallback((axis: 'w' | 'h' | 'l') => (e: React.KeyboardEvent) => {
    const dec = axis === 'h' ? 'ArrowUp' : axis === 'l' ? 'ArrowRight' : 'ArrowLeft'
    const inc = axis === 'h' ? 'ArrowDown' : axis === 'l' ? 'ArrowLeft' : 'ArrowRight'
    if (e.key !== dec && e.key !== inc) return
    e.preventDefault()
    const step = e.key === inc ? 24 : -24
    const curW = () => pv.w ?? Math.round(asideRef.current?.getBoundingClientRect().width ?? PV_MIN_W)

    if (axis === 'l') {
      const nextL = Math.min(maxPreviewL(), Math.max(0, pv.l + step))
      const nextW = Math.max(PV_MIN_W, curW() + (nextL - pv.l))
      pv.setL(nextL); pv.setW(nextW); setMaximized(false); pv.persist({ w: nextW, l: nextL })
    } else if (axis === 'w') {
      const next = Math.min(maxPreviewW(), Math.max(PV_MIN_W, curW() + step))
      pv.setW(next); setMaximized(false); pv.persist({ w: next })
    } else {
      const next = Math.max(PV_MIN_H, pv.h + step)
      pv.setH(next); pv.persist({ h: next })
    }
  }, [pv, maxPreviewW, maxPreviewL])

  /** «Μεγέθυνση»: όσο πάει δεξιά και κάτω. Δεύτερο πάτημα — στα αρχικά. */
  const toggleMaximize = useCallback(() => {
    if (maximized) { setMaximized(false); pv.reset(); return }
    const l = maxPreviewL()
    const w = maxPreviewW() + l
    const h = maxPreviewH()
    pv.setL(l); pv.setW(w); pv.setH(h); pv.persist({ w, h, l })
    setMaximized(true)
  }, [maximized, pv, maxPreviewW, maxPreviewH, maxPreviewL])

  /* Αν στενέψει το παράθυρο, το αποθηκευμένο πλάτος μπορεί να ξεπερνά την
     οθόνη και να γεννήσει οριζόντια μπάρα κύλισης. Το μαζεύουμε. */
  useEffect(() => {
    if (!twoCol || (pv.w === undefined && pv.l === 0)) return
    const onResize = () => {
      /* Πρώτα η σπρωξιά: σε στενό παράθυρο μπορεί να μην υπάρχει πια
         περιθώριο αριστερά, και τα μπλοκ θα έβγαιναν έξω από την οθόνη. */
      if (pv.l > 0) {
        const limL = maxPreviewL()
        if (pv.l > limL) {
          pv.setW(Math.max(PV_MIN_W, (pv.w ?? PV_MIN_W) - (pv.l - limL)))
          pv.setL(limL)
        }
      }
      const lim = maxPreviewW() + pv.l
      if (pv.w !== undefined && pv.w > lim) pv.setW(lim)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [twoCol, pv, maxPreviewW, maxPreviewL])

  return { pv, asideRef, twoCol, maximized, toggleMaximize, dragPreview, keyPreview, maxPreviewL }
}

/** Το πλάτος της στήλης της προεπισκόπησης, για το πλέγμα γύρω της */
export const previewTrack = (pane: PreviewPane): string =>
  `${Math.min(pane.pv.w ?? PV_BASE_TRACK, PV_BASE_TRACK + pane.pv.l)}px`

const HANDLE = 'absolute cursor-ew-resize touch-none group justify-center hidden md:flex'
const GRIP = 'rounded-full bg-coral/40 group-hover:bg-coral group-focus-visible:bg-coral transition-colors'

/**
 * Το κουτί της προεπισκόπησης: κεφαλίδα με τίτλο και ενέργειες, το πλαίσιο,
 * λεζάντα από κάτω, και οι λαβές αλλαγής μεγέθους στις άκρες.
 *
 * Οι λαβές είναι στη ΜΕΣΗ κάθε άκρης, διακριτικές αλλά ορατές: αν δεν
 * φαίνονται, δεν υπάρχουν. Κρύβονται στη μονόστηλη διάταξη, όπου το πλάτος
 * το ορίζει η οθόνη.
 */
export function OcPreviewPane({
  pane, title = 'ΠΡΟΕΠΙΣΚΟΠΗΣΗ', actions, caption, empty, children, withLeftHandle,
}: {
  pane: PreviewPane
  title?: string
  /** Κουμπιά στην κεφαλίδα — π.χ. αντιγραφή */
  actions?: ReactNode
  caption?: ReactNode
  /** Τι δείχνει όταν δεν υπάρχει ακόμη τίποτα να δει κανείς */
  empty?: ReactNode
  /** Το ίδιο το πλαίσιο· null όταν δεν υπάρχει περιεχόμενο */
  children: ReactNode | null
  withLeftHandle?: boolean
}) {
  const { pv, asideRef, twoCol } = pane
  // Μία μετατροπή στο σύνορο: ο τύπος που γυρίζει το useRef δεν ταιριάζει με
  // το `ref` του JSX όταν δηλώνεται ρητά στη διεπαφή.
  return (
    <aside ref={asideRef as React.Ref<HTMLElement>} className="relative md:sticky min-w-0"
      style={{ top: PV_STICKY_TOP, ...(twoCol && pv.w ? { width: pv.w } : {}) }}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5 sm:p-6 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">{title}</h3>
          {actions}
        </div>
        {children ?? (
          <div className="h-[32rem] rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 grid place-items-center text-sm text-gray-500">
            {empty}
          </div>
        )}
        {caption && <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">{caption}</p>}
      </div>

      {withLeftHandle && (
        <span role="separator" aria-orientation="vertical" aria-label="Πλάτος προεπισκόπησης προς τα αριστερά"
          tabIndex={0} onPointerDown={pane.dragPreview('l')} onKeyDown={pane.keyPreview('l')}
          className={`${HANDLE} top-1/2 -left-1 h-16 w-3 -translate-y-1/2`} style={{ touchAction: 'none' }}>
          <span className={`block h-full w-1 ${GRIP}`} aria-hidden="true" />
        </span>
      )}
      <span role="separator" aria-orientation="vertical" aria-label="Αλλαγή πλάτους προεπισκόπησης"
        tabIndex={0} onPointerDown={pane.dragPreview('w')} onKeyDown={pane.keyPreview('w')}
        className={`${HANDLE} top-1/2 -right-1 h-16 w-3 -translate-y-1/2`} style={{ touchAction: 'none' }}>
        <span className={`block h-full w-1 ${GRIP}`} aria-hidden="true" />
      </span>
      <span role="separator" aria-orientation="horizontal" aria-label="Αλλαγή ύψους προεπισκόπησης"
        tabIndex={0} onPointerDown={pane.dragPreview('h')} onKeyDown={pane.keyPreview('h')}
        className={`${HANDLE} left-1/2 -bottom-1 w-16 h-3 -translate-x-1/2 items-center cursor-ns-resize`}
        style={{ touchAction: 'none' }}>
        <span className={`block w-full h-1 ${GRIP}`} aria-hidden="true" />
      </span>
    </aside>
  )
}
