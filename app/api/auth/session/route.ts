import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function GET(request: NextRequest) {
  try {
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

    // Fetch member from database
    const memberResponse = await fetch(
      `${STRAPI_URL}/api/members/${decoded.memberId}?populate[0]=Image&populate[1]=Project1Pictures&populate[2]=Project2Pictures`,
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
    const member = memberData.data

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

    // Return member data (excluding sensitive fields and complex Blocks fields)
    const {
      password,
      verificationCode,
      verificationExpiry,
      Bio: _,
      Project1Description: _1,
      Project2Description: _2,
      ...safeMemberData
    } = member

    return NextResponse.json({
      success: true,
      member: {
        ...safeMemberData,
        Bio: bioText,
        Project1Description: project1DescriptionText,
        Project2Description: project2DescriptionText
      }
    })

  } catch (error) {
    console.error('Error in session:', error)
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    )
  }
}
