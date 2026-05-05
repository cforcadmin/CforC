import { NextResponse } from 'next/server'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

// Public homepage teaser: returns only expired open calls (max 3) so the
// homepage can render a "past calls" preview to non-members without exposing
// the active member-only listing through the proxy.
export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = today.toISOString().slice(0, 10)

  const qs = [
    `filters[Deadline][$lt]=${encodeURIComponent(cutoff)}`,
    'populate=Image',
    'pagination[limit]=3',
    'sort=Deadline:desc',
  ].join('&')

  try {
    const response = await fetch(`${STRAPI_URL}/api/open-calls?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
      },
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Open calls teaser error:', error)
    return NextResponse.json({ error: 'Failed to fetch teaser' }, { status: 502 })
  }
}
