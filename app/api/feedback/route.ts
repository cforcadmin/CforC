import { NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY

export async function POST(request: Request) {
  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json(
        { error: 'Η υπηρεσία email δεν είναι διαμορφωμένη' },
        { status: 500 }
      )
    }

    const { message, senderName, senderEmail, pageUrl } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Το μήνυμα είναι υποχρεωτικό' },
        { status: 400 }
      )
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Culture for Change <noreply@cultureforchange.net>',
        reply_to: senderEmail || undefined,
        to: ['it@cultureforchange.net'],
        subject: `Αναφορά / Πρόταση — ${senderName || 'Ανώνυμος επισκέπτης'}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f7fafc;">
              <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
                <div style="background-color:#FF8B6A;padding:24px 20px;text-align:center;border-radius:24px 24px 0 0;">
                  <div style="background-color:white;display:inline-block;padding:12px 24px;border-radius:16px;">
                    <h1 style="color:#2d3748;margin:0;font-size:18px;">CULTURE FOR CHANGE</h1>
                  </div>
                </div>
                <div style="padding:30px;">
                  <h2 style="color:#2d3748;font-size:20px;margin-bottom:8px;">Αναφορά / Πρόταση Βελτίωσης</h2>
                  <p style="color:#718096;font-size:13px;margin-bottom:20px;">
                    ${senderName ? `Από: <strong>${senderName}</strong>` : 'Ανώνυμος επισκέπτης'}
                    ${senderEmail ? ` &lt;${senderEmail}&gt;` : ''}
                    ${pageUrl ? `<br>Σελίδα: <a href="${pageUrl}" style="color:#FF8B6A;">${pageUrl}</a>` : ''}
                  </p>
                  <div style="background-color:#f7fafc;padding:20px;border-radius:12px;border-left:4px solid #FF8B6A;">
                    <p style="color:#2d3748;font-size:15px;line-height:1.7;margin:0;white-space:pre-line;">${message}</p>
                  </div>
                </div>
                <div style="background-color:#f7fafc;padding:16px;text-align:center;border-radius:0 0 24px 24px;">
                  <p style="color:#718096;font-size:12px;margin:0;">
                    Αυτό το email στάλθηκε μέσω του feedback widget — <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">cultureforchange.net</a>
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
      console.error('Failed to send feedback email:', errorText)
      return NextResponse.json(
        { error: 'Αποτυχία αποστολής. Δοκίμασε ξανά.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json(
      { error: 'Σφάλμα κατά την αποστολή.' },
      { status: 500 }
    )
  }
}
