import { buildExportFields, buildMembersCsv, countExportColumns, payText } from '@/lib/membersExport'
import type { OcMemberRow } from '@/lib/ocOverview'

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026]

function member(over: Partial<OcMemberRow> = {}): OcMemberRow {
  return {
    am: 12,
    docId: 'abc',
    name: 'Μαρία Παπαδοπούλου',
    email: 'maria@example.com',
    city: 'Αθήνα',
    phone: '6900000000',
    slug: 'maria-papadopoulou',
    regYear: 2022,
    payments: { '2021': 0, '2022': 1, '2023': 1, '2024': 1, '2025': 1, '2026': null },
    profileVisible: true,
    renewalClaimedAt: null,
    reminderSentAt: null,
    status: 'owes-1',
    ...over,
  } as OcMemberRow
}

const fields = buildExportFields(2026, YEARS)
const pick = (...keys: string[]) => fields.filter(f => keys.includes(f.key))
const rowsOf = (csv: string) => csv.split('\r\n')
const cellsOf = (line: string) => line.split(';').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'))

describe('εξαγωγή μελών — μόνο οι επιλεγμένες στήλες', () => {
  it('Όνομα + Email δίνει ΑΚΡΙΒΩΣ δύο στήλες', () => {
    const csv = buildMembersCsv([member()], pick('name', 'email'), YEARS)
    const [header, row] = rowsOf(csv)
    expect(cellsOf(header)).toEqual(['Ονοματεπώνυμο', 'Email'])
    expect(cellsOf(row)).toEqual(['Μαρία Παπαδοπούλου', 'maria@example.com'])
    // τίποτε άλλο δεν διαρρέει στο αρχείο
    expect(csv).not.toContain('Αθήνα')
    expect(csv).not.toContain('6900000000')
  })

  it('κρατά τη σειρά των στηλών του πίνακα, όχι τη σειρά επιλογής', () => {
    const csv = buildMembersCsv([member()], pick('email', 'am', 'name'), YEARS)
    expect(cellsOf(rowsOf(csv)[0])).toEqual(['ΑΜ', 'Ονοματεπώνυμο', 'Email'])
  })

  it('η «Πληρωμές» ανοίγει σε μία στήλη ανά έτος', () => {
    const chosen = pick('name', 'payments')
    const csv = buildMembersCsv([member()], chosen, YEARS)
    const [header, row] = rowsOf(csv)
    expect(cellsOf(header)).toEqual(['Ονοματεπώνυμο', '2021', '2022', '2023', '2024', '2025', '2026'])
    expect(cellsOf(row)).toEqual([
      'Μαρία Παπαδοπούλου', 'δεν όφειλε', 'πληρωμένο', 'πληρωμένο', 'πληρωμένο', 'πληρωμένο', 'εκκρεμεί',
    ])
    expect(countExportColumns(chosen, YEARS)).toBe(7)
  })

  it('γράφει κατάσταση, έτος συνδρομής και σύνδεσμο προφίλ σε κείμενο', () => {
    const csv = buildMembersCsv([member()], pick('year', 'status', 'profile', 'profileUrl'), YEARS)
    expect(cellsOf(rowsOf(csv)[0])).toEqual(['Συνδρομή 2026', 'Κατάσταση', 'Προφίλ ενημερωμένο', 'Σύνδεσμος προφίλ'])
    expect(cellsOf(rowsOf(csv)[1])).toEqual([
      'εκκρεμεί', 'Εκκρεμεί συνδρομή', 'ναι', 'https://www.cultureforchange.net/members/maria-papadopoulou',
    ])
  })

  it('κενά πεδία μένουν κενά, χωρίς παύλες ή «undefined»', () => {
    const csv = buildMembersCsv([member({ city: '', phone: '', regYear: null, slug: null })], pick('city', 'phone', 'regYear', 'profileUrl'), YEARS)
    expect(cellsOf(rowsOf(csv)[1])).toEqual(['', '', '', ''])
    expect(csv).not.toContain('undefined')
  })

  it('τα εισαγωγικά μέσα σε τιμή δεν σπάνε το CSV', () => {
    const csv = buildMembersCsv([member({ name: 'Ο «Νίκος" Α.' })], pick('name'), YEARS)
    expect(rowsOf(csv)[1]).toBe('"Ο «Νίκος"" Α."')
    expect(cellsOf(rowsOf(csv)[1])).toEqual(['Ο «Νίκος" Α.'])
  })

  it('μία γραμμή ανά μέλος, με τη σειρά που δόθηκε', () => {
    const csv = buildMembersCsv(
      [member({ am: 3, name: 'Α' }), member({ am: 1, name: 'Β' })],
      pick('am', 'name'), YEARS,
    )
    expect(rowsOf(csv)).toHaveLength(3)
    expect(cellsOf(rowsOf(csv)[1])).toEqual(['3', 'Α'])
    expect(cellsOf(rowsOf(csv)[2])).toEqual(['1', 'Β'])
  })

  it('χωρίς επιλογή στήλης δεν παράγεται περιεχόμενο', () => {
    expect(countExportColumns([], YEARS)).toBe(0)
  })

  it('payText: 1 πληρωμένο, 0 δεν όφειλε, null εκκρεμεί', () => {
    expect(payText(1)).toBe('πληρωμένο')
    expect(payText(0)).toBe('δεν όφειλε')
    expect(payText(null)).toBe('εκκρεμεί')
    expect(payText(undefined)).toBe('εκκρεμεί')
  })
})
