import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { verifyToken } from '@/lib/auth'
import { sendOcEmail, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * Δήλωση «πλήρωσα τη συνδρομή μου» (ανανέωση μέλους) — από το κουμπί του
 * email υπενθύμισης. Auth: signed renewal-claim token. Θέτει
 * RenewalClaimedAt στο μέλος (→ teal ένδειξη στα Οικονομικά) και
 * ειδοποιεί το finance@ — awaited (serverless).
 *
 * ΤΟ ΑΠΟΔΕΙΚΤΙΚΟ ΕΙΝΑΙ ΥΠΟΧΡΕΩΤΙΚΟ.
 *
 * Το σκέτο κουμπί δεν αποδεικνύει τίποτα: στην πράξη μέλη το πάτησαν ενώ η
 * τράπεζα είχε γυρίσει πίσω τα χρήματα, και το OC τα εμφάνιζε ως πληρωμένα.
 * Με το παραστατικό ο Ταμίας έχει κάτι να αντιπαραβάλει με την κίνηση.
 *
 * ΠΡΟΣΟΧΗ: το παραστατικό αποδεικνύει ότι η πληρωμή ΞΕΚΙΝΗΣΕ, όχι ότι
 * εκκαθαρίστηκε — η αντιστροφή γίνεται μέρες μετά. Η αυθεντία παραμένει η
 * συμφωνία με τις κινήσεις τράπεζας στα Οικονομικά.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
// PDF πρώτο: το e-banking το βγάζει με αριθμό συναλλαγής. Οι εικόνες μένουν
// δεκτές για όποιον φωτογραφίζει χάρτινο παραστατικό ταμείου.
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 500 })
  }

  let token = ''
  let receipt: File | null = null
  const contentType = request.headers.get('content-type') || ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData()
      token = String(fd.get('token') || '')
      const f = fd.get('receipt')
      if (f instanceof File && f.size > 0) receipt = f
    } else {
      const body = await request.json()
      token = String(body?.token || '')
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }

  const decoded = verifyToken(token)
  if (!decoded || decoded.type !== 'renewal-claim') {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 401 })
  }
  if (!receipt) {
    return NextResponse.json(
      { ok: false, error: 'receipt required', message: 'Χρειάζεται το αποδεικτικό της κατάθεσης' },
      { status: 422 })
  }
  if (!ALLOWED_TYPES.includes(receipt.type)) {
    return NextResponse.json(
      { ok: false, error: 'bad type', message: 'Επιτρέπονται PDF ή εικόνες (JPG/PNG/WebP)' },
      { status: 422 })
  }
  if (receipt.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'too large', message: 'Το αρχείο ξεπερνά τα 10MB' },
      { status: 422 })
  }

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/members/${decoded.memberId}?fields[0]=Name&fields[1]=Email&fields[2]=AM&fields[3]=Payments&fields[4]=RegistrationYear&fields[5]=RenewalClaimedAt`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
    )
    const member = res.ok ? (await res.json())?.data : null
    if (!member) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })

    // Το παραστατικό ανεβαίνει ΠΡΙΝ το PUT, ώστε να συνδεθεί μαζί του
    const ext = receipt.type === 'application/pdf' ? 'pdf'
      : receipt.type === 'image/png' ? 'png'
      : receipt.type === 'image/webp' ? 'webp' : 'jpg'
    const uploadForm = new FormData()
    uploadForm.append('files', receipt, `renewal_${member.AM ?? member.id}_${Date.now()}.${ext}`)
    const up = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, body: uploadForm,
    })
    if (!up.ok) {
      console.error('renewal-claim: receipt upload failed', up.status)
      return NextResponse.json({ ok: false, error: 'upload failed' }, { status: 502 })
    }
    const uploaded = await up.json()
    const receiptId: number | null = uploaded?.[0]?.id ?? null
    const receiptUrl: string | null = uploaded?.[0]?.url ?? null

    // Ξαναδήλωση: κρατάμε την ΠΡΩΤΗ ημερομηνία αλλά δεχόμαστε νεότερο
    // παραστατικό — κάποιος που ξαναπλήρωσε σωστά πρέπει να μπορεί να το δείξει.
    const already = !!member.RenewalClaimedAt
    const payload: Record<string, any> = {}
    if (!already) payload.RenewalClaimedAt = new Date().toISOString()
    if (receiptId) payload.RenewalReceipt = receiptId

    // ΠΡΟΣΟΧΗ: το custom member controller δέχεται ΜΟΝΟ αριθμητικό id στο PUT
    const put = (data: Record<string, any>) => fetch(`${STRAPI_URL}/api/members/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: JSON.stringify({ data }),
    })
    let upd = await put(payload)
    // Το RenewalReceipt μπορεί να μην έχει βγει ακόμη στο Strapi Cloud: τότε
    // το 400 θα έπαιρνε μαζί του και την ημερομηνία. Η δήλωση προηγείται· το
    // παραστατικό ζει έτσι κι αλλιώς στη Βιβλιοθήκη και μπαίνει στο email.
    if (!upd.ok && upd.status === 400 && 'RenewalReceipt' in payload) {
      delete payload.RenewalReceipt
      if (Object.keys(payload).length) upd = await put(payload)
    }
    if (!upd.ok && Object.keys(payload).length) {
      console.error('renewal-claim: member update failed', upd.status)
      return NextResponse.json({ ok: false, error: 'store failed' }, { status: 502 })
    }

    // owed για το κείμενο της ειδοποίησης
    const year = new Date().getFullYear()
    const p = (member.Payments && typeof member.Payments === 'object') ? member.Payments : {}
    const regYear = typeof member.RegistrationYear === 'number' ? member.RegistrationYear : null
    const owed: number[] = []
    const prev = p[String(year - 1)]
    if (prev !== 1 && prev !== 0 && (regYear === null || regYear <= year - 1)) owed.push(year - 1)
    const cur = p[String(year)]
    if (cur !== 1 && cur !== 0) owed.push(year)

    const name = String(member.Name || '').trim()
    const html = `<!DOCTYPE html><html lang="el"><body style="margin:0;padding:24px;background:#F5F0EB;font-family:Arial,Helvetica,sans-serif;color:#2D2D2D;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:28px 32px;">
<p style="margin:0 0 8px 0;font-size:13px;letter-spacing:1.4px;color:#FF8B6A;font-weight:bold;">CULTURE FOR CHANGE — OC</p>
<h2 style="margin:0 0 16px 0;font-size:20px;">Δήλωση πληρωμής συνδρομής (ανανέωση)</h2>
<p style="margin:0 0 6px 0;"><strong>Μέλος:</strong> ${name} (ΑΜ ${member.AM ?? '—'})</p>
<p style="margin:0 0 6px 0;"><strong>Email:</strong> ${member.Email || '—'}</p>
<p style="margin:0 0 6px 0;"><strong>Οφειλή:</strong> ${owed.length ? owed.join(' + ') + ` (${owed.length * 35},00 €)` : '—'}</p>
<p style="margin:0 0 6px 0;"><strong>Αποδεικτικό:</strong> ${receiptUrl
  ? `<a href="${receiptUrl}" style="color:#C9552F;">άνοιγμα παραστατικού</a>`
  : '— (δεν αποθηκεύτηκε)'}</p>
<p style="margin:16px 0 0 0;font-size:14px;color:#5A5A5A;">Το παραστατικό δείχνει ότι η πληρωμή ΞΕΚΙΝΗΣΕ· η αντιστροφή γίνεται μέρες μετά, οπότε η επιβεβαίωση γίνεται πάντα από τις κινήσεις τράπεζας.</p>
<p style="margin:16px 0 0 0;font-size:14px;color:#5A5A5A;">Μόλις φανεί η κατάθεση στην τράπεζα:
OC → Επισκόπηση → κλικ στο tile «Πληρωμένο» (ή Οικονομικά → Συνδρομές → κλικ στο badge) → στο popup
το μέλος είναι πρώτο με 💶 → «Έγκριση + απόδειξη» — η απόδειξη δημιουργείται, αποστέλλεται στο μέλος
και ενημερώνει τις πληρωμές, όλα αυτόματα. Αν η κατάθεση δεν φανεί, «Αποτυχία» ενημερώνει το μέλος.</p>
<p style="margin:20px 0 0 0;">
<a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cultureforchange.net'}/oc?open=renewals"
   style="display:inline-block;background:#2D2D2D;color:#FFFFFF;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 26px;border-radius:999px;">Άνοιγμα λίστας δηλώσεων →</a>
</p>
</div></body></html>`
    await sendOcEmail(FINANCE_EMAIL, `Δήλωση πληρωμής συνδρομής — ${name}`, html)

    return NextResponse.json({ ok: true, already, receiptStored: !!receiptId })
  } catch (err) {
    console.error('renewal-claim error:', err)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
