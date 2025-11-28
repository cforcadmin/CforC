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

    // Verify token matches and hasn't expired
    if (!member.magicLinkToken || member.magicLinkToken !== tokenHash) {
      return NextResponse.json(
        { error: 'Μη έγκυρος σύνδεσμος' },
        { status: 401 }
      )
    }

    if (member.magicLinkExpiry) {
      const expiryDate = new Date(member.magicLinkExpiry)
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: 'Ο σύνδεσμος έχει λήξει' },
          { status: 401 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Update member record: set password, clear magic link token
    const updateResponse = await fetch(
      `${STRAPI_URL}/api/members/${decoded.memberId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        },
        body: JSON.stringify({
          data: {
            password: hashedPassword,
            magicLinkToken: null,
            magicLinkExpiry: null,
            lastLoginAt: new Date().toISOString()
          }
        })
      }
    )

    if (!updateResponse.ok) {
      console.error('Failed to update member password:', await updateResponse.text())
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

    // Return member data (excluding sensitive fields)
    const { password: _, magicLinkToken: __, magicLinkExpiry: ___, ...safeMemberData } = member

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
