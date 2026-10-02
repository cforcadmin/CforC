
/**
 * Το γράμμα καλωσορίσματος απαριθμεί τις ενότητες του «Ο Χώρος Μου».
 *
 * Ο κατάλογος ΔΙΑΒΑΖΕΤΑΙ από την ίδια τη σελίδα του προφίλ, όχι από αντίγραφο:
 * τρεις ενότητες (Βιβλιοθήκη, Δράσεις, Εξοδολόγια) προστέθηκαν στο προφίλ και
 * το γράμμα έμεινε πίσω χωρίς να το δει κανείς (2/10/2026). Ένα αντίγραφο εδώ
 * θα ξαναέμενε πίσω με τον ίδιο ακριβώς τρόπο.
 */
describe('welcomeEmailHtml — «Ο Χώρος Μου»', () => {
  const page = require('fs').readFileSync('app/profile/page.tsx', 'utf8')
  const labels = [...page.matchAll(/\{ key: '[^']+', label: '([^']+)'/g)].map(m => m[1])
  const html = require('@/lib/ocEmails').welcomeEmailHtml('Μαρία').html

  it('βρέθηκαν οι ενότητες της σελίδας', () => {
    expect(labels.length).toBeGreaterThanOrEqual(10)
  })

  it('καμία ενότητα του προφίλ δεν λείπει από το γράμμα', () => {
    const missing = labels.filter(l => !html.includes(`<strong>${l}</strong>`))
    expect(missing).toEqual([])
  })
})
