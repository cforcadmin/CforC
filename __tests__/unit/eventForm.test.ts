import {
  offeredCapacities, visibleSessions, visibleOptions, sessionChoices,
  validateRegistration, agendaWanted, isReimbursed, MEMBER_CAPACITIES,
  emptyDraft, type RegistrationDraft, type SessionChoice,
} from '@/lib/eventForm'

const S = (id: number, Title: string, extra: any = {}) =>
  ({ id, Title, StartsAt: '2026-11-20T18:00', AllowInPerson: true, AllowOnline: true, ...extra })

const ev = {
  Capacities: ['member', 'member-ban', 'non-member-ban', 'non-member'],
  Sessions: [
    S(1, '1.α Παρασκευή'),
    S(2, '1.β Σάββατο πρωί', { AllowOnline: false }),      // ΜΟΝΟ δια ζώσης
    S(3, 'Ατζέντα', { VisibleFor: ['member', 'member-ban'] }),
  ],
  Options: [
    { id: 1, Key: 'travel', Title: 'Κάλυψη μετακίνησης', Required: true },
    { id: 2, Key: 'dietary', Title: 'Διατροφικές ιδιαιτερότητες', Required: true },
    { id: 3, Key: 'agenda', Title: 'Θέμα ατζέντας', VisibleFor: ['member'] },
  ],
} as any

const good = (over: Partial<RegistrationDraft> = {}): RegistrationDraft => ({
  ...emptyDraft(),
  FirstName: 'Γιώργος', LastName: 'Στυλ', Email: 'a@b.gr', Phone: '6900000000',
  Capacity: 'non-member',
  SessionChoices: { '1': 'online', '2': 'absent' },
  OptionAnswers: { travel: 'no' },
  Consent: true,
  ...over,
})

describe('offeredCapacities — ασφαλής προεπιλογή', () => {
  it('κενό → ΜΟΝΟ μέλη, δεν ανοίγει κατά λάθος', () =>
    expect(offeredCapacities({ Capacities: [] } as any)).toEqual(['member']))
  it('αγνοεί άγνωστες τιμές', () =>
    expect(offeredCapacities({ Capacities: ['member', 'ΧΑΖΟ'] } as any)).toEqual(['member']))
})

describe('ορατότητα ανά ιδιότητα', () => {
  it('μη μέλος ΔΕΝ βλέπει τη συνεδρία ατζέντας', () =>
    expect(visibleSessions(ev, 'non-member').map(s => s.id)).toEqual([1, 2]))
  it('μέλος τις βλέπει όλες', () =>
    expect(visibleSessions(ev, 'member').map(s => s.id)).toEqual([1, 2, 3]))
  it('το μπλοκ ατζέντας μόνο για μέλος', () => {
    expect(visibleOptions(ev, 'member').map(o => o.Key)).toContain('agenda')
    expect(visibleOptions(ev, 'non-member').map(o => o.Key)).not.toContain('agenda')
  })
})

describe('sessionChoices — η 1.β δεν έχει διαδικτυακή', () => {
  it('κανονική συνεδρία: 3 επιλογές', () =>
    expect(sessionChoices(S(1, 'x') as any).map(c => c.value)).toEqual(['in-person', 'online', 'absent']))
  it('χωρίς online: 2 επιλογές', () =>
    expect(sessionChoices(S(2, 'x', { AllowOnline: false }) as any).map(c => c.value))
      .toEqual(['in-person', 'absent']))
})

describe('validateRegistration', () => {
  it('σωστή δήλωση περνά', () => expect(validateRegistration(ev, good(), false)).toBeNull())
  it('λείπει όνομα', () => expect(validateRegistration(ev, good({ FirstName: '' }), false)).toMatch(/Συμπλήρωσε το όνομ/))
  it('κακό email', () => expect(validateRegistration(ev, good({ Email: 'οχι' }), false)).toMatch(/email/))
  it('ιδιότητα εκτός δράσης απορρίπτεται', () =>
    expect(validateRegistration(ev, good({ Capacity: 'other' }), false)).toMatch(/δεν ισχύει/))
  it('αναπάντητη ορατή συνεδρία', () =>
    expect(validateRegistration(ev, good({ SessionChoices: { '1': 'online' } }), false)).toMatch(/1\.β/))
  it('ΔΕΝ ζητά τη συνεδρία που δεν βλέπει η ιδιότητα', () =>
    expect(validateRegistration(ev, good(), false)).toBeNull())
  it('«online» σε συνεδρία χωρίς online απορρίπτεται', () =>
    expect(validateRegistration(ev, good({ SessionChoices: { '1': 'online', '2': 'online' } }), false))
      .toMatch(/Μη έγκυρη/))
  it('υποχρεωτικό μπλοκ αναπάντητο', () =>
    expect(validateRegistration(ev, good({ OptionAnswers: {} }), false)).toMatch(/Κάλυψη μετακίνησης/))
  it('τα διατροφικά ΔΕΝ είναι ποτέ υποχρεωτικά', () =>
    expect(validateRegistration(ev, good({ Dietary: '' }), false)).toBeNull())
  it('διατροφικά ΧΩΡΙΣ ρητή συγκατάθεση απορρίπτονται (άρθρο 9)', () =>
    expect(validateRegistration(ev, good({ Dietary: 'vegan' }), false)).toMatch(/ρητή συγκατάθεσ/))
  it('διατροφικά ΜΕ συγκατάθεση περνούν', () =>
    expect(validateRegistration(ev, good({ Dietary: 'vegan', DietaryConsent: true }), false)).toBeNull())
  it('μη μέλος χωρίς αποδοχή ενημέρωσης', () =>
    expect(validateRegistration(ev, good({ Consent: false }), false)).toMatch(/προσωπικά δεδομένα/))
  it('ΜΕΛΟΣ δεν χρειάζεται το ίδιο τσεκ — η σύνδεση αποδεικνύει ταυτότητα', () =>
    expect(validateRegistration(ev, good({ Consent: false, Capacity: 'member',
      SessionChoices: { '1': 'online', '2': 'absent', '3': 'in-person' } }), true)).toBeNull())

  /* Η ερώτηση της ατζέντας: το «Ναι» ΥΠΟΣΧΕΤΑΙ θέμα. Τα γενικά σχόλια
     μένουν προαιρετικά — υποχρεωτικά θα γέμιζαν με παύλες. */
  const memberBase = {
    Capacity: 'member' as const,
    SessionChoices: { '1': 'online', '2': 'absent', '3': 'in-person' } as Record<string, SessionChoice>,
  }
  it('«Ναι» στην ατζέντα χωρίς θέμα απορρίπτεται', () =>
    expect(validateRegistration(ev, good({
      ...memberBase, OptionAnswers: { travel: 'no', agenda: 'yes' },
    }), true)).toMatch(/θέμα/))
  it('«Ναι» με θέμα περνά, χωρίς γενικά σχόλια', () =>
    expect(validateRegistration(ev, good({
      ...memberBase, OptionAnswers: { travel: 'no', agenda: 'yes' },
      AgendaTopic: 'Χρηματοδοτήσεις', GeneralComments: '',
    }), true)).toBeNull())
  it('«Όχι» δεν ζητά τίποτα', () =>
    expect(validateRegistration(ev, good({
      ...memberBase, OptionAnswers: { travel: 'no', agenda: 'no' },
    }), true)).toBeNull())
})

describe('agendaWanted', () => {
  const d = (answers: Record<string, string>, cap: any = 'member') =>
    ({ Capacity: cap, OptionAnswers: answers }) as any
  it('«Ναι» από ιδιότητα που βλέπει το μπλοκ', () =>
    expect(agendaWanted(ev, d({ agenda: 'yes' }))).toBe(true))
  it('«Όχι»', () =>
    expect(agendaWanted(ev, d({ agenda: 'no' }))).toBe(false))
  it('αναπάντητο', () =>
    expect(agendaWanted(ev, d({}))).toBe(false))
  /* ΤΟ ΚΡΙΣΙΜΟ: ιδιότητα που ΔΕΝ βλέπει το μπλοκ δεν μπορεί να «θέλει»
     ατζέντα — αλλιώς μια τιμή που έμεινε από προηγούμενη επιλογή θα
     μπλόκαρε την υποβολή για ερώτηση που δεν φαίνεται πουθενά. */
  it('ιδιότητα που δεν βλέπει το μπλοκ: ποτέ', () =>
    expect(agendaWanted(ev, d({ agenda: 'yes' }, 'non-member'))).toBe(false))
})

/* Ο σύνδεσμος του εξοδολογίου ακολουθεί ΑΥΤΟ: υπόσχεση που δεν υπάρχει είναι
   χειρότερη από σιωπή, και ανακαλείται πάνω σε κάποιον που αγόρασε εισιτήριο. */
describe('isReimbursed', () => {
  it('τα μέλη του CforC', () => {
    expect(isReimbursed('member')).toBe(true)
    expect(isReimbursed('member-ban')).toBe(true)
  })
  /* Απόφαση 2/10/2026: από τη ΦΟΡΜΑ υποβάλλουν μόνο μέλη. Ο υπότροφος BAN
     που δεν είναι μέλος δεν μένει ακάλυπτος — τον ειδοποιεί η γραμματεία. */
  it('ΟΧΙ οι υπότροφοι BAN που δεν είναι μέλη — τους αναλαμβάνει άνθρωπος', () => {
    expect(isReimbursed('non-member-ban')).toBe(false)
  })
  it('ΟΧΙ όποιος δεν είναι τίποτα από τα δύο', () => {
    expect(isReimbursed('non-member')).toBe(false)
  })
  it('ΟΧΙ η «άλλη» ιδιότητα — δεν ξέρουμε τι είναι', () => {
    expect(isReimbursed('other')).toBe(false)
  })
  it('κενή ιδιότητα δεν αποζημιώνεται', () => {
    expect(isReimbursed('')).toBe(false)
    expect(isReimbursed(null)).toBe(false)
    expect(isReimbursed(undefined)).toBe(false)
  })
  /* ΜΙΑ πηγή: δεν υπάρχει δεύτερη λίστα που θα μπορούσε να αποκλίνει */
  it('ταυτίζεται με το «είναι μέλος», όχι αντίγραφό του', () => {
    for (const c of ['member', 'member-ban', 'non-member-ban', 'non-member', 'other'] as const) {
      expect(isReimbursed(c)).toBe(MEMBER_CAPACITIES.includes(c as any))
    }
  })
})
