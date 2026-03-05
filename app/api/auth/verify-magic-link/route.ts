import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hashToken } from '@/lib/auth'
import { verifyMagicLinkLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { checkCsrf } from '@/lib/csrf'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrf(request)
    if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = verifyMagicLinkLimiter.check(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: getRateLimitErrorMessage(rateLimitResult.resetTime) },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Λείπει ο σύνδεσμος επαλήθευσης' },
        { status: 400 }
      )
    }

    // Verify JWT token
    const decoded = verifyToken(token)

    if (!decoded || decoded.type !== 'magic-link') {
      console.error('[verify-magic-link] Token verification failed')
      return NextResponse.json(
        { error: 'Μη έγκυρος ή ληγμένος σύνδεσμος' },
        { status: 401 }
      )
    }

    // Hash the token to compare with database
    const tokenHash = hashToken(token)

    // Look up the auth token in the auth-tokens collection
    const queryUrl = `${STRAPI_URL}/api/auth-tokens?filters[email][$eq]=${encodeURIComponent(decoded.email)}&filters[tokenHash][$eq]=${tokenHash}&filters[tokenType][$eq]=magic-link`

    const authTokenResponse = await fetch(queryUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`
      }
    })

    if (!authTokenResponse.ok) {
      const errorText = await authTokenResponse.text()
      console.error('[verify-magic-link] Auth token fetch failed:', errorText)
      return NextResponse.json(
        { error: 'Σφάλμα επαλήθευσης συνδέσμου' },
        { status: 500 }
      )
    }

    const authTokenData = await authTokenResponse.json()

    if (!authTokenData.data || authTokenData.data.length === 0) {
      console.error('[verify-magic-link] No matching auth token found in database')
      return NextResponse.json(
        { error: 'Μη έγκυρος σύνδεσμος' },
        { status: 401 }
      )
    }

    const authToken = authTokenData.data[0]

    // Check expiry
    if (authToken.tokenExpiry) {
      const expiryDate = new Date(authToken.tokenExpiry)
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: 'Ο σύνδεσμος έχει λήξει. Παρακαλώ ζητήστε έναν νέο.' },
          { status: 401 }
        )
      }
    }

    // Token is valid (token cleanup happens in set-password after password is saved)
    return NextResponse.json({
      success: true,
      email: decoded.email,
      memberId: decoded.memberId
    })

  } catch (error) {
    console.error('Error in verify-magic-link:', error)
    return NextResponse.json(
      { error: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    )
  }
}
