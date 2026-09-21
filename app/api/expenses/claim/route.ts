import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { checkCsrf } from '@/lib/csrf'
import {
  validateClaim, computeTotals, eventDays, formatClaimNumber, normaliseIban, allLegs,
  buildAttachmentName, buildClaimPdfName, receiptSpec, MAX_FILE_BYTES, MAX_TOTAL_BYTES,
  ALLOWED_FILE_TYPES, MAX_LINES, type ClaimLine,
} from '@/lib/expenseClaims'
import { generateExpenseClaimPdf } from '@/lib/expenseClaimPdf'
import { archiveExpenseClaim, type ArchiveAttachment } from '@/lib/expenseClaimArchive'
import { sendOcEmail, expenseClaimSubmittedEmailHtml, FINANCE_FROM, FINANCE_EMAIL, ADMIN_EMAIL } from '@/lib/ocEmails'

// Ανέβασμα παραστατικών + δημιουργία φακέλου: πολύ πάνω από τα 10s
export const maxDuration = 60

/**
 * Υποβολή εξοδολογίου (Μονάδα 1: βάση μόνο).
 *
 * Μόνο για συνδεδεμένα μέλη. Το ονοματεπώνυμο ΔΕΝ έρχεται από τη φόρμα —
 * διαβάζεται από τη βάση με βάση τη συνεδρία, ώστε να μην μπορεί κανείς να
 * υποβάλει στο όνομα άλλου. Η ίδια η υποβολή είναι η υπογραφή: κρατάμε
 * ποιος, πότε και από ποια IP.
 *
 * Μετά την εγγραφή: PDF → φάκελος «Εξοδολόγια» του μήνα (μέσω Apps Script)
 * → email στο finance@ με κοινοποίηση στη Διαχείριση και στο ίδιο το μέλος.
 * Και τα δύο είναι best-effort: το εξοδολόγιο έχει ήδη καταχωρηθεί και δεν
 * χάνεται επειδή έπεσε το Drive ή ο πάροχος email.
 *
 * Τι ΔΕΝ κάνει ακόμη (Μονάδα 3): το κουτί ειδοποίησης στα Οικονομικά και
 * τις υπενθυμίσεις κάθε 5 ημέρες.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string, method: string = 'GET', data?: any) {
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

/** Το μέλος της τρέχουσας συνεδρίας — ή null */
async function currentMember() {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') return null
  const r = await strapi(`/members/${decoded.memberId}`)
  const m = r.json?.data
  // ΠΡΟΣΟΧΗ: το Iban του μέλους είναι private στο Strapi και ΔΕΝ επιστρέφεται
  // ποτέ από το API — ούτε με token. Δεν το ζητάμε από εδώ· έρχεται από το
  // τελευταίο εξοδολόγιο του μέλους (δες lastClaimBank).
  return m ? {
    id: m.id, documentId: m.documentId,
    name: String(m.Name || '').trim(), email: String(m.Email || '').trim(),
    phone: m.Phone || '', bankName: m.BankName || '', accountHolder: m.AccountHolder || '',
  } : null
}

/**
 * Τα τραπεζικά της προηγούμενης φοράς.
 *
 * Η συλλογή των εξοδολογίων είναι κλειστή (μόνο με token), σε αντίθεση με
 * το /api/members που διαβάζεται δημόσια — γι' αυτό το IBAN ζει εδώ και όχι
 * στο προφίλ. Επιστρέφεται μόνο αν το μέλος είχε ζητήσει να το θυμόμαστε,
 * κάτι που φαίνεται από το ότι κρατήθηκε ο δικαιούχος στο προφίλ του.
 */
async function lastClaimBank(email: string) {
  const r = await strapi(
    `/expense-claims?filters[MemberEmail][$eqi]=${encodeURIComponent(email)}` +
    '&sort=SubmittedAt:desc&pagination[limit]=1'
  )
  const last = r.json?.data?.[0]
  if (!last) return null
  return {
    bankName: String(last.BankName || '').trim(),
    accountHolder: String(last.AccountHolder || '').trim(),
    iban: String(last.Iban || '').trim(),
  }
}

/**
 * GET → τα στοιχεία που προσυμπληρώνει η φόρμα, μαζί με τα ονόματα των
 * μελών για το «μετακίνηση μαζί με». Στέλνουμε ΜΟΝΟ ονόματα, από διαδρομή
 * που ήδη απαιτεί σύνδεση — καμία νέα δημόσια έκθεση στοιχείων.
 */
export async function GET() {
  const member = await currentMember()
  if (!member) return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })

  const names: string[] = []
  for (let page = 1; page <= 5; page++) {
    const r = await strapi(`/members?pagination[page]=${page}&pagination[pageSize]=100&sort=Name:asc&fields[0]=Name`)
    const batch = r.json?.data || []
    for (const m of batch) {
      const n = String(m?.Name || '').trim()
      // Το ίδιο το μέλος δεν ταξιδεύει «μαζί του», και οι δοκιμαστικοί
      // λογαριασμοί δεν έχουν λόγο να εμφανίζονται σε λίστα επιλογής
      if (n && n !== member.name && !/^(TEST|E2E)/i.test(n)) names.push(n)
    }
    if (batch.length < 100) break
  }

  // Το «να τα θυμάμαι» φαίνεται από το ότι έμεινε ο δικαιούχος στο προφίλ:
  // αν το μέλος ξετσεκάρει, καθαρίζεται και δεν προσυμπληρώνεται τίποτα
  const remembered = member.accountHolder ? await lastClaimBank(member.email) : null

  return NextResponse.json({
    member: {
      name: member.name, email: member.email, phone: member.phone,
      bankName: remembered?.bankName || member.bankName,
      accountHolder: member.accountHolder || member.name,
      iban: remembered?.iban || '',
    },
    members: names,
  })
}

/** Επόμενος αριθμός της χρονιάς — με μικρή επανάληψη σε σύγκρουση */
async function nextClaimNumber(year: number): Promise<string> {
  const r = await strapi(`/expense-claims?filters[ClaimNumber][$startsWith]=ΕΞ-${year}-&pagination[pageSize]=1&sort=ClaimNumber:desc`)
  const last = r.json?.data?.[0]?.ClaimNumber as string | undefined
  const seq = last ? Number(String(last).split('-').pop()) || 0 : 0
  return formatClaimNumber(year, seq + 1)
}

export async function POST(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης διακομιστή' }, { status: 500 })
  }
  const csrfError = checkCsrf(request)
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

  const member = await currentMember()
  if (!member) return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Μη έγκυρη υποβολή' }, { status: 400 })

  let input: any
  try { input = JSON.parse(String(form.get('data') || '')) } catch {
    return NextResponse.json({ error: 'Μη έγκυρη υποβολή' }, { status: 400 })
  }

  // ── Τα αρχεία: κάθε γραμμή δηλώνει ποια «κουτάκια» της ανήκουν (line-θέση)
  const lines: ClaimLine[] = Array.isArray(input?.lines) ? input.lines.slice(0, MAX_LINES) : []
  let totalBytes = 0
  for (const [i, line] of lines.entries()) {
    line.files = []
    for (const slot of [1, 2] as const) {
      const f = form.get(`file-${i}-${slot}`)
      if (!(f instanceof File) || f.size === 0) continue
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `Γραμμή ${i + 1}: το αρχείο ξεπερνά τα 10MB` }, { status: 400 })
      }
      if (!ALLOWED_FILE_TYPES.includes(f.type)) {
        return NextResponse.json({ error: `Γραμμή ${i + 1}: επιτρέπονται PDF και εικόνες` }, { status: 400 })
      }
      totalBytes += f.size
      line.files.push({ slot, name: f.name, size: f.size })
    }
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: 'Τα συνημμένα ξεπερνούν συνολικά τα 40MB' }, { status: 400 })
  }

  const error = validateClaim({ ...input, lines })
  if (error) return NextResponse.json({ error }, { status: 400 })

  const legs = allLegs(Array.isArray(input.travelLegs) ? input.travelLegs : [], !!input.returnIncluded)
  const { total, advance, payable } = computeTotals(lines, input.advance)
  const year = new Date().getFullYear()
  const claimNumber = await nextClaimNumber(year)

  // ── Τα παραστατικά στη Media Library, με το τελικό τους όνομα. Ανεβαίνουν
  //    ΠΡΙΝ από την εγγραφή: αν κάτι σπάσει εδώ, δεν μένει μισό εξοδολόγιο.
  const uploadedIds: number[] = []
  for (const [i, line] of lines.entries()) {
    const spec = receiptSpec(line.category, line.receiptType)
    for (const file of line.files) {
      const f = form.get(`file-${i}-${file.slot}`) as File
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
      const name = buildAttachmentName({
        memberName: member.name, receiptType: line.receiptType, date: line.date,
        amount: Number(line.amount), claimNumber, slot: file.slot, pair: spec?.pair, ext,
      })
      const fd = new FormData()
      fd.append('files', f, name)
      const up = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, body: fd,
      })
      if (!up.ok) {
        console.error('expense claim: upload failed', up.status)
        return NextResponse.json({ error: 'Αποτυχία μεταφόρτωσης παραστατικού — δοκίμασε ξανά' }, { status: 502 })
      }
      const j = await up.json()
      file.mediaId = j?.[0]?.id
      file.url = j?.[0]?.url
      file.name = name
      if (file.mediaId) uploadedIds.push(file.mediaId)
    }
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const entry: Record<string, any> = {
    ClaimNumber: claimNumber,
    MemberName: member.name,
    MemberEmail: member.email,
    MemberPhone: String(input.phone || member.phone || '').trim() || null,
    linkedMember: member.documentId ? { connect: [member.documentId] } : undefined,
    EventType: input.eventType,
    EventName: String(input.eventName || '').trim() || null,
    EventStart: input.eventStart,
    EventEnd: input.eventEnd,
    EventDays: eventDays(input.eventStart, input.eventEnd),
    // Τα σκέλη είναι η αλήθεια· τα τρία παλιά πεδία μένουν ως σύνοψη της
    // πρώτης και της τελευταίας στάσης, για PDF και φύλλο χωρίς parsing JSON
    TravelLegs: legs,
    ReturnIncluded: !!input.returnIncluded,
    TravelFrom: legs[0]?.from || null,
    TravelTo: legs.filter(l => l.direction === 'outbound').at(-1)?.to || null,
    TravelMode: legs[0]?.mode || null,
    CoTravellers: String(input.coTravellers || '').trim() || null,
    Lines: lines,
    Total: total,
    Advance: advance,
    Payable: payable,
    BankName: String(input.bankName || '').trim() || null,
    AccountHolder: String(input.accountHolder || '').trim(),
    Iban: normaliseIban(input.iban),
    Signature: String(input.signature || '').slice(0, 200000) || null,
    Attachments: uploadedIds,
    SubmittedAt: new Date().toISOString(),
    SubmittedIp: ip,
    State: 'submitted',
    Notes: String(input.notes || '').trim() || null,
  }

  const created = await strapi('/expense-claims', 'POST', entry)
  if (!created.ok) {
    console.error('expense claim: create failed', created.status)
    return NextResponse.json({ error: 'Αποτυχία υποβολής — δοκίμασε ξανά σε λίγο' }, { status: 502 })
  }

  // Η επιλογή «να τα θυμάμαι»: κρατάμε τράπεζα και δικαιούχο στο προφίλ —
  // ΟΧΙ το IBAN, γιατί το /api/members διαβάζεται δημόσια. Το IBAN μένει
  // στο ίδιο το εξοδολόγιο, που είναι κλειστό. Το ξετσεκάρισμα σβήνει.
  // Το «ξέχασέ τα» γράφεται ως κενό κείμενο, όχι null: το entityService του
  // Strapi δεν συμπεριφέρεται σταθερά με null σε string πεδία, ενώ το κενό
  // είναι ψευδές και στις δύο περιπτώσεις — η προσυμπλήρωση σβήνει έτσι κι αλλιώς.
  const remember = !!input.rememberBank
  const r = await strapi(`/members/${member.id}`, 'PUT', {
    BankName: remember ? String(input.bankName || '').trim() : '',
    AccountHolder: remember ? String(input.accountHolder || '').trim() : '',
  })
  if (!r.ok) console.error('expense claim: bank preference not saved on member', r.status)

  const documentId = created.json?.data?.documentId || null

  // ── PDF: το έγγραφο που αντικαθιστά τη φόρμα Word
  const submittedAt = new Date()
  const athensToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(submittedAt)
  const money = (n: number) => `${n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  const grDate = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
  }

  let pdfBase64: string | null = null
  let pdfName = ''
  try {
    const pdf = await generateExpenseClaimPdf({
      claimNumber, memberName: member.name, email: member.email,
      phone: entry.MemberPhone, bankName: entry.BankName, accountHolder: entry.AccountHolder,
      iban: entry.Iban, eventType: entry.EventType, eventName: entry.EventName,
      eventStart: entry.EventStart, eventEnd: entry.EventEnd, eventDays: entry.EventDays,
      legs, coTravellers: entry.CoTravellers, lines, total, advance, payable,
      notes: entry.Notes, signature: entry.Signature, submittedAt,
    })
    pdfBase64 = Buffer.from(pdf).toString('base64')
    pdfName = buildClaimPdfName({
      memberName: member.name, claimNumber, submittedDate: athensToday, total, payable,
    })
  } catch (e) {
    console.error('expense claim: PDF generation failed', e)
  }

  // ── Αρχειοθέτηση στον φάκελο του μήνα (best-effort)
  let folderUrl: string | null = null
  if (pdfBase64) {
    const extras: ArchiveAttachment[] = []
    for (const [i, line] of lines.entries()) {
      for (const f of line.files) {
        const file = form.get(`file-${i}-${f.slot}`) as File | null
        if (!file) continue
        extras.push({
          name: f.name,
          base64: Buffer.from(await file.arrayBuffer()).toString('base64'),
          mime: file.type || 'application/octet-stream',
        })
      }
    }
    const archived = await archiveExpenseClaim({
      month: athensToday.slice(0, 7), claimNumber, pdfName, pdfBase64, attachments: extras,
    })
    if (archived.ok) {
      folderUrl = archived.folderUrl || null
      if (documentId) {
        await strapi(`/expense-claims/${documentId}`, 'PUT', {
          PdfUrl: archived.pdfUrl || null, PdfFileId: archived.pdfId || null, FolderUrl: folderUrl,
        })
      }
    }
  }

  // ── Ειδοποίηση: finance@ ενεργεί, hello@ ξέρει, το μέλος έχει απόδειξη
  try {
    const route = legs.map(l => `${l.from} ${l.direction === 'return' ? '←' : '→'} ${l.to}`).join(' · ')
    const tpl = expenseClaimSubmittedEmailHtml({
      claimNumber, memberName: member.name,
      eventLabel: entry.EventName ? `${entry.EventType} — ${entry.EventName}` : entry.EventType,
      eventDates: `${grDate(entry.EventStart)} – ${grDate(entry.EventEnd)}`,
      route,
      payable: money(payable), total: money(total), advance: advance > 0 ? money(advance) : null,
      accountHolder: entry.AccountHolder, bankName: entry.BankName, iban: entry.Iban,
      lines: lines.map(l => ({ date: grDate(l.date), type: l.receiptType, amount: money(Number(l.amount) || 0) })),
      ocUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cultureforchange.net'}/oc?section=finances`,
    })
    await sendOcEmail(FINANCE_EMAIL, tpl.subject, tpl.html, {
      from: FINANCE_FROM,
      replyTo: member.email,
      cc: [ADMIN_EMAIL, member.email],
      ...(pdfBase64 ? { attachments: [{ filename: pdfName, content: pdfBase64 }] } : {}),
    })
  } catch (e) {
    console.error('expense claim: notification email failed', e)
  }

  return NextResponse.json({ ok: true, claimNumber, documentId, total, advance, payable, folderUrl })
}
