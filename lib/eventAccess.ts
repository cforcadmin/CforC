/**
 * Ποιος περνά στη δήλωση συμμετοχής.
 *
 * Η ΑΠΟΦΑΣΗ είναι καθαρή συνάρτηση, χωρίς cookies και χωρίς δίκτυο, ώστε να
 * δοκιμάζεται ολόκληρη. Η διαδρομή και η σελίδα διαβάζουν τη συνεδρία και
 * ρωτούν ΕΔΩ — δεν κρίνουν μόνες τους.
 *
 * ΤΟ ΚΛΕΙΔΙ: το `Audience` της δράσης είναι ΠΥΛΗ, όχι διακόσμηση. Μια
 * δράση 'member' ΔΕΝ δέχεται ανώνυμη υποβολή — ο έλεγχος γίνεται στον
 * server και ΟΧΙ κρύβοντας ένα κουμπί στην οθόνη.
 */

import type { CforcEvent } from '@/lib/types'
import { registrationClosed, eventPhase, athensToday } from '@/lib/events'

export type EventAccess =
  /** Η δράση πέρασε — καμία δήλωση */
  | { allowed: false; reason: 'past' }
  /** Έκλεισε η προθεσμία */
  | { allowed: false; reason: 'closed' }
  /** Μόνο μέλη, και ο επισκέπτης δεν είναι συνδεδεμένος → σύνδεση */
  | { allowed: false; reason: 'login-required' }
  /** Συνδεδεμένο μέλος → η φόρμα ανοίγει προσυμπληρωμένη */
  | { allowed: true; mode: 'member' }
  /** Ανοιχτή δράση, μη συνδεδεμένος → πρώτα η επιλογή πόρτας */
  | { allowed: true; mode: 'choose' }

export function resolveEventAccess(
  ev: Pick<CforcEvent, 'Audience' | 'StartDate' | 'EndDate' | 'RegistrationDeadline' | 'RegistrationOpen'>,
  isMember: boolean,
  today: string = athensToday(),
): EventAccess {
  // Η σειρά μετράει: μια περασμένη δράση δεν «θέλει σύνδεση», τελείωσε.
  if (eventPhase(ev, today) === 'past') return { allowed: false, reason: 'past' }
  if (registrationClosed(ev, today)) return { allowed: false, reason: 'closed' }
  if (isMember) return { allowed: true, mode: 'member' }
  if (ev.Audience === 'member') return { allowed: false, reason: 'login-required' }
  return { allowed: true, mode: 'choose' }
}
