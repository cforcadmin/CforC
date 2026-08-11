'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Voting bubbles on the application review page (board members only —
 * the page itself is server-gated). Blind voting: shows WHICH roles have
 * voted, never what they voted.
 */

interface VotePanelProps {
  applicationId: string
  /** Ρόλοι που έχουν ήδη ψηφίσει (labels) */
  votedSeats: string[]
  /** Η δική μου καταχωρημένη ψήφος, αν υπάρχει */
  myVote: 'approve' | 'reject' | null
  /** IT/Γραμματεία: η ψήφος οριστικοποιεί την απόφαση αμέσως */
  canOverride: boolean
}

export default function VotePanel({ applicationId, votedSeats, myVote, canOverride }: VotePanelProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetWarn, setSheetWarn] = useState(false)
  const [localVote, setLocalVote] = useState<'approve' | 'reject' | null>(myVote)
  const [localSeats, setLocalSeats] = useState<string[]>(votedSeats)

  async function cast(vote: 'approve' | 'reject') {
    if (confirming !== vote) {
      setConfirming(vote)
      setError(null)
      return
    }
    setConfirming(null)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/oc/applications/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, vote }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Κάτι πήγε στραβά — δοκίμασε ξανά')
        return
      }
      setLocalVote(json.myVote)
      if (Array.isArray(json.votedSeats)) setLocalSeats(json.votedSeats)
      if (json.state !== 'submitted' && json.sheetSynced === false) setSheetWarn(true)
      router.refresh()
    } catch {
      setError('Κάτι πήγε στραβά — δοκίμασε ξανά')
    } finally {
      setBusy(false)
    }
  }

  const voteBtn = (vote: 'approve' | 'reject', label: string, cls: string, confirmCls: string) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => cast(vote)}
      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors disabled:opacity-50 ${
        confirming === vote ? confirmCls : cls
      }`}
    >
      {confirming === vote ? 'Σίγουρα; Πάτησε ξανά' : label}
    </button>
  )

  return (
    <div className="flex flex-col items-end gap-2 min-w-0">
      <div className="flex gap-2">
        {voteBtn(
          'approve', 'Έγκριση',
          'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:hover:bg-green-900/80',
          'bg-green-600 text-white'
        )}
        {voteBtn(
          'reject', 'Απόρριψη',
          'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900/80',
          'bg-red-600 text-white'
        )}
      </div>
      {canOverride && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">
          Ως IT/Γραμματεία, η επιλογή σου οριστικοποιεί την απόφαση για όλους.
        </p>
      )}
      {localVote && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Η ψήφος σου καταχωρήθηκε: <strong>{localVote === 'approve' ? 'Έγκριση' : 'Απόρριψη'}</strong>
        </p>
      )}
      {localSeats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-end">
          <span className="text-[11px] text-gray-400 dark:text-gray-500 self-center">Έχουν ψηφίσει:</span>
          {localSeats.map(s => (
            <span
              key={s}
              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400 text-right">{error}</p>}
      {sheetWarn && (
        <p className="text-xs text-orange-600 dark:text-orange-400 text-right max-w-56">
          Η απόφαση καταχωρήθηκε, αλλά το Μητρώο (Sheet) δεν ενημερώθηκε — μετέφερε τη γραμμή χειροκίνητα.
        </p>
      )}
    </div>
  )
}
