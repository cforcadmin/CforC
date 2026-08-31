import {
  buildBuckets, findUrgent, daysUntil, isDigestDay, weekAnchor, totalCount,
  type ReminderContract,
} from '@/lib/contractReminders'

const TODAY = '2026-09-01' // Τρίτη
const c = (over: Partial<ReminderContract>): ReminderContract => ({
  documentId: over.documentId || 'x1', Name: 'Δοκιμή', ...over,
} as ReminderContract)

describe('υπενθυμίσεις συμβάσεων', () => {
  it('μετρά σωστά τις ημέρες προς τα εμπρός και πίσω', () => {
    expect(daysUntil('2026-09-08', TODAY)).toBe(7)
    expect(daysUntil('2026-08-25', TODAY)).toBe(-7)
    expect(daysUntil(null, TODAY)).toBeNull()
  })

  it('λήξη: μπαίνει μέσα στις 45 ημέρες, όχι νωρίτερα', () => {
    const b = buildBuckets([
      c({ documentId: 'a', EndDate: '2026-09-20', ContractStatus: 'ΕΝΕΡΓΗ' }),
      c({ documentId: 'b', EndDate: '2027-03-31', ContractStatus: 'ΕΝΕΡΓΗ' }),
    ], TODAY)
    expect(b.expiring.map(i => i.documentId)).toEqual(['a'])
  })

  it('η ημερομηνία αποφασίζει την καθυστέρηση, όχι το πληκτρολογημένο πεδίο', () => {
    const b = buildBuckets([
      c({ documentId: 'late', NextPaymentDate: '2026-08-30', NextPaymentStatus: 'ΜΕΛΛΟΝΤΙΚΗ', PaymentStatus: 'Εκκρεμεί Τιμολόγιο' }),
    ], TODAY)
    expect(b.overdue).toHaveLength(1)
    // …και η διαφωνία καταγράφεται ως ασυμφωνία
    expect(b.inconsistencies.some(i => i.note?.includes('ΜΕΛΛΟΝΤΙΚΗ'))).toBe(true)
  })

  it('πληρωμένη σύμβαση δεν μπαίνει σε καθυστερήσεις', () => {
    const b = buildBuckets([c({ NextPaymentDate: '2026-08-01', PaymentStatus: 'Πληρώθηκε' })], TODAY)
    expect(b.overdue).toHaveLength(0)
  })

  it('επόμενη δόση μέσα σε 7 ημέρες → προειδοποίηση, μαζί με το εκκρεμές τιμολόγιο', () => {
    const b = buildBuckets([c({ NextPaymentDate: '2026-09-05', PaymentStatus: 'Εκκρεμεί Τιμολόγιο' })], TODAY)
    expect(b.paymentSoon).toHaveLength(1)
    expect(b.invoicePending).toHaveLength(1)
  })

  it('«Έτοιμο για eBanking» εμφανίζεται ώστε να μη μείνει αστάλτο', () => {
    const b = buildBuckets([c({ PaymentStatus: 'Έτοιμο για eBanking', NextPaymentDate: '2026-08-20' })], TODAY)
    expect(b.readyToPay).toHaveLength(1)
  })

  it('ληγμένη σύμβαση με ανοιχτή πληρωμή', () => {
    const b = buildBuckets([c({ ContractStatus: 'ΛΗΞΗ', EndDate: '2026-08-30', PaymentStatus: 'Εκκρεμεί Τιμολόγιο' })], TODAY)
    expect(b.endedOpen).toHaveLength(1)
  })

  it('σίγαση και αρχειοθέτηση βγάζουν τη σύμβαση από όλα', () => {
    const base = { NextPaymentDate: '2026-08-01', PaymentStatus: 'Εκκρεμεί Τιμολόγιο' }
    expect(totalCount(buildBuckets([c({ ...base, NoReminders: true })], TODAY))).toBe(0)
    expect(totalCount(buildBuckets([c({ ...base, Archived: true })], TODAY))).toBe(0)
  })

  it('ασυμφωνία: έληξε αλλά δηλώνεται ΕΝΕΡΓΗ', () => {
    const b = buildBuckets([c({ EndDate: '2026-08-01', ContractStatus: 'ΕΝΕΡΓΗ' })], TODAY)
    expect(b.inconsistencies.some(i => i.note?.includes('έληξε'))).toBe(true)
  })

  it('ασυμφωνία: ενεργή χωρίς ημερομηνία επόμενης πληρωμής', () => {
    const b = buildBuckets([c({ ContractStatus: 'ΕΝΕΡΓΗ' })], TODAY)
    expect(b.inconsistencies.some(i => i.note?.includes('χωρίς ημερομηνία'))).toBe(true)
  })

  it('άμεση ειδοποίηση λήξης μία φορά ανά λήξη', () => {
    const near = c({ documentId: 'n', EndDate: '2026-09-05', ContractStatus: 'ΕΝΕΡΓΗ' })
    const first = findUrgent([near], TODAY)
    expect(first).toHaveLength(1)
    expect(first[0].kind).toBe('expiry')
    // αφού καταγραφεί, δεν ξαναστέλνεται
    const logged = { ...near, ReminderLog: { [first[0].logKey]: '2026-09-01T06:00:00Z' } }
    expect(findUrgent([logged], TODAY)).toHaveLength(0)
  })

  it('άμεση ειδοποίηση για αστάλτη πληρωμή, με εβδομαδιαίο κλειδί όταν λείπει ημερομηνία', () => {
    const r = c({ documentId: 'r', PaymentStatus: 'Έτοιμο για eBanking' })
    const u = findUrgent([r], TODAY)
    expect(u).toHaveLength(1)
    expect(u[0].logKey).toBe(`ready:${weekAnchor(TODAY)}`)
  })

  it('η σύνοψη φεύγει μόνο Δευτέρα', () => {
    expect(isDigestDay('2026-08-31')).toBe(true)   // Δευτέρα
    expect(isDigestDay('2026-09-01')).toBe(false)  // Τρίτη
  })
})
