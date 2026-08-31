/**
 * Τι χρειάζεται προσοχή στις συμβάσεις — καθαρή λογική, χωρίς δίκτυο, ώστε
 * να ελέγχεται με tests.
 *
 * ΚΑΝΟΝΑΣ: οι φάσεις προκύπτουν από ΗΜΕΡΟΜΗΝΙΕΣ, όχι από τα πεδία κατάστασης
 * που γράφει ο άνθρωπος. Το «ΕΧΕΙ ΚΑΘΥΣΤΕΡΗΣΕΙ» είναι πληκτρολογημένο και
 * κληρονομεί κάθε παράλειψη· η ημερομηνία πληρωμής δεν λέει ψέματα. Τα
 * πληκτρολογημένα πεδία χρησιμεύουν αλλού: όπου διαφωνούν με τις ημερομηνίες
 * βγαίνει «ασυμφωνία», ώστε το μητρώο να διορθώνεται μόνο του με τον χρόνο.
 */

import type { ContractRecord } from '@/lib/contractsSheet'

export interface ReminderContract extends ContractRecord {
  documentId: string
  NoReminders?: boolean | null
  ReminderLog?: Record<string, string> | null
}

export interface ReminderItem {
  documentId: string
  name: string
  project: string | null
  amount: number | null
  /** Η ημερομηνία που αφορά τη φάση (λήξη ή πληρωμή) */
  date: string | null
  /** Θετικό = μέρες που απομένουν· αρνητικό = μέρες που πέρασαν */
  days: number | null
  note?: string
}

export interface ReminderBuckets {
  /** Λήγει σε 45/21/7 ημέρες */
  expiring: ReminderItem[]
  /** Επόμενη δόση μέσα στις επόμενες 7 ημέρες */
  paymentSoon: ReminderItem[]
  /** Η ημερομηνία πληρωμής πέρασε και δεν έχει πληρωθεί */
  overdue: ReminderItem[]
  /** Λείπει τιμολόγιο και η πληρωμή είναι κοντά ή πέρασε */
  invoicePending: ReminderItem[]
  /** Εγκεκριμένο, δεν έχει σταλεί ακόμη από την τράπεζα */
  readyToPay: ReminderItem[]
  /** Έληξε η σύμβαση αλλά η πληρωμή δεν έκλεισε */
  endedOpen: ReminderItem[]
  /** Τα πληκτρολογημένα πεδία διαφωνούν με τις ημερομηνίες */
  inconsistencies: ReminderItem[]
}

export const EXPIRY_STEPS = [45, 21, 7]
export const PAYMENT_LEAD_DAYS = 7
export const READY_TO_PAY_DAYS = 3

const PAID = 'πληρώθηκε'
const READY = 'έτοιμο'
const INVOICE_PENDING = 'εκκρεμεί τιμολόγιο'

const norm = (v: string | null | undefined) => String(v || '').trim().toLowerCase()
export const isPaid = (c: ReminderContract) => norm(c.PaymentStatus).includes(PAID)
const isReadyToPay = (c: ReminderContract) => norm(c.PaymentStatus).includes(READY)
const needsInvoice = (c: ReminderContract) => norm(c.PaymentStatus).includes(INVOICE_PENDING)
const isEnded = (c: ReminderContract) => norm(c.ContractStatus).includes('ληξ')

/** Ημέρες από το «σήμερα» ως την ημερομηνία· θετικό = στο μέλλον */
export function daysUntil(date: string | null | undefined, today: string): number | null {
  if (!date) return null
  const a = Date.parse(`${String(date).slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${today.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((a - b) / 86400000)
}

function item(c: ReminderContract, date: string | null, today: string, note?: string): ReminderItem {
  return {
    documentId: c.documentId,
    name: String(c.Name || '—'),
    project: c.Project ?? null,
    amount: c.Amount === null || c.Amount === undefined ? null : Number(c.Amount),
    date: date ? String(date).slice(0, 10) : null,
    days: daysUntil(date, today),
    ...(note ? { note } : {}),
  }
}

/** Οι συμβάσεις που μετρούν: όχι αρχειοθετημένες, όχι σε σίγαση */
export function active(list: ReminderContract[]): ReminderContract[] {
  return list.filter(c => !c.Archived && !c.NoReminders)
}

export function buildBuckets(list: ReminderContract[], today: string): ReminderBuckets {
  const b: ReminderBuckets = {
    expiring: [], paymentSoon: [], overdue: [], invoicePending: [], readyToPay: [], endedOpen: [], inconsistencies: [],
  }

  for (const c of active(list)) {
    const dEnd = daysUntil(c.EndDate, today)
    const dPay = daysUntil(c.NextPaymentDate, today)

    // ── Λήξη σύμβασης: μόνο στα σκαλοπάτια, ώστε να μην επαναλαμβάνεται κάθε μέρα
    if (dEnd !== null && !isEnded(c) && dEnd >= 0 && dEnd <= EXPIRY_STEPS[0]) {
      b.expiring.push(item(c, c.EndDate ?? null, today))
    }

    // ── Πληρωμές: η ημερομηνία αποφασίζει, όχι η πληκτρολογημένη κατάσταση
    if (dPay !== null && !isPaid(c)) {
      if (dPay < 0) b.overdue.push(item(c, c.NextPaymentDate ?? null, today))
      else if (dPay <= PAYMENT_LEAD_DAYS) b.paymentSoon.push(item(c, c.NextPaymentDate ?? null, today))
      if (needsInvoice(c) && dPay <= PAYMENT_LEAD_DAYS) {
        b.invoicePending.push(item(c, c.NextPaymentDate ?? null, today))
      }
    }

    // ── Εγκεκριμένο αλλά αστάλτο: κρατάμε πόσο καιρό κάθεται, αν το ξέρουμε
    if (isReadyToPay(c)) b.readyToPay.push(item(c, c.NextPaymentDate ?? null, today))

    // ── Έληξε με ανοιχτή πληρωμή
    if (isEnded(c) && !isPaid(c)) {
      b.endedOpen.push(item(c, c.EndDate ?? null, today, c.PaymentStatus || 'χωρίς κατάσταση πληρωμής'))
    }

    // ── Ασυμφωνίες: το μητρώο διορθώνεται μόνο του όταν τις βλέπει κανείς
    if (dEnd !== null && dEnd < 0 && !isEnded(c)) {
      b.inconsistencies.push(item(c, c.EndDate ?? null, today,
        `η σύμβαση έληξε πριν από ${Math.abs(dEnd)} ημέρες αλλά η κατάσταση λέει «${c.ContractStatus || '—'}»`))
    }
    if (dEnd !== null && dEnd >= 0 && isEnded(c)) {
      b.inconsistencies.push(item(c, c.EndDate ?? null, today,
        `η κατάσταση λέει «ΛΗΞΗ» αλλά η σύμβαση τρέχει ως ${String(c.EndDate).slice(0, 10)}`))
    }
    if (dPay !== null && dPay < 0 && norm(c.NextPaymentStatus).includes('μελλοντ')) {
      b.inconsistencies.push(item(c, c.NextPaymentDate ?? null, today,
        `η πληρωμή έπρεπε να γίνει πριν από ${Math.abs(dPay)} ημέρες αλλά σημειώνεται «ΜΕΛΛΟΝΤΙΚΗ»`))
    }
    if (isPaid(c) && dPay !== null && dPay < 0) {
      b.inconsistencies.push(item(c, c.NextPaymentDate ?? null, today,
        'σημειώνεται «Πληρώθηκε» αλλά η επόμενη πληρωμή δεν έχει προχωρήσει σε επόμενη ημερομηνία'))
    }
    if (!c.NextPaymentDate && !isEnded(c) && !isPaid(c)) {
      b.inconsistencies.push(item(c, null, today, 'ενεργή σύμβαση χωρίς ημερομηνία επόμενης πληρωμής'))
    }
  }

  // Το πιο επείγον πρώτο σε κάθε ομάδα
  const byUrgency = (x: ReminderItem, y: ReminderItem) => (x.days ?? 9999) - (y.days ?? 9999)
  for (const k of Object.keys(b) as Array<keyof ReminderBuckets>) b[k].sort(byUrgency)
  return b
}

export function totalCount(b: ReminderBuckets): number {
  return b.expiring.length + b.paymentSoon.length + b.overdue.length
    + b.invoicePending.length + b.readyToPay.length + b.endedOpen.length
}

/* ── Άμεσες ειδοποιήσεις (Β): μόνο δύο περιπτώσεις, με μνήμη ώστε να μη
      στέλνονται κάθε μέρα. Το κλειδί περιλαμβάνει την ημερομηνία-αφορμή, ώστε
      μια νέα λήξη ή νέα δόση να ξαναστείλει. ─────────────────────────────── */

export type UrgentKind = 'expiry' | 'ready-to-pay'

export interface UrgentAlert {
  contract: ReminderContract
  kind: UrgentKind
  /** Κλειδί στο ReminderLog — μία αποστολή ανά αφορμή */
  logKey: string
  item: ReminderItem
}

export const URGENT_EXPIRY_DAYS = 7

export function findUrgent(list: ReminderContract[], today: string): UrgentAlert[] {
  const out: UrgentAlert[] = []
  for (const c of active(list)) {
    const dEnd = daysUntil(c.EndDate, today)
    if (dEnd !== null && dEnd >= 0 && dEnd <= URGENT_EXPIRY_DAYS && !isEnded(c)) {
      const logKey = `expiry:${String(c.EndDate).slice(0, 10)}`
      if (!c.ReminderLog?.[logKey]) out.push({ contract: c, kind: 'expiry', logKey, item: item(c, c.EndDate ?? null, today) })
    }
    if (isReadyToPay(c)) {
      // Χωρίς ημερομηνία πληρωμής δεν ξέρουμε πόσο κάθεται — κλειδί ανά εβδομάδα,
      // ώστε να υπενθυμίζεται αραιά αντί να σιωπά για πάντα
      const anchor = c.NextPaymentDate ? String(c.NextPaymentDate).slice(0, 10) : weekAnchor(today)
      const dPay = daysUntil(c.NextPaymentDate, today)
      const stale = dPay === null || dPay <= -READY_TO_PAY_DAYS || dPay <= 0
      const logKey = `ready:${anchor}`
      if (stale && !c.ReminderLog?.[logKey]) {
        out.push({ contract: c, kind: 'ready-to-pay', logKey, item: item(c, c.NextPaymentDate ?? null, today) })
      }
    }
  }
  return out
}

/** Δευτέρα της εβδομάδας — σταθερό κλειδί για όσα δεν έχουν ημερομηνία */
export function weekAnchor(today: string): string {
  const d = new Date(`${today.slice(0, 10)}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // 0 = Δευτέρα
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

/** Δευτέρα; — η εβδομαδιαία σύνοψη φεύγει μόνο τότε */
export function isDigestDay(today: string): boolean {
  const d = new Date(`${today.slice(0, 10)}T00:00:00Z`)
  return d.getUTCDay() === 1
}
