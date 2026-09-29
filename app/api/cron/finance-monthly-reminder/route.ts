import { NextRequest, NextResponse } from 'next/server'
import { recordRun, cronAuthorized, triggerOf, type RunNote } from '@/lib/ocRunLog'
import { sendOcEmail, financeMonthlyReminderEmailHtml } from '@/lib/ocEmails'
import { getSeatHolder } from '@/lib/ocRoles'

// Η θυρίδα του/της Financer (ίδια με το SEAT_MAILBOX του ocRoles —
// επιβιώνει των εκλογών, δεν δείχνει σε πρόσωπο)
const FINANCE_EMAIL = 'finance@cultureforchange.net'

/**
 * Μηνιαία υπενθύμιση οικονομικού απολογισμού προς τον/την Financer.
 *
 * Το cron τρέχει κάθε μέρα 28-31 του μήνα (το cron syntax δεν ξέρει
 * «τελευταία μέρα») και ο κώδικας στέλνει ΜΟΝΟ όταν η αυριανή μέρα είναι
 * η 1η — δηλαδή ακριβώς την τελευταία μέρα του μήνα, ώρα Ελλάδας.
 *
 * ?force=1 (πάντα με το CRON_SECRET): παρακάμπτει τον έλεγχο ημέρας για
 * δοκιμή — στέλνει το email τώρα, με ετικέτα τον τρέχοντα μήνα.
 */

const CRON_SECRET = process.env.CRON_SECRET

const MONTH_LABELS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
]

/** Σήμερα/αύριο σε ώρα Ελλάδας — το Vercel τρέχει σε UTC */
function athensParts(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

async function runJob(request: NextRequest, log: RunNote) {
  // Χωρίς μυστικό η διαδρομή κλείνει — δεν ανοίγει (βλ. payment-reminders)
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = request.nextUrl.searchParams.get('force') === '1'
  const tomorrow = athensParts(1)
  if (!force && tomorrow.day !== 1) {
    log.note('δεν ήταν η τελευταία μέρα του μήνα — καμία ενέργεια')
    return NextResponse.json({ sent: false, reason: 'not last day of month (Athens)' })
  }

  const today = athensParts(0)
  const monthLabel = `${MONTH_LABELS[today.month - 1]} ${today.year}`
  // Ποιος/ποια κρατά τη θέση Admin σήμερα — για τη φράση «την αποστολή
  // προς το Λογιστήριο την αναλαμβάνει η/ο …»
  let adminName: string | null = null
  try { adminName = (await getSeatHolder('admin'))?.name?.split(/\s+/)[0] || null } catch { /* πέφτει στο «η Διαχείριση» */ }
  const { subject, html } = financeMonthlyReminderEmailHtml(monthLabel, adminName)
  const to = FINANCE_EMAIL

  const ok = await sendOcEmail(to, subject, html)
  if (!ok) {
    return NextResponse.json({ sent: false, error: 'email send failed' }, { status: 500 })
  }
  log.note(`υπενθύμιση κλεισίματος ${monthLabel}`)
  return NextResponse.json({ sent: true, to, monthLabel, test: force })
}

/**
 * Το περίβλημα καταγραφής. Ο έλεγχος μυστικού γίνεται ΠΡΙΝ από αυτό ώστε μια
 * ανεπιτυχής κλήση να μη γράφει «εκτέλεση» στο ημερολόγιο.
 */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return runJob(request, { note: () => {} })
  return recordRun('/api/cron/finance-monthly-reminder', log => runJob(request, log), { trigger: triggerOf(request) })
}
