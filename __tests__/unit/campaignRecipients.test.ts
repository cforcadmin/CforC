import {
  resolveRecipients, daysNeeded, recipientSummary, validateCampaign,
  toQueue, firstNameOf, isValidEmail, DAILY_EMAIL_BUDGET, type CampaignMember,
} from '@/lib/campaignRecipients'

/**
 * Η επιλογή παραληπτών είναι το επικίνδυνο κομμάτι: καθορίζει σε ποιους
 * ΑΝΘΡΩΠΟΥΣ φτάνει το γράμμα. Τα tests εδώ ελέγχουν κυρίως ποιος ΔΕΝ μπαίνει.
 */

const members: CampaignMember[] = [
  { docId: 'a', name: 'Μαρία Κολιοπούλου', email: 'maria@x.gr', am: 34, payments: { '2026': 1 }, groups: ['Κοινότητα'] },
  { docId: 'b', name: 'Νίκος Βανδώρος', email: 'nikos@x.gr', am: 55, payments: { '2026': 0 }, groups: [] },
  { docId: 'c', name: 'Βάσια Βαλκανιώτη', email: 'vasia@x.gr', am: 71, payments: {}, groups: ['Επικοινωνία'] },
  { docId: 'd', name: 'Χωρίς ΑΜ', email: 'noam@x.gr', am: null, payments: {}, groups: ['Γραμματεία'] },
  { docId: 'e', name: 'Χωρίς email', email: '', am: 90, payments: {}, groups: [] },
]

describe('Ποιος μπαίνει στη λίστα', () => {
  it('«όλα τα μέλη» σημαίνει όσοι έχουν ΑΜ και έγκυρο email', () => {
    const r = resolveRecipients(members, { allMembers: true })
    expect(r.map(x => x.email).sort()).toEqual(['maria@x.gr', 'nikos@x.gr', 'vasia@x.gr'])
  })

  it('μέλος χωρίς ΑΜ δεν μπαίνει στο «όλα τα μέλη»', () => {
    expect(resolveRecipients(members, { allMembers: true }).some(r => r.docId === 'd')).toBe(false)
  })

  it('μέλος χωρίς email δεν μπαίνει ποτέ', () => {
    expect(resolveRecipients(members, { allMembers: true, memberDocIds: ['e'] }).some(r => r.docId === 'e')).toBe(false)
  })

  it('απλήρωτοι: το «καμία εγγραφή» μετράει ως απλήρωτο', () => {
    const r = resolveRecipients(members, { paymentStatus: { year: 2026, paid: false } })
    // Νίκος έχει 0, Βάσια δεν έχει καθόλου εγγραφή — και οι δύο απλήρωτοι
    expect(r.map(x => x.email).sort()).toEqual(['nikos@x.gr', 'vasia@x.gr'])
  })

  it('πληρωμένοι: μόνο όσοι έχουν ρητά 1', () => {
    const r = resolveRecipients(members, { paymentStatus: { year: 2026, paid: true } })
    expect(r.map(x => x.email)).toEqual(['maria@x.gr'])
  })

  it('ομάδες, χωρίς διάκριση πεζών-κεφαλαίων', () => {
    expect(resolveRecipients(members, { groups: ['κοινότητα'] }).map(x => x.email)).toEqual(['maria@x.gr'])
  })

  it('κάτοχος έδρας ΧΩΡΙΣ ΑΜ μπαίνει — η έδρα δεν απαιτεί ιδιότητα μέλους', () => {
    // Η Γραμματεία στηρίζει το ΔΣ χωρίς να είναι μέλος του· με φίλτρο ΑΜ
    // η επιλογή δύο εδρών έδινε έναν παραλήπτη.
    expect(resolveRecipients(members, { groups: ['Γραμματεία'] }).map(x => x.email)).toEqual(['noam@x.gr'])
  })

  it('δύο έδρες → δύο παραλήπτες, ακόμη κι αν ο ένας δεν έχει ΑΜ', () => {
    expect(resolveRecipients(members, { groups: ['Γραμματεία', 'Κοινότητα'] })).toHaveLength(2)
  })

  it('μεμονωμένο μέλος μπαίνει ακόμη και χωρίς ΑΜ — είναι ρητή επιλογή', () => {
    expect(resolveRecipients(members, { memberDocIds: ['d'] }).map(x => x.email)).toEqual(['noam@x.gr'])
  })

  it('εξωτερικές διευθύνσεις, με απόρριψη των άκυρων', () => {
    const r = resolveRecipients(members, { external: ['partner@x.gr', 'σκουπίδι', ''] })
    expect(r.map(x => x.email)).toEqual(['partner@x.gr'])
  })
})

describe('Διπλοεγγραφές', () => {
  it('όποιος πιάνεται από δύο κριτήρια μπαίνει ΜΙΑ φορά', () => {
    const r = resolveRecipients(members, { allMembers: true, groups: ['Κοινότητα'], memberDocIds: ['a'] })
    expect(r.filter(x => x.email === 'maria@x.gr')).toHaveLength(1)
  })

  it('κρατά την πρώτη αιτία εισόδου', () => {
    const r = resolveRecipients(members, { allMembers: true, groups: ['Κοινότητα'] })
    expect(r.find(x => x.email === 'maria@x.gr')!.via).toBe('all')
  })

  it('το email ταιριάζει ανεξαρτήτως πεζών-κεφαλαίων', () => {
    const dup: CampaignMember[] = [
      { docId: 'x', name: 'Α', email: 'Same@X.gr', am: 1 },
      { docId: 'y', name: 'Β', email: 'same@x.gr', am: 2 },
    ]
    expect(resolveRecipients(dup, { allMembers: true })).toHaveLength(1)
  })
})

describe('Ημέρες και όριο', () => {
  it('το ημερήσιο όριο αφήνει περιθώριο στα αυτόματα email', () => {
    expect(DAILY_EMAIL_BUDGET).toBe(80)
    expect(DAILY_EMAIL_BUDGET).toBeLessThan(100)
  })

  it('113 μέλη → δύο ημέρες', () => {
    expect(daysNeeded(113)).toBe(2)
    expect(recipientSummary(113)).toBe('113 παραλήπτες · 2 ημέρες')
  })

  it('μέχρι το όριο → μία αποστολή', () => {
    expect(daysNeeded(80)).toBe(1)
    expect(recipientSummary(80)).toBe('80 παραλήπτες · μία αποστολή')
    expect(recipientSummary(1)).toBe('1 παραλήπτης · μία αποστολή')
  })

  it('κανένας παραλήπτης → καμία ημέρα', () => {
    expect(daysNeeded(0)).toBe(0)
  })
})

describe('Έλεγχος πριν την ουρά', () => {
  it('δέχεται πλήρη καμπάνια', () => {
    expect(validateCampaign({ subject: 'Θ', blocks: [{}], recipients: [{}] }).ok).toBe(true)
  })

  it('απορρίπτει κενό μήνυμα — δεν στέλνουμε λευκό γράμμα σε αληθινούς ανθρώπους', () => {
    const v = validateCampaign({ subject: 'Θ', blocks: [], recipients: [{}] })
    expect(v.ok).toBe(false)
    expect(v.errors).toContain('Το μήνυμα είναι κενό')
  })

  it('απορρίπτει μηδέν παραλήπτες — αλλιώς δείχνει επιτυχία χωρίς αποστολή', () => {
    expect(validateCampaign({ subject: 'Θ', blocks: [{}], recipients: [] }).errors)
      .toContain('Δεν έχει επιλεγεί κανένας παραλήπτης')
  })

  it('απορρίπτει κενό θέμα', () => {
    expect(validateCampaign({ subject: '   ', blocks: [{}], recipients: [{}] }).errors).toContain('Λείπει το θέμα')
  })
})

describe('Βοηθητικά', () => {
  it('η ουρά ξεκινά με όλους pending', () => {
    const q = toQueue(resolveRecipients(members, { allMembers: true }))
    expect(q.every(r => r.status === 'pending' && r.attempts === 0)).toBe(true)
  })

  it('μικρό όνομα για το merge field', () => {
    expect(firstNameOf('Μαρία Κολιοπούλου')).toBe('Μαρία')
    expect(firstNameOf('')).toBe('')
  })

  it('έλεγχος email', () => {
    expect(isValidEmail('a@b.gr')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
