import { resolveEventAccess } from '@/lib/eventAccess'

const openEv = {
  Audience: 'non-member' as const,
  StartDate: '2026-11-20', EndDate: '2026-11-22', RegistrationDeadline: '2026-10-20',
}
const membersEv = { ...openEv, Audience: 'member' as const }
const T = '2026-10-01'   // πριν την προθεσμία

describe('resolveEventAccess', () => {
  it('ανοιχτή δράση, μη συνδεδεμένος → επιλογή πόρτας', () =>
    expect(resolveEventAccess(openEv, false, T)).toEqual({ allowed: true, mode: 'choose' }))

  it('ανοιχτή δράση, μέλος → κατευθείαν η φόρμα', () =>
    expect(resolveEventAccess(openEv, true, T)).toEqual({ allowed: true, mode: 'member' }))

  it('ΜΟΝΟ ΜΕΛΗ + μη συνδεδεμένος → απαιτείται σύνδεση, ΟΧΙ πέρασμα', () =>
    expect(resolveEventAccess(membersEv, false, T)).toEqual({ allowed: false, reason: 'login-required' }))

  it('ΜΟΝΟ ΜΕΛΗ + μέλος → περνά', () =>
    expect(resolveEventAccess(membersEv, true, T)).toEqual({ allowed: true, mode: 'member' }))

  it('μετά την προθεσμία → κλειστή, ακόμη και για μέλος', () =>
    expect(resolveEventAccess(openEv, true, '2026-10-21')).toEqual({ allowed: false, reason: 'closed' }))

  it('ΤΗΝ ημέρα της προθεσμίας → ακόμη ανοιχτή', () =>
    expect(resolveEventAccess(openEv, false, '2026-10-20')).toEqual({ allowed: true, mode: 'choose' }))

  it('περασμένη δράση → «past», ΟΧΙ «login-required»', () =>
    expect(resolveEventAccess(membersEv, false, '2026-12-01')).toEqual({ allowed: false, reason: 'past' }))

  it('RegistrationOpen=false κλείνει ανεξαρτήτως προθεσμίας', () =>
    expect(resolveEventAccess({ ...openEv, RegistrationOpen: false }, true, T))
      .toEqual({ allowed: false, reason: 'closed' }))
})
