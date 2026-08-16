import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { parseKiniseis, parseIncoming, joinStatement } from '@/lib/bankStatement'
import { matchPayerToMembers, payerAliasKey, nameSimilarity, type MatchableMember } from '@/lib/memberMatcher'
import { getAliasesFor } from '@/lib/payerAliases'

/**
 * Μηνιαία επικόλληση κινήσεων τράπεζας — ΜΟΝΟ ανάλυση, καμία εγγραφή.
 *
 * POST {kiniseis, incoming} → parse + join στον Αρ. Συναλλαγής + dedup
 * απέναντι στις υπάρχουσες αποδείξεις + πρόταση μέλους ανά πίστωση
 * (πρώτα learned aliases, μετά greeklish matcher). Το αποτέλεσμα
 * τροφοδοτεί τη λίστα ελέγχου· η έκδοση γίνεται μετά, γραμμή-γραμμή,
 * μέσω /api/oc/receipts (ίδιο μονοπάτι με τη χειροκίνητη φόρμα).
 *
 * Financer-gated: εργαλείο του/της Ταμία.
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
  let json: any = null
  try { json = await res.json() } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json }
}

/** Απόσταση σε ημέρες δύο yyyy-MM-dd (άπειρο αν κάποια λείπει) */
function dayDiff(a: string | null, b: string | null): number {
  if (!a || !b) return Infinity
  const ta = Date.parse(a), tb = Date.parse(b)
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Infinity
  return Math.abs(ta - tb) / 86400000
}

export async function POST(request: NextRequest) {
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
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const kiniseisText = String(body?.kiniseis || '')
  const incomingText = String(body?.incoming || '')
  if (!kiniseisText.trim()) {
    return NextResponse.json({ error: 'Λείπει το μπλοκ Κινήσεων' }, { status: 400 })
  }

  try {
    const kiniseis = parseKiniseis(kiniseisText)
    const incoming = parseIncoming(incomingText)
    const joined = joinStatement(kiniseis, incoming)
    const warnings = [...kiniseis.warnings, ...incoming.warnings, ...joined.warnings]

    // dedup επίπεδο 1 — ακριβές: υπάρχουσα απόδειξη με ίδιο Αρ. Συναλλαγής.
    // dedup επίπεδο 2 — fallback για αποδείξεις ΧΩΡΙΣ txn id (η εισαγωγή
    // από το ΕΣΟΔΑ + όσες εκδόθηκαν χειροκίνητα): ταίριασμα σε ποσό +
    // ημερομηνία πληρωμής (±2 ημέρες) + όνομα ή μοναδικότητα 1:1. Κάθε
    // σίγουρο fallback ταίριασμα ΣΦΡΑΓΙΖΕΤΑΙ με το txn id (self-healing) —
    // από την επόμενη επικόλληση το πιάνει το ακριβές επίπεδο.
    const allRes = await strapi('/receipts?pagination[limit]=1000' +
      '&fields[0]=Number&fields[1]=TransactionId&fields[2]=Amount' +
      '&fields[3]=PaymentDate&fields[4]=MemberName&fields[5]=PayerName' +
      '&fields[6]=Type&fields[7]=SubscriptionYear')
    const allReceipts: any[] = allRes.json?.data || []
    const existingByTxn = new Map<string, number>()
    for (const e of allReceipts) {
      if (e.TransactionId) existingByTxn.set(e.TransactionId, e.Number)
    }
    const NAME_OK = 0.72
    const claimed = new Set<string>()          // documentIds που δέθηκαν σε πίστωση αυτού του run
    const fallbackMatches = new Map<string, { number: number; docId: string; stamp: boolean }>()
    const untagged = allReceipts.filter(e => !e.TransactionId)
    for (const c of joined.credits) {
      if (!c.txnId || existingByTxn.has(c.txnId)) continue
      const window = untagged.filter(e =>
        !claimed.has(e.documentId) &&
        Math.abs(Number(e.Amount) - c.amount) < 0.005 &&
        dayDiff(e.PaymentDate, c.date) <= 2
      )
      if (window.length === 0) continue
      // (α) με όνομα: ο πληρωτής μοιάζει με το όνομα μέλους/πληρωτή της απόδειξης
      let hit = null as any
      if (c.payerName) {
        hit = window.find(e =>
          (e.MemberName && nameSimilarity(c.payerName!, e.MemberName) >= NAME_OK) ||
          (e.PayerName && nameSimilarity(c.payerName!, e.PayerName) >= NAME_OK)
        )
      }
      // (β) ΣΗΜΑΣΙΟΛΟΓΙΚΟ: μία απόδειξη συνδρομής/εγγραφής ανά μέλος+έτος.
      // Καλύπτει αποδείξεις που εκδόθηκαν από δήλωση πληρωμής (claim) ΠΡΙΝ
      // από τη μηνιαία επικόλληση — η ημερομηνία έκδοσης μπορεί να απέχει
      // από την τραπεζική, γι' αυτό εδώ ΔΕΝ κοιτάμε ημερομηνία/ποσό.
      if (!hit && c.payerName) {
        const creditYear = new Date(c.date).getFullYear()
        hit = untagged.find(e =>
          !claimed.has(e.documentId) &&
          (e.Type === 'subscription' || e.Type === 'registration') &&
          e.SubscriptionYear === creditYear &&
          ((e.MemberName && nameSimilarity(c.payerName!, e.MemberName) >= NAME_OK) ||
           (e.PayerName && nameSimilarity(c.payerName!, e.PayerName) >= NAME_OK))
        )
      }
      // (γ) χωρίς όνομα αλλά μοναδικό 1:1 ταίριασμα ποσού+ημερομηνίας
      if (!hit && window.length === 1) {
        const competing = joined.credits.filter(o =>
          o !== c && !existingByTxn.has(o.txnId) &&
          Math.abs(o.amount - c.amount) < 0.005 && dayDiff(window[0].PaymentDate, o.date) <= 2
        )
        if (competing.length === 0) hit = window[0]
      }
      if (hit) {
        claimed.add(hit.documentId)
        fallbackMatches.set(c.txnId, { number: hit.Number, docId: hit.documentId, stamp: true })
      }
    }
    // self-healing: σφράγισε τα σίγουρα ταιριάσματα με το txn id τους
    for (const [txnId, m] of fallbackMatches) {
      if (!m.stamp) continue
      const upd = await strapi(`/receipts/${m.docId}`, 'PUT', { TransactionId: txnId })
      if (!upd.ok) console.error('bank-intake: txn stamp failed for', m.number, upd.status)
    }

    // μέλη για τον matcher (ενεργά, με ΑΜ)
    const membersRes = await strapi('/members?fields[0]=Name&fields[1]=Email&fields[2]=AM&pagination[limit]=1000')
    const members: MatchableMember[] = (membersRes.json?.data || [])
      .filter((m: any) => typeof m.AM === 'number' && m.Name)
      .map((m: any) => ({ docId: m.documentId, name: m.Name, am: m.AM, email: m.Email || '' }))

    // learned aliases με ένα query
    const aliases = await getAliasesFor(joined.credits.map(c => c.payerName || ''))

    const rows = joined.credits.map(c => {
      const existingNumber = existingByTxn.get(c.txnId) ?? fallbackMatches.get(c.txnId)?.number ?? null
      let suggestion: any = null
      let candidates: any[] = []
      if (c.payerName) {
        const alias = aliases.get(payerAliasKey(c.payerName))
        if (alias && (alias.memberDocId || alias.memberName)) {
          const m = members.find(x => x.docId === alias.memberDocId)
          suggestion = {
            source: 'alias' as const,
            docId: alias.memberDocId,
            name: m?.name || alias.memberName,
            am: m?.am ?? null,
            email: m?.email || '',
            confirmations: alias.confirmations,
          }
        } else {
          candidates = matchPayerToMembers(c.payerName, members)
          if (candidates.length > 0) {
            suggestion = { source: 'match' as const, ...candidates[0] }
          }
        }
      }
      return {
        txnId: c.txnId,
        date: c.date,
        amount: c.amount,
        fee: c.fee,
        reason: c.reason,
        payerName: c.payerName,
        payerBank: c.payerBank,
        kind: c.kind,
        existingNumber,
        suggestion,
        candidates,
      }
    })

    return NextResponse.json({
      rows,
      warnings,
      stats: {
        credits: rows.length,
        alreadyIssued: rows.filter(r => r.existingNumber).length,
        identified: rows.filter(r => r.payerName).length,
        suggested: rows.filter(r => r.suggestion).length,
        debits: joined.debits.length,
        balanced: kiniseis.balanced,
      },
    })
  } catch (err) {
    console.error('bank-intake analyze failed:', err)
    return NextResponse.json({ error: 'Αποτυχία ανάλυσης — έλεγξε τη μορφή της επικόλλησης' }, { status: 422 })
  }
}
