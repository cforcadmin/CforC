import { NextRequest, NextResponse } from 'next/server'
import { addSubmission } from '@/lib/membershipSubmissions'

// Webhook secret - should match your Google Apps Script
const WEBHOOK_SECRET = process.env.MEMBERSHIP_WEBHOOK_SECRET || 'cforc-membership-2024-xyz'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackingId, submittedAt, secret } = body

    // Validate webhook secret
    if (secret !== WEBHOOK_SECRET) {
      console.error('Invalid webhook secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!trackingId) {
      return NextResponse.json({ error: 'Missing trackingId' }, { status: 400 })
    }

    // Store the submission
    addSubmission(trackingId, submittedAt)

    console.log(`Form submitted with trackingId: ${trackingId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
