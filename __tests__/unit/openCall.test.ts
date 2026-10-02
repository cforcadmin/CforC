import {
  parseLines, openCallClosed, openCallVisible, collectsInForm, costApplies,
  validateProposal, costValue, emptyProposal, stripOpenCall, cleanProposalDescription,
  descriptionIsEmpty, PROPOSAL_DESCRIPTION_MAX, type EventOpenCall, type ProposalDraft,
} from '@/lib/openCall'

const OC: EventOpenCall = {
  Title: 'OPEN CALL: ΠΟΛΙΤΙΣΤΙΚΗ ΔΡΑΣΗ / ΔΡΩΜΕΝΟ',
  Question: 'Έχεις να προτείνεις κάποια δράση;',
  TimeSlots: 'Σάββατο 21/11, απόγευμα ή βράδυ\nΚυριακή 22/11, πρωί\nΕλαστικότητα στην μέρα/ώρα διεξαγωγής',
  TypeOptions: 'Δωρεάν δράση\nΔράση με εισιτήριο\nΔράση με συνολικό κόστος μέχρι 300€',
  FreeTypeLabel: 'Δωρεάν δράση',
  Deadline: '2026-10-23',
  VisibleFor: ['member', 'member-ban'],
  CollectInForm: true,
}

const full = (over: Partial<ProposalDraft> = {}): ProposalDraft => ({
  ...emptyProposal(),
  wants: 'yes',
  EventProposalTitle: 'Ξενάγηση στο λιμάνι',
  TimeSlot: 'Κυριακή 22/11, πρωί',
  TypeOfEvent: 'Δωρεάν δράση',
  ProposalDuration: 'περίπου 90 λεπτά',
  EventLocation: 'Μονή Λαζαριστών',
  ProposalPromoImage: 'https://media.example/pic.jpg',
  ...over,
})

const DAY = '2026-10-02'

describe('parseLines', () => {
  it('μία επιλογή ανά γραμμή, χωρίς κενά και κενές γραμμές', () => {
    expect(parseLines(' α \n\n β \n')).toEqual(['α', 'β'])
  })
  it('κενό κείμενο δίνει κενό πίνακα', () => {
    expect(parseLines(undefined)).toEqual([])
    expect(parseLines('')).toEqual([])
  })
})

describe('openCallClosed', () => {
  it('ανοιχτή την ίδια μέρα της προθεσμίας', () => {
    expect(openCallClosed(OC, '2026-10-23')).toBe(false)
  })
  it('κλειστή την επομένη', () => {
    expect(openCallClosed(OC, '2026-10-24')).toBe(true)
  })
  it('χωρίς προθεσμία δεν κλείνει ποτέ', () => {
    expect(openCallClosed({ ...OC, Deadline: undefined }, '2030-01-01')).toBe(false)
  })
})

describe('openCallVisible', () => {
  it('το μέλος τη βλέπει', () => {
    expect(openCallVisible(OC, 'member', DAY)).toBe(true)
    expect(openCallVisible(OC, 'member-ban', DAY)).toBe(true)
  })
  it('το μη μέλος ΔΕΝ τη βλέπει', () => {
    expect(openCallVisible(OC, 'non-member', DAY)).toBe(false)
    expect(openCallVisible(OC, 'non-member-ban', DAY)).toBe(false)
  })
  it('όσο δεν έχει διαλεγεί ιδιότητα, δεν φαίνεται', () => {
    expect(openCallVisible(OC, '', DAY)).toBe(false)
  })
  it('μετά την προθεσμία δεν φαίνεται σε κανέναν', () => {
    expect(openCallVisible(OC, 'member', '2026-10-24')).toBe(false)
  })
  it('κενό VisibleFor σημαίνει όλες οι ιδιότητες', () => {
    expect(openCallVisible({ ...OC, VisibleFor: [] }, 'non-member', DAY)).toBe(true)
    expect(openCallVisible({ ...OC, VisibleFor: null }, 'non-member', DAY)).toBe(true)
  })
  it('χωρίς πρόσκληση, τίποτα', () => {
    expect(openCallVisible(null, 'member', DAY)).toBe(false)
    expect(openCallVisible(undefined, 'member', DAY)).toBe(false)
  })
})

describe('collectsInForm', () => {
  it('εξ ορισμού μαζεύει', () => {
    expect(collectsInForm({ ...OC, CollectInForm: undefined })).toBe(true)
  })
  it('false = μόνο ανακοίνωση', () => {
    expect(collectsInForm({ ...OC, CollectInForm: false })).toBe(false)
  })
})

describe('costApplies', () => {
  it('όχι για τη δωρεάν δράση', () => {
    expect(costApplies(OC, 'Δωρεάν δράση')).toBe(false)
  })
  it('ναι για τις υπόλοιπες', () => {
    expect(costApplies(OC, 'Δράση με εισιτήριο')).toBe(true)
    expect(costApplies(OC, 'Δράση με συνολικό κόστος μέχρι 300€')).toBe(true)
  })
})

describe('validateProposal', () => {
  it('ό,τι δεν φαίνεται, δεν απαιτείται — μη μέλος', () => {
    expect(validateProposal(OC, emptyProposal(), 'non-member', DAY)).toBeNull()
  })
  it('ό,τι δεν φαίνεται, δεν απαιτείται — περασμένη προθεσμία', () => {
    expect(validateProposal(OC, emptyProposal(), 'member', '2026-10-24')).toBeNull()
  })
  it('η ερώτηση είναι υποχρεωτική για το μέλος', () => {
    expect(validateProposal(OC, emptyProposal(), 'member', DAY)).toMatch(/προτείνεις/)
  })
  it('«Όχι» είναι πλήρης απάντηση', () => {
    expect(validateProposal(OC, { ...emptyProposal(), wants: 'no' }, 'member', DAY)).toBeNull()
  })
  it('πλήρης πρόταση περνά', () => {
    expect(validateProposal(OC, full(), 'member', DAY)).toBeNull()
  })

  it.each([
    ['EventProposalTitle', /τίτλο/],
    ['TimeSlot', /πότε/],
    ['TypeOfEvent', /είδος/],
    ['ProposalDuration', /διαρκέσει/],
    ['ProposalPromoImage', /εικόνα/],
  ] as const)('λείπει το %s', (field, re) => {
    expect(validateProposal(OC, full({ [field]: '' } as any), 'member', DAY)).toMatch(re)
  })

  it('ο σύνδεσμος μένει προαιρετικός', () => {
    expect(validateProposal(OC, full({ ProposalLink: '' }), 'member', DAY)).toBeNull()
  })
  it('αλλά όταν δοθεί πρέπει να είναι διεύθυνση', () => {
    expect(validateProposal(OC, full({ ProposalLink: 'κάτι' }), 'member', DAY)).toMatch(/http/)
    expect(validateProposal(OC, full({ ProposalLink: 'https://a.gr/x' }), 'member', DAY)).toBeNull()
  })

  it('το κόστος ζητείται μόνο όταν η δράση δεν είναι δωρεάν', () => {
    expect(validateProposal(OC, full({ TypeOfEvent: 'Δράση με εισιτήριο' }), 'member', DAY)).toMatch(/κόστος/)
    expect(validateProposal(OC, full({ TypeOfEvent: 'Δράση με εισιτήριο', ProposalCost: '12' }), 'member', DAY)).toBeNull()
  })
  it('δέχεται ελληνική υποδιαστολή', () => {
    expect(validateProposal(OC, full({ TypeOfEvent: 'Δράση με εισιτήριο', ProposalCost: '12,50' }), 'member', DAY)).toBeNull()
  })
  it('απορρίπτει μη αριθμό', () => {
    expect(validateProposal(OC, full({ TypeOfEvent: 'Δράση με εισιτήριο', ProposalCost: 'δωρεάν' }), 'member', DAY)).toMatch(/αριθμός/)
  })

  it('επιλογή εκτός καταλόγου απορρίπτεται', () => {
    expect(validateProposal(OC, full({ TimeSlot: 'Τρίτη πρωί' }), 'member', DAY)).toMatch(/δεν ισχύει/)
    expect(validateProposal(OC, full({ TypeOfEvent: 'Κάτι άλλο' }), 'member', DAY)).toMatch(/δεν ισχύει/)
  })

  it('όταν η πρόσκληση είναι μόνο ανακοίνωση, τίποτα δεν απαιτείται', () => {
    expect(validateProposal({ ...OC, CollectInForm: false }, emptyProposal(), 'member', DAY)).toBeNull()
  })
})

describe('costValue', () => {
  it('κενό για δωρεάν δράση', () => {
    expect(costValue(OC, full())).toBeNull()
  })
  it('αριθμός με ελληνική υποδιαστολή', () => {
    expect(costValue(OC, full({ TypeOfEvent: 'Δράση με εισιτήριο', ProposalCost: '12,50' }))).toBe(12.5)
  })
  it('κενό όταν δεν προτείνει', () => {
    expect(costValue(OC, { ...full(), wants: 'no' })).toBeNull()
  })
})

describe('stripOpenCall', () => {
  it('βγάζει την πρόσκληση και αφήνει τα υπόλοιπα', () => {
    const ev = { Title: 'Midterm', Slug: 'midterm-2026', OpenCall: OC }
    const out = stripOpenCall(ev)
    expect('OpenCall' in out).toBe(false)
    expect(out.Title).toBe('Midterm')
    expect(out.Slug).toBe('midterm-2026')
  })
  it('δράση χωρίς πρόσκληση μένει ίδια', () => {
    const ev = { Title: 'Άλλη', OpenCall: null }
    expect(stripOpenCall(ev)).toBe(ev)
  })
  it('δεν πειράζει το πρωτότυπο — ο καλών μπορεί να το ξαναχρησιμοποιήσει', () => {
    const ev = { Title: 'Midterm', OpenCall: OC }
    stripOpenCall(ev)
    expect(ev.OpenCall).toBe(OC)
  })
})

/* Ο τόπος είναι ΕΛΕΥΘΕΡΟ και ΠΡΟΑΙΡΕΤΙΚΟ: κάποιος μπορεί να προτείνει δράση
   και να ζητάει χώρο από εμάς — υποχρεωτικό πεδίο θα γέμιζε με «δεν ξέρω». */
describe('EventLocation', () => {
  it('πρόταση χωρίς τόπο περνά', () => {
    expect(validateProposal(OC, full({ EventLocation: '' }), 'member', DAY)).toBeNull()
  })
  it('πρόταση με τόπο περνά', () => {
    expect(validateProposal(OC, full({ EventLocation: 'Μονή Λαζαριστών' }), 'member', DAY)).toBeNull()
  })
  it('το κενό προσχέδιο το έχει ως κενό κείμενο, όχι undefined', () => {
    expect(emptyProposal().EventLocation).toBe('')
  })
})

/* Η περιγραφή γράφεται σε επεξεργαστή, αλλά φτάνει ως HTML — και ό,τι
   φτιάχνει ο browser μπορεί να το φτιάξει και χειροποίητο αίτημα. */
describe('cleanProposalDescription', () => {
  it('κρατά τη μορφοποίηση που επιτρέπουμε', () => {
    const out = cleanProposalDescription('<p><strong>Έντονα</strong> και <em>πλάγια</em></p>')
    expect(out).toContain('<strong>Έντονα</strong>')
    expect(out).toContain('<em>πλάγια</em>')
  })
  it('κρατά λίστες', () => {
    expect(cleanProposalDescription('<ul><li>ένα</li><li>δύο</li></ul>')).toContain('<li>ένα</li>')
  })

  /* ΤΟ ΚΡΙΣΙΜΟ: η καρτέλα της ΟΣ αποδίδει αυτό το HTML */
  it('πετά <script>', () => {
    const out = cleanProposalDescription('<p>γεια</p><script>alert(1)</script>')
    expect(out).not.toMatch(/script/i)
    expect(out).toContain('γεια')
  })
  it('πετά χειριστές συμβάντων', () => {
    expect(cleanProposalDescription('<p onclick="alert(1)">κείμενο</p>')).not.toMatch(/onclick/i)
  })
  it('πετά εικόνες και iframe', () => {
    const out = cleanProposalDescription('<img src=x onerror=alert(1)><iframe src="evil"></iframe>')
    expect(out).not.toMatch(/img|iframe|onerror/i)
  })
  it('πετά συνδέσμους javascript:', () => {
    expect(cleanProposalDescription('<a href="javascript:alert(1)">κλικ</a>')).not.toMatch(/javascript:/i)
  })
  it('κρατά κανονικούς συνδέσμους', () => {
    expect(cleanProposalDescription('<a href="https://a.gr">κλικ</a>')).toContain('href="https://a.gr"')
  })

  it('το άδειο του επεξεργαστή δεν είναι περιεχόμενο', () => {
    for (const empty of ['', '<p></p>', '<p><br></p>', '<p>   </p>']) {
      expect(cleanProposalDescription(empty)).toBe('')
    }
  })
  it('κόβει στο όριο — μία εγγραφή δεν γίνεται μεγαμπάιτ', () => {
    const huge = '<p>' + 'α'.repeat(PROPOSAL_DESCRIPTION_MAX * 2) + '</p>'
    expect(cleanProposalDescription(huge).length).toBeLessThanOrEqual(PROPOSAL_DESCRIPTION_MAX)
  })
  it('null και undefined δίνουν κενό, όχι σφάλμα', () => {
    expect(cleanProposalDescription(null)).toBe('')
    expect(cleanProposalDescription(undefined)).toBe('')
  })
})

describe('descriptionIsEmpty', () => {
  it.each(['', '<p></p>', '<p><br></p>', '<p>&nbsp;</p>'])('κενό: %s', h => {
    expect(descriptionIsEmpty(h)).toBe(true)
  })
  it('με λέξεις δεν είναι κενό', () => {
    expect(descriptionIsEmpty('<p>μια λέξη</p>')).toBe(false)
  })
})
