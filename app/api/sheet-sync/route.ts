import { NextRequest, NextResponse } from 'next/server'

// PDF + emails χρειάζονται χρόνο — μην αφήσεις το Vercel default (10s) να τα κόψει
export const maxDuration = 60
import { sendOcEmail, departureEmailHtml, farewellUrl } from '@/lib/ocEmails'
import { getSeatHolder } from '@/lib/ocRoles'
import { generateExitSurveyToken } from '@/lib/auth'
import { processPaymentCompletion } from '@/lib/paymentCompletion'

/**
 * Reverse bridge: Μητρώο Google Sheet → site/Strapi.
 *
 * Ο Apps Script του Μητρώου καλεί αυτό το endpoint (μέσω installable
 * onEdit trigger) όταν ένας άνθρωπος παίρνει απόφαση χειροκίνητα στο Sheet,
 * ώστε το Strapi (και άρα το OC) να μένει συγχρονισμένο:
 *
 *  - action "decision": Έγκριση/Απόρριψη στο «Νέα Μέλη → Προς έγκριση»
 *      → το application dossier γίνεται approved/rejected
 *  - action "payment": ΠΛΗΡΩΜΗ = «Ναι» στα ΕΓΚΕΚΡΙΜΕΝΑ
 *      → dossier completed + AssignedAM, και το μέλος δημιουργείται
 *        (κρυφό προφίλ) ή ενημερώνεται με ΑΜ/έτος/πληρωμές
 *
 * Auth: shared secret (SHEET_WEBAPP_SECRET) — ίδιο με το WEBAPP_SECRET
 * του Apps Script. Χωρίς έγκυρο secret: 401.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const SHEET_SECRET = process.env.SHEET_WEBAPP_SECRET

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  if (res.status === 204) return { ok: true, json: null }
  let json: any = null
  try {
    json = await res.json()
  } catch {
    // non-JSON response body
  }
  return { ok: res.ok, status: res.status, json }
}

/** Τελευταία αίτηση για το email (η πιο πρόσφατη υποβολή) */
async function findApplication(email: string) {
  const r = await strapi(
    `/membership-applications?filters[Email][$eqi]=${encodeURIComponent(email)}` +
    `&sort=SubmittedAt:desc&pagination[limit]=1&populate=Photo`
  )
  return r.json?.data?.[0] || null
}

export async function POST(request: NextRequest) {
  if (!SHEET_SECRET || !STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 500 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }
  if (body?.secret !== SHEET_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const email = String(body.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ ok: false, error: 'missing email' }, { status: 400 })
  }

  try {
    if (body.action === 'decision') {
      const decision = body.decision === 'approved' ? 'approved'
        : body.decision === 'rejected' ? 'rejected' : null
      if (!decision) {
        return NextResponse.json({ ok: false, error: 'bad decision' }, { status: 400 })
      }
      const app = await findApplication(email)
      if (!app) {
        return NextResponse.json({ ok: false, error: `no application for ${email}` }, { status: 404 })
      }
      const r = await strapi(`/membership-applications/${app.documentId}`, 'PUT', {
        ApplicationState: decision,
        DecisionDate: new Date().toISOString(),
        DecisionBy: 'Μητρώο (Sheet, χειροκίνητα)',
      })
      if (!r.ok) {
        return NextResponse.json({ ok: false, error: `strapi ${r.status}` }, { status: 502 })
      }
      return NextResponse.json({ ok: true, application: app.documentId, state: decision })
    }

    if (body.action === 'payment') {
      const am = Number(body.am)
      const year = Number(body.year) || new Date().getFullYear()
      if (!am) {
        return NextResponse.json({ ok: false, error: 'missing am' }, { status: 400 })
      }
      const result = await processPaymentCompletion({
        email,
        am,
        year,
        firstName: String(body.firstName || '').trim(),
        lastName: String(body.lastName || '').trim(),
        gender: String(body.gender || '').trim(),
        phone: String(body.phone || '').trim(),
        city: String(body.city || '').trim(),
        approvalDate: String(body.approvalDate || '').trim(),
      })
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
      }
      return NextResponse.json(result)
    }

    if (body.action === 'removal') {
      // Διαγραφή μέλους στο Μητρώο (2-βημη ροή του Sheet). ΗΠΙΑ αφαίρεση στο
      // Strapi: φεύγει το ΑΜ (εκτός ενεργών/OC) και το προφίλ κρύβεται — ο
      // λογαριασμός και το ιστορικό διατηρούνται. Οριστική διαγραφή δεδομένων
      // (GDPR) παραμένει χειροκίνητη πράξη στο Strapi admin.
      const found = await strapi(
        `/members?filters[Email][$eqi]=${encodeURIComponent(email)}&fields[0]=Email&fields[1]=AM&fields[2]=AdminNotes&fields[3]=Name`
      )
      const member = found.json?.data?.[0]
      if (!member) {
        return NextResponse.json({ ok: true, member: 'not found (already removed)' })
      }
      const today = new Date().toLocaleDateString('el-GR')
      const note = `Διαγραφή από μητρώο ${today}` + (member.AM ? ` (πρώην ΑΜ ${member.AM})` : '')
      const r = await strapi(`/members/${member.id}`, 'PUT', {
        AM: null,
        HideProfile: true,
        AdminNotes: member.AdminNotes ? `${member.AdminNotes} | ${note}` : note,
      })
      if (!r.ok) {
        return NextResponse.json({ ok: false, error: `member removal ${r.status}` }, { status: 502 })
      }
      // Αποχαιρετιστήριο email — await (serverless: fire-and-forget δεν φεύγει)
      const exitName = String(member.Name || '').trim().split(' ')[0] || 'μέλος'
      const comSigner = await getSeatHolder('community')
      const fUrl = farewellUrl(generateExitSurveyToken(member.documentId, String(member.Name || '').trim()))
      const tpl = departureEmailHtml(exitName, comSigner?.engName || comSigner?.name || 'Culture for Change — Community', fUrl)
      const departureEmailSent = await sendOcEmail(email, tpl.subject, tpl.html)
      return NextResponse.json({ ok: true, member: member.documentId, removed: true, departureEmailSent })
    }

    return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
  } catch (error) {
    console.error('sheet-sync error:', error)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
