import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function GET(request: Request) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cultureforchange.net'

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(`${SITE_URL}/?subscribe_error=expired`)
    }

    // Verify JWT
    const payload = verifyToken(token)
    if (!payload || payload.type !== 'newsletter') {
      return NextResponse.redirect(`${SITE_URL}/?subscribe_error=expired`)
    }

    const email = payload.email
    const firstName = (payload as any).firstName || ''
    const lastName = (payload as any).lastName || ''

    const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
    const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

    if (!STRAPI_URL || !STRAPI_API_TOKEN) {
      console.error('Strapi configuration missing')
      return NextResponse.redirect(`${SITE_URL}/?subscribe_error=expired`)
    }

    // Check for existing subscriber (prevent duplicates)
    const checkResponse = await fetch(
      `${STRAPI_URL}/api/newsletter-subscribers?filters[Email][$eq]=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    )

    if (checkResponse.ok) {
      const checkData = await checkResponse.json()
      if (checkData.data && checkData.data.length > 0) {
        return NextResponse.redirect(`${SITE_URL}/?subscribe_error=already`)
      }
    }

    // Create subscriber record in Strapi
    const createResponse = await fetch(`${STRAPI_URL}/api/newsletter-subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          Email: email,
          FirstName: firstName || undefined,
          LastName: lastName || undefined,
          ConfirmedAt: new Date().toISOString(),
        },
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('Failed to create subscriber in Strapi:', errorText)
      return NextResponse.redirect(`${SITE_URL}/?subscribe_error=expired`)
    }

    // Add subscriber to Sender.net newsletter group
    const SENDER_API_KEY = process.env.SENDER_API_KEY
    const SENDER_GROUP_ID = process.env.SENDER_GROUP_ID
    if (SENDER_API_KEY && SENDER_GROUP_ID) {
      try {
        const senderResponse = await fetch('https://api.sender.net/v2/subscribers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDER_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email,
            firstname: firstName || undefined,
            lastname: lastName || undefined,
            groups: [SENDER_GROUP_ID],
            trigger_automation: false,
          }),
        })

        if (!senderResponse.ok) {
          const errorText = await senderResponse.text()
          console.error('Failed to add subscriber to Sender:', errorText)
        }
      } catch (err) {
        console.error('Sender API error:', err)
      }
    }

    // Send admin notification and welcome emails
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (RESEND_API_KEY) {
      const fromEmail = 'no-reply@cultureforchange.net'

      // Admin notification
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: ['media@cultureforchange.net'],
          cc: ['it@cultureforchange.net'],
          subject: 'Νέα Εγγραφή στο Newsletter - Culture for Change',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2d3748;">Νέα Επιβεβαιωμένη Εγγραφή στο Newsletter</h2>
              <p style="color: #4a5568; font-size: 16px;">
                Ένας νέος χρήστης επιβεβαίωσε την εγγραφή του στο newsletter του Culture for Change.
              </p>
              <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #2d3748;">
                  <strong>Email:</strong> ${escapeHtml(email)}
                </p>
                ${firstName || lastName ? `
                <p style="margin: 10px 0 0 0; color: #2d3748;">
                  <strong>Όνομα:</strong> ${escapeHtml([firstName, lastName].filter(Boolean).join(' '))}
                </p>
                ` : ''}
                <p style="margin: 10px 0 0 0; color: #718096; font-size: 14px;">
                  <strong>Ημερομηνία επιβεβαίωσης:</strong> ${new Date().toLocaleString('el-GR')}
                </p>
              </div>
            </div>
          `,
        }),
      }).catch(err => console.error('Failed to send admin notification:', err))

      // Welcome email to subscriber
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: 'Καλώς ήρθες στο Culture for Change!',
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
                      Καλώς ήρθες στην κοινότητα του Culture for Change!
                    </h1>

                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      Χαιρόμαστε που αποφάσισες να γίνεις μέλος της κοινότητάς μας! Από εδώ και πέρα θα λαμβάνεις τακτικά ενημερώσεις για:
                    </p>

                    <ul style="color: #4a5568; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
                      <li>Τις δράσεις και τα προγράμματα του Δικτύου</li>
                      <li>Ευκαιρίες για επαγγελματίες του πολιτισμού</li>
                      <li>Νέα από το ελληνικό και παγκόσμιο πολιτιστικό περιβάλλον</li>
                      <li>Εκδηλώσεις και ανοιχτά καλέσματα</li>
                    </ul>

                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      Μείνε συντονισμένος/η για περισσότερα!
                    </p>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="https://cultureforchange.net"
                         style="display: inline-block; background-color: #FF6B4A; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600;">
                        Επισκέψου την ιστοσελίδα μας
                      </a>
                    </div>

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
      }).catch(err => console.error('Failed to send welcome email:', err))
    }

    return NextResponse.redirect(`${SITE_URL}/?subscribed=true`)
  } catch (error) {
    console.error('Newsletter confirmation error:', error)
    return NextResponse.redirect(`${SITE_URL}/?subscribe_error=expired`)
  }
}
