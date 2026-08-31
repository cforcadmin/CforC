import { contractToRow, buildSheetRows, sortForSheet, grDate, grAmount, type ContractRecord } from '@/lib/contractsSheet'

const base: ContractRecord = {
  Aa: 1, Name: 'Ντόβα Σοφία', Role: 'Διαχειρίστρια', Email: 'x@example.com', Phone: '6900000000',
  TaxId: '111111111', ContractType: 'Σύμβαση Έργου', Project: 'CforC',
  StartDate: '2026-07-01', EndDate: '2026-12-30', ContractStatus: 'ΕΝΕΡΓΗ',
  ContractFile: '2026.07_Σύμβαση.docx', ContractNotes: 'Απαιτείται ανανέωση',
  Amount: 6600, PaymentMethod: 'Τιμολόγιο', PaymentFrequency: 'Σε Δόσεις (Milestones)',
  PaymentSchedule: '30/08/2026\n30/10/2026', NextPaymentDate: '2026-08-30',
  NextPaymentStatus: 'ΕΧΕΙ ΚΑΘΥΣΤΕΡΗΣΕΙ', PaymentHistory: null, BankIban: 'GR79701000000001877513',
  PaymentStatus: 'Εκκρεμεί Τιμολόγιο', PaymentNotes: null, ExpenseDocsLink: null, ExpenseListLink: null,
  SortIndex: 1,
}

describe('καθρέφτης συμβάσεων → Google Sheet', () => {
  it('γράφει 26 στήλες, A έως Z', () => {
    expect(contractToRow(base)).toHaveLength(26)
  })

  it('βάζει κάθε τιμή στη σωστή στήλη', () => {
    const r = contractToRow(base)
    expect(r[0]).toBe('1')                       // A Α/Α
    expect(r[1]).toBe('Ντόβα Σοφία')             // B
    expect(r[5]).toBe('111111111')               // F ΑΦΜ
    expect(r[8]).toBe('01/07/2026')              // I έναρξη
    expect(r[9]).toBe('30/12/2026')              // J λήξη
    expect(r[10]).toBe('ΕΝΕΡΓΗ')                 // K
    expect(r[14]).toBe('6.600,00')               // O αμοιβή
    expect(r[18]).toBe('30/08/2026')             // S επόμενη πληρωμή
    expect(r[21]).toBe('GR79701000000001877513') // V IBAN
    expect(r[22]).toBe('Εκκρεμεί Τιμολόγιο')     // W
  })

  it('η στήλη N μένει κενή — είναι τίτλος ενότητας, όχι δεδομένο', () => {
    expect(contractToRow(base)[13]).toBe('')
  })

  it('τα κενά πεδία γίνονται κενό κελί, ποτέ «null» ή «undefined»', () => {
    const r = contractToRow({ Name: 'Μόνο όνομα' })
    expect(r[0]).toBe('')
    expect(r.join('|')).not.toMatch(/null|undefined|NaN/)
    expect(r[1]).toBe('Μόνο όνομα')
  })

  it('ημερομηνίες σε ελληνική μορφή· ό,τι δεν είναι ISO μένει κενό', () => {
    expect(grDate('2026-01-05')).toBe('05/01/2026')
    expect(grDate('')).toBe('')
    expect(grDate('30/12/2026')).toBe('')
    expect(grDate(null)).toBe('')
  })

  it('ποσά με τελεία χιλιάδων και κόμμα δεκαδικών', () => {
    expect(grAmount(6600)).toBe('6.600,00')
    expect(grAmount(595.2)).toBe('595,20')
    expect(grAmount('9100')).toBe('9.100,00')
    expect(grAmount(null)).toBe('')
    expect(grAmount('')).toBe('')
  })

  it('οι αρχειοθετημένες δεν ταξιδεύουν στο φύλλο', () => {
    const rows = buildSheetRows([base, { ...base, Aa: 2, Name: 'Αρχειοθετημένη', Archived: true }])
    expect(rows).toHaveLength(1)
    expect(rows[0][1]).toBe('Ντόβα Σοφία')
  })

  it('η σειρά ακολουθεί SortIndex, μετά Α/Α', () => {
    const out = sortForSheet([
      { Name: 'Γ', SortIndex: 3 }, { Name: 'Α', SortIndex: 1 }, { Name: 'Β', SortIndex: 2 },
    ])
    expect(out.map(c => c.Name)).toEqual(['Α', 'Β', 'Γ'])
  })

  it('δύο συμβάσεις του ίδιου ανθρώπου μένουν δύο γραμμές', () => {
    const rows = buildSheetRows([
      { Name: 'Δασκαλή Όλγα', StartDate: '2026-03-10', Amount: 2000, SortIndex: 4 },
      { Name: 'Δασκαλή Όλγα', StartDate: '2026-08-05', Amount: 6200, SortIndex: 5 },
    ])
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r[8])).toEqual(['10/03/2026', '05/08/2026'])
    expect(rows.map(r => r[14])).toEqual(['2.000,00', '6.200,00'])
  })
})
