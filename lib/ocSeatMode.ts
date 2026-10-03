import type { OcSeat } from '@/lib/ocRoles'

/**
 * Η έδρα που «φοράει» το IT — και ΤΙ επιτρέπεται να κάνει φορώντας την.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ: το IT βλέπει τα πάντα, αλλά δεν μπορεί να δει τον ιστότοπο
 * ΜΕ ΤΑ ΜΑΤΙΑ άλλης έδρας — κι έτσι ένα σφάλμα «μόνο στον Ταμία» δεν
 * αναπαράγεται. Ο εύκολος δρόμος θα ήταν να προστεθούν όλες οι έδρες στο
 * access.seats· αυτό όμως ΔΕΝ αλλάζει μόνο την οθόνη. Το `seats.includes()`
 * είναι το φράγμα που εμποδίζει πλαστό cookie, και αν ανοίξει, το IT μπορεί
 * να εκδώσει απόδειξη ως Ταμίας και να στείλει γράμμα υπογεγραμμένο από
 * άλλον άνθρωπο — με το όνομά του στα αρχεία.
 *
 * ΔΥΟ ΔΙΑΦΟΡΕΤΙΚΑ ΠΡΑΓΜΑΤΑ, ΔΥΟ ΟΝΟΜΑΤΑ:
 *
 *   view — ΠΡΟΕΠΙΣΚΟΠΗΣΗ. Η οθόνη γίνεται της άλλης έδρας· καμία ενέργεια
 *          που απαιτεί εκείνη την έδρα δεν εκτελείται. Για να ΔΕΙΣ.
 *   act  — ΕΝΕΡΓΕΙΑ ΓΙΑ ΛΟΓΑΡΙΑΣΜΟ ΤΗΣ. Οι ενέργειες εκτελούνται, αλλά
 *          καταγράφονται ΟΝΟΜΑΣΤΙΚΑ: «IT ως Ταμίας». Για να ΚΑΝΕΙΣ, όταν
 *          λείπει ο κάτοχος.
 *
 * Το δεύτερο δεν κρύβεται ποτέ πίσω από το πρώτο: αν μια ενέργεια γίνει,
 * φαίνεται ποιος την έκανε στ' αλήθεια.
 */

export const OC_SEAT_MODE_COOKIE = 'oc-seat-mode'

export type SeatMode = 'own' | 'view' | 'act'

export interface SeatContext {
  /** Οι έδρες που ΟΝΤΩΣ κατέχει ο άνθρωπος */
  realSeats: OcSeat[]
  /** Η έδρα που ζωγραφίζει η οθόνη (δική του ή φορεμένη) */
  activeSeat: OcSeat | null
  /** Η φορεμένη έδρα, αν υπάρχει */
  wearing: OcSeat | null
  mode: SeatMode
}

/** Μόνο το IT φοράει άλλες έδρες. Καμία άλλη έδρα, ποτέ. */
export const canWearSeats = (realSeats: OcSeat[]): boolean => realSeats.includes('it')

/** «it:financer:view» → { seat, mode } · ό,τι δεν αναγνωρίζεται αγνοείται */
export function parseSeatMode(raw: string | null | undefined): { seat: string; mode: SeatMode } | null {
  const parts = String(raw || '').split(':')
  if (parts.length !== 2) return null
  const [seat, mode] = parts
  if (mode !== 'view' && mode !== 'act') return null
  if (!/^[a-z-]{2,20}$/.test(seat)) return null
  return { seat, mode }
}

export const formatSeatMode = (seat: OcSeat, mode: 'view' | 'act'): string => `${seat}:${mode}`

/**
 * Η έδρα και η κατάσταση, από τα cookies.
 *
 * ΣΕΙΡΑ ΠΡΟΤΕΡΑΙΟΤΗΤΑΣ: μια φορεμένη έδρα μετράει ΜΟΝΟ αν ο άνθρωπος έχει
 * δικαίωμα να φοράει έδρες και ΜΟΝΟ αν δεν την κατέχει ήδη — αλλιώς είναι
 * απλώς η έδρα του και δεν χρειάζεται καμία ιδιαιτερότητα.
 */
export function resolveSeatContext(
  realSeats: OcSeat[],
  lastSeatCookie: string | null | undefined,
  seatModeCookie: string | null | undefined,
): SeatContext {
  const own: OcSeat | null =
    lastSeatCookie && realSeats.includes(lastSeatCookie as OcSeat) ? (lastSeatCookie as OcSeat)
      : realSeats.length === 1 ? realSeats[0] : null

  const worn = parseSeatMode(seatModeCookie)
  if (worn && canWearSeats(realSeats) && !realSeats.includes(worn.seat as OcSeat)) {
    return {
      realSeats,
      activeSeat: worn.seat as OcSeat,
      wearing: worn.seat as OcSeat,
      mode: worn.mode,
    }
  }
  return { realSeats, activeSeat: own, wearing: null, mode: 'own' }
}

/**
 * Επιτρέπεται ενέργεια που απαιτεί ΑΥΤΗ την έδρα;
 *
 * Στην προεπισκόπηση ΟΧΙ — αυτό ακριβώς είναι το νόημά της. Στο «ενεργώ ως»
 * ναι, με την υποχρέωση του καλούντα να γράψει ΠΟΙΟΣ το έκανε (attribution).
 */
export function maySeatAct(ctx: SeatContext, required: OcSeat): boolean {
  if (ctx.mode === 'view') return false
  return ctx.activeSeat === required
}

/** Το μήνυμα που εξηγεί γιατί δεν έγινε — ποτέ σκέτο «δεν επιτρέπεται» */
export function seatRefusalMessage(ctx: SeatContext, required: OcSeat, label: string): string {
  if (ctx.mode === 'view') {
    return `Είσαι σε προεπισκόπηση ως ${label}. Για να εκτελέσεις την ενέργεια, άλλαξε σε «Ενεργώ ως ${label}».`
  }
  return `Μόνο ο/η ${label} μπορεί να το κάνει αυτό.`
}

/** Πώς υπογράφεται μια ενέργεια που έγινε φορώντας άλλη έδρα */
export function attributionFor(ctx: SeatContext, realName: string, seatLabel: string): string {
  if (ctx.mode === 'act' && ctx.wearing) return `${realName} (IT ως ${seatLabel})`
  return realName
}
