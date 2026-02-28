import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const RESEND_API_KEY = process.env.RESEND_API_KEY

export async function POST(request: Request) {
  try {
    // Verify session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Πρέπει να είσαι συνδεδεμένος/η' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(sessionCookie.value)
    if (!decoded || decoded.type !== 'session') {
      return NextResponse.json(
        { error: 'Μη έγκυρη συνεδρία' },
        { status: 401 }
      )
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json(
        { error: 'Η υπηρεσία email δεν είναι διαμορφωμένη' },
        { status: 500 }
      )
    }

    const { coordinatorEmail, groupName, messageBody, userName, userEmail, userProfileUrl } = await request.json()

    // Validate required fields
    if (!coordinatorEmail || !groupName || !messageBody || !userName || !userEmail) {
      return NextResponse.json(
        { error: 'Λείπουν απαραίτητα πεδία' },
        { status: 400 }
      )
    }

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Culture for Change <noreply@cultureforchange.net>',
        reply_to: userEmail,
        to: [coordinatorEmail],
        cc: ['hello@cultureforchange.net', userEmail],
        subject: `Αίτημα Συμμετοχής στην Ομάδα Εργασίας: ${groupName} — ${userName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background-color: #FF8B6A; padding: 30px 20px; text-align: center; border-radius: 24px 24px 0 0;">
                  <div style="background-color: white; display: inline-block; padding: 15px 30px; border-radius: 16px;">
                    <h1 style="color: #2d3748; margin: 0; font-size: 20px;">CULTURE FOR CHANGE</h1>
                  </div>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #2d3748; font-size: 22px; margin-bottom: 10px;">
                    Αίτημα Συμμετοχής
                  </h2>
                  <p style="color: #718096; font-size: 14px; margin-bottom: 25px;">
                    Ομάδα Εργασίας: <strong>${groupName}</strong>
                  </p>

                  <div style="background-color: #f7fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #FF8B6A;">
                    <p style="color: #2d3748; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-line;">${messageBody}</p>
                  </div>

                  ${userProfileUrl ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${userProfileUrl}"
                       style="display: inline-block; background-color: #FF8B6A; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-size: 14px; font-weight: 600;">
                      Προβολή Προφίλ
                    </a>
                  </div>
                  ` : ''}
                </div>

                <!-- Footer -->
                <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-radius: 0 0 24px 24px;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    Αυτό το email στάλθηκε μέσω της πλατφόρμας Culture for Change
                  </p>
                  <p style="color: #718096; font-size: 12px; margin: 8px 0 0 0;">
                    <a href="https://cultureforchange.net" style="color: #FF8B6A; text-decoration: none;">cultureforchange.net</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Failed to send join request email:', errorText)
      return NextResponse.json(
        { error: 'Αποτυχία αποστολής email. Παρακαλώ δοκίμασε ξανά.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Working group join request error:', error)
    return NextResponse.json(
      { error: 'Σφάλμα κατά την αποστολή. Παρακαλώ δοκίμασε ξανά.' },
      { status: 500 }
    )
  }
}
