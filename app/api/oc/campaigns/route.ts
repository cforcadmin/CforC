import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, SEAT_LABELS, SEAT_MAILBOX, type OcSeat } from '@/lib/ocRoles'
import { campaignEmailHtml, PRESETS, BLOCK_LABELS, BLOCK_VARIANTS, MERGE_FIELDS, FOOTER_STYLES, FOOTER_LOOKS, HEADER_STYLES, applyMergeFields, type Block, type FooterStyle, type FooterLook, type HeaderStyle, type CampaignSigner } from '@/lib/campaignBlocks'
import { drainCampaigns } from '@/lib/campaignDrain'
import {
  resolveRecipients, toQueue, validateCampaign, daysNeeded, recipientSummary,
  firstNameOf, DAILY_EMAIL_BUDGET, SEAT_AUDIENCES, SEAT_LABEL_SET,
  type CampaignMember, type RecipientSelection,
} from '@/lib/campaignRecipients'

// Η «Αποστολή» στέλνει ΤΩΡΑ ό,τι χωράει — χρειάζεται χρόνο, όχι 60 δευτερόλεπτα
export const maxDuration = 300

/**
 * Μαζική αποστολή email από το OC — σύνθεση, παραλήπτες, ουρά.
 *
 * Η αποστολή ΔΕΝ γίνεται εδώ. Η διαδρομή φτιάχνει την καμπάνια και τη βάζει
 * στην ουρά· το cron τη στραγγίζει με το ημερήσιο όριο. Έτσι μια αποστολή σε
 * 113 μέλη δεν εξαρτάται από το αν θα θυμηθεί κάποιος να στείλει το δεύτερο
 * μέρος αύριο, ούτε κρεμάει τη διαδρομή για λεπτά.
 *
 *  GET                      → καμπάνιες, μπλοκ, preset, ομάδες, όριο ημέρας
 *  POST action=resolve      → η επιλογή γίνεται συγκεκριμένη λίστα + πλήθος
 *  POST action=preview      → HTML προεπισκόπησης από τα μπλοκ
 *  POST action=save         → δημιουργία/ενημέρωση προσχεδίου
 *  POST action=queue        → έλεγχος και είσοδος στην ουρά
 *  POST action=cancel       → ακύρωση (ό,τι έχει ήδη φύγει, έχει φύγει)
 *  DELETE ?id=              → διαγραφή προσχεδίου
 *
 * Πρόσβαση: Γραμματεία και IT. Η μαζική αποστολή φτάνει σε αληθινούς
 * ανθρώπους και δεν παίρνει πίσω — δεν την ανοίγουμε σε όλο το ΔΣ «προς το
 * παρόν», γιατί το προσωρινό γίνεται μόνιμο.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const ALLOWED_SEATS: OcSeat[] = ['admin', 'it']

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

async function authorize() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (!activeSeat || !ALLOWED_SEATS.includes(activeSeat)) {
    return { error: NextResponse.json({ error: 'Η μαζική αποστολή ανήκει στη Γραμματεία' }, { status: 403 }) }
  }
  return { memberId: decoded.memberId, activeSeat }
}

/** Όλα τα μέλη με ό,τι χρειάζεται η επιλογή — μία φορά, με pagination */
async function loadMembers(): Promise<CampaignMember[]> {
  const out: CampaignMember[] = []
  let start = 0
  while (true) {
    const r = await strapi(
      `/members?fields[0]=Name&fields[1]=Email&fields[2]=AM&fields[3]=Payments` +
      `&pagination[start]=${start}&pagination[limit]=100`
    )
    const rows = r.json?.data || []
    for (const m of rows) {
      out.push({
        docId: m.documentId,
        name: String(m.Name || '').trim(),
        email: String(m.Email || '').trim(),
        am: typeof m.AM === 'number' ? m.AM : null,
        payments: m.Payments && typeof m.Payments === 'object' ? m.Payments : {},
        groups: [],
      })
    }
    if (rows.length < 100) break
    start += rows.length
  }
  return out
}

/**
 * Οι ομάδες κάθε μέλους: έδρες OC + ομάδες εργασίας.
 * Best-effort — αν αποτύχει, η επιλογή «κατά ομάδα» απλώς δεν βρίσκει κανέναν,
 * αντί να ρίξει όλη τη σελίδα.
 */
async function attachGroups(members: CampaignMember[]): Promise<string[]> {
  const byDoc = new Map(members.map(m => [m.docId, m]))
  const names = new Set<string>()
  try {
    const { getBoardRoster } = await import('@/lib/ocRoles')
    for (const r of await getBoardRoster()) {
      const m = byDoc.get(r.memberDocumentId)
      for (const s of r.seats) {
        const label = SEAT_LABELS[s] || s
        names.add(label)
        if (m) m.groups = [...(m.groups || []), label]
      }
    }
  } catch { /* οι έδρες δεν είναι κρίσιμες για τη σύνθεση */ }
  try {
    const wg = await strapi('/working-groups?populate[Members][fields][0]=id&fields[0]=Name&pagination[limit]=100')
    for (const g of wg.json?.data || []) {
      const label = String(g.Name || '').trim()
      if (!label) continue
      names.add(label)
      for (const mem of g.Members || []) {
        const m = members.find(x => x.docId === mem.documentId)
        if (m) m.groups = [...(m.groups || []), label]
      }
    }
  } catch { /* ομοίως */ }
  // Οι έδρες βγαίνουν από εδώ: έχουν δικό τους άξονα και πάνε σε θυρίδα,
  // όχι στο προσωπικό email του κατόχου.
  return [...names].filter(n => !SEAT_LABEL_SET.has(n)).sort((a, b) => a.localeCompare(b, 'el'))
}

/**
 * Ποιος υπογράφει: η θυρίδα και ο ρόλος από την ΕΔΡΑ που συνθέτει, το όνομα
 * από τον τρέχοντα κάτοχό της. Ποτέ γραμμένο στο χέρι — οι εκλογές αλλάζουν
 * πρόσωπα, και ένα πρότυπο με καρφωμένο όνομα γερνάει σιωπηλά.
 */
async function signerFor(seat: OcSeat): Promise<CampaignSigner> {
  const holder = await getSeatHolder(seat).catch(() => null)
  return {
    name: holder?.name || holder?.engName || 'Culture for Change',
    role: SEAT_LABELS[seat] || '',
    email: SEAT_MAILBOX[seat] || 'hello@cultureforchange.net',
  }
}

const CAMPAIGN_FIELDS_BASE =
  'fields[0]=Subject&fields[1]=State&fields[2]=SentCount&fields[3]=FailedCount' +
  '&fields[4]=TotalCount&fields[5]=QueuedAt&fields[6]=LastRunAt&fields[7]=CompletedAt' +
  '&fields[8]=CreatedByName&fields[9]=IsTemplate&fields[10]=TemplateName&fields[11]=updatedAt'
const CAMPAIGN_FIELDS = CAMPAIGN_FIELDS_BASE + '&fields[12]=Archived&fields[13]=ArchivedAt'

export async function GET(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (id) {
      const one = await strapi(`/oc-campaigns/${id.replace(/[^a-z0-9]/gi, '')}`)
      if (!one.ok) return NextResponse.json({ error: 'Η καμπάνια δεν βρέθηκε' }, { status: 404 })
      return NextResponse.json({ campaign: one.json?.data })
    }
    const members = await loadMembers()
    const groups = await attachGroups(members)
    // Το Archived μπορεί να μην έχει βγει ακόμη στο Strapi Cloud: τότε το query
    // γυρίζει 400 «Invalid key» και η λίστα θα ερχόταν ΚΕΝΗ — δηλαδή οι
    // καμπάνιες θα «εξαφανίζονταν» ενώ υπάρχουν. Ξαναδοκιμάζουμε χωρίς αυτό.
    const listUrl = (f: string) => `/oc-campaigns?sort=updatedAt:desc&pagination[limit]=50&${f}`
    let list = await strapi(listUrl(CAMPAIGN_FIELDS))
    if (!list.ok) list = await strapi(listUrl(CAMPAIGN_FIELDS_BASE))
    return NextResponse.json({
      campaigns: list.json?.data || [],
      // Ό,τι χρειάζεται η οθόνη για να χτίσει τον επιλογέα, χωρίς δεύτερη κλήση
      memberCount: members.filter(m => m.am != null && m.email).length,
      groups,
      seats: SEAT_AUDIENCES,
      blockLabels: BLOCK_LABELS,
      blockVariants: BLOCK_VARIANTS,
      presets: PRESETS.map(p => ({ id: p.id, label: p.label, hint: p.hint, blocks: p.blocks })),
      mergeFields: MERGE_FIELDS,
      footerStyles: FOOTER_STYLES,
      footerLooks: FOOTER_LOOKS,
      headerStyles: HEADER_STYLES,
      signer: await signerFor(auth.activeSeat),
      dailyBudget: DAILY_EMAIL_BUDGET,
      seat: auth.activeSeat,
    })
  } catch (err) {
    console.error('oc/campaigns GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')

  try {
    if (action === 'resolve') {
      const members = await loadMembers()
      await attachGroups(members)
      const recipients = resolveRecipients(members, (body?.selection || {}) as RecipientSelection)
      return NextResponse.json({
        recipients,
        count: recipients.length,
        days: daysNeeded(recipients.length),
        summary: recipientSummary(recipients.length),
      })
    }

    if (action === 'preview') {
      const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []
      // Η προεπισκόπηση δείχνει τα merge fields ΛΥΜΕΝΑ, αλλιώς κανείς δεν
      // καταλαβαίνει τι θα δει ο παραλήπτης
      const sample = body?.sample || { 'όνομα': 'Μαρία', 'επώνυμο': 'Κολιοπούλου', 'ΑΜ': '34', 'έτος': String(new Date().getFullYear()) }
      const tpl = campaignEmailHtml({
        subject: applyMergeFields(String(body?.subject || ''), sample),
        preheader: String(body?.preheader || ''),
        blocks,
        signer: await signerFor(auth.activeSeat),
        footerStyle: (body?.footerStyle || 'signature') as FooterStyle,
        footerLook: (body?.footerLook || 'plain') as FooterLook,
        footerLogo: !!body?.footerLogo,
        headerStyle: (body?.headerStyle || 'coral') as HeaderStyle,
        headerLogo: !!body?.headerLogo,
      })
      return NextResponse.json({ html: applyMergeFields(tpl.html, sample), text: tpl.text, subject: tpl.subject })
    }

    if (action === 'save' || action === 'queue') {
      const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []
      const subject = String(body?.subject || '').trim()
      const members = await loadMembers()
      await attachGroups(members)
      const recipients = resolveRecipients(members, (body?.selection || {}) as RecipientSelection)

      if (action === 'queue') {
        const v = validateCampaign({ subject, blocks, recipients })
        if (!v.ok) return NextResponse.json({ error: v.errors.join(' · '), errors: v.errors }, { status: 400 })
      }

      const name = await memberName(auth.memberId)
      const payload: Record<string, any> = {
        Subject: subject || '(χωρίς θέμα)',
        Preheader: String(body?.preheader || '').trim() || null,
        Blocks: blocks,
        Recipients: toQueue(recipients),
        TotalCount: recipients.length,
        Cc: Array.isArray(body?.cc) ? body.cc : null,
        Notes: String(body?.notes || '').trim() || null,
        FooterStyle: String(body?.footerStyle || 'signature'),
        FooterLook: String(body?.footerLook || 'plain'),
        FooterLogo: !!body?.footerLogo,
        HeaderStyle: String(body?.headerStyle || 'coral'),
        HeaderLogo: !!body?.headerLogo,
        // Παγώνει εδώ: η αποστολή μπορεί να κρατήσει ημέρες
        Signer: await signerFor(auth.activeSeat),
        IsTemplate: !!body?.isTemplate,
        TemplateName: String(body?.templateName || '').trim() || null,
        State: action === 'queue' ? 'queued' : 'draft',
        ...(action === 'queue' && { QueuedAt: new Date().toISOString() }),
      }

      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      const write = (p: Record<string, any>) => id
        ? strapi(`/oc-campaigns/${id}`, 'PUT', p)
        : strapi('/oc-campaigns', 'POST', { ...p, CreatedByName: name })
      let res = await write(payload)
      if (!res.ok && res.status === 400) {
        // Το FooterStyle μπορεί να μην έχει βγει ακόμη στο Strapi Cloud. Ένα
        // νέο πεδίο δεν πρέπει να εμποδίζει την αποθήκευση της καμπάνιας —
        // ξαναγράφουμε χωρίς αυτό και κρατάμε ό,τι έχει αξία.
        const { FooterStyle, FooterLook, FooterLogo, HeaderStyle, HeaderLogo, Signer, ...rest } = payload
        res = await write(rest)
      }
      if (!res.ok) {
        console.error('oc/campaigns: save failed', res.status)
        return NextResponse.json({ error: 'Αποτυχία αποθήκευσης' }, { status: 502 })
      }
      const savedId = res.json?.data?.documentId || id

      // Στέλνουμε ΑΜΕΣΩΣ ό,τι χωράει στο σημερινό όριο. Η ουρά υπάρχει για
      // ό,τι ΔΕΝ χωράει — δεν έχει νόημα ένα μήνυμα σε τρεις παραλήπτες να
      // περιμένει τις 08:00 επειδή το όριο είναι 80.
      let sentNow = 0
      let drainReport: string[] = []
      if (action === 'queue' && savedId) {
        try {
          const d = await drainCampaigns({ onlyId: savedId, timeBudgetMs: 240_000 })
          sentNow = d.sent
          drainReport = d.report
        } catch (e) {
          // Η καμπάνια είναι ήδη στην ουρά· το cron θα την πιάσει το πρωί
          console.error('oc/campaigns: άμεση αποστολή απέτυχε', (e as Error).message)
        }
      }

      const remaining = recipients.length - sentNow
      return NextResponse.json({
        ok: true,
        id: savedId,
        state: payload.State,
        count: recipients.length,
        sentNow,
        remaining,
        days: daysNeeded(recipients.length),
        summary: recipientSummary(recipients.length),
        report: drainReport,
      })
    }

    if (action === 'archive') {
      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      if (!id) return NextResponse.json({ error: 'Λείπει η καμπάνια' }, { status: 400 })
      const archived = body?.archived !== false
      // Η αρχειοθέτηση ΔΕΝ αγγίζει τίποτα: κρατά παραλήπτες, μπλοκ και εικόνες.
      // Είναι το «θέλω να φύγει από τα μάτια μου», όχι το «θέλω να χαθεί».
      const res = await strapi(`/oc-campaigns/${id}`, 'PUT', {
        Archived: archived,
        ArchivedAt: archived ? new Date().toISOString() : null,
      })
      if (!res.ok) return NextResponse.json({ error: 'Αποτυχία αρχειοθέτησης' }, { status: 502 })
      return NextResponse.json({ ok: true, archived })
    }

    if (action === 'cancel') {
      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      if (!id) return NextResponse.json({ error: 'Λείπει η καμπάνια' }, { status: 400 })
      // Η ακύρωση σταματά ΜΟΝΟ ό,τι δεν έχει φύγει. Τα σταλμένα δεν
      // ανακαλούνται — και η οθόνη δεν πρέπει να υπονοεί ότι ανακαλούνται.
      const res = await strapi(`/oc-campaigns/${id}`, 'PUT', { State: 'cancelled' })
      if (!res.ok) return NextResponse.json({ error: 'Αποτυχία ακύρωσης' }, { status: 502 })
      return NextResponse.json({ ok: true, state: 'cancelled' })
    }

    return NextResponse.json({ error: 'Μη έγκυρη ενέργεια' }, { status: 400 })
  } catch (err) {
    console.error('oc/campaigns POST failed:', err)
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}

/** Τα mediaId που κρατά μια καμπάνια — και τα πρωτότυπα πίσω από τα σημασμένα */
function mediaIdsOf(blocks: any): number[] {
  const ids = new Set<number>()
  const walk = (v: any) => {
    if (Array.isArray(v)) { v.forEach(walk); return }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if ((k === 'mediaId' || k === 'origMediaId') && Number.isInteger(val)) ids.add(val as number)
        else walk(val)
      }
    }
  }
  walk(blocks)
  return [...ids]
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const id = String(request.nextUrl.searchParams.get('id') || '').replace(/[^a-z0-9]/gi, '')
  if (!id) return NextResponse.json({ error: 'Λείπει η καμπάνια' }, { status: 400 })

  try {
    const cur = await strapi(`/oc-campaigns/${id}?fields[0]=State&fields[1]=Blocks&fields[2]=Subject`)
    const row = cur.json?.data
    if (!row) return NextResponse.json({ error: 'Η καμπάνια δεν βρέθηκε' }, { status: 404 })
    if (row.State === 'sending') {
      // Στη μέση της αποστολής η διαγραφή θα άφηνε μισούς παραλήπτες με
      // γράμμα και κανένα αρχείο για το ποιοι ήταν.
      return NextResponse.json({ error: 'Η αποστολή είναι σε εξέλιξη — ακύρωσέ την πρώτα' }, { status: 409 })
    }

    // Οι εικόνες φεύγουν ΜΟΝΟ αν δεν τις κρατά άλλη καμπάνια
    const mine = mediaIdsOf(row.Blocks)
    const others = await strapi('/oc-campaigns?pagination[limit]=200&fields[0]=Blocks')
    const usedElsewhere = new Set<number>()
    if (others.ok) {
      for (const c of others.json?.data || []) {
        if (c.documentId === id) continue
        for (const m of mediaIdsOf(c.Blocks)) usedElsewhere.add(m)
      }
    } else {
      // Δεν ξέρουμε τι χρησιμοποιεί ποιος → δεν σβήνουμε καμία εικόνα
      mine.forEach(m => usedElsewhere.add(m))
    }

    const deleted: number[] = []
    const kept: number[] = []
    for (const m of mine) {
      if (usedElsewhere.has(m)) { kept.push(m); continue }
      const d = await fetch(`${STRAPI_URL}/api/upload/files/${m}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      }).catch(() => null)
      if (d?.ok || d?.status === 404) deleted.push(m)
      else kept.push(m)
    }

    const res = await strapi(`/oc-campaigns/${id}`, 'DELETE')
    if (!res.ok) return NextResponse.json({ error: 'Αποτυχία διαγραφής' }, { status: 502 })
    return NextResponse.json({ ok: true, imagesDeleted: deleted.length, imagesKept: kept.length })
  } catch (err) {
    console.error('oc/campaigns DELETE failed:', err)
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}

/** Το όνομα του μέλους για τη σφραγίδα «ποιος συνέθεσε» */
async function memberName(memberId: string): Promise<string> {
  const r = await strapi(`/members/${memberId}?fields[0]=Name`)
  return String(r.json?.data?.Name || '').trim() || `member:${memberId}`
}
