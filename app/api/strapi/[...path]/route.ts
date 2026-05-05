import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

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
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(STRAPI_API_TOKEN && {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        }),
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Strapi proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from CMS' },
      { status: 502 }
    )
  }
}
