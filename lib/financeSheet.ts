/**
 * Γέφυρα προς το ΕΣΟΔΑ-ΕΞΟΔΑ Google Sheet (Φάση Γ) — ίδιο pattern με το
 * Μητρώο: web app /exec + κοινό secret. BEST-EFFORT: αποτυχία εδώ δεν
 * μπλοκάρει ΠΟΤΕ την έκδοση απόδειξης — η απόδειξη μένει SheetSynced:false
 * (πορτοκαλί «χειροκίνητα» badge) και ξαναγράφεται αργότερα.
 */

const FINANCE_SHEET_WEBAPP_URL = process.env.FINANCE_SHEET_WEBAPP_URL
const FINANCE_SHEET_WEBAPP_SECRET = process.env.FINANCE_SHEET_WEBAPP_SECRET

export function financeSheetConfigured(): boolean {
  return !!(FINANCE_SHEET_WEBAPP_URL && FINANCE_SHEET_WEBAPP_SECRET)
}

export interface EsodaReceiptRow {
  number: number
  type: 'registration' | 'subscription' | 'extraordinary' | 'donation' | 'grant' | 'other'
  amount: number
  registrationFee?: number | null
  subscriptionYear?: number | null
  paymentDate?: string | null   // yyyy-MM-dd
  issueDate?: string | null     // yyyy-MM-dd
  memberName?: string | null
  payerName?: string | null
  method?: 'bank' | 'cash'
  emailSent?: boolean
  sentAt?: string | null        // ISO
  typeLabel?: string | null
  /** Φάση Γ βήμα 2: το PDF της απόδειξης → Drive (φάκελος μήνα) + τικ ΑΡΧΕΙΟΘΕΤΗΣΗ */
  pdfBase64?: string | null
  pdfName?: string | null
}

/** Γράφει τη γραμμή της απόδειξης στο ΕΣΟΔΑ. Επιστρέφει ok=false σε
 *  οποιοδήποτε πρόβλημα (δίκτυο, secret, layout) — ο καλών συνεχίζει. */
export async function appendReceiptToEsoda(row: EsodaReceiptRow): Promise<{ ok: boolean; duplicate?: boolean; aa?: string; error?: string }> {
  if (!financeSheetConfigured()) return { ok: false, error: 'not configured' }
  try {
    const res = await fetch(FINANCE_SHEET_WEBAPP_URL as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: FINANCE_SHEET_WEBAPP_SECRET,
        action: 'appendIncome',
        ...row,
        method: row.method || 'bank',
      }),
      // Το Apps Script απαντά με redirect — follow όπως στο Μητρώο
      redirect: 'follow',
      cache: 'no-store',
    })
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch { /* HTML error page κ.λπ. */ }
    if (!res.ok || !json?.ok) {
      const error = json?.error || `HTTP ${res.status}`
      console.error('financeSheet append failed:', error, text.slice(0, 200))
      return { ok: false, error }
    }
    return { ok: true, duplicate: !!json.duplicate, aa: json.aa || undefined }
  } catch (err: any) {
    console.error('financeSheet append error:', err)
    return { ok: false, error: String(err?.message || err) }
  }
}
