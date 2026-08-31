import { NextRequest, NextResponse } from 'next/server'
import { sendOcEmail, contractsDigestEmailHtml, contractUrgentEmailHtml, FINANCE_FROM, FINANCE_EMAIL, ADMIN_EMAIL, type DigestBlock, type DigestLine } from '@/lib/ocEmails'
import { SEAT_MAILBOX } from '@/lib/ocRoles'
import { buildBuckets, findUrgent, isDigestDay, totalCount, active, type ReminderContract, type ReminderItem } from '@/lib/contractReminders'

export const maxDuration = 60

/**
 * Υπενθυμίσεις συμβάσεων — ένα cron, δύο δουλειές.
 *
 *  ΚΑΘΕ ΜΕΡΑ: οι δύο άμεσες ειδοποιήσεις (σύμβαση που λήγει μέσα σε 7 ημέρες,
 *              εγκεκριμένη πληρωμή που δεν στάλθηκε). Κάθε αφορμή στέλνεται
 *              ΜΙΑ φορά — το ReminderLog της σύμβασης το θυμάται.
 *  ΔΕΥΤΕΡΑ:    επιπλέον η εβδομαδιαία σύνοψη προς finance@, hello@, coordination@.
 *
 * Ένα cron αντί για δύο: το Vercel τα περιορίζει, και η καθημερινή εκτέλεση
 * χρειάζεται ούτως ή άλλως για τις άμεσες.
 *
 *   ?force=1  παρακάμπτει τον έλεγχο ημέρας (στέλνει και τη σύνοψη)
 *   ?test=1   στέλνει ΜΟΝΟ στο it@ με ετικέτα [ΔΟΚΙΜΗ] και δεν γράφει ReminderLog
 *   ?only=digest|expiry|ready  περιορίζει τι θα σταλεί (για δοκιμές)
 */

const CRON_SECRET = process.env.CRON_SECRET
const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const OC_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cultureforchange.net'}/oc`

async function strapi(path: string, method = 'GET', data?: any) {
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

/** Σήμερα σε ώρα Ελλάδας — το Vercel τρέχει σε UTC */
function athensToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

const grDate = (iso: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null
}
const eur = (n: number | null) =>
  n === null || n === undefined ? null : n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const toLine = (i: ReminderItem): DigestLine => ({
  name: i.name, project: i.project, amount: eur(i.amount), date: grDate(i.date), days: i.days, note: i.note,
})

export async function GET(request: NextRequest) {
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const force = request.nextUrl.searchParams.get('force') === '1'
  const test = request.nextUrl.searchParams.get('test') === '1'
  const only = request.nextUrl.searchParams.get('only') || ''
  const today = athensToday()

  const res = await strapi('/oc-contracts?pagination[limit]=500&sort[0]=SortIndex:asc')
  if (!res.ok) return NextResponse.json({ error: 'Δεν διαβάστηκαν οι συμβάσεις' }, { status: 502 })
  const contracts: ReminderContract[] = (res.json?.data || []).map((c: any) => ({
    ...c, Amount: c.Amount === null ? null : Number(c.Amount),
  }))

  const subj = (s: string) => (test ? `[ΔΟΚΙΜΗ] ${s}` : s)
  const to = (real: string[]) => (test ? [SEAT_MAILBOX.it] : real)
  const sent: string[] = []

  // ── Α. Άμεσες ειδοποιήσεις (κάθε μέρα)
  if (!only || only === 'expiry' || only === 'ready') {
    for (const u of findUrgent(contracts, today)) {
      if (only === 'expiry' && u.kind !== 'expiry') continue
      if (only === 'ready' && u.kind !== 'ready-to-pay') continue
      const tpl = contractUrgentEmailHtml(u.kind, toLine(u.item), OC_URL)
      const ok = await sendOcEmail(to([FINANCE_EMAIL])[0], subj(tpl.subject), tpl.html, {
        from: FINANCE_FROM, replyTo: FINANCE_EMAIL,
        ...(test ? {} : { cc: [SEAT_MAILBOX.admin] }),
      })
      if (ok) {
        sent.push(`${u.kind}:${u.contract.Name}`)
        // Η μνήμη γράφεται ΜΟΝΟ σε πραγματική αποστολή — αλλιώς μια δοκιμή
        // θα έσβηνε σιωπηλά την αυριανή αληθινή ειδοποίηση
        if (!test) {
          const log = { ...(u.contract.ReminderLog || {}), [u.logKey]: new Date().toISOString() }
          await strapi(`/oc-contracts/${u.contract.documentId}`, 'PUT', { ReminderLog: log })
        }
      }
    }
  }

  // ── Β. Εβδομαδιαία σύνοψη (Δευτέρα)
  let digest: { sent: boolean; needsAttention: number } | null = null
  if ((isDigestDay(today) || force) && (!only || only === 'digest')) {
    const b = buildBuckets(contracts, today)
    const blocks: DigestBlock[] = [
      { title: 'ΚΑΘΥΣΤΕΡΗΜΕΝΕΣ ΠΛΗΡΩΜΕΣ', hint: 'Η ημερομηνία πέρασε και η πληρωμή δεν έχει κλείσει.', lines: b.overdue.map(toLine), urgent: true },
      { title: 'ΕΤΟΙΜΟ ΓΙΑ eBANKING', hint: 'Εγκεκριμένα ποσά που δεν έχουν σταλεί ακόμη από την τράπεζα.', lines: b.readyToPay.map(toLine), urgent: true },
      { title: 'ΕΚΚΡΕΜΕΙ ΤΙΜΟΛΟΓΙΟ', hint: 'Περιμένουμε παραστατικό από τον/την συνεργάτη πριν πληρώσουμε.', lines: b.invoicePending.map(toLine) },
      { title: 'ΕΠΟΜΕΝΕΣ ΔΟΣΕΙΣ', hint: 'Πληρωμές μέσα στις επόμενες 7 ημέρες.', lines: b.paymentSoon.map(toLine) },
      { title: 'ΣΥΜΒΑΣΕΙΣ ΠΟΥ ΛΗΓΟΥΝ', hint: 'Λήξη μέσα στις επόμενες 45 ημέρες — η ανανέωση θέλει χρόνο.', lines: b.expiring.map(toLine) },
      { title: 'ΕΛΗΞΑΝ ΜΕ ΑΝΟΙΧΤΗ ΠΛΗΡΩΜΗ', hint: 'Τελείωσαν, αλλά κάτι μένει να τακτοποιηθεί.', lines: b.endedOpen.map(toLine) },
      { title: 'ΑΣΥΜΦΩΝΙΕΣ ΣΤΟ ΜΗΤΡΩΟ', hint: 'Οι ημερομηνίες διαφωνούν με τις καταστάσεις που έχουν γραφτεί — μια διόρθωση αρκεί.', lines: b.inconsistencies.map(toLine) },
    ]
    const tpl = contractsDigestEmailHtml(
      grDate(today) || today, blocks,
      { contracts: active(contracts).length, needsAttention: totalCount(b) + b.inconsistencies.length },
      OC_URL,
    )
    const recipients = to([FINANCE_EMAIL, SEAT_MAILBOX.admin, SEAT_MAILBOX.coordinator])
    const ok = await sendOcEmail(recipients[0], subj(tpl.subject), tpl.html, {
      from: FINANCE_FROM, replyTo: FINANCE_EMAIL,
      ...(recipients.length > 1 ? { cc: recipients.slice(1) } : {}),
    })
    digest = { sent: ok, needsAttention: totalCount(b) + b.inconsistencies.length }
    if (ok) sent.push('digest')
  }

  return NextResponse.json({
    ok: true, today, test, digest, urgentSent: sent.filter(s => s !== 'digest').length, sent,
    note: test ? `Δοκιμή — όλα στάλθηκαν μόνο στο ${SEAT_MAILBOX.it}` : undefined,
    adminMailbox: ADMIN_EMAIL,
  })
}
