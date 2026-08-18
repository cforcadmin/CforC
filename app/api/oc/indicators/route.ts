import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'
import { fetchGaYear, gaConfigured } from '@/lib/ga4'
import { fetchEvents } from '@/lib/googleCalendar'
import { strapiAll } from '@/lib/strapiPaged'

export const maxDuration = 60

/**
 * ΔΕΙΚΤΕΣ — «Πλαίσιο παρακολούθησης και αξιολόγησης έργου και αντικτύπου».
 *
 * ΑΡΧΗ: κάθε αριθμός συνοδεύεται από τη ΒΑΣΗ του. «Αττική 37» χωρίς το
 * «από 76 με καταγεγραμμένη περιφέρεια» είναι παραπλανητικό — 24 μέλη δεν
 * έχουν καθόλου περιφέρεια στο μητρώο. Δείκτης που δείχνει σίγουρος ενώ
 * είναι ελλιπής, είναι χειρότερος από κενό κελί.
 *
 * Υπολογίζονται ΜΟΝΟ όσα προκύπτουν από δεδομένα που κρατά το OC. Τα
 * υπόλοιπα (social media, ΕΜΕ, δίκτυα, συνηγορία, ποιοτική ανατροφοδότηση)
 * επισημαίνονται ως χειροκίνητα και δεν εφευρίσκονται.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

/** Πλήθος + βάση: ό,τι μετρήθηκε και πάνω σε πόσα */
interface Counted { label: string; value: number; share: number | null }
function tally(rows: Array<string | null | undefined>): { items: Counted[]; known: number; unknown: number } {
  const m = new Map<string, number>()
  let unknown = 0
  for (const raw of rows) {
    const k = String(raw || '').trim()
    if (!k) { unknown++; continue }
    m.set(k, (m.get(k) || 0) + 1)
  }
  const known = rows.length - unknown
  return {
    items: [...m.entries()]
      .map(([label, value]) => ({ label, value, share: known ? Math.round((value / known) * 1000) / 10 : null }))
      .sort((a, b) => b.value - a.value),
    known, unknown,
  }
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })

  const yearRaw = Number(request.nextUrl.searchParams.get('year'))
  const year = Number.isInteger(yearRaw) && yearRaw >= 2020 && yearRaw <= 2100
    ? yearRaw : new Date().getFullYear()
  const from = `${year}-01-01`, to = `${year}-12-31`

  try {
    const [membersJ, receiptsJ, incomeJ, expensesJ, attendanceJ, openCallsJ, ga, events] = await Promise.all([
      strapiAll('/members?fields[0]=Name&fields[1]=RegistrationYear&fields[2]=Gender&fields[3]=Province&fields[4]=FieldsOfWork&fields[5]=Payments'),
      strapiAll(`/receipts?filters[PaymentDate][$gte]=${from}&filters[PaymentDate][$lte]=${to}&fields[0]=Amount&fields[1]=Type&fields[2]=RegistrationFee&fields[3]=SubscriptionYear`),
      strapi(`/income-records?pagination[limit]=500&filters[Month][$startsWith]=${year}&fields[0]=Amount&fields[1]=Category&fields[2]=FunderType&fields[3]=PayerName`),
      strapiAll(`/expenses?filters[Month][$startsWith]=${year}&filters[State][$eq]=approved&fields[0]=PayableAmount&fields[1]=Category`),
      strapi(`/event-attendances?pagination[limit]=500&filters[EventDate][$gte]=${from}&filters[EventDate][$lte]=${to}&populate[attendees][fields][0]=Gender`),
      strapi(`/open-calls?pagination[limit]=1&filters[createdAt][$gte]=${from}&filters[createdAt][$lte]=${to}T23:59:59`),
      fetchGaYear(year).catch(() => null),
      fetchEvents({ pastDays: 400, futureDays: 200 }).catch(() => []),
    ])

    // ── Β.1 Δίκτυο ───────────────────────────────────────────────
    const members = membersJ?.data || []
    const gender = tally(members.map((m: any) => m.Gender))
    const province = tally(members.map((m: any) => m.Province))
    const fields = tally(
      members.flatMap((m: any) =>
        String(m.FieldsOfWork || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)),
    )
    const newThisYear = members.filter((m: any) => Number(m.RegistrationYear) === year).length
    const paidThisYear = members.filter((m: any) => m.Payments?.[String(year)] === 1).length

    // ── Α.1 Έσοδα ────────────────────────────────────────────────
    const receipts = receiptsJ?.data || []
    const income = incomeJ?.data || []
    const num = (v: any) => Number(v) || 0
    const registrations = receipts.reduce((s: number, r: any) =>
      s + (r.Type === 'registration' ? (num(r.RegistrationFee) || 10) : 0), 0)
    const subscriptions = receipts.reduce((s: number, r: any) => {
      if (r.Type === 'subscription') return s + num(r.Amount)
      if (r.Type === 'registration') return s + num(r.Amount) - (num(r.RegistrationFee) || 10)
      return s
    }, 0)
    const otherReceipts = receipts.reduce((s: number, r: any) =>
      s + (['registration', 'subscription'].includes(r.Type) ? 0 : num(r.Amount)), 0)

    const bySector = new Map<string, number>()
    for (const r of income) {
      const k = r.FunderType || 'unclassified'
      bySector.set(k, (bySector.get(k) || 0) + num(r.Amount))
    }
    const incomeTotal = registrations + subscriptions + otherReceipts
      + income.reduce((s: number, r: any) => s + num(r.Amount), 0)

    const expenses = expensesJ?.data || []
    const expenseByCategory = new Map<string, number>()
    for (const e of expenses) {
      const k = e.Category || 'Χωρίς κατηγορία'
      expenseByCategory.set(k, (expenseByCategory.get(k) || 0) + num(e.PayableAmount))
    }

    // ── Β.3 Συμμετοχή ────────────────────────────────────────────
    const attendance = (attendanceJ?.data || []).map((a: any) => {
      const people = a.attendees || []
      const g = tally(people.map((p: any) => p.Gender))
      return {
        title: a.EventTitle,
        date: a.EventDate,
        category: a.EventCategory || null,
        members: people.length,
        nonMembers: a.NonMemberCount ?? 0,
        share: members.length ? Math.round((people.length / members.length) * 1000) / 10 : null,
        gender: g.items,
      }
    }).sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))

    // Δράσεις που έγιναν φέτος, από το ημερολόγιο
    const heldThisYear = (events || []).filter(e =>
      String(e.start).slice(0, 4) === String(year) && String(e.start).slice(0, 10) <= new Date().toISOString().slice(0, 10))
    const actionsByType = tally(heldThisYear
      .filter(e => ['cafe', 'governance', 'share'].includes(e.category))
      .map(e => e.category))

    return NextResponse.json({
      year,
      network: {
        total: members.length,
        newThisYear,
        paidThisYear,
        gender, province, fields,
      },
      finance: {
        registrations, subscriptions, otherReceipts,
        bySector: [...bySector.entries()].map(([label, value]) => ({ label, value })),
        incomeTotal,
        expenseTotal: expenses.reduce((s: number, e: any) => s + num(e.PayableAmount), 0),
        expenseByCategory: [...expenseByCategory.entries()].map(([label, value]) => ({ label, value })),
        unclassified: bySector.get('unclassified') || 0,
      },
      participation: {
        records: attendance,
        actionsByType: actionsByType.items,
        actionsTotal: heldThisYear.filter(e => ['cafe', 'governance', 'share'].includes(e.category)).length,
        eventsWithoutAttendance: heldThisYear
          .filter(e => ['cafe', 'governance', 'share'].includes(e.category))
          .filter(e => !(attendanceJ?.data || []).some((a: any) => a.EventId === e.id))
          .map(e => ({ title: e.title, date: String(e.start).slice(0, 10) })),
      },
      communication: {
        ga,
        gaConfigured: gaConfigured(),
        openCalls: openCallsJ?.meta?.pagination?.total ?? null,
      },
      manual: [
        'Α.2 Θέσεις εργασίας / ΕΜΕ',
        'Β.2 Εκπαιδευτικά υλικά (αριθμός)',
        'Β.1/Β.2 Βαθμοί ικανοποίησης (φόρμες)',
        'Γ.1 Συμμετοχή σε δίκτυα και συνεργασίες',
        'Γ.2 Δράσεις συνηγορίας',
        'ΙΙ.Α Συμμετοχή ΑμεΑ · πολιτική ΔΕΙ',
        'ΙΙ.Β Πολιτική περιβαλλοντικού αποτυπώματος',
        'Δ. Μέσα κοινωνικής δικτύωσης (posts, followers, reach)',
      ],
    })
  } catch (err) {
    console.error('oc/indicators failed:', err)
    return NextResponse.json({ error: 'Αποτυχία υπολογισμού' }, { status: 502 })
  }
}
