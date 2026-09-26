import { canSendEmailFrom, deskOfSeat, isEmailDesk, OC_DESK_LABELS, OC_EMAIL_DESKS, OC_EMAIL_SEATS } from '@/components/oc/ocPrefs'

/**
 * Ποια έδρα βλέπει γραφείο αποστολής σε ποια ενότητα.
 *
 * Ο πίνακας είναι μικρός αλλά κρίσιμος: ένα λάθος εδώ δεν ρίχνει τίποτα —
 * απλώς δίνει σε μια έδρα το γραμματοκιβώτιο μιας άλλης, ή της το κρύβει.
 */
describe('Γραφεία αποστολής email ανά ενότητα', () => {
  it('Επισκόπηση: Συντονισμός και Outreach', () => {
    expect(canSendEmailFrom('overview', 'coordinator')).toBe(true)
    expect(canSendEmailFrom('overview', 'outreach')).toBe(true)
    expect(canSendEmailFrom('overview', 'community')).toBe(false)
    expect(canSendEmailFrom('overview', 'financer')).toBe(false)
  })

  it('Μέλη: μόνο η Κοινότητα', () => {
    expect(canSendEmailFrom('members', 'community')).toBe(true)
    expect(canSendEmailFrom('members', 'coordinator')).toBe(false)
  })

  it('Οικονομικά: μόνο ο Ταμίας', () => {
    expect(canSendEmailFrom('finances', 'financer')).toBe(true)
    expect(canSendEmailFrom('finances', 'admin')).toBe(false)
  })

  it('Επικοινωνία: μόνο η Επικοινωνία', () => {
    expect(canSendEmailFrom('comms', 'comms')).toBe(true)
    expect(canSendEmailFrom('comms', 'outreach')).toBe(false)
  })

  it('Διαχείριση: μόνο η Γραμματεία', () => {
    expect(canSendEmailFrom('admin', 'admin')).toBe(true)
    expect(canSendEmailFrom('admin', 'comms')).toBe(false)
  })

  it('το IT τα βλέπει όλα — και μόνο εκεί όπου υπάρχει γραφείο', () => {
    for (const section of Object.keys(OC_EMAIL_DESKS)) {
      expect(canSendEmailFrom(section, 'it')).toBe(true)
    }
    expect(canSendEmailFrom('settings', 'it')).toBe(false)
    expect(canSendEmailFrom('reports', 'it')).toBe(false)
  })

  it('χωρίς έδρα δεν στέλνει κανείς', () => {
    expect(canSendEmailFrom('admin', null)).toBe(false)
    expect(canSendEmailFrom('admin', undefined)).toBe(false)
    expect(canSendEmailFrom('admin', '')).toBe(false)
  })

  it('ενότητα χωρίς γραφείο δεν εμφανίζει τίποτα', () => {
    expect(canSendEmailFrom('projects', 'coordinator')).toBe(false)
    expect(canSendEmailFrom('toString', 'admin')).toBe(false)
  })

  it('κάθε έδρα του πίνακα είναι και στο φράγμα της διαδρομής', () => {
    for (const seats of Object.values(OC_EMAIL_DESKS)) {
      for (const s of seats) expect(OC_EMAIL_SEATS).toContain(s)
    }
    expect(OC_EMAIL_SEATS).toContain('it')
  })
})

describe('Σε ποιο γραφείο ανήκει η κάθε έδρα', () => {
  it('Συντονισμός και Outreach μοιράζονται την Επισκόπηση', () => {
    expect(deskOfSeat('coordinator')).toBe('overview')
    expect(deskOfSeat('outreach')).toBe('overview')
  })

  it('οι υπόλοιπες έδρες έχουν η καθεμιά το δικό της', () => {
    expect(deskOfSeat('community')).toBe('members')
    expect(deskOfSeat('financer')).toBe('finances')
    expect(deskOfSeat('comms')).toBe('comms')
    expect(deskOfSeat('admin')).toBe('admin')
  })

  it('το IT δεν έχει δικό του — κάθεται όπου χρειάζεται', () => {
    expect(deskOfSeat('it')).toBeNull()
    expect(deskOfSeat(null)).toBeNull()
  })

  it('κάθε γραφείο έχει όνομα για την οθόνη', () => {
    for (const d of Object.keys(OC_EMAIL_DESKS)) expect(OC_DESK_LABELS[d]).toBeTruthy()
  })

  it('isEmailDesk δεν ξεγελιέται από το prototype', () => {
    expect(isEmailDesk('finances')).toBe(true)
    expect(isEmailDesk('toString')).toBe(false)
    expect(isEmailDesk('')).toBe(false)
    expect(isEmailDesk(null)).toBe(false)
  })
})
