import {
  normalizeLink, normalizeLinks, validateProposal, canArchive, statusPatch, MAX_LINKS,
} from '@/lib/workingGroupProposals'

const full = {
  title: 'Ομάδα Βιωσιμότητας',
  theme: 'Βιώσιμες πρακτικές στον πολιτισμό',
  goal: 'Κοινό πλαίσιο και εργαλεία για τα μέλη',
  contactPerson: 'Μαρία Παπαδοπούλου',
  proposerName: 'Μαρία Παπαδοπούλου',
  proposerEmail: 'Maria@Example.com',
  phone: '6900000000',
}

describe('normalizeLink', () => {
  it('συμπληρώνει το https σε σκέτο τομέα', () => {
    expect(normalizeLink('cultureforchange.net')).toBe('https://cultureforchange.net/')
    expect(normalizeLink('  www.example.com/α  ')).toMatch(/^https:\/\/www\.example\.com\//)
  })

  it('κρατά http και https ως έχουν', () => {
    expect(normalizeLink('http://example.com')).toBe('http://example.com/')
  })

  /** Σύνδεσμος που μπαίνει σε email και σε οθόνη του OC πρέπει να είναι κλικ που ξέρεις πού πάει. */
  it('απορρίπτει ό,τι δεν είναι http/https', () => {
    expect(normalizeLink('javascript:alert(1)')).toBeNull()
    expect(normalizeLink('mailto:a@b.gr')).toBeNull()
    expect(normalizeLink('data:text/html,<h1>x</h1>')).toBeNull()
  })

  it('απορρίπτει κενά και μη-τομείς', () => {
    expect(normalizeLink('')).toBeNull()
    expect(normalizeLink('   ')).toBeNull()
    expect(normalizeLink('σκέτο κείμενο')).toBeNull()
  })
})

describe('normalizeLinks', () => {
  it('πετά κενά και διπλότυπα', () => {
    expect(normalizeLinks(['example.com', '', 'https://example.com', '  '])).toEqual(['https://example.com/'])
  })

  it('κόβει στο όριο', () => {
    const many = Array.from({ length: MAX_LINKS + 5 }, (_, i) => `example${i}.com`)
    expect(normalizeLinks(many)).toHaveLength(MAX_LINKS)
  })

  it('ανέχεται ό,τι δεν είναι πίνακας', () => {
    expect(normalizeLinks(undefined)).toEqual([])
    expect(normalizeLinks('example.com')).toEqual([])
  })
})

describe('validateProposal', () => {
  it('περνά η πλήρης πρόταση και πέφτει το email σε πεζά', () => {
    const r = validateProposal(full)
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual({})
    expect(r.clean.proposerEmail).toBe('maria@example.com')
  })

  it('ονομάζει ΚΑΘΕ υποχρεωτικό που λείπει, όχι μόνο το πρώτο', () => {
    const r = validateProposal({})
    expect(r.ok).toBe(false)
    expect(Object.keys(r.errors).sort()).toEqual(
      ['contactPerson', 'goal', 'phone', 'proposerEmail', 'proposerName', 'theme', 'title']
    )
  })

  it('κόβει το μη έγκυρο email', () => {
    expect(validateProposal({ ...full, proposerEmail: 'χωρίς-παπάκι' }).errors.proposerEmail)
      .toBe('Το email δεν μοιάζει έγκυρο')
  })

  /**
   * Σιωπηλή απόρριψη συνδέσμου θα έστελνε την πρόταση χωρίς το υλικό που
   * ο προτείνων νόμιζε ότι επισύναψε.
   */
  it('δεν καταπίνει σιωπηλά χαλασμένο σύνδεσμο', () => {
    const r = validateProposal({ ...full, links: ['example.com', 'javascript:alert(1)'] })
    expect(r.ok).toBe(false)
    expect(r.errors.links).toBe('Κάποιος σύνδεσμος δεν μοιάζει έγκυρος')
  })

  it('δέχεται πολλούς σύνδεσμους κανονικοποιημένους', () => {
    const r = validateProposal({ ...full, links: ['example.com', 'https://b.gr/x'] })
    expect(r.ok).toBe(true)
    expect(r.clean.links).toEqual(['https://example.com/', 'https://b.gr/x'])
  })

  it('το Facebook είναι σύνδεσμος σαν τους άλλους', () => {
    expect(validateProposal({ ...full, facebook: 'facebook.com/cforc' }).clean.facebook)
      .toBe('https://facebook.com/cforc')
    expect(validateProposal({ ...full, facebook: 'όχι σύνδεσμος' }).errors.facebook)
      .toBe('Ο σύνδεσμος δεν μοιάζει έγκυρος')
    expect(validateProposal(full).clean.facebook).toBe('')
  })

  it('βάζει όριο στο μήκος', () => {
    expect(validateProposal({ ...full, title: 'α'.repeat(201) }).errors.title).toMatch(/έως 200/)
  })

  it('κενά μόνο = άδειο πεδίο', () => {
    expect(validateProposal({ ...full, title: '   ' }).errors.title).toBe('Συμπλήρωσε τον τίτλο της ομάδας')
  })
})

describe('canArchive', () => {
  it('μόνο ό,τι κρίθηκε', () => {
    expect(canArchive('approved')).toBe(true)
    expect(canArchive('rejected')).toBe(true)
    expect(canArchive('under-review')).toBe(false)
    expect(canArchive('new')).toBe(false)
  })
})

describe('statusPatch', () => {
  it('σφραγίζει την ώρα της απόφασης', () => {
    expect(statusPatch('approved').DecidedAt).toEqual(expect.any(String))
    expect(statusPatch('rejected').DecidedAt).toEqual(expect.any(String))
  })

  it('και τη σβήνει αν γυρίσει πίσω σε εκκρεμότητα', () => {
    expect(statusPatch('under-review').DecidedAt).toBeNull()
    expect(statusPatch('new').DecidedAt).toBeNull()
  })
})
