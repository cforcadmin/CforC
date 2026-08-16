import {
  normalizeHomoglyphs,
  parseAmount,
  parseKiniseis,
  parseIncoming,
  joinStatement,
  classifyCredit,
} from '@/lib/bankStatement'

/**
 * Fixtures: πιστή αναπαραγωγή του format των myAlpha Web «CSV» exports
 * (semicolon + ="..." wrappers) με ανωνυμοποιημένα ονόματα. Τα homoglyph
 * δείγματα («SΤRΑΡΙ», «ΖΟΟΜ.CΟΜ») είναι όπως ακριβώς τα εξάγει η τράπεζα:
 * μείγμα ελληνικών/λατινικών κεφαλαίων.
 */

// Ισοζύγιο: 1.000,00 → 1.148,00 = +35 −4 +45 −1.089,92 +1.161,92 = +148,00
const KINISEIS = `Τίτλος;Κινήσεις Λογαριασμού: GR7101401420142002320005140
Ημερομηνία ; 14/8/2026
Νέο Μικτό Υπόλοιπο:; 1.148,00 Π;
Προηγούμενο Μικτό Υπόλοιπο:; 1000,00 Π;

Α/Α;Ημερομηνία;Αιτιολογία;Κατάστημα;Τοκισμός από;Αρ. συναλλαγής;Ποσό;Πρόσημο ποσού;
1;14/07/2026;="ΕΝΤ.260714949017Ξ328";99;14/7/2026;="202607140999413971";45,00;Π;
2;14/07/2026;="ΕΞΟΔΑ ΕΝΤΟΛΗΣ";99;14/7/2026;="202607140999413971";4,00;Χ;
3;09/07/2026;="RΙΖΟΥ ΤΗΑLΕΙΑ";949;9/7/2026;="202607099497829959";35,00;Π;
4;02/07/2026;="ΕΝΤΟΛΗ ΙΝSΤΑΝΤ ΤRΑΝS";96;2/7/2026;="202607020960322676";1.089,92;Χ;
5;01/07/2026;="SΤRΑΡΙ";99;1/7/2026;="202607010994552423";1.161,92;Π;
`

const INCOMING = `Τίτλος ; Εισερχόμενες εντολές: GR7101401420142002320005140
Ημερομηνία ; 14/8/2026

Α/Α;Ημερομηνία;Στοιχεία τραπέζης οφειλέτη;Επωνυμία εντολέα;Ποσό;Αρ. συναλλαγής;
1;07/14/2026 00:00:00;="COSMOTE PAYMENTS - ELECTRONIC MONEY SERVICES S.A";="PAPADAKIS EMMANOUIL";EUR 45,00;="202607140999413971";
2;01/13/2026 00:00:00;="DZ BANK AG (FORMERLY WGZ BANK AG)";="Intern. Grants Center gGmbH";EUR 10.100,00;="202601130999413589";
3;07/01/2026 00:00:00;="ΕΘΝΙΚΗ ΤΡΑΠΕΖΑ ΤΗΣ ΕΛΛΑΔΟΣ";="PAPADOPOULOU                            IRA ILIANA          GAVRIIL";EUR 35,00;="202607019999999999";
`

describe('lib/bankStatement', () => {
  // --- normalizeHomoglyphs ---
  describe('normalizeHomoglyphs', () => {
    it('greek lookalikes inside latin words become latin', () => {
      // S,R λατινικά αδιαμφισβήτητα → Τ,Α,Ρ,Ι (ελληνικά) γίνονται λατινικά
      expect(normalizeHomoglyphs('SΤRΑΡΙ')).toBe('STRAPI')
      expect(normalizeHomoglyphs('ΖΟΟΜ.CΟΜ 888-799-966')).toBe('ZOOM.COM 888-799-966')
    })

    it('latin lookalikes inside greek words become greek', () => {
      // Δ,Σ ελληνικά αδιαμφισβήτητα → τα A,K μένουν στην ελληνική μορφή
      expect(normalizeHomoglyphs('ΔΑΣKΑΛΗ')).toBe('ΔΑΣΚΑΛΗ')
    })

    it('leaves plain text untouched', () => {
      expect(normalizeHomoglyphs('ALPHA BANK AE')).toBe('ALPHA BANK AE')
      expect(normalizeHomoglyphs('ΕΞΟΔΑ ΕΝΤΟΛΗΣ')).toBe('ΕΞΟΔΑ ΕΝΤΟΛΗΣ')
    })
  })

  // --- parseAmount ---
  describe('parseAmount', () => {
    it('handles comma decimals and thousand dots', () => {
      expect(parseAmount('15,99')).toBe(15.99)
      expect(parseAmount('1.089,92')).toBe(1089.92)
      expect(parseAmount('EUR 10.100,00')).toBe(10100)
      expect(parseAmount('1.148,00 Π')).toBe(1148)
    })

    it('returns null for non-numeric', () => {
      expect(parseAmount('—')).toBeNull()
    })
  })

  // --- parseKiniseis ---
  describe('parseKiniseis', () => {
    const parsed = parseKiniseis(KINISEIS)

    it('parses all movement rows with DD/MM dates', () => {
      expect(parsed.movements).toHaveLength(5)
      expect(parsed.movements[0]).toMatchObject({
        index: 1, date: '2026-07-14', txnId: '202607140999413971',
        amount: 45, direction: 'credit',
      })
      expect(parsed.movements[3].amount).toBe(1089.92)
      expect(parsed.movements[3].direction).toBe('debit')
    })

    it('normalizes homoglyphs in the reason', () => {
      expect(parsed.movements[4].reason).toBe('STRAPI')
    })

    it('reads balances and verifies completeness', () => {
      expect(parsed.openingBalance).toBe(1000)
      expect(parsed.closingBalance).toBe(1148)
      expect(parsed.balanced).toBe(true)
      expect(parsed.warnings).toHaveLength(0)
    })

    it('flags a truncated paste as unbalanced', () => {
      const truncated = KINISEIS.split('\n').slice(0, -2).join('\n') // κόβει την τελευταία κίνηση
      const p = parseKiniseis(truncated)
      expect(p.balanced).toBe(false)
      expect(p.warnings.some(w => w.includes('ελλιπής'))).toBe(true)
    })

    it('reports null balanced when balances are absent', () => {
      const noBalances = KINISEIS.split('\n').filter(l => !l.includes('Υπόλοιπο')).join('\n')
      expect(parseKiniseis(noBalances).balanced).toBeNull()
    })
  })

  // --- parseIncoming ---
  describe('parseIncoming', () => {
    const parsed = parseIncoming(INCOMING)

    it('parses MM/DD dates correctly', () => {
      expect(parsed.orders[0].date).toBe('2026-07-14')
      expect(parsed.orders[1].date).toBe('2026-01-13') // 01/13 = 13 Ιανουαρίου, όχι μήνας 13
      expect(parsed.orders[2].date).toBe('2026-07-01')
    })

    it('parses EUR amounts with thousand dots', () => {
      expect(parsed.orders[1].amount).toBe(10100)
    })

    it('collapses padded multi-column names to a single name', () => {
      expect(parsed.orders[2].payerName).toBe('PAPADOPOULOU IRA ILIANA GAVRIIL')
    })

    it('keeps payer bank', () => {
      expect(parsed.orders[2].payerBank).toBe('ΕΘΝΙΚΗ ΤΡΑΠΕΖΑ ΤΗΣ ΕΛΛΑΔΟΣ')
    })
  })

  // --- joinStatement ---
  describe('joinStatement', () => {
    const joined = joinStatement(parseKiniseis(KINISEIS), parseIncoming(INCOMING))

    it('matches payer names by transaction id', () => {
      const c45 = joined.credits.find(c => c.amount === 45)!
      expect(c45.payerName).toBe('PAPADAKIS EMMANOUIL')
      expect(c45.payerBank).toContain('COSMOTE')
    })

    it('attaches the ΕΞΟΔΑ ΕΝΤΟΛΗΣ fee to its credit', () => {
      const c45 = joined.credits.find(c => c.amount === 45)!
      expect(c45.fee).toBe(4)
      // το fee ΔΕΝ εμφανίζεται πια στις σκέτες χρεώσεις
      expect(joined.debits.map(d => d.amount)).toEqual([1089.92])
    })

    it('leaves intra-Alpha credits unidentified with a warning', () => {
      const c35 = joined.credits.find(c => c.amount === 35)!
      expect(c35.payerName).toBeNull()
      expect(joined.warnings.some(w => w.includes('χωρίς όνομα πληρωτή'))).toBe(true)
    })

    it('classifies credits by amount', () => {
      expect(classifyCredit(45)).toBe('registration')
      expect(classifyCredit(35)).toBe('subscription')
      expect(classifyCredit(39)).toBe('subscription')  // το +4€ tip πραγματικού μέλους
      expect(classifyCredit(4962)).toBe('grant-like')
      expect(classifyCredit(120)).toBe('unknown')
      const c45 = joined.credits.find(c => c.amount === 45)!
      expect(c45.kind).toBe('registration')
    })

    it('ignores payer name when amounts disagree for the same txn', () => {
      const badIncoming = parseIncoming(INCOMING.replace('EUR 45,00', 'EUR 46,00'))
      const j = joinStatement(parseKiniseis(KINISEIS), badIncoming)
      const c45 = j.credits.find(c => c.amount === 45)!
      expect(c45.payerName).toBeNull()
      expect(j.warnings.some(w => w.includes('διαφέρει'))).toBe(true)
    })
  })
})
