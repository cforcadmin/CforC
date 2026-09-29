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
   * Ο ΚΑΝΟΝΑΣ ΕΙΛΙΚΡΙΝΕΙΑΣ, ως μηχανισμός. Οι αποφάσεις της ΟΣ ήρθαν στις
   * 29/9/2026 και ο χάρτης γέμισε — αλλά ο μηχανισμός που ΔΕΙΧΝΕΙ τα κενά
   * πρέπει να εξακολουθεί να δουλεύει για ό,τι προστεθεί αύριο.
   */
  it('κενό πεδίο εμφανίζεται ως ΛΕΙΠΕΙ, δεν συμπληρώνεται με εικασία', () => {
    const { buildDataMap: build } = require('@/lib/dataMap')
    const rowsNow = build()
    // Κάθε γραμμή χωρίς χρόνο διατήρησης ΠΡΕΠΕΙ να το δηλώνει
    for (const r of rowsNow) {
      if (!r.retention) expect(r.missing).toContain('χρόνος διατήρησης')
      if (!r.legalBasis) expect(r.missing).toContain('νομική βάση')
      if (r.retention && r.legalBasis && r.purpose) expect(r.missing).toHaveLength(0)
    }
  })

  /** Οι αποφάσεις της ΟΣ, 29/9/2026 — δεν είναι εικασίες, είναι καταγραφή */
  it('οι αποφάσεις της ΟΣ είναι καταγεγραμμένες', () => {
    const member = rows.find(r => r.api === 'member')!
    expect(member.retention).toMatch(/10 έτη/)
    expect(member.retention).toMatch(/ΑΠΟΧΩΡΗΣΗ/)   // η αφετηρία, όχι μόνο η διάρκεια
    expect(member.missing).toHaveLength(0)

    // Η ανάκληση συγκατάθεσης στο newsletter ΔΕΝ σβήνει — απενεργοποιεί
    expect(rows.find(r => r.api === 'newsletter-subscriber')!.retention)
      .toMatch(/ΑΠΕΝΕΡΓΟΠΟΙΕΙΤΑΙ/)
    // Το υλικό βιβλιοθήκης φεύγει μόνο με γραπτό αίτημα
    expect(rows.find(r => r.api === 'library-item')!.retention).toMatch(/γραπτού αιτήματος/)
    // Οι δημόσιες σελίδες έργων κατεβαίνουν μόνο με αίτημα της ΟΣ προς το IT
    expect(rows.find(r => r.api === 'project')!.note).toMatch(/ΟΣ προς το IT/)
  })

  it('τα φορολογικά δηλώνουν ότι ΔΕΝ είναι επιλογή', () => {
    for (const api of ['expense-claim', 'receipt', 'expense', 'income-record']) {
      expect(rows.find(r => r.api === api)!.retention).toMatch(/νόμιμο όριο/)
    }
  })

  it('ό,τι είναι επαληθεύσιμο από τον κώδικα ΕΙΝΑΙ συμπληρωμένο', () => {
    // Οι διάρκειες των token είναι σταθερές στο lib/auth.ts — δεν είναι γνώμη
    const tokens = rows.find(r => r.api === 'auth-token')!
    expect(tokens.retention).toMatch(/6 ώρες/)
    expect(tokens.missing).not.toContain('χρόνος διατήρησης')

    // Ο κανόνας των 30 ημερών μετρά από την ΕΓΚΡΙΣΗ της ΟΣ
    const apps = rows.find(r => r.api === 'membership-application')!
    expect(apps.retention).toMatch(/30 ημέρες από την έγκριση/)
    expect(apps.missing).toHaveLength(0)
  })

  it('η ανθρώπινη κρίση αφαιρεί τα ψευδώς θετικά', () => {
    // Η τράπεζα στο υπόλοιπο ταμείου δεν είναι προσωπικό δεδομένο
    expect(rows.find(r => r.api === 'treasury-balance')).toBeUndefined()
    // Ούτε το όνομα/εικόνα μιας ομάδας εργασίας…
    const wg = rows.find(r => r.api === 'working-group')!
    expect(wg.personalFields.map(f => f.name)).not.toContain('Name')
    // …ούτε οι διευθύνσεις ΘΕΣΗΣ της Ομάδας Συντονισμού (finance@, it@)
    const ct = rows.find(r => r.api === 'coordination-team')!
    expect(ct.personalFields.map(f => f.name)).not.toContain('FinancerEmail')
  })

  /**
   * ΤΟ ΣΟΒΑΡΟΤΕΡΟ ΚΕΝΟ ΤΗΣ ΠΡΩΤΗΣ ΕΚΔΟΧΗΣ (29/9/2026). Είκοσι ένα πεδία
   * σχέσης δείχνουν στο `member` και κανένα δεν εντοπιζόταν: οι Ομάδες
   * Εργασίας και οι Εργασίες OC έλειπαν ΟΛΟΚΛΗΡΕΣ από το αρχείο, ενώ η Ομάδα
   * Συντονισμού μετριόταν για τα λάθος πεδία. Προσωπικά δεδομένα δι' αναφοράς
   * είναι εξίσου προσωπικά δεδομένα.
   */
  it('οι ΣΥΝΔΕΣΕΙΣ με μέλη μετράνε ως προσωπικά δεδομένα', () => {
    const ct = rows.find(r => r.api === 'coordination-team')!
    expect(ct.personalFields.map(f => f.name)).toEqual(
      expect.arrayContaining(['Coordinator', 'Financer', 'IT', 'Members']))
    // Συλλογές που ΜΟΝΟ μέσω σχέσης κρατούν προσωπικά δεδομένα
    expect(rows.find(r => r.api === 'oc-task')!.personalFields.map(f => f.name)).toEqual(['assignees'])
    expect(rows.find(r => r.api === 'working-group')).toBeDefined()
  })

  /**
   * Ο έλεγχος ΤΥΠΟΥ πιάνει μηχανικά ό,τι το όνομα του πεδίου ξεγελά.
   * Το `VatAmount` είναι decimal (ποσό ΦΠΑ) και καταγραφόταν ως «ΑΦΜ»· το
   * `ReceiptType` είναι enumeration (Φυσικό πρόσωπο / Εταιρεία) και
   * καταγραφόταν ως «παραστατικό».
   */
  it('αριθμός ή enumeration ΔΕΝ μπορεί να είναι όνομα, ΑΦΜ ή παραστατικό', () => {
    const names = (api: string) =>
      (rows.find(r => r.api === api)?.personalFields || []).map(f => f.name)
    expect(names('expense')).not.toContain('VatAmount')
    expect(names('member')).not.toContain('ReceiptType')
    expect(names('membership-application')).not.toContain('ReceiptType')
    // …αλλά το πραγματικό αποδεικτικό (media) μένει
    expect(names('member')).toContain('RenewalReceipt')
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
