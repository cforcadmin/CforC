import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

/**
 * Οι ζωντανοί δείκτες του hero των μελών — ένα ελαφρύ αίτημα στη σύνδεση.
 *
 * Κανόνας μέτρου (απόφαση 25/8): ΑΡΙΘΜΟΣ μόνο όπου περιμένει κάτι μετρήσιμο
 * (προσκλήσεις, νέα τεκμήρια, εκκρεμή του Βιβλιοθηκάριου), ΗΜΕΡΟΜΗΝΙΕΣ για
 * τις τελείες «κάτι νέο» (η σύγκριση με το «τελευταία είδα» γίνεται στον
 * client, όπου ζει το localStorage) — τίποτα στα στατικά.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const strapi = async (path: string) => {
  const r = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    next: { revalidate: 300 },   // 5' — δείκτες είναι, όχι λογιστική
  })
  return r.ok ? r.json() : null
}

export async function GET() {
  const store = await cookies()
  const session = store.get('session')
  const decoded = session ? verifyToken(session.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [calls, callsSoon, nl, wg, lib, me] = await Promise.all([
    strapi(`/open-calls?filters[Deadline][$gte]=${today}&pagination[pageSize]=1`),
    strapi(`/open-calls?filters[Deadline][$gte]=${today}&filters[Deadline][$lte]=${soon}&pagination[pageSize]=1`),
    strapi('/newsletters?sort=Date:desc&fields[0]=Date&pagination[pageSize]=1'),
    strapi('/working-groups?sort=updatedAt:desc&fields[0]=updatedAt&pagination[pageSize]=1'),
    strapi(`/library-items?filters[State][$eq]=published&filters[createdAt][$gte]=${monthAgo}&pagination[pageSize]=1`),
    strapi(`/members/${decoded.memberId}?fields[0]=IsLibrarian`),
  ])

  let libraryPending = 0
  if (me?.data?.IsLibrarian) {
    const p = await strapi('/library-items?filters[State][$eq]=pending&pagination[pageSize]=1')
    libraryPending = p?.meta?.pagination?.total ?? 0
  }

  return NextResponse.json({
    openCallsActive: calls?.meta?.pagination?.total ?? 0,
    openCallsExpiringSoon: callsSoon?.meta?.pagination?.total ?? 0,
    newsletterLatest: nl?.data?.[0]?.Date ?? null,
    workingGroupsUpdated: wg?.data?.[0]?.updatedAt ?? null,
    libraryNew30: lib?.meta?.pagination?.total ?? 0,
    libraryPending,
  })
}
