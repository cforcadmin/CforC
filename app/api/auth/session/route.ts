import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

export async function GET(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('cforc_session')

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    // Verify session token
    const decoded = verifyToken(sessionCookie.value)
    if (!decoded || decoded.type !== 'session') {
      // Clear invalid cookie
      cookieStore.delete('cforc_session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
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
      cookieStore.delete('cforc_session')
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const memberData = await memberResponse.json()
    const member = memberData.data

    // Return member data (excluding sensitive fields)
    const { password, verificationCode, verificationExpiry, ...safeMemberData } = member

    return NextResponse.json({
      success: true,
      member: safeMemberData
    })

  } catch (error) {
    console.error('Error in session:', error)
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    )
  }
}
