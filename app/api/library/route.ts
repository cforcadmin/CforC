import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { strapiAll } from '@/lib/strapiPaged'
import { shapeItem } from '@/lib/library'

export const maxDuration = 60

/**
 * Ο κατάλογος της Ανοιχτής Βιβλιοθήκης.
 *
 * Επιστρέφει ΜΟΝΟ τα δημοσιευμένα. Τα «pending» (ύποπτα για διπλοεγγραφή)
 * και τα «rejected» τα βλέπει ο Βιβλιοθηκάριος από τη δική του διαδρομή.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  const decoded = session ? verifyToken(session.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }

  // Σελιδοποιημένα: η βιβλιοθήκη θα ξεπεράσει τα 100 με το πρώτο κιόλας
  // πακέτο των 50 και ένα δεύτερο — το Strapi κόβει σιωπηλά εκεί.
  const res = await strapiAll(
    '/library-items?filters[State][$eq]=published&sort=createdAt:desc'
    + '&populate[SubmittedBy][fields][0]=Name',
  )
  if (!res.ok) {
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  }

  // Ποιοι κρατούν τη θητεία τώρα — φαίνεται στο ενημερωτικό της καταχώρησης,
  // ώστε το μέλος να ξέρει σε ποιον απευθύνεται. ΜΟΝΟ ονόματα: το email του
  // Βιβλιοθηκάριου δεν χρειάζεται να το δει όλο το δίκτυο.
  const libs = await strapiAll('/members?filters[IsLibrarian][$eq]=true&fields[0]=Name&fields[1]=LibrarianUntil')

  return NextResponse.json({
    items: res.data.map(shapeItem),
    total: res.total,
    truncated: res.truncated,
    librarians: libs.data.map((m: any) => ({ name: m.Name, until: m.LibrarianUntil ?? null })),
  })
}
