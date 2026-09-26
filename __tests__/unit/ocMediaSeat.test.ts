import { canSeeSection, canSendEmailFrom, deskOfSeat, OC_SEAT_LABELS, OC_SEAT_SHORT, OC_EMAIL_SEATS } from '@/components/oc/ocPrefs'
import { VOTING_SEATS, isVoter, voteWeight, SEAT_LABELS, SEAT_MAILBOX } from '@/lib/ocRoles'
import { SEAT_AUDIENCES } from '@/lib/campaignRecipients'

/**
 * Η έδρα Media: υποστήριξη επικοινωνίας — δελτία τύπου, newsletter, επαφές με
 * δημοσιογράφους. Βλέπει ΜΟΝΟ την Επικοινωνία, στέλνει από media@, ΔΕΝ ψηφίζει.
 */
describe('Έδρα Media', () => {
  it('ΔΕΝ ψηφίζει — δεν είναι έδρα του ΔΣ', () => {
    expect(VOTING_SEATS).not.toContain('media')
    expect(isVoter(['media'])).toBe(false)
  })

  it('αν κάποιος κρατά ΚΑΙ ψηφίζουσα έδρα, ψηφίζει για εκείνη', () => {
    expect(isVoter(['media', 'comms'])).toBe(true)
    expect(voteWeight(['media', 'coordinator'])).toBe(2)
    expect(voteWeight(['media'])).toBe(1)
  })

  it('στέλνει από τη δική της θυρίδα', () => {
    expect(SEAT_MAILBOX.media).toBe('media@cultureforchange.net')
    expect(SEAT_LABELS.media).toBe('Media')
  })

  it('βλέπει ΜΟΝΟ την Επικοινωνία', () => {
    expect(canSeeSection('comms', 'media')).toBe(true)
    for (const s of ['overview', 'members', 'finances', 'admin', 'projects', 'reports', 'settings', 'corrections']) {
      expect(canSeeSection(s, 'media')).toBe(false)
    }
  })

  it('οι άλλες έδρες δεν περιορίζονται', () => {
    for (const seat of ['it', 'admin', 'financer', 'comms', 'coordinator', 'outreach', 'community']) {
      expect(canSeeSection('overview', seat)).toBe(true)
      expect(canSeeSection('finances', seat)).toBe(true)
    }
  })

  it('έχει γραφείο αποστολής — στο τραπέζι της Επικοινωνίας', () => {
    expect(canSendEmailFrom('comms', 'media')).toBe(true)
    expect(deskOfSeat('media')).toBe('comms')
    expect(OC_EMAIL_SEATS).toContain('media')
  })

  it('δεν στέλνει από ξένο γραφείο', () => {
    for (const d of ['overview', 'members', 'finances', 'admin']) {
      expect(canSendEmailFrom(d, 'media')).toBe(false)
    }
  })

  it('μοιράζεται το γραμματοκιβώτιο με την Επικοινωνία — ίδιο τραπέζι', () => {
    expect(deskOfSeat('comms')).toBe(deskOfSeat('media'))
  })

  it('υπάρχει στην οθόνη: ετικέτα, σύντομος κωδικός, κουμπί κοινοποίησης', () => {
    expect(OC_SEAT_LABELS.media).toBeTruthy()
    expect(OC_SEAT_SHORT.media).toBeTruthy()
    expect(SEAT_AUDIENCES.find(a => a.id === 'media')?.email).toBe('media@cultureforchange.net')
  })
})
