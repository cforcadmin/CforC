import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { type ReceiptType } from '@/lib/receipts'
import { sendOcEmail, FINANCE_FROM, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * Μηνιαία εικόνα εσόδων + κλείσιμο μήνα («εστάλη στο λογιστήριο»).
 *
 *  GET ?month=yyyy-MM → αποδείξεις του μήνα ΚΑΤΑ ΗΜΕΡΟΜΗΝΙΑ ΠΛΗΡΩΜΗΣ
 *    (απόφαση λογιστηρίου), σύνολα ανά κατηγορία, κατάσταση κλεισίματος,
 *    και δέλτα: αποδείξεις που δημιουργήθηκαν ΜΕΤΑ το κλείσιμο του μήνα
 *    τους — εμφανίζονται, δεν σιωπούν (handoff note §2.4).
 *  POST {month, action}:
 *    'ready'    → «Έτοιμο προς αποστολή στο λογιστήριο» (ΜΟΝΟ Financer)
 *    'dispatch' → «Αποστολή στο λογιστήριο» (ΜΟΝΟ Διαχείριση/IT):
 *                 χτίζει το αρχείο του μήνα (έσοδα τώρα — τα έξοδα έχουν
 *                 έτοιμη θέση για τη μελλοντική αυτοματοποίηση) και το
 *                 στέλνει στο ACCOUNTANT_EMAIL (fallback: finance@).
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const TYPE_LABELS: Record<ReceiptType, string> = {
  registration: 'Εγγραφή + Συνδρομή',
  subscription: 'Συνδρομή',
  extraordinary: 'Έκτακτη εισφορά',
  donation: 'Δωρεά',
  grant: 'Χορηγία',
  other: 'Είσπραξη',
}

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
  let json: any = null
  try { json = await res.json() } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json }
}

type Gate = 'board' | 'financer' | 'admin'

async function authorize(gate: Gate) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  if (gate !== 'board') {
    const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
    const activeSeat: OcSeat | null =
      seatCookie && access.seats.includes(seatCookie) ? seatCookie
        : access.seats.length === 1 ? access.seats[0] : null
    if (gate === 'financer' && activeSeat !== 'financer') {
      return { error: NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 }) }
    }
    if (gate === 'admin' && activeSeat !== 'admin' && activeSeat !== 'it') {
      return { error: NextResponse.json({ error: 'Μόνο Διαχείριση (Γραμματεία/IT)' }, { status: 403 }) }
    }
  }
  return { memberId: decoded.memberId }
}

function validMonth(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw
  // default: ο προηγούμενος μήνας
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

export async function GET(request: NextRequest) {
  const auth = await authorize('board')
  if ('error' in auth) return auth.error
  try {
    const month = validMonth(request.nextUrl.searchParams.get('month'))
    const { from, to } = monthRange(month)

    const [recRes, closeRes, allClosesRes] = await Promise.all([
      strapi(`/receipts?filters[PaymentDate][$gte]=${from}&filters[PaymentDate][$lte]=${to}` +
        '&sort[0]=PaymentDate:asc&sort[1]=Number:asc&pagination[limit]=500' +
        '&fields[0]=Number&fields[1]=Type&fields[2]=Amount&fields[3]=RegistrationFee' +
        '&fields[4]=SubscriptionYear&fields[5]=MemberName&fields[6]=PayerName' +
        '&fields[7]=PaymentDate&fields[8]=IssueDate&fields[9]=SentAt&fields[10]=createdAt&fields[11]=PaymentMethod'),
      strapi(`/monthly-closes?filters[Month][$eq]=${month}&pagination[limit]=1`),
      strapi('/monthly-closes?sort=Month:desc&pagination[limit]=24&fields[0]=Month&fields[1]=SentAt&fields[2]=ReadyAt'),
    ])

    const close = closeRes.json?.data?.[0] || null
    // Τα «δέλτα» μετρούν από την ΑΠΟΣΤΟΛΗ (ό,τι έλαβε το λογιστήριο)
    const closeTime = close?.SentAt ? Date.parse(close.SentAt) : null

    const receipts = (recRes.json?.data || []).map((r: any) => {
      const isDelta = closeTime !== null && r.createdAt && Date.parse(r.createdAt) > closeTime
      return {
        number: r.Number,
        type: r.Type,
        typeLabel: TYPE_LABELS[r.Type as ReceiptType] || r.Type,
        amount: Number(r.Amount) || 0,
        registrationFee: Number(r.RegistrationFee) || 0,
        subscriptionYear: r.SubscriptionYear ?? null,
        memberName: r.MemberName,
        payerName: r.PayerName,
        paymentDate: r.PaymentDate,
        issueDate: r.IssueDate,
        method: r.PaymentMethod || 'bank',
        emailSent: !!r.SentAt,
        delta: isDelta,
      }
    })

    // Σύνολα ανά κατηγορία — αντιστοιχούν στις στήλες του ΕΣΟΔΑ
    const totals: Record<string, number> = {}
    const add = (k: string, v: number) => { totals[k] = Math.round(((totals[k] || 0) + v) * 100) / 100 }
    for (const r of receipts) {
      add('Σύνολο', r.amount)
      if (r.type === 'registration') {
        add('Εγγραφές', r.registrationFee || 10)
        add(`Συνδρομές ${r.subscriptionYear ?? ''}`.trim(), r.amount - (r.registrationFee || 10))
      } else if (r.type === 'subscription') {
        add(`Συνδρομές ${r.subscriptionYear ?? ''}`.trim(), r.amount)
      } else {
        add(TYPE_LABELS[r.type as ReceiptType] || 'Λοιπά', r.amount)
      }
    }

    return NextResponse.json({
      month,
      receipts,
      totals,
      count: receipts.length,
      deltaCount: receipts.filter((r: any) => r.delta).length,
      close: close ? {
        readyAt: close.ReadyAt || null,
        readyBy: close.ReadyBy || null,
        sentAt: close.SentAt || null,
        sentBy: close.SentBy || null,
      } : null,
      status: close?.SentAt ? 'sent' : close?.ReadyAt ? 'ready' : 'pending',
      closes: (allClosesRes.json?.data || []).map((c: any) => ({ month: c.Month, readyAt: c.ReadyAt || null, sentAt: c.SentAt || null })),
    })
  } catch (err) {
    console.error('monthly-close GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης μηνιαίας εικόνας' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const action = body?.action === 'dispatch' ? 'dispatch' : 'ready'
  const auth = await authorize(action === 'ready' ? 'financer' : 'admin')
  if ('error' in auth) return auth.error

  try {
    const month = validMonth(String(body?.month || ''))
    const existing = (await strapi(`/monthly-closes?filters[Month][$eq]=${month}&pagination[limit]=1`)).json?.data?.[0] || null

    if (action === 'ready') {
      if (existing?.ReadyAt) {
        return NextResponse.json({ error: `Ο μήνας ${month} έχει ήδη εγκριθεί` }, { status: 409 })
      }
      const payload = { Month: month, ReadyAt: new Date().toISOString(), ReadyBy: `financer:${auth.memberId}` }
      const r = existing
        ? await strapi(`/monthly-closes/${existing.documentId}`, 'PUT', payload)
        : await strapi('/monthly-closes', 'POST', payload)
      if (!r.ok) return NextResponse.json({ error: 'Αποτυχία σήμανσης' }, { status: 502 })
      return NextResponse.json({ ok: true, month, status: 'ready' })
    }

    // ---- dispatch: αρχείο μήνα → λογιστήριο ----
    if (!existing?.ReadyAt) {
      return NextResponse.json({ error: 'Ο μήνας δεν έχει εγκριθεί από τον/τη Financer ακόμη' }, { status: 409 })
    }
    if (existing.SentAt) {
      return NextResponse.json({ error: `Ο μήνας ${month} έχει ήδη σταλεί στο λογιστήριο` }, { status: 409 })
    }

    // Έσοδα του μήνα για το αρχείο
    const { from, to } = monthRange(month)
    const recRes = await strapi(`/receipts?filters[PaymentDate][$gte]=${from}&filters[PaymentDate][$lte]=${to}` +
      '&sort[0]=PaymentDate:asc&sort[1]=Number:asc&pagination[limit]=500' +
      '&fields[0]=Number&fields[1]=Type&fields[2]=Amount&fields[3]=MemberName' +
      '&fields[4]=PaymentDate&fields[5]=IssueDate&fields[6]=SubscriptionYear&fields[7]=PaymentMethod')
    const receipts = recRes.json?.data || []
    const total = receipts.reduce((sum: number, r: any) => sum + (Number(r.Amount) || 0), 0)

    // CSV με BOM ώστε το Excel να διαβάζει σωστά τα ελληνικά.
    // ΔΟΜΗ ΜΕ ΘΕΣΗ ΓΙΑ ΕΞΟΔΑ: όταν αυτοματοποιηθούν, γεμίζει το τμήμα Β.
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines: string[] = []
    lines.push(`ΜΗΝΙΑΙΑ ΕΙΚΟΝΑ CULTURE FOR CHANGE — ${month}`)
    lines.push('')
    lines.push('Α. ΕΣΟΔΑ')
    lines.push(['Παραστατικό', 'Ονοματεπώνυμο', 'Τύπος', 'Ημ. πληρωμής', 'Ημ. έκδοσης', 'Έτος συνδρομής', 'Τρόπος', 'Ποσό (€)'].map(esc).join(';'))
    for (const r of receipts) {
      lines.push([
        `ΑΠ. ΕΙΣ. ${r.Number}`, r.MemberName || '', TYPE_LABELS[r.Type as ReceiptType] || r.Type,
        r.PaymentDate || '', r.IssueDate || '', r.SubscriptionYear ?? '',
        r.PaymentMethod === 'cash' ? 'Μετρητά' : 'Τράπεζα',
        (Number(r.Amount) || 0).toFixed(2).replace('.', ','),
      ].map(esc).join(';'))
    }
    lines.push([esc('ΣΥΝΟΛΟ ΕΣΟΔΩΝ'), '', '', '', '', '', '', esc(total.toFixed(2).replace('.', ','))].join(';'))
    lines.push('')
    lines.push('Β. ΕΞΟΔΑ')
    lines.push('(Η αυτόματη ενσωμάτωση εξόδων δεν είναι ακόμη διαθέσιμη — βλ. φύλλο ΕΞΟΔΑ στο κοινόχρηστο Excel.)')
    const csv = '\ufeff' + lines.join('\r\n')

    const to_ = process.env.ACCOUNTANT_EMAIL || FINANCE_EMAIL
    const viaFallback = !process.env.ACCOUNTANT_EMAIL
    const html = `<!DOCTYPE html><html lang="el"><body style="margin:0;padding:24px;background:#F5F0EB;font-family:Arial,Helvetica,sans-serif;color:#2D2D2D;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:28px 32px;">
<p style="margin:0 0 8px 0;font-size:13px;letter-spacing:1.4px;color:#FF8B6A;font-weight:bold;">CULTURE FOR CHANGE</p>
<h2 style="margin:0 0 16px 0;font-size:20px;">Μηνιαία εικόνα — ${month}</h2>
<p style="margin:0 0 6px 0;">Επισυνάπτεται η μηνιαία εικόνα εσόδων (${receipts.length} παραστατικά, σύνολο ${total.toFixed(2).replace('.', ',')} €).</p>
<p style="margin:0 0 6px 0;">Το πλήρες αρχείο ΕΣΟΔΑ-ΕΞΟΔΑ και τα παραστατικά βρίσκονται ως πάντα στο κοινόχρηστο Excel και στους φακέλους Drive.</p>
${viaFallback ? '<p style="margin:16px 0 0 0;font-size:13px;color:#a05a2c;">⚠ Δεν έχει οριστεί ACCOUNTANT_EMAIL — το μήνυμα ήρθε στο finance@ για χειροκίνητη προώθηση στο λογιστήριο.</p>' : ''}
</div></body></html>`
    const sent = await sendOcEmail(to_, `Μηνιαία εικόνα CforC — ${month}`, html, {
      from: FINANCE_FROM,
      replyTo: FINANCE_EMAIL,
      cc: [FINANCE_EMAIL],
      attachments: [{ filename: `CforC-μηνιαία-εικόνα-${month}.csv`, content: Buffer.from(csv, 'utf8').toString('base64') }],
    })
    if (!sent) return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })

    const upd = await strapi(`/monthly-closes/${existing.documentId}`, 'PUT', {
      SentAt: new Date().toISOString(),
      SentBy: `admin:${auth.memberId}`,
    })
    if (!upd.ok) return NextResponse.json({ error: 'Το email στάλθηκε αλλά η σήμανση απέτυχε — έλεγξε το Strapi' }, { status: 502 })
    return NextResponse.json({ ok: true, month, status: 'sent', to: to_, viaFallback })
  } catch (err) {
    console.error('monthly-close POST failed:', err)
    return NextResponse.json({ error: 'Αποτυχία' }, { status: 502 })
  }
}
