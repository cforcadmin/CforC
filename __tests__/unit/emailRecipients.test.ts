import fs from 'fs'
import { RECEIPT_CC } from '@/lib/ocEmails'

/**
 * Ποιοι παίρνουν αντίγραφο.
 *
 * Κάθε τέτοιο email στέλνεται από ΠΕΡΙΣΣΟΤΕΡΑ ΑΠΟ ΕΝΑ σημεία, και η συνήθης
 * αστοχία δεν είναι λάθος λίστα — είναι σωστή λίστα στη μία διαδρομή και
 * ξεχασμένη στην άλλη. Τα παρακάτω φυλάνε ακριβώς αυτό.
 */

describe('Αντίγραφα απόδειξης', () => {
  it('Οικονομικά, Διαχείριση, Community', () => {
    expect(RECEIPT_CC).toEqual([
      'finance@cultureforchange.net',
      'hello@cultureforchange.net',
      'community@cultureforchange.net',
    ])
  })

  it('και οι δύο διαδρομές έκδοσης το χρησιμοποιούν', () => {
    // Χειροκίνητη (Financer στο OC) και αυτόματη (ολοκλήρωση πληρωμής)
    for (const f of ['app/api/oc/receipts/route.ts', 'lib/paymentCompletion.ts']) {
      const src = fs.readFileSync(f, 'utf8')
      expect(src).toContain('cc: RECEIPT_CC')
      expect(src).not.toContain('cc: [FINANCE_EMAIL]')
    }
  })
})

describe('Αντίγραφα έγκρισης αίτησης', () => {
  it('το email έγκρισης κοινοποιείται σε Οικονομικά, Διαχείριση, Community', () => {
    const src = fs.readFileSync('app/api/oc/applications/vote/route.ts', 'utf8')
    expect(src).toContain('cc: [FINANCE_EMAIL, ADMIN_EMAIL, COMMUNITY_EMAIL]')
  })

  it('ισχύει και για το «παλιάς φόρμας» πρότυπο — μία κοινή αποστολή', () => {
    const src = fs.readFileSync('app/api/oc/applications/vote/route.ts', 'utf8')
    // Ένα sendOcEmail για τα δύο πρότυπα: αν γίνουν δύο, το cc θα ξεχαστεί στο ένα
    expect(src.match(/await sendOcEmail\(/g) || []).toHaveLength(1)
    expect(src).toContain('app.Photo ? approvedEmailHtml : approvedLegacyEmailHtml')
  })
})
