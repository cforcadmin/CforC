import { NextRequest, NextResponse } from 'next/server'
import { isValidEmail, verifyPassword, generateSessionToken } from '@/lib/auth'
import { loginLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { cookies } from 'next/headers'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Παρακαλώ εισάγετε email και κωδικό' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email' },
        { status: 400 }
      )
    }

    // Check rate limiting
    const rateLimitResult = loginLimiter.check(email.toLowerCase())
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: getRateLimitErrorMessage(rateLimitResult.resetTime) },
        { status: 429 }
      )
    }

    // Find member by email
    const membersResponse = await fetch(
      `${STRAPI_URL}/api/members?filters[Email][$eq]=${encodeURIComponent(email)}&populate=Image`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!membersResponse.ok) {
      console.error('Strapi API error:', await membersResponse.text())
      return NextResponse.json(
        { error: 'Σφάλμα σύνδεσης με τη βάση δεδομένων' },
        { status: 500 }
      )
    }

    const membersData = await membersResponse.json()

    if (!membersData.data || membersData.data.length === 0) {
      return NextResponse.json(
        { error: 'Λάθος email ή κωδικός' },
        { status: 401 }
      )
    }

    const member = membersData.data[0]

    // Check if member has set a password
    if (!member.password) {
      return NextResponse.json(
        { error: 'Δεν έχετε ορίσει κωδικό. Παρακαλώ ζητήστε σύνδεσμο σύνδεσης.' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, member.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Λάθος email ή κωδικός' },
        { status: 401 }
      )
    }

    // Update last login time
    await fetch(
      `${STRAPI_URL}/api/members/${member.documentId || member.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        },
        body: JSON.stringify({
          data: {
            lastLoginAt: new Date().toISOString()
          }
        })
      }
    )

    // Generate session token
    const sessionToken = generateSessionToken(
      member.documentId || member.id.toString(),
      email
    )

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('cforc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    // Return member data (excluding sensitive fields)
    const { password: _, magicLinkToken: __, magicLinkExpiry: ___, ...safeMemberData } = member

    return NextResponse.json({
      success: true,
      message: 'Επιτυχής σύνδεση',
      member: safeMemberData
    })

  } catch (error) {
    console.error('Error in login:', error)
    return NextResponse.json(
      { error: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    )
  }
}
