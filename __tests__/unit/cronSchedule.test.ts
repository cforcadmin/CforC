import {
  expandField, parseCron, matchesAt, lastDueAt, overdueMs,
  HOBBY_SPREAD_MS, GRACE_MS,
} from '@/lib/cronSchedule'
import crons from '@/vercel.json'

const utc = (s: string) => new Date(`${s}Z`)

describe('Ανάλυση έκφρασης cron', () => {
  it('αστερίσκος = όλες οι τιμές', () => {
    expect(expandField('*', 0, 6).size).toBe(7)
  })
  it('εύρος 28-31, όπως το μηνιαίο κλείσιμο', () => {
    expect([...expandField('28-31', 1, 31)]).toEqual([28, 29, 30, 31])
  })
  it('λίστα και βήμα', () => {
    expect([...expandField('1,15', 1, 31)]).toEqual([1, 15])
    expect([...expandField('*/15', 0, 59)]).toEqual([0, 15, 30, 45])
  })
  it('εκτός ορίων ή ανάποδο εύρος ρίχνει, δεν σιωπά', () => {
    expect(() => expandField('0-99', 0, 59)).toThrow()
    expect(() => expandField('31-1', 1, 31)).toThrow()
  })
  it('λάθος αριθμός πεδίων ρίχνει', () => {
    expect(() => parseCron('0 8 * *')).toThrow(/5 πεδία/)
  })
})

describe('Ώρα UTC — ΟΧΙ Αθήνας', () => {
  /**
   * «The timezone is always UTC» (τεκμηρίωση Vercel). Το λάθος εδώ μετατοπίζει
   * κάθε κρίση «άργησε» κατά δύο ή τρεις ώρες.
   */
  it('το «0 8 * * *» ταιριάζει στις 08:00 UTC, όχι στις 08:00 Αθήνας', () => {
    const p = parseCron('0 8 * * *')
    expect(matchesAt(p, utc('2026-09-29T08:00:00'))).toBe(true)
    // 08:00 Αθήνας το καλοκαίρι = 05:00 UTC
    expect(matchesAt(p, utc('2026-09-29T05:00:00'))).toBe(false)
  })
})

describe('Τελευταία προθεσμία', () => {
  it('ημερήσιο: αν δεν έχει φτάσει η σημερινή ώρα, μετράει η χθεσινή', () => {
    expect(lastDueAt('0 8 * * *', utc('2026-09-29T07:30:00'))!.toISOString())
      .toBe('2026-09-28T08:00:00.000Z')
    expect(lastDueAt('0 8 * * *', utc('2026-09-29T09:30:00'))!.toISOString())
      .toBe('2026-09-29T08:00:00.000Z')
  })

  it('μηνιαίο στην 1η του μήνα', () => {
    expect(lastDueAt('0 9 1 * *', utc('2026-09-29T12:00:00'))!.toISOString())
      .toBe('2026-09-01T09:00:00.000Z')
  })

  it('μηνιαίο στις 12, πριν φτάσει η μέρα → ο προηγούμενος μήνας', () => {
    expect(lastDueAt('0 6 12 * *', utc('2026-09-05T12:00:00'))!.toISOString())
      .toBe('2026-08-12T06:00:00.000Z')
  })

  it('τέλος μήνα 28-31: τρέχει ΚΑΘΕ μέρα του εύρους, όχι μία φορά', () => {
    expect(lastDueAt('0 7 28-31 * *', utc('2026-09-30T12:00:00'))!.toISOString())
      .toBe('2026-09-30T07:00:00.000Z')
    expect(lastDueAt('0 7 28-31 * *', utc('2026-09-29T12:00:00'))!.toISOString())
      .toBe('2026-09-29T07:00:00.000Z')
  })

  it('Φεβρουάριος: το 28-31 δεν σκαλώνει σε μέρες που δεν υπάρχουν', () => {
    expect(lastDueAt('0 7 28-31 * *', utc('2026-03-02T12:00:00'))!.toISOString())
      .toBe('2026-02-28T07:00:00.000Z')
  })
})

describe('Πότε λέμε ότι άργησε', () => {
  const expr = '0 8 * * *'

  it('έτρεξε μετά την προθεσμία → καθόλου καθυστέρηση', () => {
    expect(overdueMs(expr, utc('2026-09-29T08:12:00'), utc('2026-09-29T12:00:00'))).toBe(0)
  })

  it('ΔΕΝ έτρεξε ακόμη, αλλά είμαστε μέσα στο παράθυρο του Hobby → ανεκτό', () => {
    // Το Hobby χτυπά «anywhere within the specified hour»· στις 08:40 δεν έχει αργήσει
    expect(overdueMs(expr, utc('2026-09-28T08:05:00'), utc('2026-09-29T08:40:00'))).toBe(0)
  })

  it('πέρασε το παράθυρο και η ανοχή → αργεί', () => {
    const now = utc('2026-09-29T08:00:00').getTime() + HOBBY_SPREAD_MS + GRACE_MS + 60_000
    expect(overdueMs(expr, utc('2026-09-28T08:05:00'), new Date(now))).toBeGreaterThan(0)
  })

  it('καμία εκτέλεση ποτέ → αργεί (δεν περνά για εντάξει)', () => {
    expect(overdueMs(expr, null, utc('2026-09-29T23:00:00'))).toBeGreaterThan(0)
  })
})

describe('Οι ΑΛΗΘΙΝΕΣ εκφράσεις του vercel.json', () => {
  /**
   * Ο έλεγχος διαβάζει το πραγματικό αρχείο: αν κάποιος προσθέσει cron και δεν
   * το καταλάβει ο έλεγχος, εδώ θα φανεί — όχι στην παραγωγή.
   */
  const list = (crons as { crons: { path: string; schedule: string }[] }).crons

  it('υπάρχουν εργασίες και όλες αναλύονται', () => {
    expect(list.length).toBeGreaterThan(0)
    for (const c of list) expect(() => parseCron(c.schedule)).not.toThrow()
  })

  it('καμία δεν είναι συχνότερη από ημερήσια — το Hobby ΡΙΧΝΕΙ το deployment', () => {
    // 27/9/2026: ωριαίο cron μπλόκαρε κάθε build για επτά ώρες
    for (const c of list) {
      const p = parseCron(c.schedule)
      expect(p.minute.size).toBe(1)
      expect(p.hour.size).toBe(1)
    }
  })

  it('κάθε έκφραση δίνει προθεσμία μέσα στις τελευταίες 40 ημέρες', () => {
    const now = new Date()
    for (const c of list) expect(lastDueAt(c.schedule, now)).not.toBeNull()
  })
})
