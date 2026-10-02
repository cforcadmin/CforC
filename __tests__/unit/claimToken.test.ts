import { resolveClaimToken, hashClaimToken } from '@/lib/claimToken'
import { MIDTERM_2026 } from '@/lib/expenseClaims'

const RAW = 'a'.repeat(64)
const AFTER = '2026-11-23'   // η επομένη της λήξης — το παράθυρο είναι ανοιχτό

const row = (over: Record<string, unknown> = {}) => ({
  documentId: 'reg1',
  FirstName: 'Μαρία', LastName: 'Παπαδοπούλου',
  Email: 'maria@example.gr', Phone: '2101234567',
  Status: 'confirmed',
  ClaimTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  ClaimTokenUsedAt: null,
  ...over,
})

const found = (r: any = row()) => async () => r
const none = async () => null

describe('hashClaimToken', () => {
  it('σταθερό SHA-256, όχι το ίδιο το διακριτικό', () => {
    const h = hashClaimToken(RAW)
    expect(h).toMatch(/^[a-f0-9]{64}$/)
    expect(h).not.toBe(RAW)
    expect(hashClaimToken(RAW)).toBe(h)
  })
})

describe('resolveClaimToken', () => {
  it('έγκυρο διακριτικό δίνει την ταυτότητα ΑΠΟ ΤΗ ΔΗΛΩΣΗ', async () => {
    const r = await resolveClaimToken(MIDTERM_2026.slug, RAW, found(), AFTER)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.identity.name).toBe('Μαρία Παπαδοπούλου')
    expect(r.identity.email).toBe('maria@example.gr')
    expect(r.identity.eventLabel).toBe(MIDTERM_2026.label)
    expect(r.identity.registrationId).toBe('reg1')
  })

  /* Το ΠΑΡΑΘΥΡΟ πρώτα: έγκυρο διακριτικό δεν ανοίγει φόρμα που δεν έχει
     νόημα να συμπληρωθεί — και δεν πρέπει να «καίγεται» πρόωρα. */
  it('πριν τη λήξη της δράσης: πολύ νωρίς, ακόμη κι αν όλα τα άλλα ισχύουν', async () => {
    const r = await resolveClaimToken(MIDTERM_2026.slug, RAW, found(), '2026-11-22')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('too-early')
  })

  it('άγνωστη δράση', async () => {
    const r = await resolveClaimToken('κάτι-άλλο', RAW, found(), AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('bad-request')
  })

  it.each([
    ['κενό', ''],
    ['κοντό', 'abc'],
    ['μη δεκαεξαδικό', 'ζ'.repeat(64)],
  ])('κακοσχηματισμένο διακριτικό: %s', async (_label, token) => {
    const r = await resolveClaimToken(MIDTERM_2026.slug, token, found(), AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('bad-request')
  })

  it('δεν βρέθηκε', async () => {
    const r = await resolveClaimToken(MIDTERM_2026.slug, RAW, none, AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not-found')
  })

  it('ήδη χρησιμοποιημένο — μιας χρήσης σημαίνει μιας χρήσης', async () => {
    const r = await resolveClaimToken(
      MIDTERM_2026.slug, RAW, found(row({ ClaimTokenUsedAt: '2026-11-24T10:00:00.000Z' })), AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('used')
  })

  it('ληγμένο', async () => {
    const r = await resolveClaimToken(
      MIDTERM_2026.slug, RAW, found(row({ ClaimTokenExpiresAt: new Date(Date.now() - 1000).toISOString() })), AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('expired')
  })

  it('χωρίς ημερομηνία λήξης θεωρείται ληγμένο, όχι αιώνιο', async () => {
    const r = await resolveClaimToken(
      MIDTERM_2026.slug, RAW, found(row({ ClaimTokenExpiresAt: null })), AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('expired')
  })

  /* Εκκρεμής δήλωση = διεύθυνση που δεν αποδείχθηκε ποτέ ότι δουλεύει */
  it('μη επιβεβαιωμένη δήλωση δεν περνά', async () => {
    const r = await resolveClaimToken(
      MIDTERM_2026.slug, RAW, found(row({ Status: 'pending' })), AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not-found')
  })

  it('ακυρωμένη δήλωση δεν περνά', async () => {
    const r = await resolveClaimToken(
      MIDTERM_2026.slug, RAW, found(row({ Status: 'cancelled' })), AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not-found')
  })

  it('το lookup δέχεται τη ΣΥΝΟΨΗ, ποτέ το διακριτικό', async () => {
    let seen = ''
    await resolveClaimToken(MIDTERM_2026.slug, RAW, async h => { seen = h; return row() }, AFTER)
    expect(seen).toBe(hashClaimToken(RAW))
    expect(seen).not.toBe(RAW)
  })

  it('κάθε αποτυχία κουβαλά μήνυμα για τον άνθρωπο', async () => {
    const r = await resolveClaimToken(MIDTERM_2026.slug, RAW, none, AFTER)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message.length).toBeGreaterThan(10)
  })
})
