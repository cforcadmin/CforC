import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { OC_EMAIL_SEATS } from '@/components/oc/ocPrefs'

/**
 * Ποιος ανεβάζει αρχεία για τα email του OC.
 *
 * Ήταν γραμμένο μέσα στη διαδρομή των εικόνων. Βγαίνει εδώ επειδή η διαδρομή
 * των συνημμένων θέλει ΑΚΡΙΒΩΣ τον ίδιο έλεγχο — και δύο αντίγραφα του ίδιου
 * φράγματος σημαίνει ότι η επόμενη αλλαγή θα γίνει στο ένα.
 *
 * Το φράγμα είναι η ΕΝΕΡΓΗ ΕΔΡΑ, όχι η ιδιότητα μέλους: όποια έδρα στέλνει
 * email από το OC, ανεβάζει και τα αρχεία του.
 */
export type OcUploadAuth = { memberId: string; error?: undefined } | { error: NextResponse; memberId?: undefined }

const ALLOWED_SEATS = OC_EMAIL_SEATS as OcSeat[]

export async function authorizeOcUpload(): Promise<OcUploadAuth> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (!activeSeat || !ALLOWED_SEATS.includes(activeSeat)) {
    return { error: NextResponse.json({ error: 'Η έδρα σου δεν στέλνει email από το OC' }, { status: 403 }) }
  }
  return { memberId: decoded.memberId }
}
