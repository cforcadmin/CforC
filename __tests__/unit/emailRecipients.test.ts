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

describe('Ορατότητα αστοχίας συγχρονισμού', () => {
  it('η διαδρομή επιστρέφει registrySynced', () => {
    const src = fs.readFileSync('app/api/oc/receipts/route.ts', 'utf8')
    expect(src).toContain('registrySynced')
    expect(src).toContain('registryError')
  })

  it('η οθόνη διαβάζει ΚΑΙ τα δύο — αλλιώς η αστοχία μένει αόρατη', () => {
    const src = fs.readFileSync('components/oc/OcFinances.tsx', 'utf8')
    expect(src).toContain('data.sheetSynced === false')
    expect(src).toContain('data.registrySynced === false')
    // Το παλιό κείμενο έλεγε στον Financer να γράψει το ΕΣΟΔΑ στο χέρι —
    // δεν ισχύει πια και δεν πρέπει να επανέλθει
    expect(src).not.toContain('χειροκίνητα μέχρι τη Φάση Γ')
  })
})

describe('Μόνιμη ένδειξη Μητρώου', () => {
  it('το πεδίο υπάρχει στο schema, nullable χωρίς default', () => {
    const schema = JSON.parse(fs.readFileSync(
      'StrapiDBforCforC/src/api/receipt/content-types/receipt/schema.json', 'utf8'))
    const f = schema.attributes.RegistrySynced
    expect(f).toBeDefined()
    expect(f.type).toBe('boolean')
    // ΧΩΡΙΣ default: null σημαίνει «δεν αφορά», false «απέτυχε». Ένα
    // default:false θα εμφάνιζε κάθε δωρεά ως αποτυχία Μητρώου.
    expect(f.default).toBeUndefined()
  })

  it('η λίστα αποδείξεων δεν αδειάζει αν το πεδίο δεν έχει βγει ακόμη', () => {
    const src = fs.readFileSync('app/api/oc/receipts/route.ts', 'utf8')
    expect(src).toContain('firstTry.ok ? firstTry : await list(baseFields)')
  })

  it('η στήλη «Μητρώο» ξεχωρίζει null από false', () => {
    const src = fs.readFileSync('components/oc/OcFinances.tsx', 'utf8')
    expect(src).toContain('r.registrySynced === null')
    expect(src).toContain('Μητρώο ✗')
    expect(src).toContain('<th className="py-2 font-medium">Μητρώο</th>')
  })
})
