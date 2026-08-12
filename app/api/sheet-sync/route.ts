import { NextRequest, NextResponse } from 'next/server'
import {
  sendOcEmail, departureEmailHtml, farewellUrl, welcomeEmailHtml, financeWelcomeEmailHtml,
  IT_FROM, IT_EMAIL, WELCOME_CC, FINANCE_FROM, FINANCE_EMAIL,
} from '@/lib/ocEmails'
import { getSeatHolder } from '@/lib/ocRoles'
import { generateExitSurveyToken } from '@/lib/auth'
import { generateReceiptPdf } from '@/lib/receiptPdf'

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

/**
 * Δημόσια πεδία προφίλ από τον φάκελο της αίτησης, με σεβασμό στο
 * PublishConsent που επέλεξε ο/η αιτών/ούσα. Χρησιμοποιείται στη
 * δημιουργία του μέλους κατά την πληρωμή — το προφίλ ενεργοποιείται
 * (ορατό) με τα στοιχεία που συναίνεσε να δημοσιευτούν.
 */
function profileFromApplication(app: any): Record<string, any> {
  const consent: string[] = Array.isArray(app?.PublishConsent) ? app.PublishConsent : []
  const has = (k: string) => consent.includes(k)
  const links: string[] = []
  if (has('website') && app.Website) links.push(String(app.Website).trim())
  if (has('facebook') && app.Facebook) links.push(String(app.Facebook).trim())
  if (has('linkedin') && app.LinkedIn) links.push(String(app.LinkedIn).trim())
  if (has('instagram') && app.Instagram) links.push(String(app.Instagram).trim())
  const fields = Array.isArray(app.FieldsOfActivity)
    ? app.FieldsOfActivity.join(', ')
    : String(app.FieldsOfActivity || '').trim()
  const bioText = String(app.Bio || '').trim()
  const out: Record<string, any> = {
    Bio: [{ type: 'paragraph', children: [{ type: 'text', text: bioText || ' ' }] }],
    FieldsOfWork: fields || ' ',
    City: String(app.ResidenceCity || '').trim() || ' ',
    Province: String(app.ResidenceRegion || '').trim() || ' ',
    Websites: links.join(', ') || undefined,
    Phone: has('phone') && app.Phone ? String(app.Phone).trim() : undefined,
  }
  if (app.Photo?.id) {
    out.Image = [app.Photo.id]
    out.ProfileImageAltText = `Φωτογραφία: ${app.FirstName || ''} ${app.LastName || ''}`.trim()
  }
  return out
}

const GENDER_MAP: Record<string, string> = {
  'Θ': 'Γυναίκα', 'Α': 'Άνδρας',
  'Γυναίκα': 'Γυναίκα', 'Άνδρας': 'Άνδρας',
  'Μη-δυαδικό': 'Μη-δυαδικό', 'Επιθυμώ να μη δηλώσω': 'Επιθυμώ να μη δηλώσω',
}

/** «dd/MM/yyyy» ή «dd.MM.yyyy» → «yyyy-MM-dd», αλλιώς null */
function parseSheetDate(s: string | undefined): string | null {
  const m = /(\d{1,2})[./](\d{1,2})[./](20\d\d)/.exec(String(s || ''))
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
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

      // Ο φάκελος της αίτησης οδηγεί το προφίλ (δημόσια στοιχεία με συναίνεση)
      const app = await findApplication(email)

      // 1) Μέλος: ενημέρωση αν υπάρχει, αλλιώς δημιουργία με τα στοιχεία της
      // αίτησης. Η πληρωμή ΕΝΕΡΓΟΠΟΙΕΙ το προφίλ (ορατό σε όλους).
      const found = await strapi(
        `/members?filters[Email][$eqi]=${encodeURIComponent(email)}&fields[0]=Email&fields[1]=Payments`
      )
      const existing = found.json?.data?.[0] || null

      // Ίδια σημασιολογία με το Sheet: προηγούμενα έτη = 0 (δεν όφειλε),
      // έτος πληρωμής = 1. Υπάρχουσες τιμές δεν πατιούνται.
      const payments: Record<string, number> = {}
      for (let y2 = 2021; y2 < year; y2++) payments[String(y2)] = 0
      payments[String(year)] = 1
      if (existing?.Payments && typeof existing.Payments === 'object') {
        for (const [k, v] of Object.entries(existing.Payments)) {
          if (v === 0 || v === 1) payments[k] = v as number
        }
        payments[String(year)] = 1
      }

      const memberData: Record<string, any> = {
        AM: am,
        RegistrationYear: year,
        Payments: payments,
      }
      const gender = GENDER_MAP[String(body.gender || '').trim()]
      if (gender) memberData.Gender = gender
      const approval = parseSheetDate(body.approvalDate)
      if (approval) memberData.BoardApprovalDate = approval

      let memberDocId: string | null = null
      if (existing) {
        // Υπάρχων λογαριασμός: ΔΕΝ πατάμε τα στοιχεία του — μόνο μητρώο +
        // ενεργοποίηση (η πληρωμή κάνει το προφίλ ορατό)
        // ΠΡΟΣΟΧΗ: το custom member controller δέχεται ΜΟΝΟ αριθμητικό id
        const r = await strapi(`/members/${existing.id}`, 'PUT', { ...memberData, HideProfile: false })
        if (!r.ok) {
          return NextResponse.json({ ok: false, error: `member update ${r.status}` }, { status: 502 })
        }
        memberDocId = existing.documentId
      } else {
        const name = `${String(body.firstName || '').trim()} ${String(body.lastName || '').trim()}`.trim()
        const profile = app ? profileFromApplication(app) : {}
        const r = await strapi('/members', 'POST', {
          Bio: [{ type: 'paragraph', children: [{ type: 'text', text: ' ' }] }],
          FieldsOfWork: ' ',
          City: String(body.city || '').trim() || ' ',
          Province: ' ',
          ProfileImageAltText: ' ',
          Phone: String(body.phone || '').trim() || undefined,
          ...profile,
          ...memberData,
          Name: name || email,
          Email: email,
          HideProfile: false,
        })
        if (!r.ok) {
          return NextResponse.json({ ok: false, error: `member create ${r.status}` }, { status: 502 })
        }
        memberDocId = r.json?.data?.documentId || null
      }

      // 2) Application dossier → completed + ΑΜ + σύνδεση με το μέλος
      let appResult = 'no application'
      if (app) {
        const r = await strapi(`/membership-applications/${app.documentId}`, 'PUT', {
          ApplicationState: 'completed',
          AssignedAM: am,
          ...(app.DecisionDate ? {} : { DecisionDate: new Date().toISOString() }),
          DecisionBy: app.DecisionBy || 'Μητρώο (Sheet, χειροκίνητα)',
          ...(memberDocId && { linkedMember: { connect: [memberDocId] } }),
        })
        appResult = r.ok ? 'completed' : `strapi ${r.status}`
      }

      // 3) Emails ολοκλήρωσης — ΚΟΙΝΟ σημείο για πληρωμές από Sheet ΚΑΙ από OC:
      //    (α) welcome/πρώτη σύνδεση από IT (+cc), (β) απόδειξη από finance@
      const firstName = String(app?.FirstName || body.firstName || '').trim() || 'μέλος'
      const fullName = `${String(app?.FirstName || body.firstName || '').trim()} ${String(app?.LastName || body.lastName || '').trim()}`.trim() || email
      let welcomeSent = false
      let receiptSent = false
      try {
        const itSigner = await getSeatHolder('it')
        const wTpl = welcomeEmailHtml(firstName, itSigner?.engName || itSigner?.name || 'Culture for Change — IT')
        welcomeSent = await sendOcEmail(email, wTpl.subject, wTpl.html, { from: IT_FROM, replyTo: IT_EMAIL, cc: WELCOME_CC })
      } catch (err) {
        console.error('sheet-sync payment: welcome email failed:', err)
      }
      try {
        const finSigner = await getSeatHolder('financer')
        const fTpl = financeWelcomeEmailHtml(firstName, finSigner?.engName || finSigner?.name || 'Culture for Change — Finance')
        const pdf = await generateReceiptPdf({
          name: fullName,
          email,
          am,
          year,
          registrationFee: 10,
          subscriptionFee: 35,
          date: new Date(),
          taxId: app?.TaxId || null,
          city: app?.ResidenceCity || String(body.city || '').trim() || null,
          financerName: finSigner?.name || null,   // ελληνικό όνομα για την υπογραφή
          ...(app?.ReceiptType === 'Εταιρεία' && {
            companyName: app.CompanyName || null,
            companyAddress: app.CompanyAddress || null,
            companyTaxId: app.CompanyTaxId || null,
          }),
        })
        receiptSent = await sendOcEmail(email, fTpl.subject, fTpl.html, {
          from: FINANCE_FROM,
          replyTo: FINANCE_EMAIL,
          attachments: [{ filename: `apodeixi-eispraxis-${year}-${am}.pdf`, content: Buffer.from(pdf).toString('base64') }],
        })
      } catch (err) {
        console.error('sheet-sync payment: receipt email failed:', err)
      }

      return NextResponse.json({
        ok: true,
        member: memberDocId,
        memberWas: existing ? 'updated' : 'created',
        application: appResult,
        welcomeSent,
        receiptSent,
      })
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
