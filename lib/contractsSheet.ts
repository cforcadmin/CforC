/**
 * Ο καθρέφτης του «Μητρώου Συμβάσεων & Πληρωμών Συνεργατών» στο Google Sheet.
 *
 * Αυθεντία είναι το Strapi. Μετά από κάθε αλλαγή, το OC ΞΑΝΑΓΡΑΦΕΙ ολόκληρο
 * το εύρος δεδομένων του φύλλου από τη βάση — δεν ψάχνει γραμμή-γραμμή. Είναι
 * ντετερμινιστικό: ό,τι έχει η βάση έχει και το φύλλο, χωρίς λάθη ταιριάσματος.
 * Το τίμημα, συνειδητό: χειροκίνητες αλλαγές στο φύλλο χάνονται στην επόμενη
 * εγγραφή — γι' αυτό το φύλλο δηλώθηκε «μόνο για ανάγνωση» προς την ομάδα.
 *
 * Η κεφαλίδα (γραμμή 1) δεν πειράζεται ποτέ: είναι δουλειά ανθρώπου.
 */

import { getAccessToken, SCOPES } from '@/lib/googleAuth'

/** Το φύλλο· μπορεί να αλλάξει από env χωρίς αλλαγή κώδικα */
export const CONTRACTS_SHEET_ID =
  process.env.CONTRACTS_SHEET_ID || '1xjl_u5pcFqYgmbYmhZV1Pw8VJXNDibOHC04mPcytxuU'
const TAB = 'Sheet1'
/** Η πρώτη γραμμή δεδομένων· η 1 είναι η κεφαλίδα */
const FIRST_DATA_ROW = 2
const LAST_COL = 'Z'

export interface ContractRecord {
  documentId?: string
  Aa?: number | null
  Name?: string | null
  Role?: string | null
  Email?: string | null
  Phone?: string | null
  TaxId?: string | null
  ContractType?: string | null
  Project?: string | null
  StartDate?: string | null
  EndDate?: string | null
  ContractStatus?: string | null
  ContractFile?: string | null
  ContractNotes?: string | null
  Amount?: number | string | null
  PaymentMethod?: string | null
  PaymentFrequency?: string | null
  PaymentSchedule?: string | null
  NextPaymentDate?: string | null
  NextPaymentStatus?: string | null
  PaymentHistory?: string | null
  BankIban?: string | null
  PaymentStatus?: string | null
  PaymentNotes?: string | null
  ExpenseDocsLink?: string | null
  ExpenseListLink?: string | null
  SortIndex?: number | null
  Archived?: boolean | null
}

/** «2026-07-01» → «01/07/2026» — έτσι τις διαβάζουν οι άνθρωποι στο φύλλο */
export function grDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** 6600 → «6.600,00» */
export function grAmount(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v))

/**
 * Μία γραμμή φύλλου (A→Z) από μία εγγραφή. Η στήλη N είναι διαχωριστικό
 * («ΠΛΗΡΟΦΟΡΙΕΣ ΠΛΗΡΩΜΩΝ») και μένει κενή, όπως στο πρωτότυπο.
 */
export function contractToRow(c: ContractRecord): string[] {
  return [
    c.Aa === null || c.Aa === undefined ? '' : String(c.Aa), // A
    s(c.Name),                     // B
    s(c.Role),                     // C
    s(c.Email),                    // D
    s(c.Phone),                    // E
    s(c.TaxId),                    // F
    s(c.ContractType),             // G
    s(c.Project),                  // H
    grDate(c.StartDate),           // I
    grDate(c.EndDate),             // J
    s(c.ContractStatus),           // K
    s(c.ContractFile),             // L
    s(c.ContractNotes),            // M
    '',                            // N — διαχωριστικό ενότητας
    grAmount(c.Amount),            // O
    s(c.PaymentMethod),            // P
    s(c.PaymentFrequency),         // Q
    s(c.PaymentSchedule),          // R
    grDate(c.NextPaymentDate),     // S
    s(c.NextPaymentStatus),        // T
    s(c.PaymentHistory),           // U
    s(c.BankIban),                 // V
    s(c.PaymentStatus),            // W
    s(c.PaymentNotes),             // X
    s(c.ExpenseDocsLink),          // Y
    s(c.ExpenseListLink),          // Z
  ]
}

/** Η σειρά του φύλλου: όπως ο πίνακας — SortIndex, μετά Α/Α, μετά όνομα */
export function sortForSheet(list: ContractRecord[]): ContractRecord[] {
  return [...list].sort((a, b) =>
    (a.SortIndex ?? 9999) - (b.SortIndex ?? 9999) ||
    (a.Aa ?? 9999) - (b.Aa ?? 9999) ||
    String(a.StartDate || '').localeCompare(String(b.StartDate || '')) ||
    String(a.Name || '').localeCompare(String(b.Name || ''), 'el'))
}

export function buildSheetRows(list: ContractRecord[]): string[][] {
  // Οι αρχειοθετημένες δεν ταξιδεύουν στο φύλλο — μένουν στη βάση
  return sortForSheet(list.filter(c => !c.Archived)).map(contractToRow)
}

export interface MirrorResult { ok: boolean; rows?: number; error?: string }

/**
 * Ξαναγράφει τα δεδομένα του φύλλου από τη λίστα. Δεν πετά ποτέ: η αποτυχία
 * του καθρέφτη ΔΕΝ πρέπει να ακυρώνει μια επιτυχημένη εγγραφή στη βάση —
 * επιστρέφεται ώστε η οθόνη να το πει καθαρά.
 */
export async function mirrorContractsToSheet(list: ContractRecord[]): Promise<MirrorResult> {
  const rows = buildSheetRows(list)
  try {
    const token = await getAccessToken(SCOPES.sheetsWrite)
    if (!token) return { ok: false, error: 'Δεν υπάρχει πρόσβαση στο Google (service account)' }
    const auth = { Authorization: `Bearer ${token}` }

    // Πόσες γραμμές έχει σήμερα το φύλλο — για να καθαριστεί ό,τι περισσεύει
    const cur = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CONTRACTS_SHEET_ID}/values/${TAB}!A${FIRST_DATA_ROW}:A?majorDimension=COLUMNS`,
      { headers: auth, cache: 'no-store' })
    const curJson = await cur.json().catch(() => null)
    const existingRows: number = cur.ok ? (curJson?.values?.[0]?.length || 0) : 0

    if (rows.length > 0) {
      const last = FIRST_DATA_ROW + rows.length - 1
      const put = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CONTRACTS_SHEET_ID}/values/${TAB}!A${FIRST_DATA_ROW}:${LAST_COL}${last}?valueInputOption=USER_ENTERED`,
        { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: rows }) })
      if (!put.ok) {
        const j = await put.json().catch(() => null)
        return { ok: false, error: `Το φύλλο απέρριψε την εγγραφή (${put.status}): ${String(j?.error?.message || '').slice(0, 120)}` }
      }
    }

    // Γραμμές που περίσσεψαν από παλιότερη, μεγαλύτερη λίστα
    if (existingRows > rows.length) {
      const from = FIRST_DATA_ROW + rows.length
      const to = FIRST_DATA_ROW + existingRows - 1
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CONTRACTS_SHEET_ID}/values/${TAB}!A${from}:${LAST_COL}${to}:clear`,
        { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{}' })
    }
    return { ok: true, rows: rows.length }
  } catch (err) {
    // Ποτέ το περιεχόμενο — μόνο ο τύπος του σφάλματος (IBAN/ΑΦΜ δεν πάνε σε logs)
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 120) : 'άγνωστο σφάλμα' }
  }
}
