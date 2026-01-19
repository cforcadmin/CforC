import { NextRequest, NextResponse } from 'next/server'
import { checkSubmission, removeSubmission } from '@/lib/membershipSubmissions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingId = searchParams.get('trackingId')

    if (!trackingId) {
      return NextResponse.json({ error: 'Missing trackingId' }, { status: 400 })
    }

    const submitted = checkSubmission(trackingId)

    // If submitted, remove from store (one-time check)
    if (submitted) {
      removeSubmission(trackingId)
    }

    return NextResponse.json({ submitted })
  } catch (error) {
    console.error('Check submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
