import { categorise } from '@/lib/googleCalendar'

describe('κατηγορία γεγονότος από τον τίτλο', () => {
  it('αναγνωρίζει το ΔΣ — και με τελικό σίγμα, που έσπαγε τον κανόνα', () => {
    // Το πραγματικό γεγονός που δεν εμφανιζόταν στο πλακίδιο (3/9/2026):
    // το toLowerCase κάνει «ΔΣ» → «δς» (U+03C2) και το μοτίβο ζητούσε «δσ»
    expect(categorise('ΔΣ Σεπτέμβρης 2026', false)).toBe('governance')
    expect(categorise('ΔΣ', false)).toBe('governance')
    expect(categorise('Συνάντηση ΔΣ', false)).toBe('governance')
    expect(categorise('Δ.Σ. Οκτωβρίου', false)).toBe('governance')
    expect(categorise('ΓΣ 2027', false)).toBe('governance')
    expect(categorise('Γενική Συνέλευση', false)).toBe('governance')
    expect(categorise('Εκλογές ΔΣ', false)).toBe('governance')
  })

  it('δεν μπερδεύει λέξεις που απλώς περιέχουν δσ/γσ', () => {
    expect(categorise('Συνάντηση cae hub', false)).toBe('meeting')
    expect(categorise('ENCC Members’ Forum', false)).toBe('meeting')
  })

  it('οι υπόλοιπες κατηγορίες μένουν ίδιες', () => {
    expect(categorise('Meet Up Cafe ☕', false)).toBe('cafe')
    expect(categorise('Νewsletter εσωτερικής κοινότητας', true)).toBe('newsletter-internal')
    expect(categorise('Newsletter εξωτερική κοινότητας', true)).toBe('newsletter-external')
    expect(categorise('Share my experience?', false)).toBe('share')
    expect(categorise('Deadline Yποβολή_Bφάση', true)).toBe('deadline')
    expect(categorise('Παραδοτέο2.3_ΣΗμα', true)).toBe('deadline')
  })
})
