import { NextRequest, NextResponse } from 'next/server'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN

async function strapiGet(path: string) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
  })
  if (!res.ok) return null
  return res.json()
}

// Static pages that can be searched
const STATIC_PAGES = [
  { title: 'Σχετικά με εμάς', href: '/about', keywords: ['about', 'σχετικά', 'εμάς', 'ποιοι', 'δίκτυο', 'culture for change'] },
  { title: 'Ομάδα Συντονισμού', href: '/coordination-team', keywords: ['ομάδα', 'συντονισμού', 'coordination', 'team', 'πρόεδρος', 'αντιπρόεδρος'] },
  { title: 'Διαφάνεια', href: '/transparency', keywords: ['διαφάνεια', 'transparency', 'οικονομικά', 'απολογισμός'] },
  { title: 'Συμμετοχή', href: '/participation', keywords: ['συμμετοχή', 'participation', 'εγγραφή', 'μέλος'] },
  { title: 'Επικοινωνία', href: '/contact', keywords: ['επικοινωνία', 'contact', 'email', 'τηλέφωνο'] },
  { title: 'Πολιτική Απορρήτου', href: '/privacy', keywords: ['απόρρητο', 'privacy', 'προσωπικά', 'δεδομένα'] },
  { title: 'Όροι Χρήσης', href: '/terms', keywords: ['όροι', 'χρήσης', 'terms'] },
  { title: 'Cookies', href: '/cookies', keywords: ['cookies', 'cookie'] },
  { title: 'Προσβασιμότητα', href: '/accessibility', keywords: ['προσβασιμότητα', 'accessibility', 'wcag'] },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const types = searchParams.get('types') // comma-separated: members,activities,open-calls,pages
  const includeOpenCalls = searchParams.get('includeOpenCalls') === 'true'

  if (!q || q.length < 2) {
    return NextResponse.json({ members: [], activities: [], openCalls: [], pages: [] })
  }

  const requestedTypes = types ? types.split(',') : ['members', 'activities', 'open-calls', 'pages']
  const qLower = q.toLowerCase()

  const results: {
    members: any[]
    activities: any[]
    openCalls: any[]
    pages: any[]
  } = { members: [], activities: [], openCalls: [], pages: [] }

  const fetches: Promise<void>[] = []

  const qEncoded = encodeURIComponent(q)

  if (requestedTypes.includes('members')) {
    fetches.push(
      strapiGet(`/members?filters[$or][0][Name][$containsi]=${qEncoded}&filters[$or][1][FieldsOfWork][$containsi]=${qEncoded}&filters[$or][2][City][$containsi]=${qEncoded}&populate=Image&pagination[limit]=10`).then(data => {
        if (data?.data) {
          results.members = data.data
            .filter((m: any) => !m.HideProfile)
            .slice(0, 8)
            .map((m: any) => ({
              id: m.id,
              documentId: m.documentId,
              name: m.Name,
              slug: m.Slug,
              fieldsOfWork: m.FieldsOfWork,
              city: m.City,
              imageUrl: m.Image?.[0]?.url || null,
            }))
        }
      })
    )
  }

  if (requestedTypes.includes('activities')) {
    fetches.push(
      strapiGet(`/activities?filters[$or][0][Title][$containsi]=${qEncoded}&filters[$or][1][EngTitle][$containsi]=${qEncoded}&filters[$or][2][Category][$containsi]=${qEncoded}&filters[$or][3][Tags][$containsi]=${qEncoded}&populate=Visuals&pagination[limit]=10&sort=Date:desc`).then(data => {
        if (data?.data) {
          results.activities = data.data.slice(0, 8).map((a: any) => ({
            id: a.id,
            documentId: a.documentId,
            title: a.Title,
            engTitle: a.EngTitle || null,
            slug: a.Slug,
            category: a.Category,
            date: a.Date,
            imageUrl: a.Visuals?.[0]?.url || null,
          }))
        }
      })
    )
  }

  if (requestedTypes.includes('open-calls') && includeOpenCalls) {
    fetches.push(
      strapiGet(`/open-calls?filters[$or][0][Title][$containsi]=${qEncoded}&filters[$or][1][EngTitle][$containsi]=${qEncoded}&filters[$or][2][Category][$containsi]=${qEncoded}&populate=Image&pagination[limit]=10&sort=Deadline:desc`).then(data => {
        if (data?.data) {
          results.openCalls = data.data.slice(0, 8).map((oc: any) => ({
            id: oc.id,
            documentId: oc.documentId,
            title: oc.Title,
            engTitle: oc.EngTitle || null,
            slug: oc.Slug || null,
            category: oc.Category,
            date: oc.Deadline,
            imageUrl: oc.Image?.url || (Array.isArray(oc.Image) ? oc.Image[0]?.url : null) || null,
          }))
        }
      })
    )
  }

  if (requestedTypes.includes('pages')) {
    results.pages = STATIC_PAGES.filter(page =>
      page.title.toLowerCase().includes(qLower) ||
      page.keywords.some(kw => kw.includes(qLower) || qLower.includes(kw))
    )
  }

  await Promise.all(fetches)

  return NextResponse.json(results)
}
