import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, generateRenewalClaimToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import { OC_LAST_SEAT_COOKIE } from '@/components/oc/ocPrefs'
import { updateMemberEmailInSheet, sheetsConfigured } from '@/lib/googleSheets'
import { changeNewsletterSubscriberEmail, changeSenderSubscriberEmail, type StepResult } from '@/lib/memberEmailChange'
import { EMAIL_CHANGE_REQUEST_SOURCES } from '@/lib/memberEmailChangeOptions'
import { owedSubscriptionYears, SUBSCRIPTION_FEE } from '@/lib/subscriptionOwed'
import { normaliseGreek } from '@/lib/greekText'
import { strapiFetch } from '@/lib/strapiFetch'
import { sendOcEmail, emailChangedEmailHtml, renewalClaimUrl, IT_FROM, IT_EMAIL, ADMIN_EMAIL } from '@/lib/ocEmails'

/**
 * Αλλαγή email μέλους από το OC (Ασφάλεια++, θέση IT μόνο).
 *
 * Το email ζει σε ΠΕΝΤΕ σημεία και κανένα δεν ενημερώνει το άλλο:
 *   1. Strapi `members.Email`          — η ταυτότητα σύνδεσης (magic link, κωδικός)
 *   2. Strapi `membership-applications` — ο φάκελος της αίτησης (τον ψάχνει
 *      με email η γέφυρα Sheet→site, /api/sheet-sync)
 *   3. Μητρώο Google Sheet              — ενέργεια «updateEmail» στο Apps Script
 *   4. Strapi `newsletter-subscribers`
 *   5. Sender, ομάδα Paid
 *   6. Ειδοποίηση στο μέλος — στο ΝΕΟ email, κοινοποίηση ΠΑΛΙΟ + it@ + hello@, από it@
 *
 * Το (1) είναι η πηγή αλήθειας: αν αποτύχει, σταματάμε και δεν αγγίζουμε
 * τίποτα άλλο. Τα υπόλοιπα τρέχουν ΟΛΑ, το καθένα με δικό του αποτέλεσμα —
 * ένα βήμα που απέτυχε φαίνεται στην οθόνη με το όνομά του, ώστε να γίνει
 * με το χέρι ακριβώς αυτό και όχι όλα από την αρχή.
 *
 * GET ?q=όνομα
 *   Αναζήτηση μέλους κατά όνομα (ελληνικά χωρίς τόνους/πεζά-κεφαλαία, ή
 *   λατινικό όνομα, ή κομμάτι email). Τα ονόματα ΔΕΝ είναι μοναδικά — κάθε
 *   αποτέλεσμα φέρει ΑΜ και τρέχον email, ώστε το IT να διαλέξει ρητά.
 *
 * POST { memberDocId, newEmail, dryRun?, requestedVia, requestedDetail?, includeOwedReminder? }
 *   dryRun: λέει ΠΟΥ υπάρχει το τρέχον email και αν εκκρεμούν συνδρομές,
 *   χωρίς καμία αλλαγή — η οθόνη το δείχνει μόλις επιλεγεί το μέλος.
 *   requestedVia: ΠΩΣ ζητήθηκε η αλλαγή (μία από EMAIL_CHANGE_REQUEST_SOURCES) —
 *   υποχρεωτικό στην αλλαγή, γράφεται στο AdminNotes μαζί με ημερομηνία/ώρα.
 *   requestedDetail: υποχρεωτικό όταν requestedVia = «Άλλο».
 *   includeOwedReminder: αν το μέλος οφείλει συνδρομές, να μπει το ευγενικό
 *   σημείωμα πληρωμής στην ειδοποίηση (προεπιλογή: ναι — το IT το ξετικάρει).
 */

// Τα βήματα προς Apps Script + Sender είναι αργά (κρύα εκκίνηση ~55s)
export const maxDuration = 120

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MEMBER_FIELDS = '&fields[0]=Email&fields[1]=AM&fields[2]=AdminNotes&fields[3]=Name&fields[4]=Payments&fields[5]=RegistrationYear'

/** Ημερομηνία + ώρα Ελλάδας — ο server τρέχει σε UTC, το ίχνος πρέπει να διαβάζεται από άνθρωπο στην Αθήνα */
const athensNow = () => new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'short', timeStyle: 'short' })

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await strapiFetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* empty body */ }
  return { ok: res.ok, status: res.status, json }
}

const byEmail = (collection: string, email: string, extra = '') =>
  `/${collection}?filters[Email][$eqi]=${encodeURIComponent(email)}&pagination[limit]=2${extra}`

/** Σύνδεση + ενεργή θέση IT, αλλιώς η απάντηση-άρνηση */
async function requireItSeat(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) {
    return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  }
  const seatCookie = cookieStore.get(OC_LAST_SEAT_COOKIE)?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    effectiveSeat(access.seats as OcSeat[], seatCookie, cookieStore.get(OC_SEAT_MODE_COOKIE)?.value)
  if (activeSeat !== 'it') {
    return NextResponse.json({ error: 'Μόνο η θέση IT αλλάζει email μέλους' }, { status: 403 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const denied = await requireItSeat()
  if (denied) return denied
  const q = normaliseGreek(request.nextUrl.searchParams.get('q') || '')
  if (q.length < 2) return NextResponse.json({ ok: true, matches: [] })
  try {
    // Όλα τα μέλη (λίγες εκατοντάδες) και φιλτράρισμα εδώ: το Strapi
    // «containsi» αγνοεί πεζά/κεφαλαία αλλά ΟΧΙ τόνους — «Γιωργος» δεν
    // θα έβρισκε ποτέ τον «Γιώργο».
    const r = await strapi('/members?fields[0]=Name&fields[1]=EngName&fields[2]=Email&fields[3]=AM&pagination[limit]=1000&sort=Name:asc')
    if (!r.ok) return NextResponse.json({ error: `Το Strapi δεν απάντησε (${r.status})` }, { status: 502 })
    const matches = (r.json?.data || [])
      .filter((m: any) => [m.Name, m.EngName, m.Email].some(v => normaliseGreek(String(v || '')).includes(q)))
      .slice(0, 12)
      .map((m: any) => ({ docId: String(m.documentId || ''), name: String(m.Name || ''), engName: String(m.EngName || ''), am: m.AM ?? null, email: String(m.Email || '') }))
    return NextResponse.json({ ok: true, matches })
  } catch (error) {
    console.error('oc member email search error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireItSeat()
  if (denied) return denied

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const memberDocId = String(body?.memberDocId || '').replace(/[^a-z0-9]/gi, '')
  const newEmail = String(body?.newEmail || '').trim().toLowerCase()
  const dryRun = body?.dryRun === true
  if (!memberDocId) {
    return NextResponse.json({ error: 'Διάλεξε μέλος' }, { status: 400 })
  }
  if (!dryRun && !EMAIL_RE.test(newEmail)) {
    return NextResponse.json({ error: 'Μη έγκυρο νέο email' }, { status: 400 })
  }
  const requestedVia = String(body?.requestedVia || '').trim()
  const requestedDetail = String(body?.requestedDetail || '').trim().slice(0, 500)
  if (!dryRun && !(EMAIL_CHANGE_REQUEST_SOURCES as readonly string[]).includes(requestedVia)) {
    return NextResponse.json({ error: 'Διάλεξε πώς ζητήθηκε η αλλαγή' }, { status: 400 })
  }
  if (!dryRun && requestedVia === 'Άλλο' && !requestedDetail) {
    return NextResponse.json({ error: 'Για «Άλλο» γράψε πώς ζητήθηκε η αλλαγή' }, { status: 400 })
  }
  const requestedLabel = requestedVia === 'Άλλο' ? `Άλλο: ${requestedDetail}` : requestedVia
  const includeOwedReminder = body?.includeOwedReminder !== false

  try {
    // ── Το μέλος (πηγή αλήθειας) ──
    const found = await strapi(`/members/${memberDocId}?${MEMBER_FIELDS.slice(1)}`)
    if (!found.ok && found.status !== 404) {
      return NextResponse.json({ error: `Το Strapi δεν απάντησε (${found.status})` }, { status: 502 })
    }
    const member = found.json?.data
    if (!member) {
      return NextResponse.json({ error: 'Το μέλος δεν βρέθηκε' }, { status: 404 })
    }
    const currentEmail = String(member.Email || '').trim().toLowerCase()
    if (!currentEmail) {
      return NextResponse.json({ error: 'Το μέλος δεν έχει email στο Strapi — βάλ' + 'το πρώτα εκεί' }, { status: 422 })
    }
    if (!dryRun && newEmail === currentEmail) {
      return NextResponse.json({ error: 'Το νέο email είναι ίδιο με το τρέχον' }, { status: 400 })
    }
    const memberInfo = { name: String(member.Name || ''), am: member.AM ?? null, docId: String(member.documentId || ''), email: currentEmail }
    // Εκκρεμείς συνδρομές — μπαίνουν ως ευγενικό σημείωμα στην ειδοποίηση (ίδια λογική με το Finance)
    const owedYears = owedSubscriptionYears(member)

    // Το νέο email δεν πρέπει να ανήκει σε άλλο μέλος
    if (newEmail) {
      const clash = await strapi(byEmail('members', newEmail, '&fields[0]=Name'))
      const other = (clash.json?.data || []).find((m: any) => m.documentId !== member.documentId)
      if (other) {
        return NextResponse.json({ error: `Το νέο email ανήκει ήδη στο μέλος «${other.Name}»` }, { status: 409 })
      }
    }

    // ── Πού αλλού ζει το τρέχον email (για την προεπισκόπηση ΚΑΙ για τα βήματα) ──
    const appRes = await strapi(byEmail('membership-applications', currentEmail, '&sort=SubmittedAt:desc&fields[0]=Email'))
    const application = appRes.json?.data?.[0] || null

    if (dryRun) {
      const nl = await strapi(byEmail('newsletter-subscribers', currentEmail, '&fields[0]=Email'))
      return NextResponse.json({
        ok: true, member: memberInfo, owedYears,
        found: {
          application: !!application,
          newsletter: (nl.json?.data || []).length > 0,
          sender: !!(process.env.SENDER_API_KEY && process.env.SENDER_PAID_GROUP_ID),
          registry: sheetsConfigured(),
        },
      })
    }

    // ── 1. Strapi members — αν αποτύχει, τίποτα άλλο δεν αλλάζει ──
    const changedAt = new Date().toISOString()
    const note = `Αλλαγή email από OC ${athensNow()}: ${currentEmail} → ${newEmail} — ${requestedLabel}`
    // ΠΡΟΣΟΧΗ: το custom member controller δέχεται ΜΟΝΟ αριθμητικό id
    const put = await strapi(`/members/${member.id}`, 'PUT', {
      Email: newEmail,
      AdminNotes: member.AdminNotes ? `${member.AdminNotes} | ${note}` : note,
    })
    if (!put.ok) {
      return NextResponse.json({ error: `Αποτυχία αλλαγής στο Strapi (${put.status}) — τίποτα δεν άλλαξε` }, { status: 502 })
    }
    const steps: Record<string, StepResult> = {
      strapi: { state: 'done', detail: 'η ταυτότητα σύνδεσης άλλαξε· το παλιό email δεν συνδέεται πια' },
    }

    // ── 2. Φάκελος αίτησης ──
    if (application) {
      const r = await strapi(`/membership-applications/${application.documentId}`, 'PUT', { Email: newEmail })
      steps.application = r.ok
        ? { state: 'done', detail: 'ο φάκελος της αίτησης ενημερώθηκε' }
        : { state: 'failed', detail: `Strapi ${r.status}` }
    } else {
      steps.application = { state: 'skipped', detail: 'δεν υπάρχει φάκελος αίτησης με το παλιό email' }
    }

    // ── 3. Μητρώο (Sheet) ──
    if (sheetsConfigured()) {
      try {
        const r = await updateMemberEmailInSheet(currentEmail, newEmail)
        steps.registry = r.replaced > 0
          ? { state: 'done', detail: `${r.replaced} κελί(ά) σε: ${r.sheets.join(', ')}` }
          : r.lostReply
            // Η πρώτη κλήση έγραψε και έχασε την απάντηση (κρύα εκκίνηση)· η
            // επανάληψη δεν βρήκε πια το παλιό email. Δεν είναι «δεν υπήρχε».
            ? { state: 'done', detail: 'μάλλον άλλαξε στην πρώτη προσπάθεια (η απάντηση χάθηκε σε κρύα εκκίνηση) — ρίξε μια ματιά στο φύλλο' }
            : { state: 'unchanged', detail: 'το παλιό email δεν βρέθηκε σε κανένα φύλλο — έλεγξέ το με το χέρι' }
      } catch (err) {
        console.error('oc member email: sheet failed:', err)
        steps.registry = {
          state: 'failed',
          detail: `${err instanceof Error ? err.message : 'σφάλμα'} — αν λείπει η ενέργεια «updateEmail», βλ. docs/AppsScript-Αλλαγή-Email.md· αλλιώς άλλαξέ το στο φύλλο με το χέρι`,
        }
      }
    } else {
      steps.registry = { state: 'skipped', detail: 'το Μητρώο δεν είναι συνδεδεμένο' }
    }

    // ── 4. Newsletter (Strapi) · 5. Sender ──
    steps.newsletter = await changeNewsletterSubscriberEmail(currentEmail, newEmail)
    steps.sender = await changeSenderSubscriberEmail(currentEmail, newEmail)

    // ── 6. Ειδοποίηση στο μέλος — ΠΡΕΠΕΙ await (serverless: fire-and-forget δεν φεύγει ποτέ) ──
    try {
      const firstName = String(member.Name || '').trim().split(' ')[0] || 'μέλος'
      const itSigner = await getSeatHolder('it')
      const owed = owedYears.length && includeOwedReminder
        ? { years: owedYears, amount: owedYears.length * SUBSCRIPTION_FEE, memberFullName: String(member.Name || '').trim(),
            claimUrl: renewalClaimUrl(generateRenewalClaimToken(memberInfo.docId)) }
        : null
      const tpl = emailChangedEmailHtml(firstName, currentEmail, newEmail, itSigner?.engName || itSigner?.name || 'Culture for Change — IT', owed)
      // cc: το παλιό email (για να το μάθει και εκεί), it@ και hello@ (ίχνος στις θυρίδες των ρόλων)
      const cc = [currentEmail, IT_EMAIL, ADMIN_EMAIL]
      const sent = await sendOcEmail(newEmail, tpl.subject, tpl.html, { from: IT_FROM, replyTo: IT_EMAIL, cc })
      steps.notice = sent
        ? { state: 'done', detail: `στάλθηκε ${athensNow()} στο ${newEmail}, κοινοποίηση: ${cc.join(', ')}${owed ? ` · με σημείωμα συνδρομής (${owed.years.join(', ')})` : owedYears.length ? ' · ΧΩΡΙΣ σημείωμα συνδρομής (επιλογή IT)' : ''}` }
        : { state: 'failed', detail: 'το Resend δεν δέχτηκε το email — ενημέρωσε το μέλος με το χέρι' }
    } catch (err) {
      steps.notice = { state: 'failed', detail: `${err instanceof Error ? err.message : 'σφάλμα'} — ενημέρωσε το μέλος με το χέρι` }
    }

    return NextResponse.json({ ok: true, member: memberInfo, from: currentEmail, to: newEmail, changedAt, requestedVia: requestedLabel, steps })
  } catch (error) {
    console.error('oc member email error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
