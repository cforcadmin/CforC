import { farewellEmail, DELETE_CAP, GRACE_DAYS } from '@/lib/newsletterUnsubscribes'
import { UNSUBSCRIBE_CC } from '@/lib/ocEmails'

/**
 * Ο συγχρονισμός απεγγραφών σβήνει ανθρώπους και τους στέλνει γράμμα. Τα
 * φρένα του είναι πιο σημαντικά από τη λειτουργία του.
 */
describe('Αποχαιρετιστήριο', () => {
  it('χτίζεται από τα κοινά μπλοκ, όχι με δικό του HTML', () => {
    const t = farewellEmail('Μαρία')
    // Το παλιό script είχε καρφωμένο #FF6B4A — ΔΕΝ είναι το κοραλί μας
    expect(t.html).not.toContain('#FF6B4A')
    expect(t.html).toContain('#FF8B6A')
    expect(t.html).toContain('Γεια σου Μαρία,')
  })

  it('χωρίς όνομα χαιρετά χωρίς κενό', () => {
    expect(farewellEmail(null).html).toContain('Γεια σου,')
    expect(farewellEmail('   ').html).toContain('Γεια σου,')
  })

  it('λέει ότι η απεγγραφή ολοκληρώθηκε και πώς επιστρέφει κανείς', () => {
    const t = farewellEmail('Νίκο')
    expect(t.subject).toContain('απεγγραφή')
    expect(t.html).toContain('cultureforchange.net')
  })

  it('δεν κουβαλά σύνδεσμο απεγγραφής — ο παραλήπτης ΗΔΗ απεγγράφηκε', () => {
    expect(farewellEmail('Νίκο').html).not.toContain('unsubscribe')
  })
})

describe('Φρένα ασφαλείας', () => {
  it('το όριο διαγραφών είναι μικρό — δεκάδες σημαίνει σφάλμα, όχι απεγγραφές', () => {
    expect(DELETE_CAP).toBeLessThanOrEqual(25)
    expect(DELETE_CAP).toBeGreaterThan(0)
  })

  it('υπάρχει περίοδος χάριτος για νέες εγγραφές', () => {
    // Αποτυχία καταχώρησης στον Sender μοιάζει ΑΚΡΙΒΩΣ με απεγγραφή
    expect(GRACE_DAYS).toBeGreaterThanOrEqual(7)
  })
})

describe('Κοινοποίηση απεγγραφής', () => {
  it('ενημερώνονται IT, Γραμματεία και Κοινότητα', () => {
    // Η απεγγραφή γίνεται στον Sender· χωρίς κοινοποίηση δεν τη μαθαίνει κανείς
    expect(UNSUBSCRIBE_CC).toEqual(expect.arrayContaining([
      'it@cultureforchange.net',
      'hello@cultureforchange.net',
      'community@cultureforchange.net',
    ]))
    expect(UNSUBSCRIBE_CC).toHaveLength(3)
  })

  it('ποτέ στο admin@ — είναι θυρίδα του IT, η Γραμματεία διαβάζει στο hello@', () => {
    expect(UNSUBSCRIBE_CC).not.toContain('admin@cultureforchange.net')
  })

  it('το όριο διαγραφών αντέχει το κόστος των κοινοποιήσεων', () => {
    // Κάθε CC μετράει ως ξεχωριστό email: 25 × (1+3) = 100 = όλο το ημερήσιο όριο
    expect(DELETE_CAP * (1 + UNSUBSCRIBE_CC.length)).toBeLessThanOrEqual(100)
  })
})
