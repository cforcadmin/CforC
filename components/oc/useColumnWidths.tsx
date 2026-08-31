'use client'

// Ρυθμιζόμενο πλάτος στηλών για ΚΑΘΕ πίνακα του OC.
//
// Ένας μηχανισμός, ένα σημείο αποθήκευσης: το πλάτος κάθε στήλης ζει στον
// server (OcPrefs του μέλους), οπότε ακολουθεί τον άνθρωπο σε κάθε συσκευή
// και επιβιώνει καθαρισμού του browser. Η αποθήκευση γίνεται στο ΤΕΛΟΣ του
// συρσίματος, όχι σε κάθε κίνηση του ποντικιού.

import { useCallback, useEffect, useRef, useState } from 'react'

/** Μοιράζεται από όλους τους πίνακες: μία φόρτωση ανά περιήγηση */
let cache: Record<string, Record<string, number>> | null = null
let inflight: Promise<void> | null = null

async function ensureLoaded(): Promise<void> {
  if (cache) return
  if (!inflight) {
    inflight = fetch('/api/oc/ui-prefs')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { cache = (d?.colWidths as Record<string, Record<string, number>>) || {} })
      .catch(() => { cache = {} })
      .finally(() => { inflight = null })
  }
  await inflight
}

const MIN_W = 60
const MAX_W = 900

export interface ColumnWidths {
  /** Πλάτος σε px, ή undefined αν δεν έχει οριστεί (αυτόματο) */
  width: (key: string) => number | undefined
  /** Χειριστήριο συρσίματος για την κεφαλίδα της στήλης */
  ResizeHandle: (props: { colKey: string }) => React.ReactElement
  /** Επαναφορά όλων των στηλών ΑΥΤΟΥ του πίνακα */
  resetWidths: () => void
  hasCustom: boolean
}

export function useColumnWidths(tableId: string): ColumnWidths {
  const [widths, setWidths] = useState<Record<string, number>>({})
  const dragging = useRef<{ key: string; startX: number; startW: number } | null>(null)

  useEffect(() => {
    let alive = true
    ensureLoaded().then(() => { if (alive && cache?.[tableId]) setWidths(cache[tableId]) })
    return () => { alive = false }
  }, [tableId])

  const persist = useCallback((next: Record<string, number>) => {
    cache = { ...(cache || {}), [tableId]: next }
    fetch('/api/oc/ui-prefs', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colWidths: { [tableId]: next } }), keepalive: true,
    }).catch(() => { /* μη κρίσιμο: το πλάτος είναι διακοσμητικό */ })
  }, [tableId])

  const onDown = useCallback((key: string) => (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault(); e.stopPropagation()
    const th = (e.currentTarget.closest('th') || e.currentTarget.parentElement) as HTMLElement | null
    const startW = widths[key] ?? th?.getBoundingClientRect().width ?? 120
    dragging.current = { key, startX: e.clientX, startW: Math.round(startW) }

    const move = (ev: MouseEvent) => {
      const d = dragging.current
      if (!d) return
      const w = Math.min(MAX_W, Math.max(MIN_W, d.startW + (ev.clientX - d.startX)))
      setWidths(prev => ({ ...prev, [d.key]: w }))
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      const d = dragging.current
      dragging.current = null
      if (d) setWidths(prev => { persist(prev); return prev })
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [widths, persist])

  /** Πληκτρολόγιο: ← → αλλάζουν πλάτος κατά 16px — χωρίς ποντίκι */
  const onKey = useCallback((key: string) => (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setWidths(prev => {
      const cur = prev[key] ?? 120
      const next = { ...prev, [key]: Math.min(MAX_W, Math.max(MIN_W, cur + (e.key === 'ArrowRight' ? 16 : -16))) }
      persist(next)
      return next
    })
  }, [persist])

  const ResizeHandle = useCallback(({ colKey }: { colKey: string }) => (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="Αλλαγή πλάτους στήλης"
      tabIndex={0}
      onMouseDown={onDown(colKey)}
      onKeyDown={onKey(colKey)}
      onClick={e => e.stopPropagation()}
      className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      style={{ touchAction: 'none' }}
    >
      <span className="block h-full w-px mx-auto bg-coral" aria-hidden="true" />
    </span>
  ), [onDown, onKey])

  const resetWidths = useCallback(() => {
    setWidths({})
    persist({})
  }, [persist])

  return {
    width: (key: string) => widths[key],
    ResizeHandle,
    resetWidths,
    hasCustom: Object.keys(widths).length > 0,
  }
}
