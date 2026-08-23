'use client'

import { useState } from 'react'

/**
 * Το ενημερωτικό παράθυρο πριν από κάθε καταχώρηση.
 *
 * Δεν είναι διακοσμητικό: πάνω σε αυτά τα σημεία στέκει η θέση του δικτύου
 * για τα πνευματικά δικαιώματα και τα προσωπικά δεδομένα. Το «Να μην
 * εμφανιστεί ξανά» είναι ΞΕΤΣΕΚΑΡΙΣΤΟ εξ ορισμού — η ενημέρωση πρέπει να
 * είναι επιλογή του μέλους να την παρακάμψει, όχι προεπιλογή μας.
 */

export interface Librarian { name: string; until?: string | null }

const POINTS: Array<{ icon: string; title: string; text: string }> = [
  {
    icon: '⚖️',
    title: 'Νομιμότητα του υλικού',
    text: 'Ανέβασε μόνο υλικό που έχεις δικαίωμα να μοιραστείς. Δημόσια διαθέσιμες μελέτες, εκδόσεις με άδεια χρήσης ή δικά σου κείμενα. Μην ανεβάζεις υλικό που αγόρασες με προσωπική άδεια, ούτε σαρωμένα βιβλία.',
  },
  {
    icon: '🎓',
    title: 'Εσωτερική και εκπαιδευτική χρήση',
    text: 'Η βιβλιοθήκη είναι κλειστή στα μέλη του δικτύου και υπηρετεί την ενημέρωση και την εκπαίδευσή τους. Τα αρχεία δεν είναι δημόσια και δεν αναδημοσιεύονται.',
  },
  {
    icon: '🔗',
    title: 'Προτίμησε τον σύνδεσμο του εκδότη',
    text: 'Όπου υπάρχει, βάλε τη σελίδα του εκδότη. Είναι η σωστή απόδοση και δεν εγείρει κανένα ζήτημα δικαιωμάτων. Το αντίγραφο στη βιβλιοθήκη λειτουργεί ως αρχείο ασφαλείας.',
  },
  {
    icon: '🔒',
    title: 'Προσωπικά δεδομένα τρίτων',
    text: 'Μην ανεβάζεις έγγραφα που περιέχουν ονόματα, στοιχεία επικοινωνίας ή φωτογραφίες αναγνωρίσιμων προσώπων χωρίς νόμιμη βάση. Ούτε υλικό εμπιστευτικό ή δεσμευμένο από συμφωνία με εργοδότη ή πελάτη.',
  },
  {
    icon: '👤',
    title: 'Το όνομά σου καταγράφεται',
    text: 'Κάθε τεκμήριο συνδέεται με το μέλος που το καταχώρησε. Το βλέπουν τα υπόλοιπα μέλη και η Ομάδα Συντονισμού. Είσαι υπεύθυνη/υπεύθυνος για ό,τι ανεβάζεις.',
  },
  {
    icon: '📚',
    title: 'Ο ρόλος του Βιβλιοθηκάριου',
    text: 'Κάθε εξάμηνο ένα μέλος αναλαμβάνει Βιβλιοθηκάριος. Εποπτεύει τις καταχωρήσεις και μπορεί να τις επεξεργαστεί ή να τις διαγράψει. Οποιοδήποτε μέλος μπορεί να ζητήσει αφαίρεση τεκμηρίου.',
  },
]

/** Ημερομηνία λήξης θητείας σε αναγνώσιμη μορφή */
function until(d?: string | null): string {
  if (!d) return ''
  const t = Date.parse(d)
  if (Number.isNaN(t)) return ''
  return ` (έως ${new Date(t).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })})`
}

export default function LibraryIntroModal({ onAccept, onClose, librarians = [] }: {
  onAccept: (dontShowAgain: boolean) => void
  onClose: () => void
  librarians?: Librarian[]
}) {
  const [dontShow, setDontShow] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lib-intro-title"
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 id="lib-intro-title" className="text-2xl font-bold text-charcoal dark:text-gray-100">
            Πριν προσθέσεις τεκμήριο
          </h3>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
        </div>
        <p className="text-base text-gray-600 dark:text-gray-300 mb-6">
          Λίγα πράγματα που προστατεύουν εσένα και το δίκτυο.
        </p>

        <ul className="space-y-4 mb-6">
          {POINTS.map(p => (
            <li key={p.title} className="flex gap-3">
              <span aria-hidden="true" className="text-xl leading-none mt-0.5">{p.icon}</span>
              <span>
                <span className="block text-sm font-bold text-charcoal dark:text-gray-100">{p.title}</span>
                <span className="block text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{p.text}</span>
                {p.title === 'Ο ρόλος του Βιβλιοθηκάριου' && librarians.length > 0 && (
                  <span className="block mt-2 rounded-xl bg-gray-50 dark:bg-gray-700/60 px-3 py-2">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      {librarians.length > 1 ? 'Βιβλιοθηκάριοι αυτή τη στιγμή' : 'Βιβλιοθηκάριος αυτή τη στιγμή'}
                    </span>
                    {librarians.map(l => (
                      <span key={l.name} className="block text-sm text-charcoal dark:text-gray-100">
                        {l.name}
                        <span className="text-gray-500 dark:text-gray-400 notranslate">{until(l.until)}</span>
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer mb-6">
          <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} className="accent-[#FF8B6A]" />
          Να μην εμφανιστεί ξανά
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onAccept(dontShow)}
            className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 transition-colors">
            Κατάλαβα, συνέχεια
          </button>
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
            Άκυρο
          </button>
        </div>
      </div>
    </div>
  )
}
