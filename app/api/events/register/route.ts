import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { verifyToken } from '@/lib/auth'
import { checkCsrf } from '@/lib/csrf'
import { eventRegisterLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { resolveEventAccess } from '@/lib/eventAccess'
import { validateRegistration, offeredCapacities, visibleOptions, isReimbursed } from '@/lib/eventForm'
import { validateProposal, costValue, openCallVisible, collectsInForm, emptyProposal, cleanProposalDescription, type ProposalDraft } from '@/lib/openCall'
import type { CforcEvent } from '@/lib/types'
import { sendOcEmail, ADMIN_FROM, ADMIN_EMAIL } from '@/lib/ocEmails'
import { eventConfirmEmailHtml, eventRegisteredEmailHtml } from '@/lib/eventEmails'
import { dateRangeLabel } from '@/lib/events'

export const maxDuration = 60

/**
 * Υποβολή δήλωσης συμμετοχής.
 *
 * ΟΛΟΙ οι κανόνες ξαναελέγχονται ΕΔΩ. Ό,τι έκρινε η οθόνη είναι ευγένεια
 * προς τον άνθρωπο, όχι ασφάλεια — ένα POST με curl δεν περνά από καμία
 * οθόνη. Η πύλη (Audience) και η εγκυρότητα κρίνονται από τις ΙΔΙΕΣ καθαρές
 * συναρτήσεις που χρησιμοποιεί η φόρμα, ώστε να μη διαφωνήσουν ποτέ.
 *
 * ΜΕΛΗ: μπαίνουν 'confirmed' — η σύνδεση αποδεικνύει την ταυτότητα.
 * ΜΗ ΜΕΛΗ: 'pending' ως το κλικ στο email (double opt-in, ίδιο μοτίβο με
 * το newsletter). Λάθος διεύθυνση σημαίνει catering για φαντάσματα.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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

/** Ημερομηνία N μήνες μετά τη λήξη, ως YYYY-MM-DD */
function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}
function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης διακομιστή' }, { status: 500 })
  }
  const csrfError = checkCsrf(request)
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

  // Ο έλεγχος CSRF ΔΕΝ αρκεί εδώ: αφήνει επίτηδες να περνούν αιτήματα χωρίς
  // Origin (lib/csrf.ts:28), γιατί υποθέτει ότι «rate limiting + auth»
  // καλύπτουν την κατάχρηση. Αυτή η διαδρομή είναι δημόσια και χωρίς auth —
  // άρα το όριο είναι ΟΛΗ η προστασία που υπάρχει.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rate = eventRegisterLimiter.check(ip)
  if (!rate.allowed) {
    return NextResponse.json({ error: getRateLimitErrorMessage(rate.resetTime) }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.slug) return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })

  const evRes = await strapi(
    `/events?filters[Slug][$eq]=${encodeURIComponent(String(body.slug))}`
    + '&populate[Sessions]=true&populate[Options]=true&populate[OpenCall]=true&pagination[limit]=1')
  const ev: CforcEvent | null = evRes.json?.data?.[0] || null
  if (!ev) return NextResponse.json({ error: 'Η δράση δεν βρέθηκε' }, { status: 404 })

  // ── Η πύλη, ΞΑΝΑ ──
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  const isMember = !!(decoded && decoded.type === 'session')

  const access = resolveEventAccess(ev, isMember)
  if (!access.allowed) {
    const msg = access.reason === 'login-required'
      ? 'Η δράση είναι μόνο για μέλη — χρειάζεται σύνδεση'
      : 'Οι δηλώσεις συμμετοχής έχουν κλείσει'
    return NextResponse.json({ error: msg }, { status: 403 })
  }

  // ── Οι ΙΔΙΟΙ κανόνες με τη φόρμα ──
  const draft = {
    FirstName: String(body.FirstName || ''), LastName: String(body.LastName || ''),
    Email: String(body.Email || '').trim(), Phone: String(body.Phone || ''),
    Capacity: body.Capacity, CapacityOther: String(body.CapacityOther || ''),
    SessionChoices: body.SessionChoices || {}, OptionAnswers: body.OptionAnswers || {},
    Dietary: String(body.Dietary || ''), DietaryConsent: !!body.DietaryConsent,
    AgendaTopic: String(body.AgendaTopic || ''), GeneralComments: String(body.GeneralComments || ''),
    Consent: !!body.Consent,
  }
  const problem = validateRegistration(ev, draft as any, isMember)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  // Η πρόταση δράσης: ΟΙ ΙΔΙΟΙ κανόνες με τη φόρμα, ξανά εδώ.
  const proposal: ProposalDraft = { ...emptyProposal(), ...(body.Proposal || {}) }
  const proposalProblem = validateProposal(ev.OpenCall, proposal, draft.Capacity as any)
  if (proposalProblem) return NextResponse.json({ error: proposalProblem }, { status: 400 })
  // Προτείνει ΜΟΝΟ όποιος βλέπει την πρόσκληση: αλλιώς ένα χειροποίητο αίτημα
  // θα έγραφε πρόταση σε δράση που δεν έχει καν ανοιχτή πρόσκληση.
  const proposes = proposal.wants === 'yes'
    && collectsInForm(ev.OpenCall)
    && openCallVisible(ev.OpenCall, draft.Capacity as any)

  // ΚΑΘΑΡΙΣΜΟΣ ΣΤΟΝ SERVER, μία φορά, πριν γραφτεί οπουδήποτε. Ό,τι φτιάχνει
  // ο επεξεργαστής μπορεί να το φτιάξει και ένα χειροποίητο αίτημα.
  const descriptionHtml = proposes ? cleanProposalDescription(proposal.ProposalDescription) : ''

  // Μια ιδιότητα ΜΕΛΟΥΣ δεν δηλώνεται από ανώνυμο: θα έδινε σε οποιονδήποτε
  // την οθόνη και τα δικαιώματα του μέλους χωρίς να αποδείξει τίποτα.
  if (!isMember && ['member', 'member-ban'].includes(String(draft.Capacity))) {
    return NextResponse.json({ error: 'Για να δηλώσεις ως μέλος, συνδέσου πρώτα' }, { status: 403 })
  }
  if (!offeredCapacities(ev).includes(draft.Capacity)) {
    return NextResponse.json({ error: 'Η ιδιότητα δεν ισχύει για αυτή τη δράση' }, { status: 400 })
  }

  // Διπλή δήλωση με το ίδιο email στην ίδια δράση
  const dup = await strapi(
    `/event-registrations?filters[Email][$eqi]=${encodeURIComponent(draft.Email)}`
    + `&filters[event][Slug][$eq]=${encodeURIComponent(ev.Slug)}`
    + '&filters[Status][$ne]=cancelled&pagination[limit]=1')
  if (dup.json?.data?.length) {
    return NextResponse.json({ error: 'Υπάρχει ήδη δήλωση με αυτό το email για τη δράση' }, { status: 409 })
  }

  // ── Τα ΔΙΑΤΡΟΦΙΚΑ (άρθρο 9) μόνο με ρητή συγκατάθεση ──
  const dietaryGiven = draft.Dietary.trim() && draft.DietaryConsent
  const now = new Date().toISOString()

  // Η διατήρηση είναι ΔΕΔΟΜΕΝΟ της δράσης, όχι σταθερά εδώ
  const months = Number.isFinite(Number(ev.PersonalDataMonths)) ? Number(ev.PersonalDataMonths) : 12
  const purgeDays = Number.isFinite(Number(ev.DietaryPurgeDays)) ? Number(ev.DietaryPurgeDays) : 0

  const rawToken = isMember ? null : crypto.randomBytes(32).toString('hex')
  const payload: Record<string, unknown> = {
    event: ev.documentId,
    ...(isMember && decoded ? { linkedMember: decoded.memberId } : {}),
    FirstName: draft.FirstName.trim(), LastName: draft.LastName.trim(),
    Email: draft.Email, Phone: draft.Phone.trim(),
    Capacity: draft.Capacity,
    ...(draft.Capacity === 'other' ? { CapacityOther: draft.CapacityOther.trim() } : {}),
    SessionChoices: draft.SessionChoices,
    OptionAnswers: draft.OptionAnswers,
    AgendaTopic: draft.AgendaTopic.trim() || null,
    GeneralComments: draft.GeneralComments.trim() || null,
    // Η πρόταση ΜΕΣΑ στη δήλωση είναι το αποδεικτικό: ό,τι έστειλε, όπως το
    // έστειλε. Η εργάσιμη εγγραφή (event-proposal) φτιάχνεται αμέσως μετά και
    // μπορεί να αλλάξει — αυτή εδώ όχι.
    ProposalSubmitted: proposes,
    ...(proposes ? {
      EventProposalTitle: proposal.EventProposalTitle.trim(),
      ProposalDescription: descriptionHtml || null,
      EventLocation: proposal.EventLocation.trim() || null,
      ProposalTimeSlot: proposal.TimeSlot,
      ProposalType: proposal.TypeOfEvent,
      ProposalCost: costValue(ev.OpenCall, proposal),
      ProposalDuration: proposal.ProposalDuration.trim(),
      ProposalLink: proposal.ProposalLink.trim() || null,
      ...(proposal.ProposalPromoImageId ? { ProposalPromoImage: proposal.ProposalPromoImageId } : {}),
    } : {}),
    Status: isMember ? 'confirmed' : 'pending',
    ...(isMember ? { ConfirmedAt: now } : {
      // ΠΟΤΕ το ίδιο το διακριτικό στη βάση — μόνο η σύνοψή του
      ConfirmTokenHash: crypto.createHash('sha256').update(rawToken!).digest('hex'),
      ConfirmTokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    }),
    ...(dietaryGiven ? {
      Dietary: draft.Dietary.trim(),
      DietaryConsentAt: now,
      DietaryPurgeAfter: addDays(ev.EndDate, purgeDays),
    } : {}),
    ConsentAt: now,
    ConsentText: ev.ConsentText || null,
    ConsentVersion: ev.ConsentVersion || null,
    PersonalDataPurgeAfter: addMonths(ev.EndDate, months),
    SubmittedAt: now,
    SubmittedIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  }

  const created = await strapi('/event-registrations', 'POST', payload)
  if (!created.ok) {
    console.error('events/register: create failed', created.status, JSON.stringify(created.json?.error || {}))
    return NextResponse.json({ error: 'Η δήλωση δεν αποθηκεύτηκε' }, { status: 502 })
  }

  /**
   * Η ΔΕΥΤΕΡΗ ΕΓΓΡΑΦΗ: η πρόταση ως δικό της αντικείμενο.
   *
   * Η δήλωση κρατά το αποδεικτικό· αυτή εδώ είναι η εργάσιμη εγγραφή — εδώ
   * κρίνεται, εδώ σημειώνει η ΟΣ, εδώ επιβιώνει όταν η δήλωση καθαριστεί.
   *
   * Το ProposalMember δεν φτάνει ΠΟΤΕ από τη φόρμα: γράφεται από τη συνεδρία.
   * Ένα πεδίο που το στέλνει ο browser είναι πεδίο που ο browser μπορεί να πει
   * ψέματα, και εδώ θα σήμαινε πρόταση χρεωμένη σε άλλο μέλος.
   *
   * ΔΕΝ ΑΚΥΡΩΝΕΙ ΤΗ ΔΗΛΩΣΗ ΑΝ ΑΠΟΤΥΧΕΙ: η δήλωση έχει ήδη αποθηκευτεί μαζί με
   * την πρόταση μέσα της, άρα τίποτα δεν χάνεται — φτιάχνεται ξανά από εκεί.
   */
  let proposalId: string | null = null
  if (proposes) {
    const prop = await strapi('/event-proposals', 'POST', {
      event: ev.documentId,
      registration: created.json?.data?.documentId,
      ...(isMember && decoded ? { ProposalMember: decoded.memberId } : {}),
      ProposerName: `${draft.FirstName.trim()} ${draft.LastName.trim()}`.trim(),
      ProposerEmail: draft.Email,
      EventProposalTitle: proposal.EventProposalTitle.trim(),
      ProposalDescription: descriptionHtml || null,
      EventLocation: proposal.EventLocation.trim() || null,
      TimeSlot: proposal.TimeSlot,
      TypeOfEvent: proposal.TypeOfEvent,
      ProposalCost: costValue(ev.OpenCall, proposal),
      ProposalDuration: proposal.ProposalDuration.trim(),
      ProposalLink: proposal.ProposalLink.trim() || null,
      ...(proposal.ProposalPromoImageId ? { ProposalPromoImage: proposal.ProposalPromoImageId } : {}),
      Status: 'new',
      SubmittedAt: now,
    })
    if (prop.ok) {
      proposalId = prop.json?.data?.documentId || null
      // Ο σύνδεσμος και από τη μεριά της δήλωσης — η ΟΣ πηγαίνει και στις δύο φορές
      if (proposalId && created.json?.data?.documentId) {
        await strapi(`/event-registrations/${created.json.data.documentId}`, 'PUT', { proposal: proposalId })
      }
    } else {
      console.error('events/register: proposal create failed', prop.status,
        JSON.stringify(prop.json?.error || {}).slice(0, 400))
    }
  }

  // ── Το email ──
  // ΑΝΑΜΕΝΕΤΑΙ πριν την απάντηση: μια μη αναμενόμενη αποστολή πεθαίνει όταν
  // παγώσει η συνάρτηση (δες το περιστατικό με το email αποχώρησης).
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cultureforchange.net'
  const dates = dateRangeLabel(ev.StartDate, ev.EndDate)
  const venue = [ev.Venue, ev.City].filter(Boolean).join(', ') || undefined
  try {
    if (isMember) {
      const tpl = eventRegisteredEmailHtml({
        firstName: draft.FirstName.trim(), eventTitle: ev.Title, dates, venue,
        isMember: true, eventUrl: `${site}/events/${ev.Slug}`,
        // ΟΧΙ σε όποιον δεν καλύπτεται: σύνδεσμος για αποζημίωση που δεν
        // δικαιούται είναι υπόσχεση που θα πρέπει μετά να ανακληθεί.
        expensesUrl: isReimbursed(draft.Capacity as any)
          ? `${site}/expenses?event=${encodeURIComponent(ev.Slug)}` : undefined,
      })
      // Κοινοποίηση στο hello@: η ΟΣ θέλει να βλέπει τη δήλωση μόλις γίνει.
      // Μπαίνει ΜΟΝΟ εδώ, όχι στο email επιβεβαίωσης — εκείνο κουβαλά token.
      await sendOcEmail(draft.Email, tpl.subject, tpl.html, {
        from: ADMIN_FROM, replyTo: ADMIN_EMAIL, cc: [ADMIN_EMAIL],
      })
    } else {
      const tpl = eventConfirmEmailHtml({
        firstName: draft.FirstName.trim(), eventTitle: ev.Title, dates, venue,
        confirmUrl: `${site}/api/events/confirm?token=${encodeURIComponent(rawToken!)}`,
      })
      await sendOcEmail(draft.Email, tpl.subject, tpl.html, { from: ADMIN_FROM, replyTo: ADMIN_EMAIL })
    }
  } catch (err) {
    // Η δήλωση ΕΧΕΙ αποθηκευτεί· ένα email που δεν έφυγε δεν τη σβήνει.
    console.error('events/register: email failed', err)
  }

  return NextResponse.json({
    status: isMember ? 'confirmed' : 'pending',
    documentId: created.json?.data?.documentId || null,
    proposal: proposes ? { saved: !!proposalId, title: proposal.EventProposalTitle.trim() } : null,
  })
}
