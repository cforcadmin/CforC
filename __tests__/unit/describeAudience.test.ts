import { describeAudience } from '@/lib/campaignRecipients'
const N: Record<string,string> = { d1: 'Αλεξάνδρα Ακανθοπούλου', d2: 'Μαρία Π.', d3: 'Νίκος Κ.' }
const nameOf = (id: string) => N[id]
describe('describeAudience', () => {
  it('ένα μέλος: το όνομά του', () => {
    expect(describeAudience({ memberDocIds: ['d1'] }, { nameOf })).toBe('Αλεξάνδρα Ακανθοπούλου')
  })
  it('δύο μέλη: και τα δύο ονόματα', () => {
    expect(describeAudience({ memberDocIds: ['d1','d2'] }, { nameOf })).toBe('Αλεξάνδρα Ακανθοπούλου, Μαρία Π.')
  })
  it('τρία και πάνω: όνομα + αριθμός', () => {
    expect(describeAudience({ memberDocIds: ['d1','d2','d3'] }, { nameOf })).toBe('Αλεξάνδρα Ακανθοπούλου + 2 ακόμη')
  })
  it('όλα τα μέλη', () => {
    expect(describeAudience({ allMembers: true })).toBe('Όλα τα μέλη')
  })
  it('κατάσταση συνδρομής', () => {
    expect(describeAudience({ paymentStatus: { year: 2026, paid: false } })).toBe('Απλήρωτοι 2026')
  })
  it('ομάδες εργασίας', () => {
    expect(describeAudience({ groups: ['Ομάδα Δικτύων'] })).toBe('Ομάδα Δικτύων')
  })
  it('εξωτερική διεύθυνση', () => {
    expect(describeAudience({ external: ['a@b.gr'] })).toBe('a@b.gr')
  })
  it('συνδυασμός, με σειρά', () => {
    expect(describeAudience({ allMembers: true, external: ['a@b.gr'] })).toBe('Όλα τα μέλη · a@b.gr')
  })
  /* Τεύχος: δεν έχει Selection, πάει σε λίστες του Sender */
  it('newsletter: οι λίστες σε ελληνικά', () => {
    expect(describeAudience(null, { groups: ['paid','external'] })).toBe('Μέλη + Κοινό')
  })
  it('χωρίς τίποτα: πέφτει στο πλήθος', () => {
    expect(describeAudience(null, { total: 7 })).toBe('7 παραλήπτες')
  })
  it('εντελώς άδειο: κενή φράση, όχι σκουπίδια', () => {
    expect(describeAudience(null, {})).toBe('')
  })
  /* Άγνωστο docId (μέλος που έφυγε) δεν αφήνει κενό */
  it('μέλος που δεν βρέθηκε μετριέται', () => {
    expect(describeAudience({ memberDocIds: ['χχχ'] }, { nameOf })).toBe('1 μέλη')
  })
})
