import { NextRequest, NextResponse } from 'next/server'
import { checkCsrf } from '@/lib/csrf'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5MB

// Only allow emails under the cultureforchange.net domain as recipients
const ALLOWED_DOMAIN = 'cultureforchange.net'

export async function POST(request: NextRequest) {
  // CSRF check
  const csrfError = checkCsrf(request)
  if (csrfError) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const email = formData.get('email') as string | null
    const name = formData.get('name') as string | null
    const message = formData.get('message') as string | null
    const termsAccepted = formData.get('termsAccepted') as string | null
    const attachment = formData.get('attachment') as File | null
    const toEmails = formData.get('to') as string | null
    const ccEmails = formData.get('cc') as string | null

    // Validate required fields
    if (!email || !message) {
      return NextResponse.json({ error: 'Απαιτείται email και μήνυμα.' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Μη έγκυρο email.' }, { status: 400 })
    }

    // Validate terms acceptance
    if (termsAccepted !== 'true') {
      return NextResponse.json({ error: 'Πρέπει να αποδεχτείτε τους όρους χρήσης.' }, { status: 400 })
    }

    // Validate message length
    if (message.length > 5000) {
      return NextResponse.json({ error: 'Το μήνυμα δεν μπορεί να υπερβαίνει τους 5000 χαρακτήρες.' }, { status: 400 })
    }

    // Validate attachment size
    if (attachment && attachment.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: 'Το αρχείο δεν μπορεί να υπερβαίνει τα 5MB.' }, { status: 400 })
    }

    // Parse and validate TO recipients — must be @cultureforchange.net
    const toList = toEmails
      ? toEmails.split(',').map(e => e.trim()).filter(e => emailRegex.test(e) && e.endsWith(`@${ALLOWED_DOMAIN}`))
      : []
    if (toList.length === 0) {
      return NextResponse.json({ error: 'Απαιτείται τουλάχιστον ένας παραλήπτης.' }, { status: 400 })
    }

    // Parse CC recipients — sender always gets a copy, plus any valid @cultureforchange.net emails
    const ccList = [email]
    if (ccEmails) {
      const extraCc = ccEmails.split(',').map(e => e.trim()).filter(e => emailRegex.test(e) && e.endsWith(`@${ALLOWED_DOMAIN}`))
      ccList.push(...extraCc)
    }

    // Build attachments array for Resend
    const attachments: { filename: string; content: string }[] = []
    if (attachment && attachment.size > 0) {
      const buffer = Buffer.from(await attachment.arrayBuffer())
      attachments.push({
        filename: attachment.name,
        content: buffer.toString('base64'),
      })
    }

    const senderName = name ? escapeHtml(name) : 'Ανώνυμος'
    const senderEmail = escapeHtml(email)
    const senderMessage = escapeHtml(message).replace(/\n/g, '<br>')

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'no-reply@cultureforchange.net',
        to: toList,
        cc: ccList,
        reply_to: email,
        subject: `Φόρμα Επικοινωνίας: ${name || 'Ανώνυμος'} - Culture for Change`,
        html: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background-color: #FF6B4A; padding: 30px 20px; text-align: center; border-radius: 16px 16px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">Νέο Μήνυμα Επικοινωνίας</h1>
                </div>
                <div style="padding: 30px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #2d3748; width: 100px;">Όνομα:</td>
                      <td style="padding: 8px 0; color: #4a5568;">${senderName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #2d3748;">Email:</td>
                      <td style="padding: 8px 0; color: #4a5568;"><a href="mailto:${senderEmail}" style="color: #FF6B4A;">${senderEmail}</a></td>
                    </tr>
                  </table>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <div style="color: #4a5568; line-height: 1.6;">
                    ${senderMessage}
                  </div>
                  ${attachments.length > 0 ? `<p style="color: #718096; font-size: 12px; margin-top: 20px;">Συνημμένο αρχείο: ${escapeHtml(attachment!.name)}</p>` : ''}
                </div>
                <div style="padding: 20px 30px; background-color: #f7fafc; border-radius: 0 0 16px 16px; font-size: 11px; color: #a0aec0; text-align: center;">
                  Αυτό το μήνυμα στάλθηκε μέσω της φόρμας επικοινωνίας του cultureforchange.net
                </div>
              </div>
            </body>
          </html>
        `,
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    })

    if (!resendResponse.ok) {
      console.error('Resend error:', await resendResponse.text())
      return NextResponse.json({ error: 'Αποτυχία αποστολής. Δοκιμάστε ξανά.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Αποτυχία αποστολής. Δοκιμάστε ξανά.' }, { status: 500 })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
