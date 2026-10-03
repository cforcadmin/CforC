import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import { buildDataMap, summariseMap, findDrift, CATALOG, PROCESSORS } from '@/lib/dataMap'

export const maxDuration = 60

/**
 * Χάρτης δεδομένων — αρχείο δραστηριοτήτων επεξεργασίας (ΓΚΠΔ, άρθρο 30).
 * ΜΟΝΟ για τη θέση IT, όπως όλη η ενότητα.
 *
 * Η διαδρομή δεν επιστρέφει ΠΟΤΕ δεδομένα μελών — μόνο ΟΝΟΜΑΤΑ ΠΕΔΙΩΝ. Ο
 * έλεγχος απόκλισης ζητά μία εγγραφή ανά συλλογή για να δει τα κλειδιά της,
 * και κρατά αποκλειστικά τα κλειδιά· καμία τιμή δεν φεύγει από εδώ.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function authorizeIt() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    effectiveSeat(access.seats as OcSeat[], seatCookie, cookieStore.get(OC_SEAT_MODE_COOKIE)?.value)
  if (activeSeat !== 'it') return NextResponse.json({ error: 'Μόνο το IT' }, { status: 403 })
  return null
}

/**
 * Τα ΟΝΟΜΑΤΑ πεδίων μιας συλλογής, από μία μόνο εγγραφή.
 *
 * Άδεια συλλογή → `null`, δηλαδή «δεν ξέρω», ΟΧΙ «δεν έχει πεδία». Η διαφορά
 * είναι όλη η ουσία: το δεύτερο θα εμφάνιζε ψεύτικη απόκλιση.
 */
async function liveFieldNames(plural: string, timeoutMs = 10000): Promise<string[] | null> {
  const res = await fetch(`${STRAPI_URL}/api/${plural}?pagination[limit]=1`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) return null
  const j = await res.json()
  const first = (j?.data || [])[0]
  return first ? Object.keys(first) : null
}

export async function GET() {
  const denied = await authorizeIt()
  if (denied) return denied

  const rows = buildDataMap()

  /**
   * Έλεγχος απόκλισης, παράλληλα. Ένα στιγμιότυπο δεσμευμένο στο repo σαπίζει
   * σιωπηλά — αν κάποιος πρόσθεσε πεδίο στο Strapi και δεν έτρεξε τον
   * παραγωγό, ΕΔΩ φαίνεται.
   */
  const drift = await Promise.all(rows.map(async r => {
    const c = CATALOG.collections.find(x => x.api === r.api)
    try {
      const live = await liveFieldNames(c?.plural || r.api)
      if (!live) return { api: r.api, checked: false as const }
      const d = findDrift(r.api, live)
      return { api: r.api, checked: true as const, ...d }
    } catch {
      return { api: r.api, checked: false as const }
    }
  }))

  const added = drift.filter(d => d.checked && d.added.length)
  const unchecked = drift.filter(d => !d.checked).length

  return NextResponse.json({
    generatedAt: CATALOG.generatedAt,
    summary: summariseMap(rows),
    processors: Object.values(PROCESSORS),
    rows,
    drift: {
      /** Πεδία που υπάρχουν ζωντανά και ΛΕΙΠΟΥΝ από τον χάρτη */
      newFields: added.map(d => ({ api: d.api, fields: (d as { added: string[] }).added })),
      /** Πόσες συλλογές δεν μπόρεσαν να ελεγχθούν (άδειες ή χωρίς απάντηση) */
      unchecked,
      action: added.length
        ? 'Τρέξε `node scripts/generate-data-map.js` και συμπλήρωσε τις σημειώσεις στο lib/dataMap.ts'
        : null,
    },
  })
}
