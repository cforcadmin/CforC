import { PRESETS, NEWSLETTER_PRESETS, presetsForDesk } from '@/lib/campaignBlocks'

/**
 * Τα τέσσερα έτοιμα σχέδια (Ανακοίνωση, Πρόσκληση, Ενημερωτικό δελτίο,
 * Υπενθύμιση) αφορούν ΜΟΝΟ την αποστολή email. Στο newsletter δείχνονται δύο
 * άλλα: Εσωτερικό και Εξωτερικό NL.
 */
describe('Έτοιμα σχέδια ανά είδος', () => {
  it('κάθε γραφείο κρατά τα τέσσερα του email', () => {
    expect(PRESETS.filter(p => !p.desks).map(p => p.label)).toEqual([
      'Ανακοίνωση', 'Πρόσκληση σε εκδήλωση', 'Ενημερωτικό δελτίο', 'Υπενθύμιση',
    ])
  })

  /**
   * Τα σχέδια του IT φαίνονται ΜΟΝΟ στις Διορθώσεις. Χωρίς αυτό, ο Ταμίας
   * θα έβλεπε «Απάντηση σε αίτημα» δίπλα στην «Ανακοίνωση» — και τα τέσσερα
   * χρήσιμα θα γίνονταν πιο δύσκολα να βρεθούν. (16/10/2026)
   */
  it('οι Διορθώσεις δείχνουν ΜΟΝΟ τα τρία του IT — τα γενικά δεν ταιριάζουν εκεί', () => {
    expect(presetsForDesk('corrections').map(p => p.label)).toEqual([
      'Απάντηση σε αίτημα', 'Η αλλαγή είναι ενεργή', 'Οδηγίες σε βήματα',
    ])
  })

  it('κάθε άλλο γραφείο — και το άγνωστο — παίρνει τα τέσσερα γενικά', () => {
    for (const desk of ['admin', 'comms', 'finances', 'members', 'overview', '', null]) {
      expect(presetsForDesk(desk).map(p => p.label)).toEqual([
        'Ανακοίνωση', 'Πρόσκληση σε εκδήλωση', 'Ενημερωτικό δελτίο', 'Υπενθύμιση',
      ])
    }
  })

  it('τα σχέδια του IT ζουν μόνο στο γραφείο των Διορθώσεων', () => {
    const scoped = PRESETS.filter(p => p.desks)
    expect(scoped.map(p => p.label)).toEqual([
      'Απάντηση σε αίτημα', 'Η αλλαγή είναι ενεργή', 'Οδηγίες σε βήματα',
    ])
    for (const p of scoped) expect(p.desks).toEqual(['corrections'])
  })

  it('το newsletter έχει ΔΙΚΑ του, δύο', () => {
    expect(NEWSLETTER_PRESETS.map(p => p.label)).toEqual(['Εσωτερικό NL', 'Εξωτερικό NL'])
  })

  it('τα δύο σύνολα δεν μοιράζονται id — αλλιώς μπερδεύονται στην επιλογή', () => {
    const a = new Set(PRESETS.map(p => p.id))
    for (const p of NEWSLETTER_PRESETS) expect(a.has(p.id)).toBe(false)
  })

  /** Στιγμιότυπο του «CforC Community Journal», 29/9/2026 */
  it('το Εσωτερικό NL κουβαλά ολόκληρη τη δομή του Journal', () => {
    const internal = NEWSLETTER_PRESETS.find(p => p.id === 'internal-nl')!
    expect(internal.blocks.length).toBeGreaterThan(90)
    const types = new Set(internal.blocks.map(b => b.type))
    // Τα χαρακτηριστικά του μηνιαίου: κεφαλίδα, πίνακας περιεχομένων, κάρτες
    for (const t of ['masthead', 'toc', 'section', 'card', 'agenda']) {
      expect(types.has(t as any)).toBe(true)
    }
  })

  /** Στιγμιότυπο του «CforC Newsletter #8», 30/9/2026 */
  it('το Εξωτερικό NL κουβαλά τη δομή του Newsletter #8', () => {
    const ext = NEWSLETTER_PRESETS.find(p => p.id === 'external-nl')!
    expect(ext.blocks.length).toBeGreaterThan(35)
    const types = new Set(ext.blocks.map(b => b.type))
    for (const t of ['masthead', 'toc', 'section', 'card']) expect(types.has(t as any)).toBe(true)
  })

  it('τα δύο NL είναι ΔΙΑΦΟΡΕΤΙΚΑ — το εξωτερικό είναι συντομότερο', () => {
    const internal = NEWSLETTER_PRESETS.find(p => p.id === 'internal-nl')!
    const ext = NEWSLETTER_PRESETS.find(p => p.id === 'external-nl')!
    expect(ext.blocks.length).toBeLessThan(internal.blocks.length)
  })

  it('κανένα έτοιμο σχέδιο δεν είναι κενό — ένα chip που δίνει λευκή σελίδα δεν χρησιμεύει', () => {
    for (const p of NEWSLETTER_PRESETS) expect(p.blocks.length).toBeGreaterThan(0)
  })

  it('κάθε σχέδιο έχει ετικέτα και βοήθεια — το chip χωρίς εξήγηση δεν λέει τίποτα', () => {
    for (const p of [...PRESETS, ...NEWSLETTER_PRESETS]) {
      expect(p.label.trim()).toBeTruthy()
      expect(p.hint.trim()).toBeTruthy()
    }
  })
})
