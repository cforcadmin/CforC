import { NextRequest, NextResponse } from 'next/server'
import { applyLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { checkCsrf } from '@/lib/csrf'
import { appendApplicantToSheet, sheetsConfigured } from '@/lib/googleSheets'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cultureforchange.net'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const RESEND_API_KEY = process.env.RESEND_API_KEY

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BIO_WORDS = 200
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const AFM_RE = /^\d{9}$/

// Fields copied verbatim from the payload into the Strapi entry
const STRING_FIELDS = [
  'FirstName', 'LastName', 'NameLatin', 'Profession', 'AgeRange', 'Gender', 'Disability',
  'ResidenceCity', 'ResidenceRegion', 'Address', 'ActivityCityA', 'ActivityCityB',
  'Email', 'Phone', 'Website', 'Facebook', 'LinkedIn', 'Instagram', 'BoschProfile',
  'Bio', 'BioEn', 'Education', 'BoschAlumni', 'BoschPrograms', 'StartFellow',
  'Experience', 'ProposedSolutions', 'NetworkContribution',
  'ReceiptType', 'FatherName', 'TaxId', 'CompanyName', 'CompanyAddress', 'CompanyTaxId',
] as const
const JSON_FIELDS = [
  'PublishConsent', 'EmploymentStatus', 'ActionFormats', 'AudienceGroups', 'Themes', 'Challenges',
] as const
const BOOL_FIELDS = ['NewsletterOptIn', 'AcceptStatute', 'AcceptRegulation', 'AcceptPrivacy'] as const

const REQUIRED_STRINGS = [
  'FirstName', 'LastName', 'Profession', 'AgeRange', 'Gender', 'Disability',
  'ResidenceCity', 'Address', 'ActivityCityA', 'Email', 'Phone', 'Bio',
  'Education', 'BoschAlumni', 'StartFellow', 'Experience', 'FieldsOfActivity',
]
const REQUIRED_ARRAYS = ['EmploymentStatus', 'ActionFormats', 'AudienceGroups', 'Themes', 'Challenges']

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function validate(data: Record<string, any>): string | null {
  for (const f of REQUIRED_STRINGS) {
    if (typeof data[f] !== 'string' || data[f].trim() === '') return `Λείπει υποχρεωτικό πεδίο: ${f}`
  }
  for (const f of REQUIRED_ARRAYS) {
    if (!Array.isArray(data[f]) || data[f].length === 0) return `Λείπει υποχρεωτικό πεδίο: ${f}`
  }
  if (!EMAIL_RE.test(data.Email.trim())) return 'Μη έγκυρη διεύθυνση email'
  if (String(data.Phone).replace(/\D/g, '').length < 10) return 'Μη έγκυρο τηλέφωνο'
  if (wordCount(data.Bio) > MAX_BIO_WORDS) return `Το βιογραφικό ξεπερνά τις ${MAX_BIO_WORDS} λέξεις`
  if (data.BoschAlumni === 'Ναι' && String(data.BoschPrograms || '').trim() === '') return 'Λείπουν τα προγράμματα Bosch'
  if (data.ReceiptType === 'Εταιρεία') {
    if (String(data.CompanyName || '').trim() === '') return 'Λείπει η επωνυμία εταιρείας'
    if (String(data.CompanyAddress || '').trim() === '') return 'Λείπει η διεύθυνση εταιρείας'
    if (!AFM_RE.test(String(data.CompanyTaxId || ''))) return 'Το ΑΦΜ εταιρείας πρέπει να έχει 9 ψηφία'
  }
  if (data.TaxId && !AFM_RE.test(String(data.TaxId))) return 'Το ΑΦΜ πρέπει να έχει 9 ψηφία'
  if (!data.AcceptStatute || !data.AcceptRegulation || !data.AcceptPrivacy) return 'Απαιτείται αποδοχή των όρων'
  return null
}

export async function POST(request: NextRequest) {
  try {
    if (!STRAPI_URL || !STRAPI_API_TOKEN) {
      return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης διακομιστή' }, { status: 500 })
    }

    const csrfError = checkCsrf(request)
    if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rate = applyLimiter.check(ip)
    if (!rate.allowed) {
      return NextResponse.json({ error: getRateLimitErrorMessage(rate.resetTime) }, { status: 429 })
    }

    const form = await request.formData()

    // Honeypot: bots fill every field — humans never see this one
    if (String(form.get('website_hp') || '') !== '') {
      return NextResponse.json({ success: true })
    }

    const rawData = form.get('data')
    if (typeof rawData !== 'string') {
      return NextResponse.json({ error: 'Μη έγκυρη αίτηση' }, { status: 400 })
    }
    let data: Record<string, any>
    try {
      data = JSON.parse(rawData)
    } catch {
      return NextResponse.json({ error: 'Μη έγκυρη αίτηση' }, { status: 400 })
    }

    const photo = form.get('photo')
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: 'Η φωτογραφία είναι υποχρεωτική' }, { status: 400 })
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Η φωτογραφία ξεπερνά τα 5MB' }, { status: 400 })
    }
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: 'Επιτρέπονται μόνο JPG/PNG/WebP' }, { status: 400 })
    }

    const validationError = validate(data)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // 1) Upload photo to Strapi Media Library
    const uploadForm = new FormData()
    const safeName = `application_${Date.now()}.${photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'}`
    uploadForm.append('files', photo, safeName)
    const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: uploadForm,
    })
    if (!uploadRes.ok) {
      console.error('Apply: photo upload failed', uploadRes.status, await uploadRes.text().catch(() => ''))
      return NextResponse.json({ error: 'Αποτυχία μεταφόρτωσης φωτογραφίας — δοκίμασε ξανά' }, { status: 502 })
    }
    const uploaded = await uploadRes.json()
    const photoId = uploaded?.[0]?.id
    if (!photoId) {
      return NextResponse.json({ error: 'Αποτυχία μεταφόρτωσης φωτογραφίας — δοκίμασε ξανά' }, { status: 502 })
    }

    // 2) Create the application entry (the permanent dossier).
    // Empty optional strings are OMITTED — Strapi validates constraints like
    // TaxId minLength 9 even against "", which would reject the whole entry.
    const entry: Record<string, any> = { Photo: photoId, ApplicationState: 'submitted', SubmittedAt: new Date().toISOString() }
    for (const f of STRING_FIELDS) {
      const v = typeof data[f] === 'string' ? data[f].trim() : ''
      if (v !== '') entry[f] = v
    }
    for (const f of JSON_FIELDS) entry[f] = Array.isArray(data[f]) ? data[f] : []
    for (const f of BOOL_FIELDS) entry[f] = !!data[f]
    // FieldsOfActivity: the taxonomy selector emits a comma string, but the
    // Strapi column is JSON — convert to an array (a raw string 500s Strapi)
    entry.FieldsOfActivity = String(data.FieldsOfActivity || '')
      .split(',').map((s: string) => s.trim()).filter(Boolean)

    const createRes = await fetch(`${STRAPI_URL}/api/membership-applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({ data: entry }),
    })
    if (!createRes.ok) {
      console.error('Apply: entry creation failed', createRes.status, await createRes.text().catch(() => ''))
      return NextResponse.json({ error: 'Αποτυχία υποβολής — δοκίμασε ξανά σε λίγο' }, { status: 502 })
    }
    const created = await createRes.json()
    const documentId = created?.data?.documentId || null

    // 3) Mirror identity row into the Sheet (best-effort — Strapi is the
    // source of truth; on failure the entry keeps SheetSynced=false and we
    // re-sync later from the OC)
    if (sheetsConfigured() && documentId) {
      try {
        const today = new Intl.DateTimeFormat('el-GR', {
          day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Athens',
        }).format(new Date())
        await appendApplicantToSheet({
          applicationDate: today,
          lastName: data.LastName.trim(),
          firstName: data.FirstName.trim(),
          gender: data.Gender || '',
          email: data.Email.trim(),
          phone: data.Phone.trim(),
          residenceCity: data.ResidenceCity.trim(),
          activityCities: data.ActivityCityA.trim(),
          reviewUrl: `${SITE_URL}/oc/applications/${documentId}`,
        })
        await fetch(`${STRAPI_URL}/api/membership-applications/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
          body: JSON.stringify({ data: { SheetSynced: true } }),
        })
      } catch (sheetErr) {
        console.error('Apply: sheet sync failed (entry saved, SheetSynced=false)', sheetErr)
      }
    }

    // 4) Confirmation email (best-effort — the application is already saved)
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Culture for Change <noreply@cultureforchange.net>',
            to: [data.Email.trim()],
            subject: 'Λάβαμε την αίτησή σου — Culture for Change',
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#2D2D2D;">
                <h2 style="color:#FF8B6A;">Ευχαριστούμε, ${escapeHtml(data.FirstName.trim())}!</h2>
                <p>Λάβαμε την αίτηση εγγραφής σου στο Culture for Change.</p>
                <p>Η Διοικητική Ομάδα θα την εξετάσει και θα λάβεις απάντηση στο email σου
                το συντομότερο δυνατόν, το αργότερο εντός <strong>14 ημερών</strong>.</p>
                <p>Μέχρι τότε, μπορείς να γνωρίσεις καλύτερα το δίκτυο στο
                <a href="https://cultureforchange.net" style="color:#FF8B6A;">cultureforchange.net</a>.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                <p style="font-size:12px;color:#888;">Αυτό είναι αυτοματοποιημένο μήνυμα — αν έχεις
                απορίες, γράψε μας στο hello@cultureforchange.net</p>
              </div>`,
          }),
        })
      } catch (emailErr) {
        console.error('Apply: confirmation email failed', emailErr)
      }
    }

    return NextResponse.json({ success: true, id: created?.data?.documentId || null })
  } catch (error) {
    console.error('Apply submission error:', error)
    return NextResponse.json({ error: 'Κάτι πήγε στραβά — δοκίμασε ξανά' }, { status: 500 })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
