import { parseInvoiceFilename, parseDateToken, buildApprovedFilename, supplierAliasKey } from '@/lib/invoiceFilename'

/**
 * Τα 18 ΠΡΑΓΜΑΤΙΚΑ ονόματα αρχείων του Μαρτίου 2026 από τον φάκελο
 * Παραστατικά → 2026 → Έξοδα 2026 → 03_Μάρτιος 2026. Αν ο parser τα
 * περνάει αυτά, περνάει ό,τι πετάει η πραγματικότητα.
 */

describe('parseDateToken', () => {
  it('δέχεται τις μορφές που εμφανίζονται στα πραγματικά αρχεία', () => {
    expect(parseDateToken('01.03.26')).toBe('2026-03-01')
    expect(parseDateToken('2.3.26')).toBe('2026-03-02')
    expect(parseDateToken('21.03.2026')).toBe('2026-03-21')
    expect(parseDateToken('26-3-26')).toBe('2026-03-26')
    expect(parseDateToken('3_3_26')).toBe('2026-03-03')
    expect(parseDateToken('20260324')).toBe('2026-03-24')
  })

  it('απορρίπτει μη-ημερομηνίες', () => {
    expect(parseDateToken('72152')).toBeNull()
    expect(parseDateToken('400012755975983')).toBeNull()
    expect(parseDateToken('45.99.26')).toBeNull()   // άκυρος μήνας
    expect(parseDateToken('32.03.2026')).toBeNull() // άκυρη ημέρα
    expect(parseDateToken('alpha')).toBeNull()
  })
})

describe('parseInvoiceFilename — πραγματικά αρχεία Μαρτίου 2026', () => {
  it('3.1 Strapi: όνομα, ID, ημερομηνία', () => {
    const p = parseInvoiceFilename('3.1_Strapi_72152_01.03.26.pdf')
    expect(p.aa).toBe('3.1')
    expect(p.docNumber).toBe('72152')
    expect(p.mark).toBeNull()
    expect(p.issueDate).toBe('2026-03-01')
    expect(p.supplierHint).toBe('Strapi')
    expect(p.ext).toBe('pdf')
  })

  it('3.2 Alpha: ID + ΜΑΡΚ + όνομα + ημερομηνία', () => {
    const p = parseInvoiceFilename('3.2_1001164551_400012755975983_alpha_2.3.26.pdf')
    expect(p.docNumber).toBe('1001164551')
    expect(p.mark).toBe('400012755975983')
    expect(p.issueDate).toBe('2026-03-02')
    expect(p.supplierHint).toBe('alpha')
  })

  it('3.4 Alpha: ίδιο μοτίβο, άλλη ημερομηνία', () => {
    const p = parseInvoiceFilename('3.4_1001238409_400012790817150_alpha_5.3.26.pdf')
    expect(p.docNumber).toBe('1001238409')
    expect(p.mark).toBe('400012790817150')
    expect(p.issueDate).toBe('2026-03-05')
  })

  it('3.5 Τσέλιου: # και σκουπίδι «.» πριν την ημερομηνία', () => {
    const p = parseInvoiceFilename('3.5_90_Τσέλιου_400012773266056_Sima#1_.4.03.2026.pdf')
    expect(p.docNumber).toBe('90')
    expect(p.mark).toBe('400012773266056')
    expect(p.issueDate).toBe('2026-03-04')
    expect(p.supplierHint).toContain('Τσέλιου')
  })

  it('3.6 Βεβαιωμένες Οφειλές: Ταυτότητα Οφειλής σε 3 ομάδες + «26pdf»', () => {
    const p = parseInvoiceFilename('3.6_Βεβαιωμένες Οφειλές_996788256 910102238 634009903946_3_3_26pdf.pdf')
    expect(p.docNumber).toBe('996788256 910102238 634009903946')
    expect(p.issueDate).toBe('2026-03-03')
    expect(p.supplierHint).toContain('Οφειλές')
  })

  it('3.7 Βεβαιωμένες Οφειλές: ποσό μέσα στο όνομα', () => {
    const p = parseInvoiceFilename('3.7_Βεβαιωμένες Οφειλές_996788256 910102233 692309500088_36,26_3_3_26.pdf')
    expect(p.amount).toBe(36.26)
    expect(p.docNumber).toBe('996788256 910102233 692309500088')
    expect(p.issueDate).toBe('2026-03-03')
  })

  it('3.9 ZOOM: ημερομηνία ΚΟΛΛΗΜΕΝΗ στον αριθμό', () => {
    const p = parseInvoiceFilename('3.9_ΖOOM_34636810019.03.2026.pdf')
    expect(p.issueDate).toBe('2026-03-19')
    expect(p.docNumber).toBe('346368100')
    expect(p.supplierHint).toContain('OOM')
  })

  it('3.10 ENCC: αριθμός που μοιάζει με ISO ημερομηνία δεν γίνεται ημερομηνία', () => {
    const p = parseInvoiceFilename('3.10_2026-0127_ENCC_20.03.2026.pdf')
    expect(p.issueDate).toBe('2026-03-20')
    expect(p.docNumber).toBe('2026-0127')
    expect(p.supplierHint).toBe('ENCC')
  })

  it('3.11 ΑΒ Βασιλόπουλος: αριθμός με παύλα + ΜΑΡΚ, κεφαλαία επέκταση', () => {
    const p = parseInvoiceFilename('3.11_3123-55984_ΑΛΦΑΒΗΤΑΒΑΣΙΛΟΠΟΥΛΟΣ_400012950428258_21.03.2026.PDF')
    expect(p.docNumber).toBe('3123-55984')
    expect(p.mark).toBe('400012950428258')
    expect(p.issueDate).toBe('2026-03-21')
    expect(p.ext).toBe('pdf')
  })

  it('3.12 Πλαίσιο: ΜΟΝΟ ΜΑΡΚ, χωρίς αριθμό παραστατικού', () => {
    const p = parseInvoiceFilename('3.12_ΠΛΑΣΙΟ_400012950088681_21.03.2026.PDF')
    expect(p.mark).toBe('400012950088681')
    expect(p.docNumber).toBeNull()
    expect(p.supplierHint).toBe('ΠΛΑΣΙΟ')
  })

  it('3.13 Παπαρούνα: PNG, 18ψήφιο (ΟΧΙ ΜΑΡΚ) + αρ. αναφοράς, χωρίς ημερομηνία', () => {
    const p = parseInvoiceFilename('3.13_Παπαρούνα Αθήνα_202603240996372332_60489212.PNG')
    expect(p.mark).toBeNull()                       // 18ψήφιο ≠ ΜΑΡΚ
    expect(p.docNumber).toBe('202603240996372332')
    expect(p.issueDate).toBeNull()                  // συμπληρώνεται στην οθόνη
    expect(p.ext).toBe('png')
  })

  it('3.14 NAZERAJ: όνομα με κενά, ΜΑΡΚ, ημερομηνία', () => {
    const p = parseInvoiceFilename('3.14_NAZERAJ SOKOL HASAN_400012963690423_23.03.2026.pdf')
    expect(p.mark).toBe('400012963690423')
    expect(p.issueDate).toBe('2026-03-23')
    expect(p.supplierHint).toBe('NAZERAJ SOKOL HASAN')
  })

  it('3.16 εξοδολόγιο: όνομα χωρίς αριθμούς παραστατικού', () => {
    const p = parseInvoiceFilename('3.16_Eξοδολόγιο_6ηΓΣ_Τσιαρβούλα_26-3-26.pdf')
    expect(p.issueDate).toBe('2026-03-26')
    expect(p.mark).toBeNull()
    expect(p.supplierHint).toContain('Τσιαρβούλα')
  })

  it('3.18 Κληρονόμος: μικρός αριθμός παραστατικού', () => {
    const p = parseInvoiceFilename('3.18_205_Κληρονόμος_28.03.2026.pdf')
    expect(p.docNumber).toBe('205')
    expect(p.issueDate).toBe('2026-03-28')
    expect(p.supplierHint).toBe('Κληρονόμος')
  })

  it('όνομα χωρίς Α/Α (όπως θα το ρίχνει ο Financer)', () => {
    const p = parseInvoiceFilename('Strapi_72152_01-03-2026.pdf')
    expect(p.aa).toBeNull()
    expect(p.docNumber).toBe('72152')
    expect(p.issueDate).toBe('2026-03-01')
  })

  it('σκέτο ID όπως συμφωνήθηκε στο drop', () => {
    const p = parseInvoiceFilename('2450.pdf')
    expect(p.docNumber).toBe('2450')
    expect(p.mark).toBeNull()
    expect(p.issueDate).toBeNull()
    expect(p.supplierHint).toBe('')
  })

  it('ID-ΜΑΡΚ όπως συμφωνήθηκε στο drop', () => {
    const p = parseInvoiceFilename('2450-400012345678901.pdf')
    // η παύλα δεν σπάει το token — μένει ενιαίο ως αριθμός παραστατικού
    expect(p.docNumber).toBe('2450-400012345678901')
  })
})

describe('supplierAliasKey', () => {
  it('κανονικοποιεί τόνους, πεζά-κεφαλαία και σημεία', () => {
    expect(supplierAliasKey('ΑΛΦΑΒΗΤΑΒΑΣΙΛΟΠΟΥΛΟΣ')).toBe(supplierAliasKey('αλφαβηταβασιλοπουλος'))
    expect(supplierAliasKey('Τσέλιου')).toBe(supplierAliasKey('ΤΣΕΛΙΟΥ'))
    expect(supplierAliasKey('alpha')).toBe('alpha')
  })
})

describe('buildApprovedFilename — ΕΝΙΑΙΑ μορφή από τα πεδία', () => {
  it('πλήρης εγγραφή: Α/Α_σε ποιον_αριθμός_ΜΑΡΚ_ημερομηνία_ποσό', () => {
    expect(buildApprovedFilename({
      aa: '9.4', subject: 'ΑΒ Βασιλόπουλος', docNumber: '4471-88012',
      mark: '400014700880013', date: '2026-08-28', amount: 62.5, ext: 'pdf',
    })).toBe('9.4_ΑΒ Βασιλόπουλος_4471-88012_400014700880013_28-08-2026_62,50.pdf')
  })

  it('χωρίς ΜΑΡΚ παραλείπεται καθαρά', () => {
    expect(buildApprovedFilename({
      aa: '9.3', subject: 'Strapi', docNumber: '91204',
      date: '2026-08-03', amount: 16.2, ext: 'pdf',
    })).toBe('9.3_Strapi_91204_03-08-2026_16,20.pdf')
  })

  it('χιλιάδες με τελεία, δεκαδικά με κόμμα', () => {
    expect(buildApprovedFilename({
      aa: '9.2', subject: 'Παπαδοπούλου', docNumber: '112',
      mark: '400014601880012', date: '2026-08-18', amount: 1299.52, ext: 'pdf',
    })).toBe('9.2_Παπαδοπούλου_112_400014601880012_18-08-2026_1.299,52.pdf')
  })

  it('ΚΑΜΙΑ κληρονομιά από το πρόχειρο όνομα (χωρίς διπλή ημερομηνία)', () => {
    const parsed = parseInvoiceFilename('1004250011_400014550880011_alpha_07-08-2026_4,00.pdf')
    const name = buildApprovedFilename({
      aa: '9.1', subject: 'ALPHA ΤΡΑΠΕΖΑ Α.Ε.', docNumber: parsed.docNumber,
      mark: parsed.mark, date: '2026-08-07', amount: 4, ext: parsed.ext,
    })
    expect(name).toBe('9.1_ALPHA ΤΡΑΠΕΖΑ Α.Ε._1004250011_400014550880011_07-08-2026_4,00.pdf')
    expect(name.match(/07-08-2026/g)).toHaveLength(1)
  })

  it('κρατά την επέκταση (png) και καθαρίζει επικίνδυνους χαρακτήρες', () => {
    expect(buildApprovedFilename({
      aa: '9.5', subject: 'Παπαρούνα/Αθήνα', docNumber: '60489212',
      date: '2026-08-22', amount: 18.2, ext: 'png',
    })).toBe('9.5_Παπαρούνα-Αθήνα_60489212_22-08-2026_18,20.png')
  })
})

describe('ποσό στο όνομα αρχείου — αποδεκτές μορφές', () => {
  const amountOf = (n: string) => parseInvoiceFilename(n).amount

  it('κόμμα με δύο δεκαδικά (ο βασικός κανόνας)', () => {
    expect(amountOf('Strapi_72152_16,20_03-08-2026.pdf')).toBe(16.20)
    expect(amountOf('Τσέλιου_90_1.299,52_04-03-2026.pdf')).toBe(1299.52)
  })

  it('με σύμβολο ευρώ δέχεται και τελεία, και χωρίς δεκαδικά', () => {
    expect(amountOf('Strapi_72152_16.20€_03-08-2026.pdf')).toBe(16.20)
    expect(amountOf('Strapi_72152_€16,20_03-08-2026.pdf')).toBe(16.20)
    expect(amountOf('ECF_2500€.pdf')).toBe(2500)
  })

  it('ΔΕΝ μπερδεύει ημερομηνίες ή ΜΑΡΚ με ποσά', () => {
    expect(amountOf('alpha_400012755975983_02-03-2026.pdf')).toBeNull()
    expect(amountOf('ENCC_2026-0127_20-03-2026.pdf')).toBeNull()
  })

  it('τελεία ΧΩΡΙΣ ευρώ δεν θεωρείται ποσό (μπορεί να είναι αριθμός)', () => {
    expect(amountOf('Προμηθευτής_16.20_03-08-2026.pdf')).toBeNull()
  })
})

describe('κρατήσεις — «σύνολο→πληρωτέο» στο όνομα', () => {
  it('διαβάζει σύνολο, πληρωτέο και παράγει τις κρατήσεις', () => {
    const p = parseInvoiceFilename('Παπαδοπούλου_112_400014601880012_18-08-2026_120,00→96,00.pdf')
    expect(p.grossAmount).toBe(120)
    expect(p.amount).toBe(96)
    expect(p.withholding).toBe(24)
    expect(p.docNumber).toBe('112')
  })

  it('δέχεται και -> / > ως βέλος', () => {
    expect(parseInvoiceFilename('x_1.000,00->800,00.pdf').withholding).toBe(200)
    expect(parseInvoiceFilename('x_50€>40€.pdf').withholding).toBe(10)
  })

  it('σκέτο ποσό = πληρωτέο, χωρίς κρατήσεις', () => {
    const p = parseInvoiceFilename('Strapi_91204_03-08-2026_16,20.pdf')
    expect(p.amount).toBe(16.2)
    expect(p.grossAmount).toBeNull()
    expect(p.withholding).toBeNull()
  })

  it('το εγκεκριμένο όνομα κρατά το ζεύγος όταν υπάρχουν κρατήσεις', () => {
    expect(buildApprovedFilename({
      aa: '9.5', subject: 'Παπαδοπούλου', docNumber: '112',
      date: '2026-08-18', amount: 96, grossAmount: 120, ext: 'pdf',
    })).toBe('9.5_Παπαδοπούλου_112_18-08-2026_120,00→96,00.pdf')
  })

  it('ίδιο σύνολο και πληρωτέο → σκέτο ποσό', () => {
    expect(buildApprovedFilename({
      aa: '9.6', subject: 'Strapi', date: '2026-08-03', amount: 16.2, grossAmount: 16.2, ext: 'pdf',
    })).toBe('9.6_Strapi_03-08-2026_16,20.pdf')
  })
})
