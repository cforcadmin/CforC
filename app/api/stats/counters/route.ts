import { NextResponse } from 'next/server'

/**
 * Οι μετρητές της σελίδας «Σχετικά με εμάς»: ΔΡΑΣΕΙΣ και ΜΕΛΗ.
 *
 * Ήταν γραμμένοι στο χέρι (10 και 101) και έμεναν πίσω σε κάθε νέα εγγραφή.
 *
 * ΜΕΛΗ = όσα έχουν ΑΜ. Είναι τα εγγεγραμμένα μέλη του δικτύου, ανεξάρτητα
 * από το αν έχουν συμπληρώσει ή κρύψει το προφίλ τους — τα 91 ορατά προφίλ
 * είναι άλλο πράγμα και θα υποτιμούσαν τη δύναμη του δικτύου.
 *
 * ΔΡΑΣΕΙΣ = η συλλογή activities. (Ο μετρητής έλεγε «ΕΡΓΑ», αλλά η συλλογή
 * projects έχει 3 εγγραφές· η λέξη άλλαξε ώστε να λέει την αλήθεια.)
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

// Οι αριθμοί αλλάζουν σπάνια — μια ώρα cache είναι υπεραρκετή
export const revalidate = 3600

/** Παλιές τιμές: αν πέσει το Strapi, η σελίδα δεν δείχνει ποτέ μηδενικά */
const FALLBACK = { members: 112, activities: 65 }

async function total(path: string): Promise<number | null> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/${path}`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      next: { revalidate },
    })
    if (!res.ok) return null
    const json = await res.json()
    const n = json?.meta?.pagination?.total
    return Number.isFinite(n) ? Number(n) : null
  } catch {
    return null
  }
}

export async function GET() {
  const [members, activities] = await Promise.all([
    total('members?filters[AM][$notNull]=true&pagination[pageSize]=1&fields[0]=id'),
    total('activities?pagination[pageSize]=1&fields[0]=id'),
  ])
  return NextResponse.json({
    members: members ?? FALLBACK.members,
    activities: activities ?? FALLBACK.activities,
    live: members !== null && activities !== null,
  })
}
