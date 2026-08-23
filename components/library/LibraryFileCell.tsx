'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Το κελί «Σύνδεσμος αρχείου».
 *
 * Κλικ → ανοίγει το αρχείο σε νέα καρτέλα. Hover → δείχνει τη διεύθυνση με
 * κουμπί αντιγραφής.
 *
 * Η διεύθυνση που δείχνουμε ΔΕΝ είναι του Drive. Τα αρχεία είναι σκόπιμα
 * «Περιορισμένη πρόσβαση», οπότε σύνδεσμος Drive θα έβγαζε στα μέλη
 * «Ζητήστε πρόσβαση». Αυτή εδώ δουλεύει για κάθε συνδεδεμένο μέλος, και
 * για τον έξω κόσμο οδηγεί στη σύνδεση αντί να παραδίδει το αρχείο.
 */
export default function LibraryFileCell({ fileId, fileName, mimeType }: {
  fileId: string | null
  fileName: string | null
  mimeType: string | null
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [above, setAbove] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  if (!fileId) return <span className="text-gray-400 dark:text-gray-500">—</span>

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/api/library/file/${fileId}`
    : `/api/library/file/${fileId}`

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    // Αν δεν χωράει από κάτω, το βγάζουμε από πάνω: σε τελευταία γραμμή
    // πίνακα το popover θα έβγαινε εκτός οθόνης.
    const r = wrapRef.current?.getBoundingClientRect()
    if (r) setAbove(window.innerHeight - r.bottom < 130)
    setOpen(true)
  }
  const hide = () => { hideTimer.current = setTimeout(() => setOpen(false), 180) }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Κάποιοι browsers αρνούνται το clipboard χωρίς άμεση χειρονομία —
      // η επιλογή του κειμένου είναι η εφεδρεία, όχι σιωπηλή αποτυχία.
      const el = document.getElementById(`liburl-${fileId}`) as HTMLInputElement | null
      el?.select()
    }
  }

  const label = fileName || 'Άνοιγμα αρχείου'
  const isPdf = mimeType === 'application/pdf'

  return (
    <span ref={wrapRef} className="relative inline-flex items-center"
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        title={label}
        className="inline-flex items-center gap-1.5 text-coral hover:text-coral/80 dark:text-coral-light font-medium focus:outline-none focus:ring-2 focus:ring-coral rounded"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          {isPdf
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m4.5-4.5l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" />}
        </svg>
        Άνοιγμα
      </a>

      {open && (
        <span
          className={`absolute left-0 z-40 w-[19rem] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3 ${above ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          onClick={e => e.stopPropagation()}
        >
          <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Σύνδεσμος
          </span>
          <input
            id={`liburl-${fileId}`}
            readOnly
            value={url}
            onClick={e => (e.target as HTMLInputElement).select()}
            className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-charcoal dark:text-gray-100 mb-2"
          />
          <button
            type="button"
            onClick={copy}
            className="w-full px-3 py-1.5 rounded-full bg-coral text-white text-xs font-bold hover:bg-coral/90 transition-colors"
          >
            {copied ? 'Αντιγράφηκε ✓' : 'Αντιγραφή συνδέσμου'}
          </button>
          <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-snug">
            Ανοίγει μόνο για συνδεδεμένα μέλη.
          </span>
        </span>
      )}
    </span>
  )
}
