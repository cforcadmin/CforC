import {
  expenseClaimSubmittedEmailHtml, expenseClaimReceivedEmailHtml,
} from '@/lib/ocEmails'

const base = {
  claimNumber: 'ΕΞ-2026-002',
  memberName: 'Έφη Πρόικου',
  eventLabel: 'Συνάντηση — ΔΣ',
  eventDates: '20/09/2026 – 20/09/2026',
  route: 'Αθήνα → Θεσσαλονίκη',
  payable: '39,78 €',
  total: '39,78 €',
  advance: null,
  accountHolder: 'Έφη Πρόικου',
  bankName: 'ALPHA BANK',
  iban: 'GR7101401420142002320005140',
  lines: [{ date: '06/04/2026', type: 'Σούπερ μάρκετ', amount: '3,70 €' }],
}

describe('Εξοδολόγιο — τα δύο γράμματα της υποβολής', () => {
  const internal = expenseClaimSubmittedEmailHtml({ ...base, ocUrl: 'https://x/oc?section=finances' })
  const mine = expenseClaimReceivedEmailHtml(base)

  it('το εσωτερικό μιλά για τον Ταμία και έχει κουμπί προς τα Οικονομικά', () => {
    expect(internal.html).toContain('υπέβαλε εξοδολόγιο')
    expect(internal.html).toContain('Άνοιγμα στα Οικονομικά')
  })

  it('το γράμμα του μέλους ΔΕΝ δίνει εσωτερικές οδηγίες', () => {
    // Αυτό ακριβώς διάβαζε το μέλος όσο έμπαινε σε cc στο εσωτερικό γράμμα
    expect(mine.html).not.toContain('σημείωσέ το στα Οικονομικά')
    expect(mine.html).not.toContain('σημείωσέ την κατάθεση')
    expect(mine.html).not.toContain('Άνοιγμα στα Οικονομικά')
    expect(mine.html).not.toContain('/oc')
  })

  it('ούτε το εσωτερικό ζητά πια από τον παραλήπτη να σημειώσει την κατάθεση', () => {
    // Έφευγε με κοινοποίηση στο μέλος· η οδηγία ζει στο email υπενθύμισης
    expect(internal.html).not.toContain('σημείωσέ το στα Οικονομικά')
  })

  it('το γράμμα του μέλους δείχνει ΟΣΑ υπέβαλε — ώστε να πιάσει λάθος', () => {
    expect(mine.html).toContain('ΕΞ-2026-002')
    expect(mine.html).toContain('Σούπερ μάρκετ')
    expect(mine.html).toContain('39,78 €')
    expect(mine.html).toContain('GR7101401420142002320005140')
    expect(mine.html).toContain('ALPHA BANK')
  })

  it('τα δύο γράμματα έχουν ΔΙΑΦΟΡΕΤΙΚΟ θέμα — αλλιώς νήμα με τον εαυτό του', () => {
    expect(mine.subject).not.toBe(internal.subject)
    expect(mine.subject).toContain('ΕΞ-2026-002')
  })

  it('η προκαταβολή εμφανίζεται μόνο όταν υπάρχει', () => {
    expect(expenseClaimReceivedEmailHtml(base).html).not.toContain('προκαταβολή')
    expect(expenseClaimReceivedEmailHtml({ ...base, advance: '10,00 €' }).html).toContain('προκαταβολή')
  })

  it('τα στοιχεία του μέλους περνούν από escaping', () => {
    const html = expenseClaimReceivedEmailHtml({ ...base, memberName: '<script>x</script>' }).html
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
