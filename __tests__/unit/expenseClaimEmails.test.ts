import {
  expenseClaimSubmittedEmailHtml, expenseClaimReceivedEmailHtml, expenseClaimPaidEmailHtml,
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

describe('Εξοδολόγιο — το γράμμα «πληρώθηκε» λέει ΤΙ κατατέθηκε', () => {
  const paid = {
    firstName: 'Έφη', claimNumber: 'ΕΞ-2026-002', payable: '120,00 €',
    accountHolder: 'Έφη Πρόικου', bankName: 'ALPHA BANK', ibanTail: '5140',
    financerName: 'Γιώργος Στυλ',
  }

  it('ολική πληρωμή: ούτε λέξη για μικρότερο ποσό', () => {
    const { html } = expenseClaimPaidEmailHtml(paid)
    expect(html).toContain('120,00 €')
    expect(html).not.toContain('μικρότερο')
    expect(html).not.toContain('αντί για')
  })

  it('μερική πληρωμή: το ποσό που μπήκε, το ζητούμενο και ο λόγος — αυτούσιος', () => {
    const { html } = expenseClaimPaidEmailHtml({
      ...paid, claimed: '150,00 €', shortfallNote: 'Δεν καλύπτεται το γεύμα της 2ης ημέρας.',
    })
    expect(html).toContain('120,00 €')
    expect(html).toContain('αντί για 150,00 € του εξοδολογίου')
    expect(html).toContain('είναι μικρότερο</strong> από το ποσό του εξοδολογίου (150,00 €)')
    expect(html).toContain('Δεν καλύπτεται το γεύμα της 2ης ημέρας.')
  })

  it('μερική χωρίς λόγο: η πρόταση κλείνει μετά το ποσό, χωρίς «undefined»', () => {
    const { html } = expenseClaimPaidEmailHtml({ ...paid, claimed: '150,00 €', shortfallNote: null })
    expect(html).toContain('(150,00 €).</p>')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('null')
  })

  it('ο λόγος περνά από escaping', () => {
    const { html } = expenseClaimPaidEmailHtml({ ...paid, claimed: '150,00 €', shortfallNote: '<b>x</b> & y' })
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt; &amp; y')
    expect(html).not.toContain('<b>x</b>')
  })
})
