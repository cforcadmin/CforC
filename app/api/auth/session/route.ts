import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function GET(request: NextRequest) {
  try {
    // Check required environment variables
    if (!STRAPI_URL || !STRAPI_API_TOKEN) {
      console.error('Missing environment variables:', {
        STRAPI_URL: !!STRAPI_URL,
        STRAPI_API_TOKEN: !!STRAPI_API_TOKEN
      })
      return NextResponse.json(
        { error: 'Σφάλμα διαμόρφωσης διακομιστή' },
        { status: 500 }
      )
    }

    // Get session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

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
      cookieStore.delete('session')
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Fetch member from database using documentId
    const memberResponse = await fetch(
      `${STRAPI_URL}/api/members?filters[documentId][$eq]=${decoded.memberId}&populate[0]=Image&populate[1]=Project1Pictures&populate[2]=Project2Pictures`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!memberResponse.ok) {
      cookieStore.delete('session')
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const memberData = await memberResponse.json()

    if (!memberData.data || memberData.data.length === 0) {
      cookieStore.delete('session')
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const member = memberData.data[0]

    // Return member data (excluding sensitive fields)
    // Bio, Project1Description, Project2Description are returned as raw Strapi blocks
    // so the frontend RichTextEditor can preserve formatting
    const {
      password,
      verificationCode,
      verificationExpiry,
      ...safeMemberData
    } = member

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
