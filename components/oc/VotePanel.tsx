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
  /** IT/Admin: η ψήφος οριστικοποιεί την απόφαση αμέσως */
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

  /**
   * ΤΑ ΚΟΥΜΠΙΑ ΜΕΝΟΥΝ ΜΕΤΑ ΤΗΝ ΨΗΦΟ — ΚΑΙ ΤΩΡΑ ΤΟ ΛΕΝΕ.
   *
   * Η διαδρομή γράφει `votes[memberId] = …`, δηλαδή ΑΝΤΙΚΑΘΙΣΤΑ την
   * προηγούμενη ψήφο — όσο η αίτηση είναι «submitted»· μόλις κριθεί,
   * απαντά 409. Ο Γιώργος ψήφισε, είδε τα κουμπιά ακόμη εκεί και ρώτησε αν
   * αλλάζει η ψήφος: η συμπεριφορά ήταν σωστή, η οθόνη σιωπηλή (16/10/2026).
   *
   * Το λύνουν το ✓ με το δαχτυλίδι στη δική σου ψήφο, η επιβεβαίωση που
   * γίνεται «Αλλαγή;» όταν πατάς το άλλο, και μία σύντομη γραμμή από κάτω.
   *
   * ΟΙ ΕΤΙΚΕΤΕΣ ΜΕΝΟΥΝ ΚΟΝΤΕΣ. Πρώτη δοκιμή έγραφε «Αλλαγή σε Απόρριψη» και
   * η εξήγηση έπιανε δύο γραμμές: η στήλη παίρνει το πλάτος της από τα
   * κουμπιά, οπότε φάρδυνε, έσπρωξε το όνομα και κατέβασε το «Έχουν
   * ψηφίσει». Η πληροφορία χωρά αλλού — στο title και στη γραμμή από κάτω.
   */
  const voteBtn = (vote: 'approve' | 'reject', label: string, cls: string, confirmCls: string) => {
    const mine = localVote === vote
    const changing = !!localVote && !mine
    return (
      <button
        type="button"
        disabled={busy}
        aria-pressed={mine}
        title={mine
          ? 'Αυτή είναι η ψήφος σου. Μπορείς να την αλλάξεις όσο η αίτηση είναι σε εκκρεμότητα.'
          : changing ? `Αλλάζει την ψήφο σου σε «${label}»` : undefined}
        onClick={() => cast(vote)}
        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors disabled:opacity-50 ${
          confirming === vote ? confirmCls : cls
        } ${mine ? 'ring-2 ring-offset-2 ring-charcoal dark:ring-white dark:ring-offset-gray-900' : ''}`}
      >
        {confirming === vote
          ? (changing ? 'Αλλαγή; Πάτησε ξανά' : 'Σίγουρα; Πάτησε ξανά')
          : mine ? `✓ ${label}` : label}
      </button>
    )
  }

  return (
    /* items-center, ΟΧΙ items-end: με δεξιά στοίχιση τα τρία παιδιά
       (κουμπιά, γραμμή ψήφου, ποιοι ψήφισαν) έχουν άλλο πλάτος και
       μοιάζουν κεντραρισμένα ΜΟΝΟ όσο το πάνελ κάθεται δεξιά από το
       όνομα. Μόλις η κεφαλίδα στοιβαχτεί σε στήλη, όλα γέρνουν. */
    <div className="flex flex-col items-center gap-3 min-w-0">
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
          Ως IT/Admin, η επιλογή σου οριστικοποιεί την απόφαση για όλους.
        </p>
      )}
      {localVote && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Η ψήφος σου: <strong>{localVote === 'approve' ? 'Έγκριση' : 'Απόρριψη'}</strong>
          {' · '}αλλάζει μέχρι να ολοκληρωθεί η διαδικασία
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
