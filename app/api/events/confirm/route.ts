import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sendOcEmail, ADMIN_FROM, ADMIN_EMAIL } from '@/lib/ocEmails'
import { eventRegisteredEmailHtml } from '@/lib/eventEmails'
import { dateRangeLabel } from '@/lib/events'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Το κλικ στο email — εδώ η δήλωση γίνεται πραγματική.
 *
 * Το διακριτικό συγκρίνεται με τη ΣΥΝΟΨΗ του (SHA256): το ίδιο δεν υπάρχει
 * πουθενά στη βάση, οπότε μια διαρροή της βάσης δεν δίνει σε κανέναν τη
 * δυνατότητα να επιβεβαιώσει δηλώσεις άλλων.
 *
 * Είναι GET επίτηδες — πατιέται από γραμμή σε email. Γι' αυτό είναι και
 * ΑΘΩΟ να ξαναπατηθεί: δεύτερο κλικ δεν αλλάζει τίποτα και δεν βγάζει
 * σφάλμα, γιατί οι άνθρωποι πατούν δύο φορές.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cultureforchange.net'

async function strapi(path: string, method = 'GET', data?: unknown) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, json }
}

function page(title: string, body: string, ok: boolean) {
  return new NextResponse(
    `<!DOCTYPE html><html lang="el"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${title} — Culture for Change</title></head>
<body style="margin:0;background:#F5F0EB;font-family:Arial,Helvetica,sans-serif;color:#2D2D2D;">
<div style="max-width:560px;margin:80px auto;padding:40px;background:#fff;border-radius:24px;">
<div style="font-size:13px;letter-spacing:1.6px;font-weight:bold;color:${ok ? '#FF8B6A' : '#999'};">CULTURE FOR CHANGE</div>
<h1 style="font-size:26px;margin:12px 0 16px 0;">${title}</h1>
<p style="font-size:16px;line-height:24px;margin:0 0 24px 0;">${body}</p>
<a href="${SITE}/events" style="display:inline-block;padding:12px 28px;background:#FF8B6A;color:#2D2D2D;font-weight:bold;border-radius:999px;text-decoration:none;">Δες τις δράσεις</a>
</div></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token || !STRAPI_URL || !STRAPI_API_TOKEN) {
    return page('Ο σύνδεσμος δεν ισχύει', 'Λείπει ή είναι λανθασμένος ο σύνδεσμος επιβεβαίωσης.', false)
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const res = await strapi(
    `/event-registrations?filters[ConfirmTokenHash][$eq]=${encodeURIComponent(hash)}`
    + '&populate[event]=true&pagination[limit]=1')
  const reg = res.json?.data?.[0]
  if (!reg) {
    return page('Ο σύνδεσμος δεν ισχύει',
      'Δεν βρέθηκε δήλωση για αυτόν τον σύνδεσμο. Ίσως έχει ήδη χρησιμοποιηθεί ή αντιγράφηκε μισός.', false)
  }

  // Δεύτερο κλικ: δεν είναι σφάλμα, είναι άνθρωπος που ξαναπάτησε.
  if (reg.Status === 'confirmed') {
    return page('Η συμμετοχή σου είναι ήδη καταχωρημένη ✓',
      `Σε περιμένουμε στο <strong>${reg.event?.Title || 'τη δράση'}</strong>.`, true)
  }
  if (reg.Status === 'cancelled') {
    return page('Η δήλωση έχει ακυρωθεί',
      'Αν θέλεις να συμμετάσχεις, γράψε μας στο hello@cultureforchange.net.', false)
  }

  const expires = reg.ConfirmTokenExpiresAt ? Date.parse(reg.ConfirmTokenExpiresAt) : 0
  if (expires && Date.now() > expires) {
    return page('Ο σύνδεσμος έληξε',
      'Ο σύνδεσμος ίσχυε για 7 ημέρες. Κάνε ξανά τη δήλωση ή γράψε μας στο hello@cultureforchange.net.', false)
  }

  const upd = await strapi(`/event-registrations/${reg.documentId}`, 'PUT', {
    Status: 'confirmed',
    ConfirmedAt: new Date().toISOString(),
    // Το διακριτικό καίγεται: ένας σύνδεσμος, μία χρήση.
    ConfirmTokenHash: null,
  })
  if (!upd.ok) {
    return page('Κάτι πήγε στραβά', 'Δοκίμασε ξανά σε λίγο ή γράψε μας στο hello@cultureforchange.net.', false)
  }

  const ev = reg.event
  try {
    const tpl = eventRegisteredEmailHtml({
      firstName: String(reg.FirstName || '').trim(),
      eventTitle: ev?.Title || 'τη δράση',
      dates: ev ? dateRangeLabel(ev.StartDate, ev.EndDate) : '',
      venue: [ev?.Venue, ev?.City].filter(Boolean).join(', ') || undefined,
      isMember: false,
      eventUrl: `${SITE}/events/${ev?.Slug || ''}`,
    })
    // Κοινοποίηση στο hello@ ΕΔΩ, στη στιγμή που η δήλωση γίνεται πραγματική
    // — όχι στο email με τον σύνδεσμο επιβεβαίωσης που στάλθηκε πριν.
    await sendOcEmail(String(reg.Email), tpl.subject, tpl.html,
      { from: ADMIN_FROM, replyTo: ADMIN_EMAIL, cc: [ADMIN_EMAIL] })
  } catch (err) {
    console.error('events/confirm: email failed', err)
  }

  return page('Η συμμετοχή σου καταχωρήθηκε ✓',
    `Σε περιμένουμε στο <strong>${ev?.Title || 'τη δράση'}</strong>. Σου στείλαμε επιβεβαίωση με email.`, true)
}
