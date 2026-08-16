import {
  transliterateGreek,
  wordSkeleton,
  nameSimilarity,
  matchPayerToMembers,
  payerAliasKey,
  type MatchableMember,
} from '@/lib/memberMatcher'

/**
 * Τα ζεύγη προέρχονται από την πραγματική αντιπαραβολή τράπεζας↔ΕΣΟΔΑ του
 * Αυγούστου 2026 (ανωνυμοποιημένα όπου χρειάζεται): greeklish πληρωτής από
 * Εισερχόμενες εντολές, ελληνικό όνομα μέλους από το Strapi.
 */

const MEMBERS: MatchableMember[] = [
  { docId: 'm1', name: 'Μάνος Κιτσέλλης', am: 113, email: 'a@x.gr' },
  { docId: 'm2', name: 'Φωτεινή Παπαχατζή', am: 87, email: 'b@x.gr' },
  { docId: 'm3', name: 'Ήρα-Ηλιάνα Παπαδοπούλου', am: 45, email: 'c@x.gr' },
  { docId: 'm4', name: 'Ηλιάνα Ζιώγα', am: 92, email: 'd@x.gr' },
  { docId: 'm5', name: 'Χριστίνα Βουμβουράκη', am: 51, email: 'e@x.gr' },
  { docId: 'm6', name: 'Μαρία Κουμιανού', am: 60, email: 'f@x.gr' },
  { docId: 'm7', name: 'Θάλεια Ρίζου', am: 71, email: 'g@x.gr' },
  { docId: 'm8', name: 'Φωτεινή Τσιδημοπούλου', am: 33, email: 'h@x.gr' },
  { docId: 'm9', name: 'Βίβιαν Δούμπα', am: 29, email: 'i@x.gr' },
]

describe('lib/memberMatcher', () => {
  describe('transliterateGreek + wordSkeleton', () => {
    it('greek and greeklish spellings collapse to the same skeleton', () => {
      const pairs: Array<[string, string]> = [
        ['Κιτσέλλης', 'KITSELLIS'],
        ['Φωτεινή', 'FOTEINI'],
        ['Χριστίνα', 'CHRISTINA'],
        ['Θάλεια', 'THALEIA'],
        ['Βουμβουράκη', 'VOUMVOURAKI'],
        ['Κουμιανού', 'KOUMIANOU'],
        ['Παπαδοπούλου', 'PAPADOPOULOU'],
        ['Δούμπα', 'DOUMPA'],
        ['Ζιώγα', 'ZIOGA'],
      ]
      for (const [greek, latin] of pairs) {
        expect(wordSkeleton(greek)).toBe(wordSkeleton(latin))
      }
    })

    it('transliterates digraphs correctly', () => {
      expect(transliterateGreek('Κουμιανού')).toBe('KOUMIANOU')
      expect(transliterateGreek('Θάλεια')).toBe('THALEIA')
    })
  })

  describe('nameSimilarity', () => {
    it('matches surname-first bank order against first-name-first member', () => {
      expect(nameSimilarity('KITSELLIS EMMANOUIL', 'Μάνος Κιτσέλλης')).toBeGreaterThan(0.7)
      expect(nameSimilarity('PAPACHATZI FOTEINI', 'Φωτεινή Παπαχατζή')).toBeGreaterThanOrEqual(0.95)
      expect(nameSimilarity('RIZOU THALEIA', 'Θάλεια Ρίζου')).toBeGreaterThanOrEqual(0.95)
    })

    it('ignores extra patronymic tokens from ΕΘΝΙΚΗ', () => {
      expect(nameSimilarity('PAPADOPOULOU IRA ILIANA GAVRIIL', 'Ήρα-Ηλιάνα Παπαδοπούλου')).toBeGreaterThanOrEqual(0.95)
    })

    it('scores unrelated names low (the payer≠member 14%)', () => {
      // πραγματική περίπτωση: πλήρωσε ο PAPAS για την Τσιδημοπούλου
      expect(nameSimilarity('PAPAS ELEFTHERIOS', 'Φωτεινή Τσιδημοπούλου')).toBeLessThan(0.5)
      // εταιρείες δεν μοιάζουν με πρόσωπα
      expect(nameSimilarity('ANAMESA STOUS MERMIGKES AMKE', 'Μαρία Κουμιανού')).toBeLessThan(0.5)
    })
  })

  describe('matchPayerToMembers', () => {
    it('finds the right member at the top with high confidence', () => {
      const cases: Array<[string, string]> = [
        ['ZIOGA ILIANA', 'm4'],
        ['VOUMVOURAKI CHRISTINA', 'm5'],
        ['KOUMIANOU MARIA', 'm6'],
        ['RIZOU THALEIA', 'm7'],
        ['PAPADOPOULOU IRA ILIANA GAVRIIL', 'm3'],
      ]
      for (const [payer, expected] of cases) {
        const matches = matchPayerToMembers(payer, MEMBERS)
        expect(matches[0]?.docId).toBe(expected)
        expect(matches[0]?.confidence).toBe('high')
      }
    })

    it('does not cross-match the two Φωτεινές on first name alone', () => {
      const matches = matchPayerToMembers('PAPACHATZI FOTEINI', MEMBERS)
      expect(matches[0]?.docId).toBe('m2')
      // η Τσιδημοπούλου (m8) δεν επιτρέπεται να είναι high
      const m8 = matches.find(m => m.docId === 'm8')
      if (m8) expect(m8.confidence).not.toBe('high')
    })

    it('returns empty for company payers — the review queue case', () => {
      expect(matchPayerToMembers('We are Community Ltd', MEMBERS)).toHaveLength(0)
    })

    it('matches DOUMPA despite the ΜΠ/Β variant', () => {
      const matches = matchPayerToMembers('DOUMPA VIVIAN', MEMBERS)
      expect(matches[0]?.docId).toBe('m9')
    })
  })

  describe('payerAliasKey', () => {
    it('is stable across word order and script', () => {
      expect(payerAliasKey('KITSELLIS EMMANOUIL')).toBe(payerAliasKey('EMMANOUIL KITSELLIS'))
      expect(payerAliasKey('ΡΙΖΟΥ ΘΑΛΕΙΑ')).toBe(payerAliasKey('THALEIA RIZOU'))
    })
  })
})
