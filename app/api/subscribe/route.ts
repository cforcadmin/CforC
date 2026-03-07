import { NextResponse } from 'next/server'
import { newsletterLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { checkCsrf } from '@/lib/csrf'
import { generateNewsletterToken } from '@/lib/auth'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(request: Request) {
  try {
    const csrfError = checkCsrf(request)
    if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Check rate limit
    const rateLimitResult = newsletterLimiter.check(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: getRateLimitErrorMessage(rateLimitResult.resetTime) },
        { status: 429 }
      )
    }

    const { email, firstName, lastName, website } = await request.json()

    // Honeypot check - if filled, it's a bot
    if (website) {
      // Silently reject but return success to not alert bots
      console.log('Bot detected via honeypot')
      return NextResponse.json({ success: true })
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Suspicious email pattern check - excessive dots in username
    const username = email.split('@')[0]
    const dotCount = (username.match(/\./g) || []).length
    if (dotCount > 3) {
      // Silently reject but return success to not alert spammers
      console.log('Suspicious email pattern blocked')
      return NextResponse.json({ success: true })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cultureforchange.net'

    // Sanitize optional name fields
    const cleanFirst = typeof firstName === 'string' ? firstName.trim().slice(0, 100) : undefined
    const cleanLast = typeof lastName === 'string' ? lastName.trim().slice(0, 100) : undefined

    // Generate confirmation token (includes names if provided)
    const token = generateNewsletterToken(email, cleanFirst, cleanLast)
    const confirmUrl = `${SITE_URL}/api/subscribe/confirm?token=${encodeURIComponent(token)}`

    // Use verified domain
    const fromEmail = 'no-reply@cultureforchange.net'

    // Send confirmation email only (double opt-in)
    const confirmEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Επιβεβαίωσε την εγγραφή σου - Culture for Change',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Logo Section -->
                <div style="background-color: #FF6B4A; padding: 40px 20px; text-align: center; border-radius: 24px 24px 0 0;">
                  <div style="background-color: white; display: inline-block; padding: 20px 40px; border-radius: 16px;">
                    <h1 style="color: #2d3748; margin: 0; font-size: 24px;">CULTURE FOR CHANGE</h1>
                  </div>
                </div>

                <!-- Content Section -->
                <div style="padding: 40px 30px;">
                  <h1 style="color: #2d3748; font-size: 28px; margin-bottom: 20px;">
                    Επιβεβαίωσε την εγγραφή σου
                  </h1>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Λάβαμε αίτημα εγγραφής στο newsletter του Culture for Change με αυτό το email (${escapeHtml(email)}).
                  </p>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Κάνε κλικ στο παρακάτω κουμπί για να ολοκληρώσεις την εγγραφή σου:
                  </p>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${confirmUrl}"
                       style="display: inline-block; background-color: #FF6B4A; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600;">
                      ΕΠΙΒΕΒΑΙΩΣΗ ΕΓΓΡΑΦΗΣ
                    </a>
                  </div>

                  <p style="color: #718096; font-size: 14px; line-height: 1.6;">
                    Αν δεν ζήτησες εσύ αυτή την εγγραφή, μπορείς απλά να αγνοήσεις αυτό το email.
                    Ο σύνδεσμος λήγει σε 24 ώρες.
                  </p>

                  <!-- Signature -->
                  <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                      Με εκτίμηση,
                    </p>
                    <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0;">
                      Η Συντονιστική Ομάδα του Culture for Change
                    </p>
                  </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-radius: 0 0 24px 24px;">
                  <p style="color: #718096; font-size: 14px; margin: 0;">
                    Culture for Change | Αλεξάνδρας 48, 11473, Αθήνα
                  </p>
                  <p style="color: #718096; font-size: 14px; margin: 10px 0 0 0;">
                    <a href="https://cultureforchange.net" style="color: #FF6B4A; text-decoration: none;">cultureforchange.net</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!confirmEmailResponse.ok) {
      const errorText = await confirmEmailResponse.text()
      console.error('Failed to send confirmation email:', errorText)
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    )
  }
}
