import { deriveSteps, allStepsDone, doneCount, PAYMENT_STEP_ORDER } from '@/lib/paymentSteps'

const st = (ev: any) => Object.fromEntries(deriveSteps(ev).map(s => [s.key, s.state]))

/**
 * 7/10/2026 — Η ΑΚΡΙΒΗΣ ΚΑΤΑΣΤΑΣΗ ΠΟΥ ΕΜΕΙΝΕ ΑΟΡΑΤΗ.
 * Το Μητρώο προήχθη, η συνάρτηση σκοτώθηκε στα 60s, τίποτα άλλο δεν έγινε.
 */
describe('το περιστατικό της Ιφιγένειας', () => {
  it('Μητρώο ✓ και όλα τα υπόλοιπα εκκρεμή ή κλειδωμένα', () => {
    // Το ΑΜ υπάρχει στο Sheet αλλά μέλος δεν δημιουργήθηκε
    const s = st({ member: { AM: 118 }, receipt: null })
    expect(s.registry).toBe('done')
    expect(s.member).toBe('pending')
    expect(s.receipt).toBe('blocked')
    expect(s.receiptEmail).toBe('blocked')
    expect(s.esoda).toBe('blocked')
    expect(s.welcome).toBe('blocked')
  })
})

describe('deriveSteps', () => {
  it('τίποτα δεν έγινε', () => {
    const s = st({})
    expect(s.registry).toBe('pending')
    expect(s.member).toBe('pending')
  })

  it('όλα έγιναν', () => {
    const ev = {
      member: { documentId: 'm1', AM: 118 },
      receipt: { Number: 382, SentAt: '2026-10-07T10:00:00Z', SheetSynced: true },
      welcomeSentAt: '2026-10-07T10:00:00Z',
    }
    expect(allStepsDone(deriveSteps(ev))).toBe(true)
    expect(doneCount(deriveSteps(ev))).toBe(PAYMENT_STEP_ORDER.length)
  })

  /* Η απόδειξη εκδόθηκε αλλά δεν στάλθηκε, και δεν μπήκε στα ΕΣΟΔΑ */
  it('απόδειξη χωρίς αποστολή και χωρίς συγχρονισμό', () => {
    const s = st({
      member: { documentId: 'm1', AM: 118 },
      receipt: { Number: 382, SentAt: null, SheetSynced: false },
    })
    expect(s.receipt).toBe('done')
    expect(s.receiptEmail).toBe('pending')
    expect(s.esoda).toBe('pending')
  })

  /**
   * ΤΟ ΚΛΕΙΔΩΜΕΝΟ ΔΕΝ ΕΙΝΑΙ ΑΠΟΤΥΧΙΑ. Χωρίς μέλος, η απόδειξη δεν ΜΠΟΡΕΙ να
   * τρέξει — δεν πρέπει να προσφέρεται ως κουμπί που θα αποτύχει.
   */
  it('τα κλειδωμένα λένε ΓΙΑΤΙ', () => {
    const steps = deriveSteps({})
    const receipt = steps.find(s => s.key === 'receipt')!
    expect(receipt.state).toBe('blocked')
    expect(receipt.because).toMatch(/μέλος/)
  })

  it('το welcome ξεκλειδώνει μόλις υπάρξει μέλος', () => {
    expect(st({ member: { documentId: 'm1' } }).welcome).toBe('pending')
  })

  it('η σειρά των βημάτων είναι σταθερή', () => {
    expect(deriveSteps({}).map(s => s.key)).toEqual(PAYMENT_STEP_ORDER)
  })

  /* Το ΑΜ μηδέν ή κενό δεν μετράει ως προαγωγή */
  it('κενό ΑΜ δεν είναι ολοκληρωμένο Μητρώο', () => {
    expect(st({ member: { AM: '' } }).registry).toBe('pending')
    expect(st({ member: { AM: null } }).registry).toBe('pending')
  })
})
