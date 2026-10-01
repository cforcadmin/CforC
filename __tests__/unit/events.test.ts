import {
  eventPhase, registrationClosed, visibleForCapacity, dateRangeLabel, grDate, sortSessions,
} from '@/lib/events'

const ev = (StartDate: string, EndDate: string) => ({ StartDate, EndDate })

describe('eventPhase — η τελευταία μέρα μετρά ολόκληρη', () => {
  it('μελλοντική', () => expect(eventPhase(ev('2026-11-20', '2026-11-22'), '2026-10-01')).toBe('upcoming'))
  it('τρέχουσα την πρώτη μέρα', () => expect(eventPhase(ev('2026-11-20', '2026-11-22'), '2026-11-20')).toBe('running'))
  it('τρέχουσα την ΤΕΛΕΥΤΑΙΑ μέρα — όχι περασμένη', () =>
    expect(eventPhase(ev('2026-11-20', '2026-11-22'), '2026-11-22')).toBe('running'))
  it('περασμένη την επομένη', () => expect(eventPhase(ev('2026-11-20', '2026-11-22'), '2026-11-23')).toBe('past'))
})

describe('registrationClosed', () => {
  const base = { EndDate: '2026-11-22', RegistrationDeadline: '2026-10-20' }
  it('ανοιχτή πριν την προθεσμία', () => expect(registrationClosed(base, '2026-10-19')).toBe(false))
  it('ανοιχτή ΤΗΝ ημέρα της προθεσμίας', () => expect(registrationClosed(base, '2026-10-20')).toBe(false))
  it('κλειστή την επομένη', () => expect(registrationClosed(base, '2026-10-21')).toBe(true))
  it('χωρίς προθεσμία, ανοιχτή ως τη λήξη', () =>
    expect(registrationClosed({ EndDate: '2026-11-22' }, '2026-11-22')).toBe(false))
  it('RegistrationOpen=false κλείνει ό,τι κι αν λέει η προθεσμία', () =>
    expect(registrationClosed({ ...base, RegistrationOpen: false }, '2026-01-01')).toBe(true))
})

describe('visibleForCapacity — κενό σημαίνει ΟΛΟΙ', () => {
  it('κενή λίστα → ορατό', () => expect(visibleForCapacity({ VisibleFor: [] }, 'non-member')).toBe(true))
  it('απόν → ορατό', () => expect(visibleForCapacity({ VisibleFor: null }, null)).toBe(true))
  it('ταιριάζει', () => expect(visibleForCapacity({ VisibleFor: ['member'] }, 'member')).toBe(true))
  it('δεν ταιριάζει', () => expect(visibleForCapacity({ VisibleFor: ['member'] }, 'non-member')).toBe(false))
  it('περιορισμένο αλλά χωρίς ιδιότητα ακόμη → κρυφό', () =>
    expect(visibleForCapacity({ VisibleFor: ['member'] }, null)).toBe(false))
})

describe('μορφή ημερομηνιών', () => {
  it('ελληνική σειρά', () => expect(grDate('2026-11-20')).toBe('20/11/2026'))
  it('ίδιος μήνας', () => expect(dateRangeLabel('2026-11-20', '2026-11-22')).toBe('20–22 Νοεμβρίου 2026'))
  it('αλλαγή μήνα', () => expect(dateRangeLabel('2026-10-30', '2026-11-02')).toBe('30 Οκτωβρίου – 2 Νοεμβρίου 2026'))
  it('μονοήμερη', () => expect(dateRangeLabel('2026-11-20', '2026-11-20')).toBe('20/11/2026'))
})

describe('sortSessions', () => {
  it('SortOrder πρώτα, ώρα ως εφεδρεία', () => {
    const s = sortSessions([
      { id: 1, Title: 'γ', StartsAt: '2026-11-21T16:00', AllowInPerson: true, AllowOnline: true, SortOrder: 2 },
      { id: 2, Title: 'α', StartsAt: '2026-11-20T18:00', AllowInPerson: true, AllowOnline: true, SortOrder: 1 },
    ] as any)
    expect(s.map(x => x.Title)).toEqual(['α', 'γ'])
  })
})
