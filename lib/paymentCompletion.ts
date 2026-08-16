import { getSeatHolder } from '@/lib/ocRoles'
import {
  sendOcEmail, welcomeEmailHtml, financeWelcomeEmailHtml,
  IT_FROM, IT_EMAIL, WELCOME_CC, FINANCE_FROM, FINANCE_EMAIL,
} from '@/lib/ocEmails'
import { generateReceiptPdf } from '@/lib/receiptPdf'
import { createReceipt, markReceiptSent, syncReceiptToSheet, athensToday } from '@/lib/receipts'

/**
 * Ολοκλήρωση πληρωμής μέλους — ΚΟΙΝΗ λογική για τα δύο σημεία εκκίνησης:
 *  - /api/sheet-sync (payment): ο/η Financer έβαλε ΠΛΗΡΩΜΗ=Ναι στο Sheet
 *  - /api/oc/applications/payment (paid): κουμπί «Πληρώθηκε» στο OC — το
 *    Sheet κάνει μόνο την προαγωγή (skipSync) και ο server τρέχει αυτό
 *    απευθείας, χωρίς εμφωλευμένη κλήση Vercel μέσα από το Google.
 * Κάνει: δημιουργία/ενεργοποίηση μέλους (με σεβασμό στο PublishConsent),
 * ολοκλήρωση φακέλου, welcome email (IT) + απόδειξη PDF (finance).
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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
    // non-JSON body
  }
  return { ok: res.ok, status: res.status, json }
}

/** Τελευταία αίτηση για το email (με φωτογραφία για το προφίλ) */
export async function findApplicationByEmail(email: string) {
  const r = await strapi(
    `/membership-applications?filters[Email][$eqi]=${encodeURIComponent(email)}` +
    `&sort=SubmittedAt:desc&pagination[limit]=1&populate=Photo`
  )
  return r.json?.data?.[0] || null
}

const GENDER_MAP: Record<string, string> = {
  'Θ': 'Γυναίκα', 'Α': 'Άνδρας',
  'Γυναίκα': 'Γυναίκα', 'Άνδρας': 'Άνδρας',
  'Μη-δυαδικό': 'Μη-δυαδικό', 'Επιθυμώ να μη δηλώσω': 'Επιθυμώ να μη δηλώσω',
}

/** «dd/MM/yyyy» ή «dd.MM.yyyy» → «yyyy-MM-dd», αλλιώς null */
function parseSheetDate(s: string | undefined | null): string | null {
  const m = /(\d{1,2})[./](\d{1,2})[./](20\d\d)/.exec(String(s || ''))
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/**
 * Δημόσια πεδία προφίλ από τον φάκελο της αίτησης, με σεβασμό στο
 * PublishConsent — το προφίλ ενεργοποιείται με όσα συναίνεσε ο/η αιτών/ούσα.
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

export interface PaymentCompletionInput {
  email: string
  am: number
  year: number
  firstName?: string
  lastName?: string
  gender?: string
  phone?: string
  city?: string
  approvalDate?: string
}

export interface PaymentCompletionResult {
  ok: boolean
  error?: string
  member?: string | null
  memberWas?: 'updated' | 'created'
  application?: string
  welcomeSent?: boolean
  receiptSent?: boolean
}

export async function processPaymentCompletion(input: PaymentCompletionInput): Promise<PaymentCompletionResult> {
  const email = input.email.trim().toLowerCase()
  const { am, year } = input

  // Ο φάκελος της αίτησης οδηγεί το προφίλ και την απόδειξη
  const app = await findApplicationByEmail(email)

  // 1) Μέλος: ενημέρωση αν υπάρχει, αλλιώς δημιουργία από την αίτηση.
  // Η πληρωμή ΕΝΕΡΓΟΠΟΙΕΙ το προφίλ (ορατό σε όλους).
  const found = await strapi(
    `/members?filters[Email][$eqi]=${encodeURIComponent(email)}&fields[0]=Email&fields[1]=Payments`
  )
  const existing = found.json?.data?.[0] || null

  // Ίδια σημασιολογία με το Sheet: προηγούμενα έτη = 0, έτος πληρωμής = 1.
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
  const gender = GENDER_MAP[String(input.gender || '').trim()]
  if (gender) memberData.Gender = gender
  const approval = parseSheetDate(input.approvalDate)
  if (approval) memberData.BoardApprovalDate = approval

  let memberDocId: string | null = null
  let memberWas: 'updated' | 'created'
  if (existing) {
    // Υπάρχων λογαριασμός: δεν πατάμε τα στοιχεία του — μητρώο + ενεργοποίηση
    // ΠΡΟΣΟΧΗ: το custom member controller δέχεται ΜΟΝΟ αριθμητικό id
    const r = await strapi(`/members/${existing.id}`, 'PUT', { ...memberData, HideProfile: false })
    if (!r.ok) return { ok: false, error: `member update ${r.status}` }
    memberDocId = existing.documentId
    memberWas = 'updated'
  } else {
    const name = `${String(input.firstName || '').trim()} ${String(input.lastName || '').trim()}`.trim()
    const profile = app ? profileFromApplication(app) : {}
    const r = await strapi('/members', 'POST', {
      Bio: [{ type: 'paragraph', children: [{ type: 'text', text: ' ' }] }],
      FieldsOfWork: ' ',
      City: String(input.city || '').trim() || ' ',
      Province: ' ',
      ProfileImageAltText: ' ',
      Phone: String(input.phone || '').trim() || undefined,
      ...profile,
      ...memberData,
      Name: name || email,
      Email: email,
      HideProfile: false,
    })
    if (!r.ok) return { ok: false, error: `member create ${r.status}` }
    memberDocId = r.json?.data?.documentId || null
    memberWas = 'created'
  }

  // 2) Φάκελος → completed + ΑΜ + σύνδεση με το μέλος
  let application = 'no application'
  if (app) {
    const r = await strapi(`/membership-applications/${app.documentId}`, 'PUT', {
      ApplicationState: 'completed',
      AssignedAM: am,
      ...(app.DecisionDate ? {} : { DecisionDate: new Date().toISOString() }),
      DecisionBy: app.DecisionBy || 'Μητρώο (Sheet, χειροκίνητα)',
      ...(memberDocId && { linkedMember: { connect: [memberDocId] } }),
    })
    application = r.ok ? 'completed' : `strapi ${r.status}`
  }

  // 3) Emails ολοκλήρωσης: (α) welcome/πρώτη σύνδεση από IT (+cc),
  //    (β) απόδειξη είσπραξης από finance@ — πάντα awaited (serverless)
  const firstName = String(app?.FirstName || input.firstName || '').trim() || 'μέλος'
  const fullName = `${String(app?.FirstName || input.firstName || '').trim()} ${String(app?.LastName || input.lastName || '').trim()}`.trim() || email
  let welcomeSent = false
  let receiptSent = false
  try {
    const itSigner = await getSeatHolder('it')
    const wTpl = welcomeEmailHtml(firstName, itSigner?.engName || itSigner?.name || 'Culture for Change — IT')
    welcomeSent = await sendOcEmail(email, wTpl.subject, wTpl.html, { from: IT_FROM, replyTo: IT_EMAIL, cc: WELCOME_CC })
  } catch (err) {
    console.error('payment completion: welcome email failed:', err)
  }
  try {
    // Σημασιολογικό φρένο: αν υπάρχει ήδη απόδειξη συνδρομής/εγγραφής για
    // αυτό το μέλος+έτος (π.χ. replay του sheet-sync), ΔΕΝ εκδίδουμε δεύτερη.
    const dupQ = 'filters[Type][$in][0]=subscription&filters[Type][$in][1]=registration' +
      `&filters[SubscriptionYear][$eq]=${year}&fields[0]=Number&pagination[limit]=1`
    const dupByRel = memberDocId
      ? await strapi(`/receipts?filters[member][documentId][$eq]=${memberDocId}&${dupQ}`)
      : null
    const dupByName = !dupByRel?.json?.data?.[0]
      ? await strapi(`/receipts?filters[MemberName][$eqi]=${encodeURIComponent(fullName)}&${dupQ}`)
      : null
    const dupHit = dupByRel?.json?.data?.[0] || dupByName?.json?.data?.[0]
    if (dupHit) {
      console.log(`payment completion: receipt already exists for ${fullName}/${year} (ΑΠ. ΕΙΣ. ${dupHit.Number}) — skipping issue`)
      return { ok: true, member: memberDocId, memberWas, application, welcomeSent, receiptSent: false }
    }

    const isCompany = app?.ReceiptType === 'Εταιρεία'
    // Επίσημος αριθμός από την ενιαία σειρά — αν η σειρά δεν έχει
    // αρχικοποιηθεί (πριν το seeding), ΔΕΝ εκδίδουμε απόδειξη· το welcome
    // έχει ήδη φύγει και το receiptSent:false το δείχνει στο αποτέλεσμα.
    const receipt = await createReceipt({
      type: 'registration',
      amount: 45,
      registrationFee: 10,
      subscriptionFee: 35,
      subscriptionYear: year,
      memberName: fullName,
      memberDocId,
      paymentMethod: 'bank',
      createdBy: 'payment-completion',
      ...(isCompany && {
        companyName: app.CompanyName || null,
        companyAddress: app.CompanyAddress || null,
        companyTaxId: app.CompanyTaxId || null,
      }),
    })
    const finSigner = await getSeatHolder('financer')
    const fTpl = financeWelcomeEmailHtml(firstName, finSigner?.engName || finSigner?.name || 'Culture for Change — Finance')
    const pdf = await generateReceiptPdf({
      name: fullName,
      email,
      am,
      year,
      receiptNumber: receipt.number,
      registrationFee: 10,
      subscriptionFee: 35,
      date: new Date(),
      taxId: app?.TaxId || null,
      city: app?.ResidenceCity || String(input.city || '').trim() || null,
      financerName: finSigner?.name || null,
      ...(isCompany && {
        companyName: app.CompanyName || null,
        companyAddress: app.CompanyAddress || null,
        companyTaxId: app.CompanyTaxId || null,
      }),
    })
    receiptSent = await sendOcEmail(email, fTpl.subject, fTpl.html, {
      from: FINANCE_FROM,
      replyTo: FINANCE_EMAIL,
      cc: [FINANCE_EMAIL],   // αντίγραφο της απόδειξης στο αρχείο του finance@
      attachments: [{ filename: `apodeixi-eispraxis-${receipt.number}.pdf`, content: Buffer.from(pdf).toString('base64') }],
    })
    if (receiptSent) {
      try { await markReceiptSent(receipt.documentId) } catch (e) {
        console.error('payment completion: markReceiptSent failed (non-fatal):', e)
      }
    }
    // Φάση Γ: γραμμή εγγραφής στο ΕΣΟΔΑ sheet (best-effort, awaited)
    try {
      await syncReceiptToSheet(receipt.documentId, {
        number: receipt.number,
        type: 'registration',
        amount: 45,
        registrationFee: 10,
        subscriptionYear: year,
        paymentDate: athensToday(),
        issueDate: athensToday(),
        memberName: fullName,
        payerName: null,
        method: 'bank',
        emailSent: receiptSent,
        sentAt: receiptSent ? new Date().toISOString() : null,
      })
    } catch (e) {
      console.error('payment completion: sheet sync failed (non-fatal):', e)
    }
  } catch (err) {
    console.error('payment completion: receipt email failed:', err)
  }

  return { ok: true, member: memberDocId, memberWas, application, welcomeSent, receiptSent }
}
