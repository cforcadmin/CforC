import { NextRequest, NextResponse } from 'next/server'
import { athensToday } from '@/lib/events'

export const maxDuration = 60

/**
 * Η διαγραφή που κάνει την υπόσχεση αληθινή.
 *
 * Δύο ΞΕΧΩΡΙΣΤΑ ρολόγια, γιατί τα δεδομένα δεν είναι ίδια:
 *
 *  1. ΔΙΑΤΡΟΦΙΚΑ (άρθρο 9 — υγεία/θρησκεία). Σβήνονται ΠΡΩΤΑ και νωρίς:
 *     DietaryPurgeAfter, που βγαίνει από το DietaryPurgeDays της δράσης
 *     (προεπιλογή 0 = αμέσως μετά). Η υπόλοιπη δήλωση ΜΕΝΕΙ — γι' αυτό το
 *     πεδίο ζει χωριστά εξαρχής.
 *  2. ΤΑ ΥΠΟΛΟΙΠΑ ΠΡΟΣΩΠΙΚΑ. Σβήνονται στο PersonalDataPurgeAfter και
 *     αφήνουν ΜΗ ΠΡΟΣΩΠΙΚΟ απομεινάρι: ιδιότητα, επιλογές συνεδριών και
 *     κατάσταση. Έτσι «πόσοι ήρθαν δια ζώσης το 2026» απαντιέται για πάντα
 *     χωρίς να κρατάμε κανέναν άνθρωπο.
 *
 * ΟΧΙ διαγραφή ολόκληρης της εγγραφής: το Strapi token δεν μπορεί να
 * διαγράψει, και ένα μηδενισμένο πεδίο είναι ούτως ή άλλως καλύτερη
 * απόδειξη συμμόρφωσης από μια γραμμή που εξαφανίστηκε.
 *
 * Οι χρόνοι είναι ΔΕΔΟΜΕΝΑ της κάθε δράσης. Η απάντηση του DPO θα είναι
 * αλλαγή τιμής στο Strapi, όχι αλλαγή αυτού του αρχείου.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

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

function authorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true
  // Το Vercel cron στέλνει δικό του header
  return !!request.headers.get('x-vercel-cron')
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 401 })
  }
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  const today = athensToday()
  const report = { dietaryPurged: 0, personalPurged: 0, errors: [] as string[] }

  // ── 1. Διατροφικά που έληξαν ──
  const dRes = await strapi(
    `/event-registrations?filters[DietaryPurgeAfter][$lte]=${today}`
    + '&filters[DietaryPurgedAt][$null]=true&pagination[limit]=200')
  for (const r of dRes.json?.data || []) {
    const upd = await strapi(`/event-registrations/${r.documentId}`, 'PUT', {
      Dietary: null,
      DietaryPurgedAt: new Date().toISOString(),
    })
    if (upd.ok) report.dietaryPurged++
    else report.errors.push(`dietary ${r.documentId}`)
  }

  // ── 2. Τα υπόλοιπα προσωπικά που έληξαν ──
  // Το Email μηδενίζεται ΤΕΛΕΥΤΑΙΟ στη σειρά των πεδίων αλλά στην ίδια
  // κλήση: δεν υπάρχει ενδιάμεση κατάσταση όπου μένει μισό προσωπικό.
  const pRes = await strapi(
    `/event-registrations?filters[PersonalDataPurgeAfter][$lte]=${today}`
    + '&filters[Email][$notNull]=true&pagination[limit]=200')
  for (const r of pRes.json?.data || []) {
    const upd = await strapi(`/event-registrations/${r.documentId}`, 'PUT', {
      FirstName: null, LastName: null, Email: null, Phone: null,
      Dietary: null, AgendaTopic: null, GeneralComments: null,
      CapacityOther: null, SubmittedIp: null, ConfirmTokenHash: null,
      linkedMember: null,
      ...(r.DietaryPurgedAt ? {} : { DietaryPurgedAt: new Date().toISOString() }),
    })
    if (upd.ok) report.personalPurged++
    else report.errors.push(`personal ${r.documentId}`)
  }

  return NextResponse.json({ ok: report.errors.length === 0, today, ...report })
}
