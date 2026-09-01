import { normaliseGreek, isBoardMeetingTitle } from '@/lib/greekText'

describe('ελληνικό κείμενο για συγκρίσεις', () => {
  it('το τελικό σίγμα γίνεται σίγμα — αλλιώς το «ΔΣ» δεν ταιριάζει ποτέ', () => {
    expect(normaliseGreek('ΔΣ')).toBe('δσ')
    expect(normaliseGreek('ΔΣ Σεπτέμβρης 2026').startsWith('δσ ')).toBe(true)
  })

  it('οι τόνοι φεύγουν πριν από τα λατινικά ομοιώματα', () => {
    expect(normaliseGreek('Γενική Συνέλευση')).toBe(normaliseGreek('γενικη συνελευση'))
  })

  it('αναγνωρίζει συνεδρίαση ΔΣ σε όλες τις γραφές', () => {
    for (const t of ['ΔΣ', 'ΔΣ Ιούλιος 2026', 'Συνάντηση ΔΣ', 'Δ.Σ. Οκτωβρίου', 'δσ σεπτεμβρη'])
      expect(isBoardMeetingTitle(t)).toBe(true)
  })

  it('η Γενική Συνέλευση ΔΕΝ είναι ΔΣ — εκεί παρευρίσκεται όλο το δίκτυο', () => {
    expect(isBoardMeetingTitle('Γενική Συνέλευση')).toBe(false)
    expect(isBoardMeetingTitle('ΓΣ 2027')).toBe(false)
  })

  it('δεν μπερδεύεται με λέξεις που περιέχουν δσ', () => {
    expect(isBoardMeetingTitle('Meet Up Cafe')).toBe(false)
    expect(isBoardMeetingTitle('Συνάντηση cae hub')).toBe(false)
  })
})
