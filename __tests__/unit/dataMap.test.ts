import { buildDataMap, summariseMap, findDrift, CATALOG, ANNOTATIONS, PROCESSORS } from '@/lib/dataMap'

describe('Χάρτης δεδομένων — άρθρο 30', () => {
  const rows = buildDataMap()

  it('βρίσκει τις συλλογές με προσωπικά δεδομένα', () => {
    expect(rows.length).toBeGreaterThan(10)
    expect(rows.map(r => r.api)).toContain('member')
  })

  it('η πιο ευαίσθητη συλλογή είναι πρώτη και περιέχει IBAN, ΑΦΜ, κωδικό', () => {
    const member = rows.find(r => r.api === 'member')!
    const names = member.personalFields.map(f => f.name)
    expect(names).toEqual(expect.arrayContaining(['Iban', 'TaxId', 'password', 'Email', 'FatherName']))
  })

  /**
   * Ο ΚΑΝΟΝΑΣ ΕΙΛΙΚΡΙΝΕΙΑΣ. Ένα αρχείο άρθρου 30 γεμάτο εύλογες εικασίες για
   * χρόνους διατήρησης είναι χειρότερο από ένα με κενά: τα κενά φαίνονται.
   */
  it('ό,τι δεν έχει αποφασιστεί δηλώνεται ΛΕΙΠΕΙ, δεν επινοείται', () => {
    const member = rows.find(r => r.api === 'member')!
    expect(member.retention).toBeNull()
    expect(member.missing).toContain('χρόνος διατήρησης')
  })

  it('ό,τι είναι επαληθεύσιμο από τον κώδικα ΕΙΝΑΙ συμπληρωμένο', () => {
    // Οι διάρκειες των token είναι σταθερές στο lib/auth.ts — δεν είναι γνώμη
    const tokens = rows.find(r => r.api === 'auth-token')!
    expect(tokens.retention).toMatch(/6 ώρες/)
    expect(tokens.missing).not.toContain('χρόνος διατήρησης')

    // Η αυτόματη διαγραφή αιτήσεων υπάρχει στο cron payment-reminders
    const apps = rows.find(r => r.api === 'membership-application')!
    expect(apps.retention).toMatch(/[Δδ]ιαγράφεται/)
    expect(apps.missing).toHaveLength(0)
  })

  it('η ανθρώπινη κρίση αφαιρεί τα ψευδώς θετικά', () => {
    // Το όνομα μιας ομάδας εργασίας δεν είναι προσωπικό δεδομένο
    const wg = rows.find(r => r.api === 'working-group')
    expect(wg).toBeUndefined()
    // Ούτε η τράπεζα στο υπόλοιπο ταμείου
    expect(rows.find(r => r.api === 'treasury-balance')).toBeUndefined()
  })

  it('κάθε γραμμή ονομάζει τους τρίτους που αγγίζουν τα δεδομένα', () => {
    for (const r of rows) {
      expect(r.processors.length).toBeGreaterThan(0)
      for (const p of r.processors) expect(p.name).toBeTruthy()
    }
  })

  it('κάθε επεξεργαστής δηλώνει ΠΕΡΙΟΧΗ — μετράει για διεθνείς διαβιβάσεις', () => {
    for (const p of Object.values(PROCESSORS)) expect(p.region).toBeTruthy()
  })

  it('καμία σημείωση δεν δείχνει σε συλλογή που δεν υπάρχει', () => {
    const known = new Set(CATALOG.collections.map(c => c.api))
    for (const api of Object.keys(ANNOTATIONS)) expect(known.has(api)).toBe(true)
  })

  it('η σύνοψη μετρά συλλογές, πεδία και ατελείς γραμμές', () => {
    const s = summariseMap(rows)
    expect(s.collections).toBe(rows.length)
    expect(s.fields).toBeGreaterThan(50)
    expect(s.incomplete).toBe(rows.filter(r => r.missing.length > 0).length)
  })
})

describe('Απόκλιση από τη ζωντανή βάση', () => {
  /**
   * Αυτό κάνει αληθινή την υπόσχεση «ένα νέο πεδίο δεν ξεχνιέται». Ένα
   * στιγμιότυπο δεσμευμένο στο repo σαπίζει σιωπηλά· ο έλεγχος πρέπει να ρωτά
   * ΑΥΤΟ που τρέχει, όχι αυτό που γράψαμε κάποτε.
   */
  it('νέο πεδίο στη βάση εντοπίζεται', () => {
    const member = CATALOG.collections.find(c => c.api === 'member')!
    const live = [...member.fields.map(f => f.name), 'ΝέοΕυαίσθητοΠεδίο']
    expect(findDrift('member', live).added).toEqual(['ΝέοΕυαίσθητοΠεδίο'])
  })

  it('τα συστημικά πεδία του Strapi ΔΕΝ μετράνε ως απόκλιση', () => {
    const member = CATALOG.collections.find(c => c.api === 'member')!
    const live = [...member.fields.map(f => f.name), 'id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale']
    expect(findDrift('member', live).added).toHaveLength(0)
  })

  it('πεδίο που σβήστηκε από τη βάση αναφέρεται κι αυτό', () => {
    const member = CATALOG.collections.find(c => c.api === 'member')!
    const live = member.fields.map(f => f.name).filter(n => n !== 'Iban')
    expect(findDrift('member', live).removed).toContain('Iban')
  })

  it('άγνωστη συλλογή: όλα τα πεδία της είναι καινούργια', () => {
    expect(findDrift('δεν-υπάρχει', ['Α', 'Β']).added).toEqual(['Α', 'Β'])
  })
})
