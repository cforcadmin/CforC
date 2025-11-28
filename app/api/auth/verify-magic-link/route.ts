import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hashToken } from '@/lib/auth'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  try {
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
      console.error('Token verification failed:', { decoded, hasType: decoded?.type })
      return NextResponse.json(
        { error: 'Μη έγκυρος ή ληγμένος σύνδεσμος' },
        { status: 401 }
      )
    }

    // Hash the token to compare with database
    const tokenHash = hashToken(token)

    // Fetch member from database
    const memberResponse = await fetch(
      `${STRAPI_URL}/api/members/${decoded.memberId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!memberResponse.ok) {
      console.error('Member fetch failed:', await memberResponse.text())
      return NextResponse.json(
        { error: 'Μέλος δεν βρέθηκε' },
        { status: 404 }
      )
    }

    const memberData = await memberResponse.json()
    const member = memberData.data

    // Check if token matches and hasn't expired
    console.log('Token comparison:', {
      hasStoredToken: !!member.magicLinkToken,
      tokensMatch: member.magicLinkToken === tokenHash,
      storedToken: member.magicLinkToken?.substring(0, 20) + '...',
      computedHash: tokenHash.substring(0, 20) + '...'
    })

    if (!member.magicLinkToken || member.magicLinkToken !== tokenHash) {
      return NextResponse.json(
        { error: 'Μη έγκυρος σύνδεσμος' },
        { status: 401 }
      )
    }

    // Check expiry
    if (member.magicLinkExpiry) {
      const expiryDate = new Date(member.magicLinkExpiry)
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: 'Ο σύνδεσμος έχει λήξει. Παρακαλώ ζητήστε έναν νέο.' },
          { status: 401 }
        )
      }
    }

    // Token is valid
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
