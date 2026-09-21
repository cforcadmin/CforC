/**
 * Αρχειοθέτηση εξοδολογίου στο Drive, μέσω του Apps Script του
 * ΕΣΟΔΑ-ΕΞΟΔΑ — τον ίδιο δρόμο που ακολουθούν ήδη τα PDF των αποδείξεων.
 *
 * Γιατί όχι Drive API: ο λογαριασμός υπηρεσίας ΔΕΝ βλέπει τους φακέλους
 * Παραστατικών (επαληθεύτηκε: 404), ενώ το script τρέχει ως ιδιοκτήτης και
 * ξέρει ήδη πού είναι ο φάκελος κάθε μήνα. Δύο αντίγραφα αυτής της γνώσης
 * θα ήταν ένα παραπάνω από όσα χρειάζονται.
 *
 * BEST-EFFORT: αποτυχία εδώ ΔΕΝ ακυρώνει το εξοδολόγιο. Η εγγραφή μένει
 * χωρίς FolderUrl και ξανα-ανεβαίνει αργότερα.
 */

const WEBAPP_URL = process.env.FINANCE_SHEET_WEBAPP_URL
const WEBAPP_SECRET = process.env.FINANCE_SHEET_WEBAPP_SECRET

export interface ArchiveAttachment {
  name: string
  base64: string
  mime: string
}

export interface ArchiveResult {
  ok: boolean
  folderUrl?: string
  pdfUrl?: string
  pdfId?: string
  files?: Array<{ name: string; url: string }>
  error?: string
}

export function archiveConfigured(): boolean {
  return !!(WEBAPP_URL && WEBAPP_SECRET)
}

export async function archiveExpenseClaim(input: {
  month: string            // yyyy-MM — ο μήνας ΥΠΟΒΟΛΗΣ, εκεί ζει το αρχείο
  claimNumber: string
  pdfName: string
  pdfBase64: string
  attachments: ArchiveAttachment[]
}): Promise<ArchiveResult> {
  if (!archiveConfigured()) return { ok: false, error: 'not configured' }
  try {
    const res = await fetch(WEBAPP_URL as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: WEBAPP_SECRET, action: 'archiveExpenseClaim', ...input }),
      redirect: 'follow',
      cache: 'no-store',
    })
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch { /* σελίδα σφάλματος του Apps Script */ }
    if (!res.ok || !json?.ok) {
      const error = json?.error || `HTTP ${res.status}`
      console.error('expense claim archive failed:', error, text.slice(0, 160))
      return { ok: false, error }
    }
    return { ok: true, folderUrl: json.folderUrl, pdfUrl: json.pdfUrl, pdfId: json.pdfId, files: json.files }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'σφάλμα δικτύου'
    console.error('expense claim archive failed:', error)
    return { ok: false, error }
  }
}
