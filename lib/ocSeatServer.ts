import { cookies } from 'next/headers'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { resolveSeatContext, OC_SEAT_MODE_COOKIE, type SeatContext } from '@/lib/ocSeatMode'

/**
 * Η έδρα της τρέχουσας συνεδρίας, μαζί με την κατάσταση (δική της /
 * προεπισκόπηση / ενεργώ ως). ΜΙΑ πηγή για όλες τις διαδρομές.
 *
 * Ο υπολογισμός ήταν αντιγραμμένος σε 24 αρχεία — και είναι η πιο κρίσιμη
 * γραμμή του OC, αυτή που εμποδίζει ένα πλαστό cookie. Όσο ζει σε 24
 * αντίγραφα, κάθε αυστηροποίηση πρέπει να θυμηθεί και τα 24.
 */
export const OC_LAST_SEAT_COOKIE = 'oc-last-seat'

export async function seatContextOf(memberId: string): Promise<SeatContext> {
  const store = await cookies()
  const access = await resolveOcAccess(memberId)
  return resolveSeatContext(
    access.seats as OcSeat[],
    store.get(OC_LAST_SEAT_COOKIE)?.value,
    store.get(OC_SEAT_MODE_COOKIE)?.value,
  )
}
