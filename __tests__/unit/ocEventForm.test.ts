import { validateEventDraft, slugify } from '@/lib/ocEventForm'

const BASE = {
  Title: '5ο CforC Midterm',
  StartDate: '2026-11-20',
  EndDate: '2026-11-22',
  Audience: 'member',
}

const ok = (over: any = {}) => validateEventDraft({ ...BASE, ...over })

describe('slugify', () => {
  it('ελληνικά σε λατινικά, χωρίς τόνους', () => {
    expect(slugify('Δράση Θεσσαλονίκης')).toBe('drasi-thessalonikis')
  })
  /* Ο τόνος ΔΕΝ επιτρέπεται να δώσει δεύτερη διεύθυνση */
  it('«Δράση» και «Δραση» δίνουν το ΙΔΙΟ slug', () => {
    expect(slugify('Δράση')).toBe(slugify('Δραση'))
  })
  it('κρατά λατινικά και αριθμούς', () => {
    expect(slugify('5ο CforC Midterm 2026')).toBe('5o-cforc-midterm-2026')
  })
  it('καθαρίζει σημεία στίξης και παύλες στις άκρες', () => {
    expect(slugify('  — Midterm!! (2026) —  ')).toBe('midterm-2026')
  })
})

describe('τα βασικά', () => {
  it('δέχεται δράση με τα υποχρεωτικά', () => {
    const r = ok()
    expect(r.ok).toBe(true)
    expect(r.payload!.Slug).toBe('5o-cforc-midterm')
  })

  it('επιστρέφει ΟΛΑ τα λάθη μαζί, όχι το πρώτο', () => {
    const r = validateEventDraft({ Audience: 'κάτι' })
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(4)
  })

  it('λήξη πριν την έναρξη', () => {
    expect(ok({ EndDate: '2026-11-19' }).errors).toContain('Η λήξη είναι πριν την έναρξη')
  })

  it('προθεσμία δηλώσεων μετά τη λήξη', () => {
    expect(ok({ RegistrationDeadline: '2026-12-01' }).errors)
      .toContain('Η προθεσμία δηλώσεων είναι μετά τη λήξη της δράσης')
  })

  it('ρητό slug υπερισχύει του τίτλου, αλλά καθαρίζεται', () => {
    expect(ok({ Slug: 'Midterm 2026!' }).payload!.Slug).toBe('midterm-2026')
  })
})

/**
 * ΟΙ ΣΙΩΠΗΛΕΣ ΣΥΜΒΑΣΕΙΣ. Κενό Capacities = μόνο μέλη· κενό VisibleFor = όλοι.
 * Ένα `[]` στη θέση του null θα σήμαινε «κανείς» σε δύο διαφορετικά σημεία.
 */
describe('κενό ≠ άδειο', () => {
  it('χωρίς ιδιότητες γράφεται null, όχι []', () => {
    expect(ok().payload!.Capacities).toBeNull()
    expect(ok({ Capacities: [] }).payload!.Capacities).toBeNull()
  })
  it('κρατά μόνο υπαρκτές ιδιότητες', () => {
    expect(ok({ Capacities: ['member', 'φανταστικό', 'non-member'] }).payload!.Capacities)
      .toEqual(['member', 'non-member'])
  })
  it('δεν κρατά διπλότυπα', () => {
    expect(ok({ Capacities: ['member', 'member'] }).payload!.Capacities).toEqual(['member'])
  })
  it('RegistrationOpen: ανοιχτό εκτός αν κλείσει ρητά', () => {
    expect(ok().payload!.RegistrationOpen).toBe(true)
    expect(ok({ RegistrationOpen: false }).payload!.RegistrationOpen).toBe(false)
  })
})

describe('συνεδρίες', () => {
  const S = (over: any = {}) => ok({ Sessions: [{ Title: 'Ολομέλεια', StartsAt: '2026-11-20T10:00', ...over }] })

  it('περνά μια σωστή συνεδρία', () => {
    expect(S().ok).toBe(true)
  })
  it('χωρίς ώρα έναρξης απορρίπτεται', () => {
    expect(S({ StartsAt: '' }).ok).toBe(false)
  })
  it('λήξη πριν την έναρξη', () => {
    expect(S({ EndsAt: '2026-11-20T09:00' }).errors.join(' ')).toMatch(/πριν την έναρξη/)
  })
  /* Συνεδρία που δεν δηλώνεται ούτε δια ζώσης ούτε online δεν δηλώνεται ποτέ */
  it('και τα δύο κλειστά απορρίπτεται', () => {
    expect(S({ AllowInPerson: false, AllowOnline: false }).errors.join(' '))
      .toMatch(/δια ζώσης ή διαδικτυακά/)
  })
  it('η σειρά συμπληρώνεται από τη θέση όταν λείπει', () => {
    const r = ok({ Sessions: [
      { Title: 'Α', StartsAt: '2026-11-20T10:00' },
      { Title: 'Β', StartsAt: '2026-11-20T12:00' },
    ] })
    expect(r.payload!.Sessions.map((s: any) => s.SortOrder)).toEqual([0, 1])
  })
})

describe('μπλοκ logistics', () => {
  const O = (list: any[]) => ok({ Options: list })

  it('δέχεται γνωστό είδος', () => {
    expect(O([{ Key: 'travel', Title: 'Μετακίνηση' }]).ok).toBe(true)
  })
  it('απορρίπτει άγνωστο είδος', () => {
    expect(O([{ Key: 'parking', Title: 'Πάρκινγκ' }]).ok).toBe(false)
  })
  /* Η απάντηση αποθηκεύεται ΑΝΑ Key — δύο ίδια μπλοκ σβήνουν το ένα το άλλο */
  it('απορρίπτει δύο μπλοκ με το ίδιο είδος', () => {
    expect(O([{ Key: 'dietary', Title: 'Α' }, { Key: 'dietary', Title: 'Β' }]).errors.join(' '))
      .toMatch(/υπάρχει δύο φορές/)
  })
  it('οι κενές επιλογές γίνονται null', () => {
    expect(O([{ Key: 'lunch', Title: 'Γεύμα', Choices: ['', '  '] }]).payload!.Options[0].Choices).toBeNull()
  })
})

describe('ανοιχτή πρόσκληση', () => {
  it('εντελώς κενή αγνοείται — δεν είναι λάθος', () => {
    const r = ok({ OpenCall: { Title: '', Question: '' } })
    expect(r.ok).toBe(true)
    expect(r.payload!.OpenCall).toBeNull()
  })
  it('μισοσυμπληρωμένη απορρίπτεται', () => {
    expect(ok({ OpenCall: { Title: 'Πρότεινε δράση' } }).ok).toBe(false)
  })
  it('συμπληρώνει τις προεπιλογές', () => {
    const oc = ok({ OpenCall: { Title: 'Πρότεινε δράση', Question: 'Τι θα ήθελες;' } }).payload!.OpenCall
    expect(oc.ContactEmail).toBe('hello@cultureforchange.net')
    expect(oc.FreeTypeLabel).toBe('Δωρεάν δράση')
    expect(oc.CollectInForm).toBe(true)
  })
  it('απορρίπτει άκυρο email', () => {
    expect(ok({ OpenCall: { Title: 'Α', Question: 'Β', ContactEmail: 'όχι-email' } }).ok).toBe(false)
  })
})

describe('υλικό', () => {
  it('χρειάζεται σύνδεσμο ή αρχείο', () => {
    expect(ok({ Resources: [{ Label: 'Ατζέντα' }] }).errors.join(' ')).toMatch(/σύνδεσμο ή αρχείο/)
  })
  it('δέχεται απόλυτο σύνδεσμο', () => {
    expect(ok({ Resources: [{ Label: 'Ατζέντα', Url: 'https://x.gr/a.pdf' }] }).ok).toBe(true)
  })
  it('απορρίπτει σχετικό σύνδεσμο', () => {
    expect(ok({ Resources: [{ Label: 'Ατζέντα', Url: '/a.pdf' }] }).ok).toBe(false)
  })
  it('δέχεται αρχείο χωρίς σύνδεσμο', () => {
    expect(ok({ Resources: [{ Label: 'Ατζέντα', File: 42 }] }).payload!.Resources[0].File).toBe(42)
  })
})

describe('όρια διατήρησης', () => {
  it('δέχεται κενό', () => {
    expect(ok({ PersonalDataMonths: '' }).payload!.PersonalDataMonths).toBeNull()
  })
  it('απορρίπτει εκτός ορίων', () => {
    expect(ok({ PersonalDataMonths: 0 }).ok).toBe(false)
    expect(ok({ DietaryPurgeDays: 400 }).ok).toBe(false)
  })
  it('δέχεται έγκυρα', () => {
    expect(ok({ PersonalDataMonths: 24, DietaryPurgeDays: 30 }).ok).toBe(true)
  })
})

/**
 * Η περιγραφή γράφεται πλέον σε επεξεργαστή πλούσιου κειμένου, που δίνει
 * «<p></p>» μόλις τον αδειάσεις. Οπτικά κενό = null.
 */
describe('περιγραφή σε πλούσιο κείμενο', () => {
  it('κρατά πραγματικό HTML', () => {
    expect(ok({ Description: '<p>Με <strong>έντονα</strong></p>' }).payload!.Description)
      .toBe('<p>Με <strong>έντονα</strong></p>')
  })
  it('οπτικά κενό γίνεται null', () => {
    expect(ok({ Description: '<p></p>' }).payload!.Description).toBeNull()
    expect(ok({ Description: '<p>&nbsp;</p>' }).payload!.Description).toBeNull()
    expect(ok({ Description: '   ' }).payload!.Description).toBeNull()
  })
  it('το παλιό απλό κείμενο περνά αυτούσιο', () => {
    expect(ok({ Description: 'Σκέτο κείμενο' }).payload!.Description).toBe('Σκέτο κείμενο')
  })
  it('ισχύει και για τα αγγλικά', () => {
    expect(ok({ DescriptionEn: '<p><br></p>' }).payload!.DescriptionEn).toBeNull()
  })
})

/**
 * 6/10/2026 — Η ΖΗΜΙΑ ΠΟΥ ΔΕΝ ΞΑΝΑΓΙΝΕΤΑΙ.
 *
 * Οι επιλογές ήταν αντικείμενα {value,label}· ο έλεγχος τις περνούσε από
 * String() και τις έκανε «[object Object]». Η φόρμα της ζωντανής δράσης
 * εμφάνισε κουμπάκια ΧΩΡΙΣ ΚΕΙΜΕΝΟ, με ανοιχτή δήλωση συμμετοχής.
 *
 * Η ΤΙΜΗ είναι ό,τι αποθηκεύεται στη δήλωση του μέλους («yes», «plane»):
 * αν αλλάξει, οι ήδη υποβληθείσες δηλώσεις δείχνουν στο πουθενά.
 */
describe('επιλογές μπλοκ — τιμή και ετικέτα', () => {
  const opt = (Choices: any) => ok({ Options: [{ Key: 'lunch', Title: 'Γεύμα', Choices }] })

  it('τα αντικείμενα περνούν ΑΥΤΟΥΣΙΑ — καμία απώλεια τιμής', () => {
    const c = opt([{ value: 'yes', label: 'Ναι' }, { value: 'no', label: 'Όχι' }])
      .payload!.Options[0].Choices
    expect(c).toEqual([{ value: 'yes', label: 'Ναι' }, { value: 'no', label: 'Όχι' }])
  })

  it('«τιμή | ετικέτα» αναλύεται σωστά', () => {
    expect(opt(['plane | Αεροπλάνο', 'bus | ΚΤΕΛ / λεωφορείο']).payload!.Options[0].Choices)
      .toEqual([{ value: 'plane', label: 'Αεροπλάνο' }, { value: 'bus', label: 'ΚΤΕΛ / λεωφορείο' }])
  })

  it('σκέτη ετικέτα: η τιμή παράγεται από αυτήν', () => {
    expect(opt(['Αεροπλάνο']).payload!.Options[0].Choices)
      .toEqual([{ value: 'aeroplano', label: 'Αεροπλάνο' }])
  })

  /* ΤΟ ΚΡΙΣΙΜΟ: τίποτα δεν αποθηκεύεται στοιχειοποιημένο, ποτέ */
  it('«[object Object]» ΑΠΟΡΡΙΠΤΕΤΑΙ — δεν γράφεται πάνω στα καλά δεδομένα', () => {
    const r = opt(['[object Object]', '[object Object]'])
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/λάθος μορφή/)
  })

  it('καμία επιλογή: null, όχι κενός πίνακας', () => {
    expect(opt([]).payload!.Options[0].Choices).toBeNull()
    expect(opt(null).payload!.Options[0].Choices).toBeNull()
  })

  it('η ετικέτα με κάθετο στο κείμενό της δεν κόβεται λάθος', () => {
    expect(opt(['bus | ΚΤΕΛ / λεωφορείο | εντός Ελλάδας']).payload!.Options[0].Choices)
      .toEqual([{ value: 'bus', label: 'ΚΤΕΛ / λεωφορείο | εντός Ελλάδας' }])
  })
})
