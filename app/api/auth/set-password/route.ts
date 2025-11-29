import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hashToken, validatePassword, hashPassword, generateSessionToken } from '@/lib/auth'
import { cookies } from 'next/headers'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Λείπουν απαραίτητα στοιχεία' },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      )
    }

    // Verify JWT token
    const decoded = verifyToken(token)
    if (!decoded || decoded.type !== 'magic-link') {
      return NextResponse.json(
        { error: 'Μη έγκυρος ή ληγμένος σύνδεσμος' },
        { status: 401 }
      )
    }

    // Hash the token to compare with database
    const tokenHash = hashToken(token)

    // Look up the auth token in the auth-tokens collection
    const authTokenResponse = await fetch(
      `${STRAPI_URL}/api/auth-tokens?filters[email][$eq]=${encodeURIComponent(decoded.email)}&filters[tokenHash][$eq]=${tokenHash}&filters[tokenType][$eq]=magic-link`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!authTokenResponse.ok) {
      return NextResponse.json(
        { error: 'Σφάλμα επαλήθευσης συνδέσμου' },
        { status: 500 }
      )
    }

    const authTokenData = await authTokenResponse.json()

    if (!authTokenData.data || authTokenData.data.length === 0) {
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
          { error: 'Ο σύνδεσμος έχει λήξει' },
          { status: 401 }
        )
      }
    }

    // Fetch member from database
    const memberResponse = await fetch(
      `${STRAPI_URL}/api/members/${decoded.memberId}?populate=Image`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!memberResponse.ok) {
      return NextResponse.json(
        { error: 'Μέλος δεν βρέθηκε' },
        { status: 404 }
      )
    }

    const memberData = await memberResponse.json()
    const member = memberData.data

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Update auth token record: set password, clear magic link fields, update last login
    const updateResponse = await fetch(
      `${STRAPI_URL}/api/auth-tokens/${authToken.documentId || authToken.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        },
        body: JSON.stringify({
          data: {
            passwordHash: hashedPassword,
            tokenHash: null,
            tokenExpiry: null,
            tokenType: null,
            lastLoginAt: new Date().toISOString()
          }
        })
      }
    )

    if (!updateResponse.ok) {
      console.error('Failed to update password:', await updateResponse.text())
      return NextResponse.json(
        { error: 'Σφάλμα κατά την αποθήκευση του κωδικού' },
        { status: 500 }
      )
    }

    // Generate session token
    const sessionToken = generateSessionToken(decoded.memberId, decoded.email)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('cforc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    // Return member data (excluding sensitive and blocks fields)
    const {
      password: _,
      magicLinkToken: __,
      magicLinkExpiry: ___,
      Bio,
      Project1Description,
      Project2Description,
      ...safeMemberData
    } = member

    return NextResponse.json({
      success: true,
      message: 'Ο κωδικός ορίστηκε επιτυχώς',
      member: safeMemberData
    })

  } catch (error) {
    console.error('Error in set-password:', error)
    return NextResponse.json(
      { error: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    )
  }
}
