/**
 * Επανάληψη αρχειοθέτησης ενός εξοδολογίου στο Drive.
 *
 * Η αρχειοθέτηση στην υποβολή είναι BEST-EFFORT: αν πέσει το Apps Script, το
 * εξοδολόγιο περνά κανονικά αλλά μένει χωρίς PdfUrl/FolderUrl — και το email
 * προς το finance@ φεύγει ΧΩΡΙΣ τον σύνδεσμο «Τα παραστατικά στο Drive»,
 * γιατί ο σύνδεσμος μπαίνει μόνο όταν υπάρχει φάκελος. Συνέβη στο ΕΞ-2026-002
 * (28/9/2026): η υποβολή ολοκληρώθηκε, τα παραστατικά δεν έφτασαν ποτέ στο
 * Drive, και τίποτα δεν το έλεγε.
 *
 * Τίποτα δεν χάνεται: τα συνημμένα ζουν στη Βιβλιοθήκη του Strapi και το PDF
 * του εξοδολογίου ξαναχτίζεται από την ίδια την εγγραφή. Άρα η επανάληψη
 * είναι πλήρης — δεν χρειάζεται να ξανα-υποβάλει το μέλος.
 *
 * Ο ΜΗΝΑΣ είναι της ΥΠΟΒΟΛΗΣ, όχι της επανάληψης: αλλιώς ένα εξοδολόγιο του
 * Σεπτεμβρίου που ξανα-ανεβαίνει τον Οκτώβριο θα προσγειωνόταν σε λάθος
 * φάκελο και θα χαλούσε τη μηνιαία συμφωνία.
 */

import { generateExpenseClaimPdf } from '@/lib/expenseClaimPdf'
import { archiveExpenseClaim, archiveConfigured, type ArchiveAttachment, type ArchiveResult } from '@/lib/expenseClaimArchive'

/** Ο μήνας υποβολής σε ώρα Αθήνας — ίδιος υπολογισμός με τη διαδρομή του OC */
function athensMonth(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 7)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit',
  }).formatToParts(d)
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  return y && m ? `${y}-${m}` : d.toISOString().slice(0, 7)
}

/** Το αρχείο όπως το κατεβάζουμε από τη Βιβλιοθήκη, έτοιμο για το Apps Script */
async function fetchAttachment(a: any): Promise<ArchiveAttachment | null> {
  const url = String(a?.url || '')
  if (!/^https?:\/\//.test(url)) return null
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return {
      name: String(a.name || 'συνημμένο'),
      base64: buf.toString('base64'),
      mime: String(a.mime || 'application/octet-stream'),
    }
  } catch {
    return null
  }
}

export interface ReArchiveOutcome extends ArchiveResult {
  /** Πόσα συνημμένα δεν κατέβηκαν — η αρχειοθέτηση συνεχίζει με τα υπόλοιπα */
  missingAttachments?: number
}

/**
 * Ξαναχτίζει το PDF, ξανακατεβάζει τα συνημμένα και ξαναστέλνει στο Drive.
 * Δέχεται την ΕΓΓΡΑΦΗ του Strapi (με populate στα Attachments).
 */
export async function reArchiveExpenseClaim(c: any): Promise<ReArchiveOutcome> {
  if (!archiveConfigured()) return { ok: false, error: 'not configured' }

  const claimNumber = String(c?.ClaimNumber || '').trim()
  if (!claimNumber) return { ok: false, error: 'χωρίς αριθμό εξοδολογίου' }

  const pdf = await generateExpenseClaimPdf({
    claimNumber,
    memberName: String(c.MemberName || ''),
    email: String(c.MemberEmail || ''),
    phone: c.MemberPhone || null,
    bankName: c.BankName || null,
    accountHolder: String(c.AccountHolder || ''),
    iban: String(c.Iban || ''),
    eventType: String(c.EventType || ''),
    eventName: c.EventName || null,
    eventStart: String(c.EventStart || ''),
    eventEnd: String(c.EventEnd || ''),
    eventDays: c.EventDays ?? null,
    legs: Array.isArray(c.TravelLegs) ? c.TravelLegs : [],
    coTravellers: c.CoTravellers || null,
    lines: Array.isArray(c.Lines) ? c.Lines : [],
    total: Number(c.Total) || 0,
    advance: Number(c.Advance) || 0,
    payable: Number(c.Payable) || 0,
    notes: c.Notes || null,
    signature: c.Signature || null,
    submittedAt: c.SubmittedAt ? new Date(c.SubmittedAt) : new Date(),
  })

  const raw = Array.isArray(c.Attachments) ? c.Attachments : []
  const fetched = await Promise.all(raw.map(fetchAttachment))
  const attachments = fetched.filter((x): x is ArchiveAttachment => x !== null)

  const result = await archiveExpenseClaim({
    month: athensMonth(String(c.SubmittedAt || '')),
    claimNumber,
    pdfName: `${claimNumber}.pdf`,
    pdfBase64: Buffer.from(pdf).toString('base64'),
    attachments,
  })

  return { ...result, missingAttachments: raw.length - attachments.length }
}
