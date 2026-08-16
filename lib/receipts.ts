/**
 * Μητρώο αποδείξεων είσπραξης — ενιαία σειρά «ΑΠ. ΕΙΣ. Ν».
 *
 * Το OC είναι η ΜΟΝΑΔΙΚΗ αρχή αρίθμησης (απόφαση 14 Aug 2026): web
 * αποδείξεις παίρνουν τον επόμενο αριθμό αυτόματα, χειροκίνητες
 * (ανανεώσεις, μετρητά ΓΣ) καταχωρούνται από τον/την Financer μέσω OC.
 *
 * Seeding: η ΠΡΩΤΗ εγγραφή στη συλλογή γίνεται από τη φόρμα του Financer
 * με τον τελευταίο πραγματικό χειρόγραφο αριθμό — μέχρι τότε το σύστημα
 * ΑΡΝΕΙΤΑΙ να εκδώσει (nextReceiptNumber → null) αντί να μαντέψει.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export type ReceiptType = 'registration' | 'subscription' | 'extraordinary' | 'donation' | 'grant' | 'other'

export interface ReceiptInput {
  type: ReceiptType
  amount: number
  registrationFee?: number
  subscriptionFee?: number
  subscriptionYear?: number
  paymentDate?: string          // yyyy-MM-dd — ημερομηνία τράπεζας
  issueDate?: string            // yyyy-MM-dd — default σήμερα (Αθήνα)
  payerName?: string | null     // όπως ήρθε από την τράπεζα, as-is
  memberName?: string | null    // το τελικό/επιμελημένο όνομα
  memberDocId?: string | null   // σύνδεση με μέλος όταν υπάρχει
  transactionId?: string | null
  paymentMethod?: 'bank' | 'cash'
  companyName?: string | null
  companyAddress?: string | null
  companyTaxId?: string | null
  notes?: string | null
  createdBy?: string
}

export interface CreatedReceipt {
  number: number
  documentId: string
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
  try { json = await res.json() } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, json }
}

/** Αθηναϊκό σήμερα ως yyyy-MM-dd */
export function athensToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  return parts // en-CA δίνει ήδη yyyy-MM-dd
}

/** Εμφάνιση: «ΑΠ. ΕΙΣ. 366» */
export function formatReceiptNumber(n: number): string {
  return `ΑΠ. ΕΙΣ. ${n}`
}

/**
 * Σήμανση «η απόδειξη έφτασε στον παραλήπτη» — μετά από επιτυχή αποστολή
 * email ή χειροκίνητα από τον/τη Financer (π.χ. παράδοση σε ΓΣ).
 */
export async function markReceiptSent(documentId: string, when?: Date): Promise<boolean> {
  const r = await strapi(`/receipts/${documentId}`, 'PUT', {
    SentAt: (when || new Date()).toISOString(),
  })
  return r.ok
}

/**
 * Επόμενος αριθμός σειράς = μεγαλύτερος υπάρχων + 1.
 * null = η σειρά ΔΕΝ έχει αρχικοποιηθεί ακόμη (κενή συλλογή) — μην εκδώσεις.
 */
export async function nextReceiptNumber(): Promise<number | null> {
  const r = await strapi('/receipts?sort=Number:desc&pagination[limit]=1&fields[0]=Number')
  if (!r.ok) throw new Error(`receipts query failed: ${r.status}`)
  const top = r.json?.data?.[0]?.Number
  return typeof top === 'number' ? top + 1 : null
}

/**
 * Δημιουργία απόδειξης με τον επόμενο αριθμό της σειράς.
 * Το unique constraint στο Number πιάνει τον αγώνα δρόμου δύο ταυτόχρονων
 * εκδόσεων — σε σύγκρουση ξαναρωτάμε τη σειρά και ξαναπροσπαθούμε.
 *
 * explicitNumber: ΜΟΝΟ για το seeding (πρώτη εγγραφή με τον τελευταίο
 * χειρόγραφο αριθμό) ή διορθωτικές καταχωρήσεις από τον Financer.
 */
export async function createReceipt(input: ReceiptInput, explicitNumber?: number): Promise<CreatedReceipt> {
  const issueDate = input.issueDate || athensToday()
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = explicitNumber ?? await nextReceiptNumber()
    if (number === null) {
      throw new Error('receipt series not seeded — καταχώρησε πρώτα τον τελευταίο χειρόγραφο αριθμό από τη φόρμα του Financer')
    }
    const r = await strapi('/receipts', 'POST', {
      Number: number,
      Type: input.type,
      Amount: input.amount,
      RegistrationFee: input.registrationFee ?? null,
      SubscriptionFee: input.subscriptionFee ?? null,
      SubscriptionYear: input.subscriptionYear ?? null,
      PaymentDate: input.paymentDate || issueDate,
      IssueDate: issueDate,
      PayerName: input.payerName || null,
      MemberName: input.memberName || null,
      ...(input.memberDocId && { member: { connect: [input.memberDocId] } }),
      TransactionId: input.transactionId || null,
      PaymentMethod: input.paymentMethod || 'bank',
      CompanyName: input.companyName || null,
      CompanyAddress: input.companyAddress || null,
      CompanyTaxId: input.companyTaxId || null,
      SheetSynced: false,
      Notes: input.notes || null,
      CreatedBy: input.createdBy || 'system',
    })
    if (r.ok) {
      return { number, documentId: r.json?.data?.documentId }
    }
    // unique violation → άλλος πήρε τον αριθμό πρώτος· ξαναδοκίμασε
    const msg = JSON.stringify(r.json?.error || {})
    if (explicitNumber === undefined && (r.status === 400 || r.status === 409) && /unique/i.test(msg)) {
      continue
    }
    throw new Error(`receipt create failed: ${r.status} ${msg.slice(0, 200)}`)
  }
  throw new Error('receipt create failed: εξαντλήθηκαν οι προσπάθειες (unique conflict)')
}
