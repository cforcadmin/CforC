import { NextRequest, NextResponse } from 'next/server'
import { resolveClaimToken, CLAIM_TOKEN_MESSAGES } from '@/lib/claimToken'
import { strapiFetch, StrapiQueryError, strapiErrorText } from '@/lib/strapiFetch'

export const maxDuration = 60

/**
 * Τι σημαίνει αυτός ο σύνδεσμος — για την οθόνη, πριν συμπληρωθεί τίποτα.
 *
 * Επιστρέφει ΜΟΝΟ όνομα και email, δηλαδή ό,τι θα προσυμπληρωθεί κλειδωμένο.
 * ΔΕΝ καίει το διακριτικό: αν το έκαιγε εδώ, ένα ανανεωμένο παράθυρο θα
 * ακύρωνε τον σύνδεσμο χωρίς να έχει υποβληθεί τίποτα. Καίγεται με την
 * υποβολή.
 */

const MESSAGES_LOOKUP_FAILED = CLAIM_TOKEN_MESSAGES['lookup-failed']

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function lookup(hash: string, slug: string) {
  const res = await strapiFetch(`${STRAPI_URL}/api/event-registrations?filters[ClaimTokenHash][$eq]=${encodeURIComponent(hash)}`
    + `&filters[event][Slug][$eq]=${encodeURIComponent(slug)}&pagination[limit]=1`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' })
  const json = await res.json().catch(() => null)
  // ΟΧΙ `return null` σε αποτυχία: θα γινόταν «άκυρος σύνδεσμος» για βλάβη δική μας.
  if (!res.ok) throw new StrapiQueryError(res.status, strapiErrorText(json), 'event-registrations')
  return json?.data?.[0] || null
}

export async function GET(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης διακομιστή' }, { status: 500 })
  }
  const sp = new URL(request.url).searchParams
  let result
  try {
    result = await resolveClaimToken(sp.get('event'), sp.get('t'), lookup)
  } catch (err) {
    console.error('expenses/claim-token:', err)
    return NextResponse.json(
      { error: MESSAGES_LOOKUP_FAILED, reason: 'lookup-failed' }, { status: 503 })
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.message, reason: result.reason }, { status: 403 })
  }
  const { name, email, phone, eventLabel, eventTitle } = result.identity
  return NextResponse.json({ name, email, phone, eventLabel, eventTitle })
}
