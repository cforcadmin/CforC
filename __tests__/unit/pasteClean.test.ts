import { unwrapHardBreaks, cleanPastedHtml, joinBrokenLines } from '@/lib/pasteClean'

/**
 * Επικόλληση από PDF/Word/Docs. Οι πηγές τυλίγουν στο πλάτος της σελίδας
 * τους· επικολλημένο σε πλάτος email η πρόταση σπάει σε παράλογα σημεία και
 * ο συντάκτης το διορθώνει γραμμή γραμμή (αναφέρθηκε 27/9/2026).
 */
describe('Σκληρές αλλαγές γραμμής', () => {
  it('ενώνει ό,τι είναι συνέχεια πρότασης', () => {
    const src = 'Η αλλαγή γίνεται με δύο κινήσεις: στο πάνω μενού θα βρείτε το εικονίδιο με τις τρεις\nστρώσεις· περνώντας το ποντίκι από πάνω ανοίγει το μενού.'
    expect(unwrapHardBreaks(src)).toBe(
      'Η αλλαγή γίνεται με δύο κινήσεις: στο πάνω μενού θα βρείτε το εικονίδιο με τις τρεις στρώσεις· περνώντας το ποντίκι από πάνω ανοίγει το μενού.'
    )
  })

  it('κρατά την αλλαγή όταν η προηγούμενη έκλεισε πρόταση', () => {
    expect(unwrapHardBreaks('Πρώτη πρόταση.\nΔεύτερη πρόταση.'))
      .toBe('Πρώτη πρόταση.\nΔεύτερη πρόταση.')
    // Άνω τελεία: κλείνει κι αυτή
    expect(unwrapHardBreaks('Ένα·\nΔύο')).toBe('Ένα·\nΔύο')
  })

  it('δύο κενές γραμμές μένουν παράγραφος', () => {
    expect(unwrapHardBreaks('Πρώτη\nσυνέχεια\n\nΔεύτερη')).toBe('Πρώτη συνέχεια\n\nΔεύτερη')
  })

  it('οι λίστες δεν ενώνονται ποτέ', () => {
    const src = 'Τα βήματα\n- πρώτο\n- δεύτερο\n1. τρίτο'
    expect(unwrapHardBreaks(src)).toBe('Τα βήματα\n- πρώτο\n- δεύτερο\n1. τρίτο')
  })

  it('ενώνει λέξη κομμένη με παύλα', () => {
    expect(unwrapHardBreaks('δια-\nχείριση')).toBe('διαχείριση')
  })

  it('δεν αφήνει διπλά κενά ή κενές γραμμές', () => {
    expect(unwrapHardBreaks('  Ένα  \n\n\n  δύο  ')).toBe('Ένα\n\nδύο')
  })

  it('κείμενο χωρίς αλλαγές μένει ίδιο', () => {
    expect(unwrapHardBreaks('Μια κανονική πρόταση.')).toBe('Μια κανονική πρόταση.')
    expect(unwrapHardBreaks('')).toBe('')
  })
})

describe('HTML από Word/Docs', () => {
  it('πετά γραμματοσειρές, χρώματα και κλάσεις', () => {
    const src = '<p class="MsoNormal" style="font-family:Calibri;color:#1F1F1F"><span style="font-size:11pt">Κείμενο</span></p>'
    expect(cleanPastedHtml(src)).toBe('<p>Κείμενο</p>')
  })

  it('κρατά τη ΔΟΜΗ — έντονα, λίστες, παραγράφους', () => {
    const src = '<p>Ένα <b>έντονο</b></p><ul><li>στοιχείο</li></ul>'
    expect(cleanPastedHtml(src)).toBe('<p>Ένα <b>έντονο</b></p><ul><li>στοιχείο</li></ul>')
  })

  it('κρατά μόνο έγκυρους συνδέσμους', () => {
    expect(cleanPastedHtml('<a href="https://x.gr" class="c">δες</a>')).toBe('<a href="https://x.gr">δες</a>')
    expect(cleanPastedHtml('<a href="/σχετικο">δες</a>')).toBe('<a>δες</a>')
  })

  it('καθαρίζει τα σκουπίδια του Word', () => {
    const src = '<!--[if gte mso 9]><xml>junk</xml><![endif]--><o:p></o:p><p>Καθαρό</p>'
    expect(cleanPastedHtml(src)).toBe('<p>Καθαρό</p>')
  })

  it('οι κενές παράγραφοι του Word γίνονται κανονικές κενές', () => {
    expect(cleanPastedHtml('<p>&nbsp;</p>')).toBe('<p></p>')
    expect(cleanPastedHtml('<p><br></p>')).toBe('<p></p>')
  })
})

describe('Κουμπί «Ένωση γραμμών»', () => {
  it('ενώνει <br> που είναι απλώς τύλιγμα σελίδας', () => {
    expect(joinBrokenLines('<p>με τις τρεις<br>στρώσεις· και μετά</p>'))
      .toBe('<p>με τις τρεις στρώσεις· και μετά</p>')
  })

  it('κρατά το <br> όταν η προηγούμενη έκλεισε πρόταση', () => {
    expect(joinBrokenLines('<p>Πρώτη.<br>Δεύτερη.</p>')).toBe('<p>Πρώτη.<br>Δεύτερη.</p>')
  })

  it('ενώνει διαδοχικές παραγράφους που είναι συνέχεια', () => {
    // Έτσι έρχεται η επικόλληση από PDF: κάθε γραμμή δική της <p>
    expect(joinBrokenLines('<p>Η αλλαγή γίνεται με τις τρεις</p><p>στρώσεις.</p>'))
      .toBe('<p>Η αλλαγή γίνεται με τις τρεις στρώσεις.</p>')
  })

  it('ΔΕΝ πειράζει την κενή παράγραφο — είναι σκόπιμο κενό', () => {
    const src = '<p>Ένα</p><p></p><p>δύο</p>'
    expect(joinBrokenLines(src)).toBe(src)
  })

  it('δεν ενώνει λίστες ούτε παραγράφους που ξεκινούν κουκκίδα', () => {
    expect(joinBrokenLines('<p>Τα βήματα</p><p>- πρώτο</p>')).toBe('<p>Τα βήματα</p><p>- πρώτο</p>')
    expect(joinBrokenLines('<ul><li>ένα<br>- δύο</li></ul>')).toContain('<br>')
  })

  it('ενώνει λέξη κομμένη με παύλα', () => {
    expect(joinBrokenLines('<p>δια-</p><p>χείριση.</p>')).toBe('<p>διαχείριση.</p>')
  })

  it('κρατά τα έντονα και τους συνδέσμους', () => {
    expect(joinBrokenLines('<p>δες το <b>εδώ</b></p><p>και μετά.</p>'))
      .toBe('<p>δες το <b>εδώ</b> και μετά.</p>')
  })

  it('ενώνει αλυσίδα από πολλές σπασμένες γραμμές', () => {
    expect(joinBrokenLines('<p>ένα</p><p>δύο</p><p>τρία.</p>')).toBe('<p>ένα δύο τρία.</p>')
  })
})
