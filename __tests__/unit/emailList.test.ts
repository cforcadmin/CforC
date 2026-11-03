/** emailList — εξαγωγή διευθύνσεων από επικολλημένη στήλη/λίστα (συνθέτης μηνυμάτων OC). */
const { extractEmails, emailCandidates, normaliseEmail, looksLikeEmailList } = require('@/lib/emailList')

describe('extractEmails', () => {
  it('στήλη φύλλου με επικεφαλίδα και κενές γραμμές', () => {
    const r = extractEmails('Email\nanna@example.gr\n\nBob@Example.com\n')
    expect(r).toEqual({ valid: ['anna@example.gr', 'bob@example.com'], invalid: [] })
  })
  it('κόμματα, ερωτηματικά, tab και «Όνομα <email>»', () => {
    const r = extractEmails('a@x.gr, b@y.gr; "Νίκος Π." <c@z.gr>\td@w.gr')
    expect(r.valid).toEqual(['a@x.gr', 'b@y.gr', 'c@z.gr', 'd@w.gr'])
  })
  it('ονόματα χωρίς @ αγνοούνται, άκυρα με @ αναφέρονται', () => {
    const r = extractEmails('Μαρία\nmaria@\nfoo@bar\nok@ok.gr')
    expect(r.valid).toEqual(['ok@ok.gr'])
    expect(r.invalid).toEqual(['maria@', 'foo@bar'])
  })
  it('διπλά: μία φορά, ανεξαρτήτως πεζών, με τη σειρά εμφάνισης', () => {
    expect(emailCandidates('B@y.gr A@x.gr a@X.GR')).toEqual(['b@y.gr', 'a@x.gr'])
  })
  it('mailto: και τελεία στο τέλος πρότασης', () => {
    expect(normaliseEmail('mailto:A@x.gr.')).toBe('a@x.gr')
  })
})

describe('looksLikeEmailList', () => {
  it('μία διεύθυνση δεν είναι λίστα', () => {
    expect(looksLikeEmailList('a@x.gr')).toBe(false)
  })
  it('κόμμα, νέα γραμμή ή δεύτερο @ = λίστα', () => {
    expect(looksLikeEmailList('a@x.gr,')).toBe(true)
    expect(looksLikeEmailList('a@x.gr\nb@y.gr')).toBe(true)
    expect(looksLikeEmailList('a@x.gr b@y.gr')).toBe(true)
  })
})
