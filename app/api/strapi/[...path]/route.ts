import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { sanitizeMember, sanitizeNestedMembers } from '@/lib/strapi'
import { cachedJson } from '@/lib/strapiCache'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

// Allowlist of permitted Strapi collection endpoints
const ALLOWED_COLLECTIONS = new Set([
  'members',
  'activities',
  'open-calls',
  'newsletters',
  'projects',
  'project-entries',
  'working-groups',
  'coordination-teams',
  'pages',
])

// Collections that are members-only — proxy requires a valid session cookie.
// Public consumers (e.g. homepage teaser) must use a dedicated public endpoint.
const MEMBER_ONLY_COLLECTIONS = new Set(['open-calls'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const collection = path[0]

  if (!collection || !ALLOWED_COLLECTIONS.has(collection)) {
    return NextResponse.json(
      { error: 'Not allowed' },
      { status: 403 }
    )
  }

  if (MEMBER_ONLY_COLLECTIONS.has(collection)) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
    if (!decoded || decoded.type !== 'session') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  // Reconstruct the Strapi API path
  const strapiPath = `/api/${path.join('/')}`
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${STRAPI_URL}${strapiPath}${searchParams ? `?${searchParams}` : ''}`

  try {
    /**
     * ΜΝΗΜΗ ΚΑΙ ΣΤΟΝ ΔΙΑΚΟΜΙΣΤΗ, ΟΧΙ ΜΟΝΟ ΣΤΟ CDN.
     *
     * Η κεφαλίδα Cache-Control παρακάτω τιμάται από το CDN του Vercel —
     * στην παραγωγή. Στο localhost δεν υπάρχει CDN, οπότε ΚΑΘΕ φόρτωση
     * σελίδας ξαναρωτούσε το Strapi: μετρημένο 16/10/2026, 13 κλήσεις για
     * τα ίδια «featured projects» μέσα σε τέσσερα λεπτά περιήγησης, πάνω
     * σε όριο που είχε 2.600 κλήσεις να δώσει.
     *
     * Το κλειδί είναι ΟΛΟΚΛΗΡΗ η διαδρομή με το ερώτημα: άλλο φίλτρο,
     * άλλη απάντηση. Τα member-only δεν μπαίνουν — ο έλεγχος συνεδρίας
     * έχει ήδη γίνει παραπάνω, αλλά μια κοινή μνήμη θα έδινε το ίδιο σώμα
     * σε επόμενο αίτημα και δεν θέλουμε να το σκεφτόμαστε κάθε φορά.
     */
    const cacheable = !MEMBER_ONLY_COLLECTIONS.has(collection)
    const fetchFresh = async () => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(STRAPI_API_TOKEN && {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          }),
        },
      })
      return { status: response.status, ok: response.ok, body: await response.json() }
    }

    const result = cacheable
      ? await cachedJson(`proxy:${strapiPath}?${searchParams}`, 60_000, fetchFresh)
      : await fetchFresh()
    const response = { ok: result.ok, status: result.status }
    const data = result.body

    // Strip auth internals + OC registry/financial member fields before
    // anything reaches a browser. This proxy is the only client-side data
    // path, so this is the enforcement point — not the UI.
    if (collection === 'members') {
      if (Array.isArray(data?.data)) data.data.forEach(sanitizeMember)
      else if (data?.data) sanitizeMember(data.data)
    } else if (collection === 'working-groups' || collection === 'coordination-teams') {
      if (Array.isArray(data?.data)) data.data.forEach(sanitizeNestedMembers)
      else if (data?.data) sanitizeNestedMembers(data.data)
    }

    /**
     * ΚΡΑΤΙΕΤΑΙ ΣΤΟ CDN — ΓΙΑΤΙ ΚΑΘΕ ΕΠΙΣΚΕΨΗ ΧΤΥΠΟΥΣΕ ΤΟ STRAPI.
     *
     * Οι σελίδες /members και /news είναι client components: φέρνουν τα
     * δεδομένα από εδώ σε ΚΑΘΕ φόρτωση. Με 380 μέλη και όριο σελίδας 100,
     * μια επίσκεψη στα μέλη κόστιζε πέντε κλήσεις στο Strapi — κάθε φορά,
     * για δεδομένα ίδια για όλους. Στις 16/10/2026 το μηνιαίο όριο ήταν
     * 45.700/50.000 με δεκαπέντε μέρες μπροστά.
     *
     * ΤΙ ΑΛΛΑΖΕΙ ΓΙΑ ΤΟΝ ΕΠΙΣΚΕΠΤΗ: τίποτα στην εμφάνιση. Μόνο ότι νέο
     * περιεχόμενο μπορεί να αργήσει έως πέντε λεπτά να φανεί.
     *
     * ΟΧΙ στα member-only: εκείνα περνούν από έλεγχο συνεδρίας και μια
     * κοινή απάντηση στο CDN θα τα έδινε σε ΟΛΟΥΣ.
     */
    const res = NextResponse.json(data, { status: response.status })
    res.headers.set(
      'Cache-Control',
      response.ok && !MEMBER_ONLY_COLLECTIONS.has(collection)
        ? 'public, s-maxage=300, stale-while-revalidate=1800'
        : 'private, no-store',
    )
    return res
  } catch (error) {
    console.error('Strapi proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from CMS' },
      { status: 502 }
    )
  }
}
