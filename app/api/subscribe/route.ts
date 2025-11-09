import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Email to admin (notification)
    const adminEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Culture for Change <newsletter@cultureforchange.net>',
        to: ['contact@yoryosstyl.com'],
        subject: 'Νέα Εγγραφή στο Newsletter',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3748;">Νέα Εγγραφή στο Newsletter</h2>
            <p style="color: #4a5568; font-size: 16px;">
              Ένας νέος χρήστης εγγράφηκε στο newsletter του Culture for Change.
            </p>
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #2d3748;">
                <strong>Email:</strong> ${email}
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!adminEmailResponse.ok) {
      const errorText = await adminEmailResponse.text()
      console.error('Failed to send admin email:', errorText)
    }

    // Welcome email to user
    const welcomeEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Culture for Change <newsletter@cultureforchange.net>',
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
                  <img src="https://cultureforchange.net/cforc_logo.svg" alt="Culture for Change" style="max-width: 200px; height: auto;">
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
    })

    if (!welcomeEmailResponse.ok) {
      const errorText = await welcomeEmailResponse.text()
      console.error('Failed to send welcome email:', errorText)
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
