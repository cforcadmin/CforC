import { isStale } from '@/app/api/oc/treasury/route'

describe('Ταμείο — πότε μια μέτρηση θεωρείται παλιά', () => {
  it('μέτρηση του τρέχοντος μήνα: ποτέ παλιά', () => {
    expect(isStale('2026-09-01', '2026-09-15')).toBe(false)
    expect(isStale('2026-09-15', '2026-09-15')).toBe(false)
  })

  it('χθεσινή μέτρηση δεν γίνεται εκπρόθεσμη επειδή άλλαξε ο μήνας', () => {
    // Το πραγματικό περιστατικό: καταχώριση 31/8 λίγο πριν τα μεσάνυχτα,
    // στην Αθήνα ήταν ήδη 1/9
    expect(isStale('2026-08-31', '2026-09-01')).toBe(false)
    expect(isStale('2026-08-31', '2026-09-07')).toBe(false)
  })

  it('μετά τη χάρη των 7 ημερών, ναι', () => {
    expect(isStale('2026-08-31', '2026-09-08')).toBe(true)
    expect(isStale('2026-07-15', '2026-09-01')).toBe(true)
  })

  it('χωρίς καμία μέτρηση: πάντα παλιά', () => {
    expect(isStale(null, '2026-09-01')).toBe(true)
    expect(isStale(undefined, '2026-09-01')).toBe(true)
    expect(isStale('', '2026-09-01')).toBe(true)
  })

  it('μελλοντική ημερομηνία δεν θεωρείται παλιά', () => {
    expect(isStale('2026-10-01', '2026-09-01')).toBe(false)
  })
})
