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
const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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

  // Είναι ο ίδιος Βιβλιοθηκάριος; Μόνο για να δείξουμε το κουμπί — η
  // διαδρομή ελέγχου ξαναελέγχει τον ρόλο μόνη της.
  let isLibrarian = false
  let pendingCount = 0
  try {
    const meRes = await fetch(`${STRAPI_URL}/api/members/${decoded.memberId}?fields[0]=IsLibrarian`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store',
    })
    isLibrarian = !!(await meRes.json().catch(() => null))?.data?.IsLibrarian
    if (isLibrarian) {
      const pRes = await fetch(`${STRAPI_URL}/api/library-items?filters[State][$eq]=pending&pagination[pageSize]=1`, {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store',
      })
      pendingCount = (await pRes.json().catch(() => null))?.meta?.pagination?.total ?? 0
    }
  } catch { /* το κουμπί απλώς δεν εμφανίζεται */ }

  return NextResponse.json({
    items: res.data.map(shapeItem),
    total: res.total,
    truncated: res.truncated,
    librarians: libs.data.map((m: any) => ({ name: m.Name, until: m.LibrarianUntil ?? null })),
    isLibrarian,
    pendingCount,
  })
}
