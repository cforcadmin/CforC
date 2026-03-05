import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hashToken, validatePassword, hashPassword, generateSessionToken } from '@/lib/auth'
import { setPasswordLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { checkCsrf } from '@/lib/csrf'
import { cookies } from 'next/headers'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrf(request)
    if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = setPasswordLimiter.check(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: getRateLimitErrorMessage(rateLimitResult.resetTime) },
        { status: 429 }
      )
    }

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

    // Fetch member from database using the email from auth-token
    // We use the email because the auth-token already has the correct email
    const memberResponse = await fetch(
      `${STRAPI_URL}/api/members?filters[Email][$eq]=${encodeURIComponent(authToken.email)}&populate[0]=Image&populate[1]=Project1Pictures&populate[2]=Project2Pictures`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!memberResponse.ok) {
      console.error('[set-password] Member fetch failed:', await memberResponse.text())
      return NextResponse.json(
        { error: 'Μέλος δεν βρέθηκε' },
        { status: 404 }
      )
    }

    const memberData = await memberResponse.json()

    if (!memberData.data || memberData.data.length === 0) {
      console.error('[set-password] No member found with email:', authToken.email)
      return NextResponse.json(
        { error: 'Μέλος δεν βρέθηκε' },
        { status: 404 }
      )
    }

    const member = memberData.data[0]

    // Helper function to convert Blocks format to plain text
    const convertBlocksToText = (blocks: any) => {
      if (!blocks || !Array.isArray(blocks)) return ''
      return blocks
        .map((block: any) => {
          if (block.children && Array.isArray(block.children)) {
            return block.children
              .map((child: any) => child.text || '')
              .join('')
          }
          return ''
        })
        .join('\n')
    }

    // Convert Bio from Blocks format to plain text
    const bioText = convertBlocksToText(member.Bio)

    // Convert Project descriptions from Blocks format to plain text
    const project1DescriptionText = convertBlocksToText(member.Project1Description)
    const project2DescriptionText = convertBlocksToText(member.Project2Description)

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

    // Generate session token using the documentId (required for Strapi v5)
    const sessionToken = generateSessionToken(member.documentId, authToken.email)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    // Return member data (excluding sensitive fields but including converted text fields)
    const {
      password: _,
      magicLinkToken: __,
      magicLinkExpiry: ___,
      Bio: ____,
      Project1Description: _____,
      Project2Description: ______,
      ...safeMemberData
    } = member

    return NextResponse.json({
      success: true,
      message: 'Ο κωδικός ορίστηκε επιτυχώς',
      member: {
        ...safeMemberData,
        Bio: bioText,
        Project1Description: project1DescriptionText,
        Project2Description: project2DescriptionText
      }
    })

  } catch (error) {
    console.error('Error in set-password:', error)
    return NextResponse.json(
      { error: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    )
  }
}
