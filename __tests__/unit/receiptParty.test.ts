import { resolveReceiptParty, hasCompanyIdentity } from '@/lib/receiptParty'

const COMPANY = {
  CompanyName: 'Αλεξάνδρα Πρόδρομος Ακανθοπούλου - Spookville',
  CompanyAddress: 'Γεωργίου Παράσχου 7, 54248, Θεσσαλονίκη',
  CompanyTaxId: '055423558',
}

describe('hasCompanyIdentity', () => {
  it('θέλει ΚΑΙ επωνυμία ΚΑΙ ΑΦΜ', () => {
    expect(hasCompanyIdentity(COMPANY)).toBe(true)
    expect(hasCompanyIdentity({ CompanyName: 'Κάτι' })).toBe(false)
    expect(hasCompanyIdentity({ CompanyTaxId: '123' })).toBe(false)
    expect(hasCompanyIdentity(null)).toBe(false)
  })
  it('τα κενά δεν μετράνε', () => {
    expect(hasCompanyIdentity({ CompanyName: '  ', CompanyTaxId: '  ' })).toBe(false)
  })
})

describe('resolveReceiptParty', () => {
  /* Η ΑΠΟΦΑΣΗ ανήκει στην αίτηση — δεν τη μαντεύουμε από το προφίλ */
  it('αίτηση «Φυσικό πρόσωπο»: απόδειξη σε φυσικό πρόσωπο', () => {
    const p = resolveReceiptParty({ ReceiptType: 'Φυσικό πρόσωπο' }, COMPANY)
    expect(p.isCompany).toBe(false)
    expect(p.companyName).toBeNull()
  })

  /* ΑΛΛΑ δεν περνά απαρατήρητο — αυτό ακριβώς έγινε στην ΑΠ. ΕΙΣ. 381 */
  it('…και σημαδεύει την ασυμφωνία όταν το μέλος ΕΙΝΑΙ εταιρεία', () => {
    expect(resolveReceiptParty({ ReceiptType: 'Φυσικό πρόσωπο' }, COMPANY).mismatch).toBe(true)
  })
  it('χωρίς εταιρική ταυτότητα στο μέλος, καμία ασυμφωνία', () => {
    expect(resolveReceiptParty({ ReceiptType: 'Φυσικό πρόσωπο' }, {}).mismatch).toBe(false)
  })

  /* ΤΟ ΚΥΡΙΟ: τα στοιχεία από το μητρώο, που είναι το φρέσκο */
  it('εταιρεία: προτιμά τα στοιχεία του ΜΕΛΟΥΣ από της αίτησης', () => {
    const p = resolveReceiptParty(
      { ReceiptType: 'Εταιρεία', CompanyName: 'ΠΑΛΙΑ ΕΠΩΝΥΜΙΑ', CompanyTaxId: '000000000' },
      COMPANY)
    expect(p.isCompany).toBe(true)
    expect(p.source).toBe('member')
    expect(p.companyName).toBe(COMPANY.CompanyName)
    expect(p.companyTaxId).toBe('055423558')
  })

  it('εταιρεία χωρίς στοιχεία στο μέλος: πέφτει στην αίτηση', () => {
    const p = resolveReceiptParty(
      { ReceiptType: 'Εταιρεία', ...COMPANY }, { CompanyName: 'Μόνο όνομα' })
    expect(p.source).toBe('application')
    expect(p.companyName).toBe(COMPANY.CompanyName)
  })

  /* Μισοσυμπληρωμένο προφίλ ΔΕΝ σβήνει σωστά στοιχεία της αίτησης */
  it('ημιτελές προφίλ δεν υπερισχύει', () => {
    const p = resolveReceiptParty(
      { ReceiptType: 'Εταιρεία', ...COMPANY },
      { CompanyName: 'Κάτι', CompanyTaxId: '' })
    expect(p.companyName).toBe(COMPANY.CompanyName)
    expect(p.companyTaxId).toBe(COMPANY.CompanyTaxId)
  })

  it('διεύθυνση: αν λείπει από το μέλος, κρατιέται της αίτησης', () => {
    const p = resolveReceiptParty(
      { ReceiptType: 'Εταιρεία', CompanyAddress: 'Οδός Αιτήσεως 1' },
      { CompanyName: COMPANY.CompanyName, CompanyTaxId: COMPANY.CompanyTaxId })
    expect(p.companyAddress).toBe('Οδός Αιτήσεως 1')
  })

  it('χωρίς αίτηση και χωρίς μέλος: φυσικό πρόσωπο, χωρίς σφάλμα', () => {
    const p = resolveReceiptParty(null, null)
    expect(p).toMatchObject({ isCompany: false, source: null, mismatch: false })
  })
})
