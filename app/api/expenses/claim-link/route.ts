import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { eventRegisterLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { eventFromSlug, claimWindow, CLAIMS_LATE_CONTACT } from '@/lib/expenseClaims'
import { athensToday } from '@/lib/events'
import { sendOcEmail, ADMIN_FROM, ADMIN_EMAIL } from '@/lib/ocEmails'
import { claimLinkEmailHtml } from '@/lib/eventEmails'

export const maxDuration = 60

/**
 * Σύνδεσμος μιας χρήσης για εξοδολόγιο — ΜΟΝΟ για όποιον δήλωσε συμμετοχή.
 *
 * Το δίκτυο αποζημιώνει και μη μέλη (όρος του συγχρηματοδότη), και εκείνοι
 * δεν έχουν λογαριασμό για να συνδεθούν. Η ταυτότητα εδώ είναι η ΚΑΤΟΧΗ του
 * γραμματοκιβωτίου με το οποίο έγινε η δήλωση: ο σύνδεσμος φεύγει μόνο προς
 * τα εκεί, ποτέ σε διεύθυνση που γράφει κάποιος τρίτος.
 *
 * Η ΑΠΑΝΤΗΣΗ ΕΙΝΑΙ ΠΑΝΤΑ Η ΙΔΙΑ. Αν λέγαμε «δεν βρέθηκε», οποιοσδήποτε θα
 * μάθαινε ποιος δήλωσε συμμετοχή γράφοντας διευθύνσεις στο κουτί.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

/** Ο σύνδεσμος ζει λίγο: δίνεται κατά παραγγελία, τη στιγμή που χρειάζεται */
const TOKEN_HOURS = 72

async function strapi(path: string, method = 'GET', data?: unknown) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

/** Η ΙΔΙΑ απάντηση σε κάθε περίπτωση — εδώ ακριβώς είναι το νόημα */
const SAME_ANSWER = () => NextResponse.json({ ok: true })

export async function POST(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης διακομιστή' }, { status: 500 })
  }

  // Δημόσια διαδρομή που ΣΤΕΛΝΕΙ email: χωρίς όριο είναι κανόνι προς
  // οποιαδήποτε διεύθυνση, και τρώει το ημερήσιο budget του newsletter.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rate = eventRegisterLimiter.check(ip)
  if (!rate.allowed) {
    return NextResponse.json({ error: getRateLimitErrorMessage(rate.resetTime) }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const slug = String(body?.event || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()

  const ev = eventFromSlug(slug)
  if (!ev) return NextResponse.json({ error: 'Άγνωστη δράση' }, { status: 400 })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Το email δεν είναι έγκυρο' }, { status: 400 })
  }
  // Δύο διαφορετικά «όχι», με διαφορετική συνέχεια για τον άνθρωπο
  const phase = claimWindow(slug, athensToday())
  if (phase === 'early') {
    return NextResponse.json({ error: 'Τα εξοδολόγια δεν έχουν ανοίξει ακόμη' }, { status: 409 })
  }
  if (phase === 'late') {
    return NextResponse.json({
      error: `Η προθεσμία υποβολής έκλεισε. Γράψε στο ${CLAIMS_LATE_CONTACT} για να το τακτοποιήσουμε.`,
    }, { status: 409 })
  }

  // ΜΟΝΟ επιβεβαιωμένη δήλωση: μια εκκρεμής σημαίνει ότι η διεύθυνση δεν
  // έχει αποδειχθεί ποτέ ότι ανήκει σε κάποιον που την ελέγχει.
  const reg = await strapi(
    `/event-registrations?filters[Email][$eqi]=${encodeURIComponent(email)}`
    + `&filters[event][Slug][$eq]=${encodeURIComponent(slug)}`
    + '&filters[Status][$eq]=confirmed&pagination[limit]=1')
  const row = reg.json?.data?.[0]
  if (!row) return SAME_ANSWER()

  const raw = crypto.randomBytes(32).toString('hex')
  const saved = await strapi(`/event-registrations/${row.documentId}`, 'PUT', {
    // ΠΟΤΕ το ίδιο το διακριτικό στη βάση — μόνο η σύνοψή του
    ClaimTokenHash: crypto.createHash('sha256').update(raw).digest('hex'),
    ClaimTokenExpiresAt: new Date(Date.now() + TOKEN_HOURS * 3600 * 1000).toISOString(),
    ClaimTokenUsedAt: null,
  })
  if (!saved.ok) {
    console.error('expenses/claim-link: save failed', saved.status)
    return SAME_ANSWER()
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cultureforchange.net'
  const url = `${site}/expenses?event=${encodeURIComponent(slug)}&t=${encodeURIComponent(raw)}`
  const tpl = claimLinkEmailHtml({
    firstName: String(row.FirstName || '').trim(),
    eventTitle: ev.title,
    url,
    hours: TOKEN_HOURS,
  })
  try {
    await sendOcEmail(String(row.Email), tpl.subject, tpl.html, {
      from: ADMIN_FROM, replyTo: ADMIN_EMAIL,
    })
  } catch (err) {
    console.error('expenses/claim-link: email failed', err)
  }
  return SAME_ANSWER()
}
