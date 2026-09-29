import {
  orthodoxEaster, greekBankHolidays, isBusinessDay, fullBusinessDaysSince,
  canRejectPayment, athensDay, REJECT_AFTER_BUSINESS_DAYS,
} from '@/lib/businessDays'

const at = (s: string) => new Date(s)

describe('Ορθόδοξο Πάσχα', () => {
  // Επαληθευμένες ημερομηνίες — αν αλλάξει ο υπολογισμός, σπάει εδώ
  it.each([
    [2024, '2024-05-05'],
    [2025, '2025-04-20'],
    [2026, '2026-04-12'],
    [2027, '2027-05-02'],
  ])('%i → %s', (y, expected) => {
    expect(orthodoxEaster(y as number).toISOString().slice(0, 10)).toBe(expected)
  })
})

describe('Αργίες τραπεζών', () => {
  const h = greekBankHolidays(2026)
  it('σταθερές αργίες', () => {
    for (const d of ['2026-01-01', '2026-01-06', '2026-03-25', '2026-05-01', '2026-08-15', '2026-10-28', '2026-12-25', '2026-12-26']) {
      expect(h.has(d)).toBe(true)
    }
  })
  it('κινητές γύρω από το Πάσχα (12/4/2026)', () => {
    expect(h.has('2026-02-23')).toBe(true) // Καθαρά Δευτέρα
    expect(h.has('2026-04-10')).toBe(true) // Μεγάλη Παρασκευή
    expect(h.has('2026-04-13')).toBe(true) // Δευτέρα του Πάσχα
    expect(h.has('2026-06-01')).toBe(true) // Αγίου Πνεύματος
  })
  it('μια συνηθισμένη μέρα δεν είναι αργία', () => {
    expect(h.has('2026-09-29')).toBe(false)
  })
})

describe('Εργάσιμες', () => {
  it('Σάββατο και Κυριακή δεν είναι εργάσιμες', () => {
    expect(isBusinessDay(at('2026-10-03T10:00:00Z'))).toBe(false) // Σάββατο
    expect(isBusinessDay(at('2026-10-04T10:00:00Z'))).toBe(false) // Κυριακή
  })
  it('η 28η Οκτωβρίου δεν είναι εργάσιμη', () => {
    expect(isBusinessDay(at('2026-10-28T10:00:00Z'))).toBe(false)
  })
  it('καθημερινή χωρίς αργία είναι εργάσιμη', () => {
    expect(isBusinessDay(at('2026-10-29T10:00:00Z'))).toBe(true)
  })
  it('η ημέρα κρίνεται σε ώρα Αθήνας, όχι UTC', () => {
    // 2/10/2026 23:30 UTC = 3/10 02:30 Αθήνα → Σάββατο
    expect(athensDay(at('2026-10-02T23:30:00Z'))).toBe('2026-10-03')
    expect(isBusinessDay(at('2026-10-02T23:30:00Z'))).toBe(false)
  })
})

describe('Το περιστατικό που γέννησε τον κανόνα', () => {
  // Δήλωση Πέμπτη 24/9/2026 βράδυ· τα χρήματα φάνηκαν Τρίτη 29/9 πρωί
  const thuEvening = at('2026-09-24T19:00:00Z')

  it('Παρασκευή: καμία πλήρης εργάσιμη', () => {
    expect(fullBusinessDaysSince(thuEvening, at('2026-09-25T09:00:00Z'))).toBe(0)
  })
  it('Δευτέρα: μία (η Παρασκευή)', () => {
    expect(fullBusinessDaysSince(thuEvening, at('2026-09-28T09:00:00Z'))).toBe(1)
  })
  it('Τρίτη: δύο — το Σαββατοκύριακο ΔΕΝ μετράει', () => {
    expect(fullBusinessDaysSince(thuEvening, at('2026-09-29T09:00:00Z'))).toBe(2)
  })
  it('Τετάρτη: τρεις → επιτρέπεται', () => {
    expect(fullBusinessDaysSince(thuEvening, at('2026-09-30T09:00:00Z'))).toBe(3)
  })
})

describe('Η δικλείδα', () => {
  const claim = '2026-09-24T19:00:00.000Z'

  it('μπλοκάρει πριν την ώρα της, με εξήγηση και υπόλοιπο', () => {
    const g = canRejectPayment(claim, at('2026-09-28T09:00:00Z'))
    expect(g.allowed).toBe(false)
    expect(g.remaining).toBe(2)
    expect(g.message).toContain('εργάσιμες')
    expect(g.message).toContain('Σεπτεμβρίου')
  })

  it('ανοίγει μόλις συμπληρωθούν οι τρεις', () => {
    const g = canRejectPayment(claim, at('2026-09-30T09:00:00Z'))
    expect(g.allowed).toBe(true)
    expect(g.remaining).toBe(0)
  })

  it('ίδια μέρα με τη δήλωση: μηδέν εργάσιμες', () => {
    expect(canRejectPayment(claim, at('2026-09-24T23:00:00Z')).daysPassed).toBe(0)
  })

  it('οι αργίες επιμηκύνουν την αναμονή', () => {
    // Δήλωση Παρασκευή 23/10/2026· 28/10 (Τετάρτη) είναι αργία
    const g = canRejectPayment('2026-10-23T18:00:00.000Z', at('2026-10-29T09:00:00Z'))
    // Δευ 26, Τρι 27, [Τετ 28 αργία], Πεμ 29 = σήμερα, δεν μετράει → 2
    expect(g.daysPassed).toBe(2)
    expect(g.allowed).toBe(false)
  })

  it('ΧΩΡΙΣ ημερομηνία δήλωσης δεν μπλοκάρει — δεν ξέρουμε από πότε', () => {
    expect(canRejectPayment(null).allowed).toBe(true)
    expect(canRejectPayment('χαλασμένη').allowed).toBe(true)
  })

  it('το όριο είναι τρεις εργάσιμες', () => {
    expect(REJECT_AFTER_BUSINESS_DAYS).toBe(3)
  })
})
