import { eventCellValue } from '@/components/oc/OcEvents'

/**
 * ΜΙΑ ΠΗΓΗ ΓΙΑ ΤΗΝ ΟΘΟΝΗ ΚΑΙ ΓΙΑ ΤΟ ΑΡΧΕΙΟ.
 *
 * Ο πίνακας των συμμετεχόντων και η εξαγωγή CSV διαβάζουν την ΙΔΙΑ συνάρτηση.
 * Δύο αντίγραφα θα απέκλιναν σιωπηλά — και το αρχείο που κατεβαίνει για να
 * σταλεί στο ξενοδοχείο ή στο εστιατόριο θα έλεγε άλλα από την οθόνη.
 */

const REG: any = {
  documentId: 'r1', FirstName: 'Μαρία', LastName: 'Κολιοπούλου',
  Email: 'maria@example.gr', Phone: '6970000000',
  Capacity: 'member', CapacityOther: '', Status: 'confirmed',
  SessionChoices: { s1: 'in-person', s2: 'in-person', s3: 'online', s4: 'absent' },
  OptionAnswers: {
    travel: 'yes', travelFromCity: 'Ιωάννινα', transport: 'plane',
    accommodation: 'Δίκλινο', lunch: 'Ναι', dinner: 'Όχι',
  },
  Dietary: 'vegan', AgendaTopic: 'Χρηματοδότηση', SubmittedAt: '2026-10-02T10:00:00.000Z',
  proposal: { documentId: 'p1', Title: 'Εργαστήριο', Status: 'new' },
}

describe('eventCellValue', () => {
  it('όνομα και ιδιότητα', () => {
    expect(eventCellValue(REG, 'name')).toBe('Μαρία Κολιοπούλου')
    expect(eventCellValue(REG, 'capacity')).toBe('Μέλος CforC')
  })

  it('«Άλλο» δείχνει ό,τι έγραψε ο ίδιος', () => {
    expect(eventCellValue({ ...REG, Capacity: 'other', CapacityOther: 'Προσκεκλημένος' }, 'capacity'))
      .toBe('Προσκεκλημένος')
    expect(eventCellValue({ ...REG, Capacity: 'other', CapacityOther: '' }, 'capacity')).toBe('Άλλο')
  })

  it('οι συνεδρίες μετρώνται, οι απουσίες δεν', () => {
    expect(eventCellValue(REG, 'sessions')).toBe('2 δια ζώσης · 1 online')
    expect(eventCellValue({ ...REG, SessionChoices: {} }, 'sessions')).toBe('—')
  })

  it('η μετακίνηση κουβαλά την πόλη όταν υπάρχει', () => {
    expect(eventCellValue(REG, 'travel')).toBe('Ναι — Ιωάννινα')
    expect(eventCellValue({ ...REG, OptionAnswers: { travel: 'no' } }, 'travel')).toBe('Όχι')
  })

  it('το μέσο μεταφράζεται, δεν δείχνει τον κωδικό', () => {
    expect(eventCellValue(REG, 'transport')).toBe('Αεροπλάνο')
  })

  it('τα γεύματα ενώνονται', () => {
    expect(eventCellValue(REG, 'meals')).toBe('Ναι · Όχι')
  })

  it('η κατάσταση γράφεται με λέξεις — το CSV δεν έχει ετικέτες', () => {
    expect(eventCellValue(REG, 'status')).toBe('επιβεβαιωμένη')
    expect(eventCellValue({ ...REG, Status: 'pending' }, 'status')).toBe('εκκρεμεί')
    expect(eventCellValue({ ...REG, Status: 'cancelled' }, 'status')).toBe('άκυρη')
  })

  /* ΚΕΝΟ, όχι «—»: η παύλα είναι διακόσμηση της οθόνης. Σε υπολογιστικό
     φύλλο θα γινόταν τιμή που χαλάει ταξινόμηση και φίλτρα. */
  it('τα κενά πεδία βγαίνουν ΚΕΝΑ για το αρχείο', () => {
    const empty: any = { ...REG, Phone: '', Dietary: '', AgendaTopic: '', proposal: null, OptionAnswers: {} }
    for (const k of ['phone', 'dietary', 'agenda', 'proposal', 'fromCity', 'accommodation', 'meals']) {
      expect(eventCellValue(empty, k)).toBe('')
    }
  })

  it('άγνωστη στήλη δεν ρίχνει τίποτα', () => {
    expect(eventCellValue(REG, 'φανταστική')).toBe('')
  })
})
