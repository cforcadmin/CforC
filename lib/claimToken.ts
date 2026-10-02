import crypto from 'node:crypto'
import { eventFromSlug, claimWindowOpen } from '@/lib/expenseClaims'
import { athensToday } from '@/lib/events'

/**
 * Ο σύνδεσμος μιας χρήσης, ΜΙΑ φορά γραμμένος.
 *
 * Τον διαβάζουν δύο διαδρομές — η οθόνη που ζητά τα στοιχεία για προσυμπλήρωση
 * και η υποβολή που δημιουργεί το εξοδολόγιο. Αν ο έλεγχος ήταν γραμμένος και
 * στα δύο, η επόμενη αυστηροποίηση θα γινόταν στο ένα: η υποβολή θα δεχόταν
 * ληγμένο διακριτικό που η οθόνη είχε ήδη απορρίψει.
 *
 * ΤΑΥΤΟΤΗΤΑ ΕΔΩ = κατοχή του γραμματοκιβωτίου της δήλωσης. Δεν είναι
 * λογαριασμός, και δεν προσποιείται ότι είναι: γι' αυτό το όνομα και το email
 * έρχονται ΑΠΟ ΤΗ ΔΗΛΩΣΗ και όχι από ό,τι πληκτρολογεί ο χρήστης.
 */

export interface ClaimIdentity {
  registrationId: string
  firstName: string
  lastName: string
  name: string
  email: string
  phone: string
  eventLabel: string
  eventTitle: string
}

type ClaimTokenFailure = 'bad-request' | 'not-found' | 'expired' | 'used' | 'too-early'

export type ClaimTokenResult =
  | { ok: true; identity: ClaimIdentity }
  | { ok: false; reason: ClaimTokenFailure; message: string }

const MESSAGES: Record<ClaimTokenFailure, string> = {
  'bad-request': 'Ο σύνδεσμος δεν είναι έγκυρος.',
  'not-found': 'Ο σύνδεσμος δεν είναι έγκυρος ή ακυρώθηκε. Ζήτα καινούργιον από τη σελίδα του εξοδολογίου.',
  expired: 'Ο σύνδεσμος έληξε. Ζήτα καινούργιον από τη σελίδα του εξοδολογίου.',
  used: 'Ο σύνδεσμος έχει ήδη χρησιμοποιηθεί. Αν χρειάζεσαι άλλον, ζήτα καινούργιον.',
  'too-early': 'Τα εξοδολόγια για τη δράση δεν έχουν ανοίξει ακόμη.',
}

const fail = (reason: ClaimTokenFailure): ClaimTokenResult =>
  ({ ok: false, reason, message: MESSAGES[reason] })

export const hashClaimToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex')

/**
 * Ελέγχει το διακριτικό και επιστρέφει ΠΟΙΟΣ είναι.
 *
 * Το `lookup` δίνεται απ' έξω ώστε η λογική να ελέγχεται χωρίς δίκτυο.
 */
export async function resolveClaimToken(
  slug: string | null | undefined,
  raw: string | null | undefined,
  lookup: (hash: string, slug: string) => Promise<any | null>,
  today = athensToday(),
): Promise<ClaimTokenResult> {
  const ev = eventFromSlug(slug)
  const token = String(raw || '').trim()
  if (!ev || !/^[a-f0-9]{64}$/i.test(token)) return fail('bad-request')
  // Το παράθυρο ελέγχεται ΠΡΙΝ από το διακριτικό: ένα έγκυρο διακριτικό δεν
  // ανοίγει φόρμα που δεν έχει νόημα να συμπληρωθεί.
  if (!claimWindowOpen(slug, today)) return fail('too-early')

  const row = await lookup(hashClaimToken(token), String(slug))
  if (!row) return fail('not-found')
  if (row.ClaimTokenUsedAt) return fail('used')
  const exp = row.ClaimTokenExpiresAt ? Date.parse(String(row.ClaimTokenExpiresAt)) : NaN
  if (!Number.isFinite(exp) || exp < Date.now()) return fail('expired')
  if (row.Status !== 'confirmed') return fail('not-found')

  const first = String(row.FirstName || '').trim()
  const last = String(row.LastName || '').trim()
  return {
    ok: true,
    identity: {
      registrationId: String(row.documentId),
      firstName: first,
      lastName: last,
      name: `${first} ${last}`.trim(),
      email: String(row.Email || '').trim(),
      phone: String(row.Phone || '').trim(),
      eventLabel: ev.label,
      eventTitle: ev.title,
    },
  }
}
