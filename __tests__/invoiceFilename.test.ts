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

describe('buildApprovedFilename', () => {
  it('προσθέτει Α/Α και ημερομηνία DD-MM-YYYY χωρίς διπλοεγγραφές', () => {
    const p = parseInvoiceFilename('Strapi_72152.pdf')
    expect(buildApprovedFilename(p, '3.1', '2026-03-01')).toBe('3.1_Strapi_72152_01-03-2026.pdf')
  })

  it('αντικαθιστά υπάρχον Α/Α και ημερομηνία-ουρά', () => {
    const p = parseInvoiceFilename('3.1_Strapi_72152_01.03.26.pdf')
    expect(buildApprovedFilename(p, '3.1', '2026-03-01')).toBe('3.1_Strapi_72152_01-03-2026.pdf')
  })

  it('κρατά την επέκταση του αρχείου (png)', () => {
    const p = parseInvoiceFilename('Παπαρούνα Αθήνα_60489212.PNG')
    expect(buildApprovedFilename(p, '3.13', '2026-03-22')).toBe('3.13_Παπαρούνα Αθήνα_60489212_22-03-2026.png')
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
