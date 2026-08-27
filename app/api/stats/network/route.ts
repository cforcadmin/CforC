import { NextResponse } from 'next/server'

// Δημόσια στατιστικά δικτύου για το υποσέλιδο: πλήθος ενεργών μελών (με ΑΜ —
// ο ίδιος ορισμός με την Επισκόπηση του OC) και πλήθος περιφερειών με μέλη.
// ΜΟΝΟ αριθμοί — κανένα προσωπικό δεδομένο δεν βγαίνει από εδώ.

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

// Τα νούμερα αλλάζουν σπάνια — μία ώρα cache αρκεί και κρατά το Strapi ήσυχο
export const revalidate = 3600

// Τα στατικά του σχεδίου, όταν το Strapi δεν απαντά
const FALLBACK = { members: 110, provinces: 13 }

export async function GET() {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) return NextResponse.json(FALLBACK)
  try {
    let start = 0
    let members = 0
    const provinces = new Set<string>()
    while (true) {
      const res = await fetch(
        `${STRAPI_URL}/api/members?fields[0]=AM&fields[1]=Province&pagination[start]=${start}&pagination[limit]=100&pagination[withCount]=true`,
        { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, next: { revalidate: 3600 } }
      )
      if (!res.ok) return NextResponse.json(FALLBACK)
      const page = await res.json()
      for (const m of page.data || []) {
        if (m.AM == null) continue // λογαριασμοί χωρίς ΑΜ δεν είναι ενεργά μέλη
        members++
        if (m.Province) provinces.add(String(m.Province).trim())
      }
      const total = page.meta?.pagination?.total ?? 0
      start += 100
      if (start >= total) break
    }
    if (members === 0) return NextResponse.json(FALLBACK)
    return NextResponse.json({ members, provinces: provinces.size })
  } catch {
    return NextResponse.json(FALLBACK)
  }
}
