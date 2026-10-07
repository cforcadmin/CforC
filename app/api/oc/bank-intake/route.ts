import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { strapiAll } from '@/lib/strapiPaged'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
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
    effectiveSeat(access.seats as OcSeat[], seatCookie, cookieStore.get(OC_SEAT_MODE_COOKIE)?.value)
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
    const allRes = await strapi('/receipts?pagination[pageSize]=100' +
      '&fields[0]=Number&fields[1]=TransactionId&fields[2]=Amount' +
      '&fields[3]=PaymentDate&fields[4]=MemberName&fields[5]=PayerName' +
      '&fields[6]=Type&fields[7]=SubscriptionYear')
    const allReceipts: any[] = allRes.json?.data || []
    /**
     * ΜΙΑ ΚΑΤΑΘΕΣΗ ΜΠΟΡΕΙ ΝΑ ΕΧΕΙ ΠΟΛΛΕΣ ΑΠΟΔΕΙΞΕΙΣ.
     *
     * 70€ σημαίνει δύο έτη συνδρομής — και το σωματείο κόβει ΜΙΑ απόδειξη ανά
     * έτος, άρα δύο των 35€ με τον ίδιο Αρ. Συναλλαγής. Ο χάρτης ήταν
     * `Map<string, number>` και η δεύτερη ΕΣΒΗΝΕ την πρώτη: η οθόνη έδειχνε
     * μία απόδειξη και ξεχνούσε την άλλη. Χειρότερα, όταν το ταίριασμα
     * γινόταν με ΙΣΟ ποσό (70 ≠ 35) δεν έβρισκε καμία — και η γραμμή
     * εμφανιζόταν ως «—», έτοιμη να κόψει ΤΡΙΤΗ απόδειξη (7/10/2026).
     */
    const existingByTxn = new Map<string, number[]>()
    for (const e of allReceipts) {
      if (!e.TransactionId) continue
      const list = existingByTxn.get(e.TransactionId) || []
      list.push(e.Number)
      existingByTxn.set(e.TransactionId, list)
    }
    const NAME_OK = 0.72
    const claimed = new Set<string>()          // documentIds που δέθηκαν σε πίστωση αυτού του run
    const fallbackMatches = new Map<string, Array<{ number: number; docId: string }>>()
    const untagged = allReceipts.filter(e => !e.TransactionId)
    for (const c of joined.credits) {
      if (!c.txnId || existingByTxn.has(c.txnId)) continue
      const window = untagged.filter(e =>
        !claimed.has(e.documentId) &&
        Math.abs(Number(e.Amount) - c.amount) < 0.005 &&
        dayDiff(e.PaymentDate, c.date) <= 2
      )
      /**
       * (δ) ΑΘΡΟΙΣΜΑ — ΠΡΙΝ από κάθε άλλο βήμα, γιατί όλα τα άλλα ψάχνουν
       * απόδειξη ΙΣΟΥ ποσού και φεύγουν από τη γραμμή όταν δεν τη βρουν.
       *
       * Δύο έτη συνδρομής σε μία κατάθεση των 70€ = 35 + 35: καμία απόδειξη
       * των 70€ δεν υπάρχει, άρα το `window` είναι κενό και η γραμμή
       * εγκαταλειπόταν πριν προλάβει να εξεταστεί. (Πρώτη μου εκδοχή το είχε
       * ΜΕΤΑ την έξοδο — δεν έτρεξε ποτέ, 7/10/2026.)
       *
       * ΜΟΝΟ με όνομα και ΜΟΝΟ σε ακριβές άθροισμα: ένα «περίπου» εδώ θα
       * έδενε αποδείξεις άσχετων ανθρώπων σε μία κατάθεση.
       */
      if (c.payerName) {
        const sameName = untagged.filter(e =>
          !claimed.has(e.documentId) &&
          dayDiff(e.PaymentDate, c.date) <= 2 &&
          ((e.MemberName && nameSimilarity(c.payerName!, e.MemberName) >= NAME_OK) ||
           (e.PayerName && nameSimilarity(c.payerName!, e.PayerName) >= NAME_OK)))
        if (sameName.length > 1) {
          const total = sameName.reduce((t, e) => t + Number(e.Amount || 0), 0)
          if (Math.abs(total - c.amount) < 0.005) {
            for (const e of sameName) claimed.add(e.documentId)
            fallbackMatches.set(c.txnId, sameName.map(e => ({ number: e.Number, docId: e.documentId })))
            continue
          }
        }
      }
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
        fallbackMatches.set(c.txnId, [{ number: hit.Number, docId: hit.documentId }])
      }
    }
    // self-healing: σφράγισε τα σίγουρα ταιριάσματα με το txn id τους
    for (const [txnId, list] of fallbackMatches) {
      for (const m of list) {
        const upd = await strapi(`/receipts/${m.docId}`, 'PUT', { TransactionId: txnId })
        if (!upd.ok) console.error('bank-intake: txn stamp failed for', m.number, upd.status)
      }
    }

    // Μέλη για τον matcher — ΣΕΛΙΔΟΠΟΙΗΜΕΝΑ. Με σκέτο limit=1000 το Strapi
    // επιστρέφει 100 και ο matcher δεν βλέπει τα υπόλοιπα: το μέλος
    // εμφανίζεται σαν άγνωστος πληρωτής και καταχωρείται με το χέρι.
    const membersAll = await strapiAll('/members?fields[0]=Name&fields[1]=Email&fields[2]=AM')
    const membersRes = { ok: membersAll.ok, json: { data: membersAll.data } }
    const members: MatchableMember[] = (membersRes.json?.data || [])
      .filter((m: any) => typeof m.AM === 'number' && m.Name)
      .map((m: any) => ({ docId: m.documentId, name: m.Name, am: m.AM, email: m.Email || '' }))

    // learned aliases με ένα query
    const aliases = await getAliasesFor(joined.credits.map(c => c.payerName || ''))

    const rows = joined.credits.map(c => {
      const existingNumbers = existingByTxn.get(c.txnId)
        ?? fallbackMatches.get(c.txnId)?.map(m => m.number)
        ?? []
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
        existingNumbers,
        existingNumber: existingNumbers[0] ?? null,
        suggestion,
        candidates,
      }
    })

    return NextResponse.json({
      rows,
      warnings,
      stats: {
        credits: rows.length,
        alreadyIssued: rows.filter(r => r.existingNumbers.length).length,
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

/**
 * ΧΕΙΡΟΚΙΝΗΤΗ ΣΥΝΔΕΣΗ ΥΠΑΡΧΟΥΣΑΣ ΑΠΟΔΕΙΞΗΣ ΜΕ ΜΙΑ ΚΑΤΑΘΕΣΗ.
 *
 * ΓΙΑΤΙ: οι ενδοτραπεζικές μεταφορές (τύπος 96) ΔΕΝ περνούν από την αναφορά
 * «Εισερχόμενες εντολές» — άρα δεν αποκτούν ποτέ όνομα πληρωτή, και καμία
 * αυτόματη ταύτιση δεν μπορεί να τις δέσει. Η αιτιολογία («ΣΥΝΔΡΟΜΗ C FOR C»)
 * δεν ταυτοποιεί κανέναν, και κρύβει ακόμη και δύο αποδείξεις.
 *
 * Αντί να ΜΑΝΤΕΥΟΥΜΕ από την αιτιολογία, ο Financer δίνει ΒΕΒΑΙΟΤΗΤΑ: τον
 * αριθμό ή τους αριθμούς απόδειξης. Τα υπόλοιπα συμπληρώνονται από την ίδια
 * την απόδειξη.
 *
 * ΔΕΝ ΔΗΜΙΟΥΡΓΕΙ ΤΙΠΟΤΑ — δένει υπάρχοντα. Γι' αυτό είναι και πιο ασφαλές
 * από την έκδοση: η χειρότερη περίπτωση λάθους ξεκλειδώνεται.
 */
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat = effectiveSeat(
    access.seats as OcSeat[], seatCookie, cookieStore.get(OC_SEAT_MODE_COOKIE)?.value)
  if (activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const txnId = String(body?.txnId || '').trim()
  const amount = Number(body?.amount)
  const numbers: number[] = Array.isArray(body?.numbers)
    ? Array.from(new Set(
        (body.numbers as unknown[])
          .map(n => Number(n))
          .filter(n => Number.isInteger(n) && n > 0)))
    : []
  if (!txnId) return NextResponse.json({ error: 'Λείπει ο Αρ. Συναλλαγής' }, { status: 400 })
  if (!numbers.length) return NextResponse.json({ error: 'Δώσε τουλάχιστον έναν αριθμό απόδειξης' }, { status: 400 })

  // ΑΠΟΣΥΝΔΕΣΗ: κενή λίστα δεν φτάνει εδώ· το ρητό unlink είναι άλλη πράξη
  const found: any[] = []
  for (const n of numbers) {
    const r = await strapi(
      `/receipts?filters[Number][$eq]=${n}&pagination[limit]=1`
      + '&fields[0]=Number&fields[1]=Amount&fields[2]=MemberName&fields[3]=TransactionId'
      + '&fields[4]=Type&fields[5]=SubscriptionYear&fields[6]=PaymentDate')
    const hit = r.json?.data?.[0]
    if (!hit) return NextResponse.json({ error: `Η ΑΠ. ΕΙΣ. ${n} δεν βρέθηκε` }, { status: 404 })
    found.push(hit)
  }

  // Ήδη δεμένη ΑΛΛΟΥ; Τότε κάτι δεν στέκει — δεν την κλέβουμε σιωπηλά.
  const stolen = found.filter(f => f.TransactionId && f.TransactionId !== txnId)
  if (stolen.length) {
    return NextResponse.json({
      error: `Η ΑΠ. ΕΙΣ. ${stolen.map(s => s.Number).join(', ')} είναι ήδη δεμένη σε άλλη συναλλαγή `
        + '— αν είναι λάθος, ξεκλείδωσέ την πρώτα από εκείνη τη γραμμή.',
    }, { status: 409 })
  }

  /**
   * ΤΟ ΑΘΡΟΙΣΜΑ ΕΙΝΑΙ Ο ΕΛΕΓΧΟΣ. Ένας λάθος αριθμός πληκτρολογείται εύκολα·
   * ένας λάθος αριθμός που ΤΥΧΑΙΝΕΙ να αθροίζει στο ακριβές ποσό της κίνησης,
   * δύσκολα. Προτιμάμε να πούμε «δεν βγαίνει» παρά να δέσουμε λάθος απόδειξη.
   */
  const total = found.reduce((t, f) => t + Number(f.Amount || 0), 0)
  if (Number.isFinite(amount) && Math.abs(total - amount) > 0.005) {
    return NextResponse.json({
      error: `Δεν βγαίνει: οι αποδείξεις αθροίζουν ${total.toFixed(2)}€ ενώ η κατάθεση είναι `
        + `${amount.toFixed(2)}€. Λείπει ή περισσεύει κάποια.`,
    }, { status: 422 })
  }

  for (const f of found) {
    if (f.TransactionId === txnId) continue
    const upd = await strapi(`/receipts/${f.documentId}`, 'PUT', { TransactionId: txnId })
    if (!upd.ok) {
      return NextResponse.json({ error: `Αποτυχία σύνδεσης της ΑΠ. ΕΙΣ. ${f.Number}` }, { status: 502 })
    }
  }

  return NextResponse.json({
    ok: true,
    numbers: found.map(f => f.Number).sort((a, b) => a - b),
    memberName: found[0]?.MemberName || null,
    total,
  })
}
