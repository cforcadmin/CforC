import { writeFileSync } from 'fs'
import { generateExpenseClaimPdf, type ExpenseClaimPdfData } from '@/lib/expenseClaimPdf'
import type { ClaimLine } from '@/lib/expenseClaims'

/** Το παράδειγμα ΜΠΑΡΑΤΑ, το ίδιο που έχουμε ως χαρτί */
const sample = (over: Partial<ExpenseClaimPdfData> = {}): ExpenseClaimPdfData => ({
  claimNumber: 'ΕΞ-2026-001',
  memberName: 'Αργυρώ Μπαράτα',
  email: 'argyro.barata@gmail.com',
  phone: '6945903959',
  bankName: 'Alpha Bank',
  accountHolder: 'Argyro Barata',
  iban: 'GR2501407050705002310020006',
  eventType: 'Midterm',
  eventName: null,
  eventStart: '2026-12-20',
  eventEnd: '2026-12-22',
  eventDays: 3,
  legs: [
    { from: 'Θεσσαλονίκη', to: 'Πάτρα', mode: 'Καύσιμα', direction: 'outbound' },
    { from: 'Πάτρα', to: 'Θεσσαλονίκη', mode: 'Καύσιμα', direction: 'return' },
  ],
  coTravellers: 'Γιώργος Στυλιανόπουλος, Στέλλα Τσιαρβούλα, Ειρήνη Μακεδώνα',
  lines: [
    { category: 'Ταξίδι', receiptType: 'Καύσιμα', description: 'Βενζίνη μετ’ επιστροφής', date: '2026-12-20', amount: 183.2, files: [] },
    { category: 'Ταξίδι', receiptType: 'Διόδια', description: '', date: '2026-12-20', dateEnd: '2026-12-22', amount: 82.7, files: [] },
    { category: 'Άλλο', receiptType: 'Εκτυπώσεις / αναλώσιμα', description: 'Υλικό εργαστηρίου', date: '2026-12-21', amount: 12.22, files: [] },
  ],
  total: 278.12,
  advance: 175,
  payable: 103.12,
  notes: 'Η βενζίνη καλύπτει και τις δύο κατευθύνσεις.',
  signature: null,
  submittedAt: new Date('2026-12-22T16:41:57Z'),
  ...over,
})

describe('PDF εξοδολογίου', () => {
  it('παράγει έγκυρο PDF και το αφήνει για οπτικό έλεγχο', async () => {
    const bytes = await generateExpenseClaimPdf(sample())
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(20000)
    writeFileSync('/tmp/exodologio-sample.pdf', bytes)
  }, 20000)

  it('αντέχει 40 γραμμές εξόδων χωρίς να κοπεί', async () => {
    const many: ClaimLine[] = Array.from({ length: 40 }, (_, i) => ({
      category: 'Διατροφή', receiptType: 'Εστιατόριο / καφέ',
      description: `Γεύμα ημέρας ${i + 1} με αρκετά μεγάλη περιγραφή για να δοκιμαστεί το κόψιμο`,
      date: '2026-12-20', amount: 12.5, files: [],
    }))
    const bytes = await generateExpenseClaimPdf(sample({ lines: many, total: 500, advance: 0, payable: 500 }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
    writeFileSync('/tmp/exodologio-many.pdf', bytes)
  }, 20000)

  it('δεν σπάει με χαλασμένη υπογραφή', async () => {
    const bytes = await generateExpenseClaimPdf(sample({ signature: 'data:image/png;base64,όχι-εικόνα' }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
  }, 20000)

  it('παραλείπει το μπλοκ προκαταβολής όταν δεν υπάρχει', async () => {
    const withAdvance = await generateExpenseClaimPdf(sample())
    const without = await generateExpenseClaimPdf(sample({ advance: 0, payable: 278.12 }))
    expect(without.length).toBeLessThan(withAdvance.length)
  }, 20000)
})
