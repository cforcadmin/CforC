import { PRESETS, NEWSLETTER_PRESETS } from '@/lib/campaignBlocks'

/**
 * Τα τέσσερα έτοιμα σχέδια (Ανακοίνωση, Πρόσκληση, Ενημερωτικό δελτίο,
 * Υπενθύμιση) αφορούν ΜΟΝΟ την αποστολή email. Στο newsletter δείχνονται δύο
 * άλλα: Εσωτερικό και Εξωτερικό NL.
 */
describe('Έτοιμα σχέδια ανά είδος', () => {
  it('το μήνυμα κρατά τα τέσσερα του email', () => {
    expect(PRESETS.map(p => p.label)).toEqual([
      'Ανακοίνωση', 'Πρόσκληση σε εκδήλωση', 'Ενημερωτικό δελτίο', 'Υπενθύμιση',
    ])
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

  it('το Εξωτερικό NL είναι ακόμη κενό — μπαίνει όταν δοθεί το περιεχόμενο', () => {
    expect(NEWSLETTER_PRESETS.find(p => p.id === 'external-nl')!.blocks).toEqual([])
  })

  it('κάθε σχέδιο έχει ετικέτα και βοήθεια — το chip χωρίς εξήγηση δεν λέει τίποτα', () => {
    for (const p of [...PRESETS, ...NEWSLETTER_PRESETS]) {
      expect(p.label.trim()).toBeTruthy()
      expect(p.hint.trim()).toBeTruthy()
    }
  })
})
