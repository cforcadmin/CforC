import {
  computeTotals, eventDays, ibanLooksValid, normaliseIban, validateClaim,
  buildAttachmentName, buildClaimPdfName, formatClaimNumber, receiptSpec,
  buildReturnLegs, allLegs, TRAVEL_MODES, RECEIPT_TYPES,
  type ClaimLine,
} from '@/lib/expenseClaims'

/** Μια έγκυρη γραμμή εξόδου — οι δοκιμές χαλάνε ένα πράγμα τη φορά */
const line = (over: Partial<ClaimLine> = {}): ClaimLine => ({
  category: 'Διαμονή',
  receiptType: 'Ξενοδοχείο',
  description: 'Δύο διανυκτερεύσεις',
  date: '2026-10-02',
  amount: 120,
  files: [{ slot: 1, name: 'apodeixi.pdf', size: 1000 }],
  ...over,
})

const claim = (over: any = {}) => ({
  eventType: 'Midterm', eventStart: '2026-10-01', eventEnd: '2026-10-03',
  lines: [line()], advance: 0,
  bankName: 'Alpha Bank', accountHolder: 'Argyro Barata',
  iban: 'GR2501407050705002310020006',
  ...over,
})

describe('εξοδολόγια — υπολογισμοί', () => {
  it('αθροίζει χωρίς δεκαδικά σκουπίδια', () => {
    const t = computeTotals([line({ amount: 0.1 }), line({ amount: 0.2 })], 0)
    expect(t.total).toBe(0.3)
    expect(t.payable).toBe(0.3)
  })

  it('αφαιρεί την προκαταβολή — το παράδειγμα ΜΠΑΡΑΤΑ', () => {
    const t = computeTotals([line({ amount: 183.2 }), line({ amount: 82.7 }), line({ amount: 12.22 })], 175)
    expect(t.total).toBe(278.12)
    expect(t.payable).toBe(103.12)
  })

  it('μετράει και τις δύο άκρες στη διάρκεια', () => {
    expect(eventDays('2026-10-01', '2026-10-03')).toBe(3)
    expect(eventDays('2026-10-01', '2026-10-01')).toBe(1)
    expect(eventDays('2026-10-03', '2026-10-01')).toBeNull()
    expect(eventDays('', '2026-10-01')).toBeNull()
  })
})

describe('εξοδολόγια — IBAN', () => {
  it('δέχεται έγκυρο ελληνικό IBAN με ή χωρίς κενά', () => {
    expect(ibanLooksValid('GR2501407050705002310020006')).toBe(true)
    expect(ibanLooksValid('GR25 0140 7050 7050 0231 0020 006')).toBe(true)
    expect(normaliseIban('gr25 0140 7050')).toBe('GR2501407050')
  })

  it('απορρίπτει λάθος μήκος και λάθος ψηφίο ελέγχου', () => {
    expect(ibanLooksValid('GR250140705070500231002000')).toBe(false)
    expect(ibanLooksValid('GR2501407050705002310020007')).toBe(false)
    expect(ibanLooksValid('')).toBe(false)
  })
})

describe('εξοδολόγια — έλεγχος υποβολής', () => {
  it('δέχεται πλήρες εξοδολόγιο', () => {
    expect(validateClaim(claim() as any)).toBeNull()
  })

  it('ζητά όνομα δράσης στα Project/Δράση/Άλλο', () => {
    expect(validateClaim(claim({ eventType: 'Project' }) as any)).toMatch(/δράση ή project/)
    expect(validateClaim(claim({ eventType: 'Project', eventName: 'Tandem' }) as any)).toBeNull()
  })

  it('απαιτεί παραστατικό σε κάθε γραμμή', () => {
    expect(validateClaim(claim({ lines: [line({ files: [] })] }) as any)).toMatch(/επισύναψε το παραστατικό/)
  })

  it('απαιτεί ΔΕΥΤΕΡΟ αρχείο στο αεροπορικό εισιτήριο', () => {
    const air = line({ category: 'Ταξίδι', receiptType: 'Αεροπορικό εισιτήριο' })
    expect(validateClaim(claim({ lines: [air] }) as any)).toMatch(/κάρτα επιβίβασης/)
    air.files.push({ slot: 2, name: 'boarding.jpg', size: 500 })
    expect(validateClaim(claim({ lines: [air] }) as any)).toBeNull()
  })

  it('δεν δέχεται προκαταβολή μεγαλύτερη από τα έξοδα', () => {
    expect(validateClaim(claim({ advance: 500 }) as any)).toMatch(/προκαταβολή/i)
  })

  it('δεν δέχεται μηδενικό πληρωτέο', () => {
    expect(validateClaim(claim({ advance: 120 }) as any)).toMatch(/πληρωτέο είναι 0/)
  })

  it('απορρίπτει άγνωστη κατηγορία ή είδος παραστατικού', () => {
    expect(validateClaim(claim({ lines: [line({ category: 'Καύσιμα' })] }) as any)).toMatch(/κατηγορία/)
    expect(validateClaim(claim({ lines: [line({ receiptType: 'Κάτι άλλο' })] }) as any)).toMatch(/είδος παραστατικού/)
  })

  it('απορρίπτει άκυρες ημερομηνίες και αρνητικά ποσά', () => {
    expect(validateClaim(claim({ eventEnd: '2026-09-01' }) as any)).toMatch(/ημερομηνίες/)
    expect(validateClaim(claim({ lines: [line({ amount: 0 })] }) as any)).toMatch(/μεγαλύτερο από 0/)
  })

  it('απορρίπτει άκυρο IBAN', () => {
    expect(validateClaim(claim({ iban: 'GR00' }) as any)).toMatch(/IBAN/)
  })
})

describe('εξοδολόγια — ονόματα αρχείων', () => {
  it('το παραστατικό φέρει όνομα, είδος, ημερομηνία, ποσό και αριθμό', () => {
    const name = buildAttachmentName({
      memberName: 'ΜΠΑΡΑΤΑ ΑΡΓΥΡΩ', receiptType: 'Αεροπορικό εισιτήριο', date: '2026-12-22',
      amount: 148.5, claimNumber: 'ΕΞ-2026-014', slot: 2,
      pair: receiptSpec('Ταξίδι', 'Αεροπορικό εισιτήριο')!.pair, ext: 'jpg',
    })
    expect(name).toBe('ΜΠΑΡΑΤΑ ΑΡΓΥΡΩ_Αεροπορικό εισιτήριο_22-12-2026_148,50_ΕΞ-2026-014_2of2-κάρτα επιβίβασης.jpg')
  })

  it('το PDF γράφει ΜΟΝΟ το πληρωτέο όταν δεν υπάρχει προκαταβολή', () => {
    expect(buildClaimPdfName({
      memberName: 'ΜΠΑΡΑΤΑ ΑΡΓΥΡΩ', claimNumber: 'ΕΞ-2026-014',
      submittedDate: '2026-12-22', total: 103.12, payable: 103.12,
    })).toBe('ΕΞΟΔΟΛΟΓΙΟ ΜΠΑΡΑΤΑ ΑΡΓΥΡΩ_ΕΞ-2026-014_22-12-2026_103,12.pdf')
  })

  it('με προκαταβολή γράφει «σύνολο→πληρωτέο», όπως τα τιμολόγια', () => {
    expect(buildClaimPdfName({
      memberName: 'ΜΠΑΡΑΤΑ ΑΡΓΥΡΩ', claimNumber: 'ΕΞ-2026-014',
      submittedDate: '2026-12-22', total: 278.12, payable: 103.12,
    })).toContain('278,12→103,12')
  })

  it('καθαρίζει χαρακτήρες που σπάνε ονόματα αρχείων', () => {
    const name = buildAttachmentName({
      memberName: 'A/B: C', receiptType: 'Ταξί', date: '2026-10-02',
      amount: 12, claimNumber: 'ΕΞ-2026-001', slot: 1, ext: 'PDF',
    })
    expect(name).not.toMatch(/[\\/:*?"<>|]/)
    expect(name.endsWith('.pdf')).toBe(true)
  })

  it('ο αριθμός εξοδολογίου έχει σταθερό πλάτος', () => {
    expect(formatClaimNumber(2026, 14)).toBe('ΕΞ-2026-014')
    expect(formatClaimNumber(2026, 7)).toBe('ΕΞ-2026-007')
  })
})

describe('εξοδολόγια — σκέλη διαδρομής', () => {
  const leg = (from: string, to: string, mode = 'Καύσιμα'): any => ({ from, to, mode, direction: 'outbound' })

  it('η επιστροφή είναι η διαδρομή ανάποδα', () => {
    expect(buildReturnLegs([leg('Θεσσαλονίκη', 'Πάτρα')])).toEqual([
      { from: 'Πάτρα', to: 'Θεσσαλονίκη', mode: 'Καύσιμα', direction: 'return' },
    ])
  })

  it('με ενδιάμεση στάση γυρίζει και τα δύο σκέλη, με τη σωστή σειρά', () => {
    const back = buildReturnLegs([leg('Αθήνα', 'Λάρισα'), leg('Λάρισα', 'Θεσσαλονίκη', 'Εισιτήριο τρένου')])
    expect(back.map(l => `${l.from}→${l.to}`)).toEqual(['Θεσσαλονίκη→Λάρισα', 'Λάρισα→Αθήνα'])
    expect(back[0].mode).toBe('Εισιτήριο τρένου')
  })

  it('αγνοεί τα μισοσυμπληρωμένα σκέλη', () => {
    expect(buildReturnLegs([leg('Αθήνα', 'Πάτρα'), leg('Πάτρα', '')])).toHaveLength(1)
  })

  it('το allLegs προσθέτει την επιστροφή μόνο όταν ζητηθεί', () => {
    const out = [leg('Αθήνα', 'Πάτρα')]
    expect(allLegs(out, true)).toHaveLength(2)
    expect(allLegs(out, false)).toHaveLength(1)
  })

  it('τα μέσα μετακίνησης είναι ίδια με τα παραστατικά «Ταξίδι»', () => {
    expect(TRAVEL_MODES).toContain('Αεροπορικό εισιτήριο')
    expect(TRAVEL_MODES).toContain('Καύσιμα')
    expect(TRAVEL_MODES).toEqual(RECEIPT_TYPES['Ταξίδι'].map(r => r.label))
  })

  it('το μισό σκέλος κόβεται στην υποβολή', () => {
    expect(validateClaim(claim({ travelLegs: [{ from: 'Αθήνα', to: '', mode: 'Καύσιμα' }] }) as any))
      .toMatch(/και τις δύο πόλεις/)
    expect(validateClaim(claim({ travelLegs: [{ from: 'Αθήνα', to: 'Πάτρα', mode: '' }] }) as any))
      .toMatch(/μέσο μετακίνησης/)
    expect(validateClaim(claim({ travelLegs: [{ from: '', to: '', mode: '' }] }) as any)).toBeNull()
  })
})
