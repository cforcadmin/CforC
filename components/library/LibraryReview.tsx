'use client'

import { useEffect, useState } from 'react'
import LibraryFileCell from './LibraryFileCell'
import { shortDocType, type LibraryItem } from '@/lib/library'

/**
 * Ο πάγκος του Βιβλιοθηκάριου: η νέα καταχώρηση δίπλα σε αυτή που μοιάζει.
 *
 * Δίπλα-δίπλα και όχι η μία μετά την άλλη: η απόφαση είναι «ίδιο ή όχι» και
 * παίρνεται με σύγκριση. Αν χρειαστεί κύλιση για να δεις το δεύτερο, η
 * σύγκριση γίνεται από μνήμης.
 */

interface PendingItem extends LibraryItem {
  submitterEmail: string | null
  existing: LibraryItem | null
}

const FIELDS: Array<{ label: string; get: (i: LibraryItem) => string }> = [
  { label: 'Έτος', get: i => String(i.year ?? '—') },
  { label: 'Θεματική', get: i => i.theme || '—' },
  { label: 'Υποθεματική', get: i => i.subthemes.join(', ') || '—' },
  { label: 'Είδος', get: i => shortDocType(i.docType) || '—' },
  { label: 'Γλώσσα', get: i => i.language || '—' },
  { label: 'Πηγή', get: i => i.sourceUrl || '—' },
  { label: 'Καταχώρηση', get: i => i.submittedBy || '—' },
]

export default function LibraryReview({ focusId, onDone, onClose }: {
  focusId?: string | null
  onDone: () => void
  onClose: () => void
}) {
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/library/review')
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'Αποτυχία φόρτωσης')
        const j = await r.json()
        if (!alive) return
        const list: PendingItem[] = j.items || []
        setItems(list)
        // Ο σύνδεσμος του email δείχνει σε συγκεκριμένο τεκμήριο
        const at = focusId ? list.findIndex(i => i.documentId === focusId) : -1
        setIdx(at >= 0 ? at : 0)
      } catch (err: any) {
        if (alive) setError(err?.message || 'Αποτυχία φόρτωσης')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [focusId])

  const current = items[idx]

  async function decide(action: 'approve' | 'reject') {
    if (!current) return
    setBusy(action); setError(null)
    try {
      const r = await fetch('/api/library/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: current.documentId, action, reason: reason.trim() || undefined }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) throw new Error(j?.error || 'Η ενέργεια απέτυχε')
      const rest = items.filter(i => i.documentId !== current.documentId)
      setItems(rest)
      setIdx(i => Math.min(i, Math.max(0, rest.length - 1)))
      setReason('')
      onDone()
      if (rest.length === 0) onClose()
    } catch (err: any) {
      setError(err?.message || 'Απρόσμενο σφάλμα')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="lib-review-title"
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-4xl w-full p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 id="lib-review-title" className="text-2xl font-bold text-charcoal dark:text-gray-100">
            Έλεγχος διπλοεγγραφής
          </h3>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
        </div>

        {loading ? (
          <p className="text-base text-gray-400 py-10">Φόρτωση…</p>
        ) : !current ? (
          <div className="py-12 text-center">
            <p className="text-lg font-bold text-charcoal dark:text-gray-100 mb-1">Καμία εκκρεμότητα</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Δεν υπάρχει τεκμήριο σε αναμονή ελέγχου.</p>
          </div>
        ) : (
          <>
            <p className="text-base text-gray-600 dark:text-gray-300 mb-6">
              <span className="notranslate">{idx + 1}</span> από <span className="notranslate">{items.length}</span> σε αναμονή.
              Είναι το ίδιο τεκμήριο με αυτό που υπάρχει ήδη;
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: 16 }} className="mb-6">
              <Card item={current} tone="new" heading="Νέα καταχώρηση" />
              {current.existing
                ? <Card item={current.existing} tone="old" heading="Υπάρχει ήδη" />
                : <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-5 flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Το αρχικό τεκμήριο δεν βρέθηκε — μπορεί να διαγράφηκε στο μεταξύ.
                    </p>
                  </div>}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="lib-reason">
                Σημείωση προς το μέλος <span className="font-normal text-gray-400">(προαιρετική, μπαίνει στο email απόρριψης)</span>
              </label>
              <input id="lib-reason" value={reason} onChange={e => setReason(e.target.value)}
                style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="π.χ. Υπάρχει ήδη η έκδοση του 2025 με το ίδιο περιεχόμενο" />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <button type="button" onClick={() => decide('approve')} disabled={!!busy}
                className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
                {busy === 'approve' ? 'Έγκριση…' : 'Έγκριση — δεν είναι διπλό'}
              </button>
              <button type="button" onClick={() => decide('reject')} disabled={!!busy}
                className="px-6 py-2.5 rounded-full border-2 border-red-500 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40">
                {busy === 'reject' ? 'Απόρριψη…' : 'Απόρριψη ως διπλό'}
              </button>
              {items.length > 1 && (
                <button type="button" onClick={() => { setIdx(i => (i + 1) % items.length); setReason('') }}
                  disabled={!!busy}
                  className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
                  Επόμενο →
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Η απόρριψη στέλνει email στο μέλος και μεταφέρει το αρχείο στον κάδο του Drive — επαναφέρεται αν χρειαστεί.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Card({ item, tone, heading }: { item: LibraryItem; tone: 'new' | 'old'; heading: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${
      tone === 'new'
        ? 'border-coral bg-coral/5 dark:bg-coral/10'
        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40'
    }`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{heading}</p>
      <p className="text-base font-bold text-charcoal dark:text-gray-100 mb-2 leading-snug">{item.title}</p>
      {item.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed"
          style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.description}
        </p>
      )}
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }} className="text-sm">
        {FIELDS.map(f => (
          <div key={f.label} style={{ display: 'contents' }}>
            <dt className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{f.label}</dt>
            <dd className="text-charcoal dark:text-gray-200 break-words">{f.get(item)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <LibraryFileCell fileId={item.fileId} fileName={item.fileName} mimeType={item.mimeType} />
      </div>
    </div>
  )
}
