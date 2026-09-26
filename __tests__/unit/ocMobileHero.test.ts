import { readFileSync } from 'fs'
import path from 'path'

/**
 * Στο κινητό το OC ανοίγει ΠΑΝΤΑ στη συμπαγή προβολή.
 *
 * Το πλήρες hero απλώνει τα chips με flex-wrap· σε στενή οθόνη κάθε chip
 * στενεύει τόσο που η ελληνική λέξη σπάει σε ένα γράμμα ανά γραμμή και η
 * σελίδα γίνεται στήλη από χρωματιστές ράβδους (αναφέρθηκε 26/9/26).
 *
 * Το έργο δεν έχει testing-library, οπότε αυτός ο έλεγχος διαβάζει την ΠΗΓΗ:
 * δεν αποδεικνύει ότι η οθόνη φαίνεται σωστά — εμποδίζει όμως να ξαναμπεί
 * σιωπηλά το `heroCompact` σε συνθήκη διάταξης, που είναι ό,τι έσπασε.
 */
const src = readFileSync(path.join(process.cwd(), 'components/oc/OcShell.tsx'), 'utf8')

describe('Συμπαγές OC στο κινητό', () => {
  it('η προβολή κρίνεται από το `compact`, που περιλαμβάνει τη στενή οθόνη', () => {
    expect(src).toContain('const compact = heroCompact || isNarrow')
  })

  it('καμία συνθήκη διάταξης δεν κοιτάζει σκέτο το heroCompact', () => {
    // Επιτρέπονται μόνο: η δήλωση, ο setter, το persistPrefs και ο ορισμός
    const offenders = src.split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, l]) => l.includes('heroCompact'))
      .filter(([, l]) => !/useState\(initialHeroCompact\)|persistPrefs\(\{ heroCompact|setHeroCompactState|heroCompact\?: boolean|const compact = heroCompact/.test(l))
    expect(offenders).toEqual([])
  })

  it('το hero δεν εμφανίζεται καθόλου σε στενή οθόνη', () => {
    // Και πριν την ενυδάτωση: ο server δεν ξέρει πλάτος, οπότε χωρίς το
    // `hidden md:block` θα φαινόταν για ένα καρέ η σπασμένη διάταξη
    expect(src).toContain('<section ref={heroRef} className="hidden md:block">')
  })

  it('ο κενός χώρος του μενού υπάρχει στο κινητό ακόμη κι όταν δεν είναι συμπαγές', () => {
    expect(src).toContain("`h-28 ${compact || coolMode ? '' : 'md:hidden'}`")
  })

  it('ο διακόπτης επαναφοράς κρύβεται στο κινητό', () => {
    expect(src).toContain('{compact && !isNarrow && (')
  })

  it('η προτίμηση του υπολογιστή ΔΕΝ γράφεται από επίσκεψη κινητού', () => {
    // Μόνο ο setter γράφει· το isNarrow δεν αγγίζει ποτέ το cookie
    const persistLines = src.split('\n').filter(l => l.includes('persistPrefs({ heroCompact'))
    expect(persistLines).toHaveLength(1)
    expect(src).not.toMatch(/persistPrefs\(\{ heroCompact: isNarrow/)
  })

  it('η στενή οθόνη μετριέται με useSyncExternalStore, όχι με useEffect', () => {
    // Με useEffect το πρώτο render στο κινητό θα έδειχνε τη σπασμένη διάταξη
    expect(src).toContain('useSyncExternalStore')
    expect(src).toContain("'(max-width: 767px)'")
  })
})
