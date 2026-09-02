import { ADMIN_EMAIL, ADMIN_FROM, WELCOME_CC, DEPARTURE_CC } from '@/lib/ocEmails'

/**
 * Το admin@ είναι θυρίδα του IT. Η Διαχείριση διαβάζει στο hello@, οπότε καμία
 * κοινοποίηση ή απάντηση δεν επιτρέπεται να δείχνει εκεί (2/9/2026).
 */
describe('η Διαχείριση παραλαμβάνει στο hello@', () => {
  it('η διεύθυνση παραλαβής είναι το hello@', () => {
    expect(ADMIN_EMAIL).toBe('hello@cultureforchange.net')
  })

  it('καμία λίστα κοινοποίησης δεν στέλνει στο admin@', () => {
    for (const list of [WELCOME_CC, DEPARTURE_CC]) {
      expect(list).not.toContain('admin@cultureforchange.net')
      expect(list).toContain('hello@cultureforchange.net')
    }
  })

  it('το admin@ μένει μόνο ως ταυτότητα αποστολής', () => {
    expect(ADMIN_FROM).toContain('admin@cultureforchange.net')
  })
})
