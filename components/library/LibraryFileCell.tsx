'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Το κελί «Σύνδεσμος αρχείου».
 *
 * Κλικ → ανοίγει το αρχείο σε νέα καρτέλα. Hover → δείχνει τη διεύθυνση με
 * κουμπί αντιγραφής.
 *
 * Η διεύθυνση ΔΕΝ είναι του Drive. Τα αρχεία είναι σκόπιμα «Περιορισμένη
 * πρόσβαση», οπότε σύνδεσμος Drive θα έβγαζε στα μέλη «Ζητήστε πρόσβαση».
 * Αυτή δουλεύει για κάθε συνδεδεμένο μέλος και για τον έξω κόσμο οδηγεί
 * στη σύνδεση αντί να παραδίδει το αρχείο.
 *
 * ΓΙΑΤΙ position:fixed ΚΑΙ ΟΧΙ absolute: ο πίνακας ζει μέσα σε δοχείο με
 * overflow-x-auto, και ένα overflow ancestor ΚΟΒΕΙ τα absolute παιδιά του.
 * Το popover εμφανιζόταν μισό, κομμένο στο περίγραμμα του πίνακα. Με fixed
 * βγαίνει από κάθε τέτοιο δοχείο· τις συντεταγμένες τις υπολογίζουμε από
 * το ίδιο το κουμπί.
 */
export default function LibraryFileCell({ fileId, fileName, mimeType }: {
  fileId: string | null
  fileName: string | null
  mimeType: string | null
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PANEL_W = 304
  const PANEL_H = 190

  const place = useCallback(() => {
    const r = anchorRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom > PANEL_H + 12
    setPos({
      top: below ? r.bottom + 8 : r.top - PANEL_H - 8,
      // να μη βγει από τη δεξιά άκρη σε στενή οθόνη
      left: Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8)),
    })
  }, [])

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  // Με fixed, το popover δεν ακολουθεί το scroll — το κλείνουμε αντί να
  // το αφήσουμε να «κρέμεται» πάνω από άλλη γραμμή.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  if (!fileId) return <span className="text-gray-400 dark:text-gray-500">—</span>

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/api/library/file/${fileId}`
    : `/api/library/file/${fileId}`

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    place()
    setOpen(true)
  }
  const hide = () => { hideTimer.current = setTimeout(() => setOpen(false), 200) }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      const el = document.getElementById(`liburl-${fileId}`) as HTMLInputElement | null
      el?.select()
    }
  }

  const isPdf = mimeType === 'application/pdf'

  return (
    <>
      <a
        ref={anchorRef}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label={`Άνοιγμα: ${fileName || 'αρχείο'}`}
        className="inline-flex items-center gap-1.5 text-coral hover:text-coral/80 dark:text-coral-light font-medium focus:outline-none focus:ring-2 focus:ring-coral rounded"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          {isPdf
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m4.5-4.5l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" />}
        </svg>
        Άνοιγμα
      </a>

      {open && pos && (
        <div
          role="dialog"
          aria-label="Σύνδεσμος αρχείου"
          onMouseEnter={show}
          onMouseLeave={hide}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            width: PANEL_W, boxSizing: 'border-box',
            // Στοίβα σε στήλη με inline style: το w-full στο κουμπί ΔΕΝ
            // εφαρμοζόταν και το κουμπί καθόταν δίπλα στο πεδίο, μισό έξω
            // από το πλαίσιο. Τρίτη φορά που κλάση διάταξης δεν φτάνει στο
            // στοιχείο σε αυτό το project — η δομή μπαίνει inline.
            display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8,
            zIndex: 60,
          }}
          className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-2xl p-3"
        >
          {fileName && (
            <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              className="text-xs font-medium text-charcoal dark:text-gray-100" title={fileName}>
              {fileName}
            </p>
          )}
          <p style={{ margin: 0 }} className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Σύνδεσμος
          </p>
          <input
            id={`liburl-${fileId}`}
            readOnly
            value={url}
            onClick={e => (e.target as HTMLInputElement).select()}
            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            className="text-xs font-mono bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-charcoal dark:text-gray-100"
          />
          <button
            type="button"
            onClick={copy}
            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            className="px-3 py-2 rounded-full bg-coral text-white text-xs font-bold hover:bg-coral/90 transition-colors"
          >
            {copied ? 'Αντιγράφηκε ✓' : 'Αντιγραφή συνδέσμου'}
          </button>
          <p style={{ margin: 0 }} className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            Ανοίγει μόνο για συνδεδεμένα μέλη.
          </p>
        </div>
      )}
    </>
  )
}
