'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmationModal from '@/components/ConfirmationModal'

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
  /** Ο ενεργός ρόλος που αποφασίζει μόνος του — «IT» ή «Admin» */
  overrideSeatLabel?: string | null
  /** Θέση με δικαίωμα ψήφου που ΕΠΙΣΗΣ κατέχει το μέλος — π.χ. «Ταμίας» */
  votingSeatLabel?: string | null
}

export default function VotePanel({ applicationId, votedSeats, myVote, canOverride, overrideSeatLabel, votingSeatLabel }: VotePanelProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetWarn, setSheetWarn] = useState(false)
  const [localVote, setLocalVote] = useState<'approve' | 'reject' | null>(myVote)
  const [localSeats, setLocalSeats] = useState<string[]>(votedSeats)
  /**
   * ΔΕΥΤΕΡΗ ΕΠΙΒΕΒΑΙΩΣΗ ΓΙΑ IT/ADMIN — παράθυρο, όχι δεύτερο κλικ.
   *
   * 5/11/2026: μέλος με θέσεις IT ΚΑΙ Ταμία πάτησε «Έγκριση» για να ψηφίσει,
   * με ενεργό ρόλο το IT. Η ψήφος αποφάσισε μόνη της, με δύο ψήφους από
   * πέντε, και το γράμμα έγκρισης με τις οδηγίες πληρωμής έφυγε αμέσως. Το
   * «Σίγουρα; Πάτησε ξανά» δεν το έπιασε: είναι ΙΔΙΟ με της απλής ψήφου,
   * άρα δεν λέει ότι εδώ συμβαίνει κάτι άλλο. Η γκρίζα γραμμή από κάτω το
   * έλεγε, αλλά μια γραμμή 11px δεν σταματά χέρι που ξέρει τη διαδρομή.
   */
  const [overrideAsk, setOverrideAsk] = useState<'approve' | 'reject' | null>(null)

  function cast(vote: 'approve' | 'reject') {
    if (confirming !== vote) {
      setConfirming(vote)
      setError(null)
      return
    }
    setConfirming(null)
    // Ως IT/Admin δεν φεύγει ΤΙΠΟΤΑ από εδώ: ανοίγει το παράθυρο
    if (canOverride) { setOverrideAsk(vote); return }
    void send(vote, false)
  }

  async function send(vote: 'approve' | 'reject', confirmOverride: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/oc/applications/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Το confirmOverride στέλνεται ΜΟΝΟ από το παράθυρο· ο server αρνείται
        // καθολική απόφαση χωρίς αυτό
        body: JSON.stringify({ applicationId, vote, ...(confirmOverride && { confirmOverride: true }) }),
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
      {(() => {
        const seat = overrideSeatLabel || 'IT/Admin'
        const approving = overrideAsk === 'approve'
        return (
          <ConfirmationModal
            isOpen={overrideAsk !== null}
            variant={approving ? 'warning' : 'danger'}
            title={approving ? `Έγκριση για όλους, ως ${seat};` : `Απόρριψη για όλους, ως ${seat};`}
            message={`Ενεργείς ως ${seat}. Αυτό δεν μετράει ως μία ψήφος: ${approving ? 'εγκρίνει' : 'απορρίπτει'} την αίτηση αμέσως, χωρίς να ψηφίσουν τα υπόλοιπα μέλη του ΔΣ.`}
            confirmText={approving ? 'Έγκριση για όλους' : 'Απόρριψη για όλους'}
            cancelText="Ακύρωση"
            onCancel={() => setOverrideAsk(null)}
            onConfirm={() => { const v = overrideAsk; setOverrideAsk(null); if (v) void send(v, true) }}
          >
            <ul className="space-y-2 text-sm text-left text-charcoal dark:text-gray-200 list-disc pl-5">
              {approving && (
                <li>Το <strong>email έγκρισης με τις οδηγίες πληρωμής</strong> φεύγει αμέσως προς τον άνθρωπο που έκανε την αίτηση. Δεν ανακαλείται.</li>
              )}
              <li>Η γραμμή στο Μητρώο μετακινείται στα {approving ? 'ΕΓΚΕΚΡΙΜΕΝΑ' : 'ΜΗ ΕΓΚΕΚΡΙΜΕΝΑ'}.</li>
              <li>
                {localSeats.length
                  ? <>Έχουν ψηφίσει ως τώρα: <strong>{localSeats.join(', ')}</strong>.</>
                  : <>Δεν έχει ψηφίσει κανείς ακόμη.</>}
              </li>
              {votingSeatLabel && (
                <li>
                  Αν ήθελες απλώς να <strong>ψηφίσεις ως {votingSeatLabel}</strong>: πάτησε «Ακύρωση», άλλαξε
                  τον ενεργό ρόλο σου σε {votingSeatLabel} και ψήφισε από εκεί.
                </li>
              )}
            </ul>
          </ConfirmationModal>
        )
      })()}
    </div>
  )
}
