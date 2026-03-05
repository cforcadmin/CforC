import { NextRequest, NextResponse } from 'next/server'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const RESEND_API_KEY = process.env.RESEND_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

// Greek month names for the email subject
const GREEK_MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
]

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!STRAPI_URL || !STRAPI_API_TOKEN || !RESEND_API_KEY) {
      console.error('[MONTHLY-REPORT] Missing environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Calculate previous month's date range
    const now = new Date()
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const startISO = prevMonthStart.toISOString()
    const endISO = prevMonthEnd.toISOString()

    const monthName = GREEK_MONTHS[prevMonthStart.getMonth()]
    const year = prevMonthStart.getFullYear()

    // Query Strapi for change logs in the previous month
    const logsUrl = `${STRAPI_URL}/api/profile-change-logs?filters[changedAt][$gte]=${encodeURIComponent(startISO)}&filters[changedAt][$lte]=${encodeURIComponent(endISO)}&pagination[limit]=1000&sort=changedAt:asc`

    const logsResponse = await fetch(logsUrl, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    })

    if (!logsResponse.ok) {
      const errorText = await logsResponse.text()
      console.error('[MONTHLY-REPORT] Failed to fetch logs:', errorText)
      return NextResponse.json({ error: 'Failed to fetch change logs' }, { status: 500 })
    }

    const logsData = await logsResponse.json()
    const logs = logsData.data || []

    if (logs.length === 0) {
      console.log('[MONTHLY-REPORT] No profile changes in previous month')
      return NextResponse.json({ message: 'No changes to report', month: `${monthName} ${year}` })
    }

    // Group by member name
    const grouped: Record<string, { fields: Set<string>; dates: string[] }> = {}

    for (const log of logs) {
      const name = log.memberName || 'Άγνωστο μέλος'
      if (!grouped[name]) {
        grouped[name] = { fields: new Set(), dates: [] }
      }

      // Add changed fields
      const fields = (log.changedFields || '').split(',').map((f: string) => f.trim()).filter(Boolean)
      for (const f of fields) {
        grouped[name].fields.add(f)
      }

      // Add date (day/month format)
      const d = new Date(log.changedAt)
      grouped[name].dates.push(`${d.getDate()}/${d.getMonth() + 1}`)
    }

    // Build summary lines
    const memberNames = Object.keys(grouped)
    let totalUpdates = 0
    const summaryLines: string[] = []

    for (const name of memberNames) {
      const { fields, dates } = grouped[name]
      totalUpdates += dates.length
      const uniqueDates = [...new Set(dates)]
      summaryLines.push(`${name} — ${[...fields].join(', ')} (${uniqueDates.join(', ')})`)
    }

    // Build HTML email
    const listItems = summaryLines.map(line => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<li style="margin-bottom: 8px; color: #2d3748;">${escaped}</li>`
    }).join('\n')

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: #FF6B4A; padding: 30px 20px; text-align: center; border-radius: 24px 24px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Αναφορά Αλλαγών Προφίλ</h1>
              <p style="color: #ffffff; margin: 8px 0 0; font-size: 16px; opacity: 0.9;">${monthName} ${year}</p>
            </div>

            <div style="padding: 30px;">
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Κατά τη διάρκεια του μήνα <strong>${monthName} ${year}</strong>, τα παρακάτω μέλη ενημέρωσαν το προφίλ τους:
              </p>

              <ul style="list-style: disc; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                ${listItems}
              </ul>

              <div style="background-color: #f7fafc; padding: 16px; border-radius: 8px; margin-top: 24px;">
                <p style="margin: 0; color: #2d3748; font-size: 15px;">
                  <strong>Σύνολο:</strong> ${memberNames.length} μέλη, ${totalUpdates} ενημερώσεις
                </p>
              </div>
            </div>

            <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-radius: 0 0 24px 24px;">
              <p style="color: #718096; font-size: 13px; margin: 0;">
                Αυτόματη αναφορά από το Culture for Change
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'no-reply@cultureforchange.net',
        to: ['media@cultureforchange.net'],
        cc: ['it@cultureforchange.net', 'communication@cultureforchange.net'],
        subject: `Αναφορά Αλλαγών Προφίλ — ${monthName} ${year}`,
        html: htmlBody,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('[MONTHLY-REPORT] Failed to send email:', errorText)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    console.log(`[MONTHLY-REPORT] Sent report for ${monthName} ${year}: ${memberNames.length} members, ${totalUpdates} updates`)

    return NextResponse.json({
      success: true,
      month: `${monthName} ${year}`,
      members: memberNames.length,
      updates: totalUpdates,
    })
  } catch (error) {
    console.error('[MONTHLY-REPORT] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
