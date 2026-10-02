import { NextRequest, NextResponse } from 'next/server'
import { resolveClaimToken } from '@/lib/claimToken'

export const maxDuration = 60

/**
 * Τι σημαίνει αυτός ο σύνδεσμος — για την οθόνη, πριν συμπληρωθεί τίποτα.
 *
 * Επιστρέφει ΜΟΝΟ όνομα και email, δηλαδή ό,τι θα προσυμπληρωθεί κλειδωμένο.
 * ΔΕΝ καίει το διακριτικό: αν το έκαιγε εδώ, ένα ανανεωμένο παράθυρο θα
 * ακύρωνε τον σύνδεσμο χωρίς να έχει υποβληθεί τίποτα. Καίγεται με την
 * υποβολή.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function lookup(hash: string, slug: string) {
  const res = await fetch(
    `${STRAPI_URL}/api/event-registrations?filters[ClaimTokenHash][$eq]=${encodeURIComponent(hash)}`
    + `&filters[event][Slug][$eq]=${encodeURIComponent(slug)}&pagination[limit]=1`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' })
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  return json?.data?.[0] || null
}

export async function GET(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης διακομιστή' }, { status: 500 })
  }
  const sp = new URL(request.url).searchParams
  const result = await resolveClaimToken(sp.get('event'), sp.get('t'), lookup)
  if (!result.ok) {
    return NextResponse.json({ error: result.message, reason: result.reason }, { status: 403 })
  }
  const { name, email, phone, eventLabel, eventTitle } = result.identity
  return NextResponse.json({ name, email, phone, eventLabel, eventTitle })
}
