import {
  canArchive, shouldNotify, statusPatch, requestPreview, isRequestStatus, isValidEmail,
} from '@/lib/siteRequests'

describe('isRequestStatus', () => {
  it('δέχεται μόνο τις τρεις', () => {
    expect(isRequestStatus('not-started')).toBe(true)
    expect(isRequestStatus('in-progress')).toBe(true)
    expect(isRequestStatus('completed')).toBe(true)
    expect(isRequestStatus('αρχειοθετημένο')).toBe(false)
    expect(isRequestStatus(undefined)).toBe(false)
  })
})

/**
 * Το αρχείο σημαίνει «τελείωσε», όχι «δεν θέλω να το βλέπω». Αρχειοθέτηση
 * μισοτελειωμένου αιτήματος είναι ο τρόπος να χαθεί δουλειά.
 */
describe('canArchive', () => {
  it('μόνο ό,τι ολοκληρώθηκε', () => {
    expect(canArchive('completed')).toBe(true)
    expect(canArchive('in-progress')).toBe(false)
    expect(canArchive('not-started')).toBe(false)
  })
})

describe('statusPatch', () => {
  const NOW = '2026-10-06T12:00:00.000Z'

  it('η ολοκλήρωση σφραγίζει την ώρα', () => {
    expect(statusPatch('completed', NOW)).toMatchObject({ Status: 'completed', CompletedAt: NOW })
  })

  /* Ό,τι ξαναανοίγει δεν μένει «κλεισμένο» ούτε κρυμμένο στο αρχείο */
  it('επιστροφή σε εξέλιξη: καθαρίζει ώρα ΚΑΙ βγάζει από το αρχείο', () => {
    expect(statusPatch('in-progress', NOW)).toEqual({
      Status: 'in-progress', CompletedAt: null, Archived: false, ArchivedAt: null,
    })
  })
})

/**
 * ΤΡΕΙΣ ΠΡΟΫΠΟΘΕΣΕΙΣ ΜΑΖΙ. Η ρητή οδηγία ήταν: χωρίς email, δεν συμβαίνει
 * τίποτα — όχι σφάλμα, όχι προειδοποίηση.
 */
describe('shouldNotify', () => {
  const base = { Status: 'in-progress', NotifiedAt: null, SenderEmail: 'a@b.gr' }

  it('ολοκλήρωση με email: ναι', () => {
    expect(shouldNotify(base, 'completed')).toBe(true)
  })
  it('χωρίς email: τίποτα', () => {
    expect(shouldNotify({ ...base, SenderEmail: null }, 'completed')).toBe(false)
    expect(shouldNotify({ ...base, SenderEmail: '   ' }, 'completed')).toBe(false)
    expect(shouldNotify({ ...base, SenderEmail: 'όχι-email' }, 'completed')).toBe(false)
  })
  it('άλλη κατάσταση: όχι', () => {
    expect(shouldNotify(base, 'in-progress')).toBe(false)
  })
  it('ήταν ΗΔΗ ολοκληρωμένο: δεν ξαναστέλνει', () => {
    expect(shouldNotify({ ...base, Status: 'completed' }, 'completed')).toBe(false)
  })
  /* Η σφραγίδα εμποδίζει δεύτερο γράμμα σε κύκλο completed → in-progress → completed */
  it('έχει ήδη ειδοποιηθεί: δεν ξαναστέλνει', () => {
    expect(shouldNotify({ ...base, NotifiedAt: '2026-10-01T00:00:00.000Z' }, 'completed')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('τα προφανή', () => {
    expect(isValidEmail('a@b.gr')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
  })
})

describe('requestPreview', () => {
  it('μικρό μήνυμα μένει ακέραιο', () => {
    expect(requestPreview('Κάτι μικρό')).toBe('Κάτι μικρό')
  })
  it('οι αλλαγές γραμμής γίνονται κενά', () => {
    expect(requestPreview('Πρώτη\n\nδεύτερη')).toBe('Πρώτη δεύτερη')
  })
  /* Ποτέ απότομη κοπή — πάντα «…» (κανόνας UI του έργου) */
  it('μεγάλο μήνυμα κόβεται με αποσιωπητικά', () => {
    const out = requestPreview('λ'.repeat(300))
    expect(out).toHaveLength(120)
    expect(out.endsWith('…')).toBe(true)
  })
})
