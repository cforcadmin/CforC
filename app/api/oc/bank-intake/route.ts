import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { parseKiniseis, parseIncoming, joinStatement } from '@/lib/bankStatement'
import { matchPayerToMembers, payerAliasKey, type MatchableMember } from '@/lib/memberMatcher'
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

async function strapi(path: string) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json }
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

    // dedup: υπάρχουσες αποδείξεις για αυτά τα txn ids (τμηματικά ανά 50)
    const txnIds = joined.credits.map(c => c.txnId).filter(Boolean)
    const existingByTxn = new Map<string, number>()
    for (let i = 0; i < txnIds.length; i += 50) {
      const chunk = txnIds.slice(i, i + 50)
      const filters = chunk.map((t, j) => `filters[TransactionId][$in][${j}]=${encodeURIComponent(t)}`).join('&')
      const r = await strapi(`/receipts?${filters}&fields[0]=Number&fields[1]=TransactionId&pagination[limit]=${chunk.length}`)
      for (const e of r.json?.data || []) {
        if (e.TransactionId) existingByTxn.set(e.TransactionId, e.Number)
      }
    }

    // μέλη για τον matcher (ενεργά, με ΑΜ)
    const membersRes = await strapi('/members?fields[0]=Name&fields[1]=Email&fields[2]=AM&pagination[limit]=1000')
    const members: MatchableMember[] = (membersRes.json?.data || [])
      .filter((m: any) => typeof m.AM === 'number' && m.Name)
      .map((m: any) => ({ docId: m.documentId, name: m.Name, am: m.AM, email: m.Email || '' }))

    // learned aliases με ένα query
    const aliases = await getAliasesFor(joined.credits.map(c => c.payerName || ''))

    const rows = joined.credits.map(c => {
      const existingNumber = existingByTxn.get(c.txnId) ?? null
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
