import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import { sendOcEmail, IT_FROM, IT_EMAIL } from '@/lib/ocEmails'
import {
  canArchive, isRequestStatus, shouldNotify, statusPatch,
  type RequestStatus,
} from '@/lib/siteRequests'

export const maxDuration = 60

/**
 * ΑΙΤΗΜΑΤΑ ΑΠΟ ΤΟΝ ΙΣΤΟΤΟΠΟ — ανάγνωση για το ΔΣ, αλλαγές μόνο από το IT.
 *
 * Γιατί ΜΟΝΟ το IT γράφει: το feedback widget πάει ήδη στο it@ και οι
 * καταστάσεις είναι τεχνική εκκρεμότητα, όχι απόφαση σώματος (οδηγία
 * 6/10/2026). Η ΑΝΑΓΝΩΣΗ μένει ανοιχτή σε όλο το ΔΣ — ένα αίτημα που κανείς
 * δεν βλέπει είναι αίτημα που χάνεται.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...(data !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

async function authorize(needWrite: boolean) {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = store.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat = effectiveSeat(
    access.seats as OcSeat[], seatCookie, store.get(OC_SEAT_MODE_COOKIE)?.value)
  if (needWrite && activeSeat !== 'it') {
    return { error: NextResponse.json({ error: 'Μόνο το IT αλλάζει κατάσταση σε αιτήματα' }, { status: 403 }) }
  }
  return { memberId: decoded.memberId, activeSeat }
}

const FIELDS =
  'fields[0]=Message&fields[1]=SenderName&fields[2]=SenderEmail&fields[3]=PageUrl'
  + '&fields[4]=Source&fields[5]=Status&fields[6]=Notes&fields[7]=Archived'
  + '&fields[8]=ArchivedAt&fields[9]=CompletedAt&fields[10]=NotifiedAt&fields[11]=SubmittedAt'
  + '&fields[12]=Kind&fields[13]=Category'

export async function GET() {
  const auth = await authorize(false)
  if ('error' in auth) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }
  // Νεότερο πρώτο· το αρχείο έρχεται ΜΑΖΙ και φιλτράρεται στην οθόνη, ώστε να
  // μη χρειάζεται δεύτερη κλήση όταν πατηθεί «Αρχείο».
  const r = await strapi(`/site-requests?sort=createdAt:desc&pagination[limit]=200&${FIELDS}`)
  if (!r.ok) {
    // Η συλλογή μπορεί να μην έχει βγει ακόμη στο Strapi Cloud — το κουτί
    // ανοίγει άδειο με εξήγηση, αντί να ρίξει ολόκληρη την Επισκόπηση.
    return NextResponse.json({ requests: [], unavailable: true })
  }
  return NextResponse.json({ requests: r.json?.data || [] })
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const documentId = String(body?.documentId || '').replace(/[^a-z0-9]/gi, '')
  if (!documentId) return NextResponse.json({ error: 'Λείπει το αίτημα' }, { status: 400 })

  const current = await strapi(`/site-requests/${documentId}?${FIELDS}`)
  if (!current.ok || !current.json?.data) {
    return NextResponse.json({ error: 'Το αίτημα δεν βρέθηκε' }, { status: 404 })
  }
  const row = current.json.data
  const now = new Date().toISOString()
  const patch: Record<string, any> = {}

  if (body.status !== undefined) {
    if (!isRequestStatus(body.status)) {
      return NextResponse.json({ error: 'Άγνωστη κατάσταση' }, { status: 400 })
    }
    Object.assign(patch, statusPatch(body.status as RequestStatus, now))
  }

  if (body.archived !== undefined) {
    const wanted = !!body.archived
    const statusAfter = patch.Status ?? row.Status
    if (wanted && !canArchive(statusAfter)) {
      return NextResponse.json(
        { error: 'Αρχειοθετείται μόνο ό,τι έχει ολοκληρωθεί' }, { status: 409 })
    }
    patch.Archived = wanted
    patch.ArchivedAt = wanted ? now : null
  }

  if (body.notes !== undefined) patch.Notes = String(body.notes || '').trim() || null

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Καμία αλλαγή' }, { status: 400 })
  }

  /**
   * Η ΕΙΔΟΠΟΙΗΣΗ ΦΕΥΓΕΙ ΠΡΙΝ ΓΡΑΦΤΕΙ ΤΟ NotifiedAt, και αναμένεται.
   *
   * Αν γραφόταν πρώτα η σφραγίδα και το email αποτύγχανε, το αίτημα θα
   * θεωρούνταν «ειδοποιημένο» για πάντα. Έτσι, χειρότερη περίπτωση είναι να
   * ξαναπροσπαθήσει κανείς — όχι να μη φτάσει ποτέ.
   */
  let notified = false
  if (shouldNotify(row, patch.Status)) {
    const to = String(row.SenderEmail).trim()
    const name = String(row.SenderName || '').trim()
    const ok = await sendOcEmail(to, 'Το αίτημά σου ολοκληρώθηκε — Culture for Change',
      completedEmailHtml(name, String(row.Message || '')),
      { from: IT_FROM, replyTo: IT_EMAIL })
    if (ok) { patch.NotifiedAt = now; notified = true }
    else console.error('oc/site-requests: η ειδοποίηση ολοκλήρωσης δεν στάλθηκε')
  }

  const put = await strapi(`/site-requests/${documentId}`, 'PUT', patch)
  if (!put.ok) {
    return NextResponse.json({ error: 'Το Strapi απέρριψε την αλλαγή' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, notified, request: put.json?.data || null })
}

/** Σύντομο, χωρίς υποσχέσεις — το αίτημα έκλεισε, αυτό λέει */
function completedEmailHtml(name: string, message: string): string {
  const esc = (s: string) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const quoted = esc(message).slice(0, 600).replace(/\n/g, '<br>')
  return `<!DOCTYPE html>
<html lang="el"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>Το αίτημά σου ολοκληρώθηκε</title></head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;">
  <tr><td style="background-color:#FF8B6A;padding:32px 40px;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;">CULTURE FOR CHANGE</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;color:#2D2D2D;font-weight:bold;padding-top:12px;">Το αίτημά σου ολοκληρώθηκε</div>
  </td></tr>
  <tr><td style="padding:32px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#2D2D2D;">
    <p style="margin:0 0 16px 0;">${name ? esc(name) + ',' : 'Γεια σου,'}</p>
    <p style="margin:0 0 16px 0;">Το μήνυμα που μας έστειλες μέσα από τον ιστότοπο <strong>ολοκληρώθηκε</strong>. Ευχαριστούμε που μας το επισήμανες.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;border-radius:12px;margin:0 0 20px 0;">
      <tr><td style="padding:16px 20px;font-size:15px;line-height:22px;color:#2D2D2D;">
        <strong style="display:block;margin-bottom:6px;">Τι μας είχες γράψει</strong>${quoted}
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#666666;">Αν χρειάζεσαι κάτι ακόμη, απάντησε σε αυτό το email.</p>
  </td></tr>
  <tr><td style="background-color:#2D2D2D;padding:20px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#CCCCCC;text-align:center;">
    Σωματείο Κοινωνικής και Πολιτισμικής Καινοτομίας — Culture for Change
  </td></tr>
</table>
</td></tr></table></body></html>`
}

