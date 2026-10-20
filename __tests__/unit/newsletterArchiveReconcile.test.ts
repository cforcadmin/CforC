/**
 * Η ΣΥΜΦΙΛΙΩΣΗ ΤΟΥ ΑΡΧΕΙΟΥ ΤΕΥΧΩΝ.
 *
 * ΤΟ ΠΕΡΙΣΤΑΤΙΚΟ (20/10/2026): τεύχη έφυγαν στα 115 μέλη και δεν μπήκαν ποτέ
 * στο αρχείο — το διακριτικό δεν είχε δικαίωμα `create` στα newsletters και η
 * αποτυχία φαινόταν μόνο ως `archived: false` σε μια απάντηση που κανείς δεν
 * κοιτάζει μετά από επιτυχημένη αποστολή.
 *
 * Η ΔΕΥΤΕΡΗ ΤΡΥΠΑ, ΜΕΓΑΛΥΤΕΡΗ: το προγραμματισμένο τεύχος γράφεται ως
 * `queued` και ΚΑΝΕΙΣ δεν το προάγει ποτέ σε `sent` — η μόνη εγγραφή
 * `State: 'sent'` σε όλο το repo είναι το drain των μηνυμάτων, που δεν
 * αγγίζει newsletters. Φεύγει από τον Sender ώρες αργότερα, η εγγραφή μένει
 * «σε αναμονή» για πάντα, και κανένα φίλτρο «στάλθηκε» δεν θα το έβρισκε.
 */
const mockStats = jest.fn()
jest.mock('@/lib/senderCampaigns', () => ({ getSenderCampaignStats: (...a: any[]) => mockStats(...a) }))

const { reconcileNewsletterArchives } = require('@/lib/newsletterArchive')

const TODAY = new Date().toISOString().slice(0, 10)

interface Seen { archived: any[]; promoted: any[] }

/**
 * Στήνει τις δύο αναγνώσεις (καμπάνιες, αρχείο) και καταγράφει τις γραφές.
 * Το `archiveOk: false` μιμείται την άρνηση 403 που κόστισε τα τεύχη.
 */
function stub(opts: {
  campaigns?: any[]
  existing?: any[]
  archiveOk?: boolean
  promoteOk?: boolean
} = {}): Seen {
  const seen: Seen = { archived: [], promoted: [] }
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const json = (d: any, status = 200) => new Response(JSON.stringify(d), { status })

    if (url.includes('/api/oc-campaigns/')) {
      seen.promoted.push(JSON.parse(init.body).data)
      return opts.promoteOk === false ? json({ error: 'no' }, 500) : json({ data: { documentId: 'c1' } })
    }
    if (url.includes('/api/oc-campaigns')) return json({ data: opts.campaigns ?? [] })
    if (url.includes('/api/newsletters')) {
      if (init?.method === 'POST') {
        seen.archived.push(JSON.parse(init.body).data)
        return opts.archiveOk === false ? json({ error: 'forbidden' }, 403) : json({ data: { documentId: 'n1' } })
      }
      return json({ data: opts.existing ?? [] })
    }
    return json({ data: [] })
  })
  return seen
}

const sentCampaign = (over: any = {}) => ({
  documentId: 'camp1', Subject: 'Τεύχος Οκτωβρίου', State: 'sent',
  CompletedAt: `${TODAY}T09:00:00.000Z`, Groups: ['paid'],
  Blocks: [{ type: 'text', html: '<p>νέα</p>' }], ...over,
})

describe('reconcileNewsletterArchives', () => {
  beforeEach(() => mockStats.mockReset())
  afterEach(() => jest.restoreAllMocks())

  it('γράφει στο αρχείο το τεύχος που στάλθηκε και λείπει', async () => {
    const seen = stub({ campaigns: [sentCampaign()] })
    const r = await reconcileNewsletterArchives()
    expect(seen.archived).toHaveLength(1)
    expect(seen.archived[0].Title).toBe('Τεύχος Οκτωβρίου')
    expect(seen.archived[0].Slug).toBe('teyhos-oktovrioy')
    expect(r.created).toHaveLength(1)
    expect(r.failed).toHaveLength(0)
  })

  it('δεν ξαναγράφει τεύχος που υπάρχει ήδη — η εκτέλεση είναι επαναλήψιμη', async () => {
    const seen = stub({
      campaigns: [sentCampaign()],
      existing: [{ Title: 'Τεύχος Οκτωβρίου', Date: TODAY, Slug: 'oktovrios' }],
    })
    const r = await reconcileNewsletterArchives()
    expect(seen.archived).toHaveLength(0)
    expect(r.created).toHaveLength(0)
    expect(r.failed).toHaveLength(0)
  })

  /**
   * Η ταυτότητα είναι ΤΙΤΛΟΣ+ΗΜΕΡΟΜΗΝΙΑ, όχι slug: τα τεύχη που μπήκαν με το
   * χέρι δεν ακολουθούν τον τύπο του slug (το τεύχος Οκτωβρίου είναι
   * `ta-nea-toy-diktyoy-oktovrios-2026`). Έλεγχος με slug θα τα θεωρούσε
   * απόντα και θα έγραφε δεύτερο αντίγραφο.
   */
  it('αναγνωρίζει χειροκίνητη εγγραφή με εντελώς άλλο slug', async () => {
    const seen = stub({
      campaigns: [sentCampaign({ Subject: 'Τα νέα του δικτύου — Οκτώβριος 2026' })],
      existing: [{
        Title: 'Τα νέα του δικτύου — Οκτώβριος 2026', Date: TODAY,
        Slug: 'ta-nea-toy-diktyoy-oktovrios-2026',
      }],
    })
    await reconcileNewsletterArchives()
    expect(seen.archived).toHaveLength(0)
  })

  it('ΤΟ ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΟ: ο Sender βεβαιώνει ότι έφυγε → προάγεται και αρχειοθετείται', async () => {
    mockStats.mockResolvedValue({
      status: 'SENT', sentAt: `${TODAY}T07:30:00.000Z`, sent: 115, recipients: 117,
    })
    const seen = stub({ campaigns: [sentCampaign({ State: 'queued', SenderCampaignId: 'snd9' })] })
    const r = await reconcileNewsletterArchives()
    expect(mockStats).toHaveBeenCalledWith('snd9')
    expect(seen.promoted[0]).toMatchObject({ State: 'sent', SentCount: 115, TotalCount: 117 })
    expect(seen.archived).toHaveLength(1)
    expect(r.promoted).toEqual(['Τεύχος Οκτωβρίου'])
  })

  /**
   * ΜΑΡΤΥΡΑΣ ΕΙΝΑΙ Ο SENDER, ΟΧΙ ΤΟ ΡΟΛΟΪ. Μια καμπάνια μπορεί να ακυρώθηκε ή
   * να απέτυχε· τότε η σελίδα θα δημοσίευε γράμμα που δεν έφυγε ποτέ.
   */
  it('δεν δημοσιεύει τεύχος που ο Sender δεν έχει στείλει', async () => {
    mockStats.mockResolvedValue({ status: 'SCHEDULED', sentAt: null, sent: 0, recipients: 117 })
    const seen = stub({ campaigns: [sentCampaign({ State: 'queued', SenderCampaignId: 'snd9' })] })
    const r = await reconcileNewsletterArchives()
    expect(seen.promoted).toHaveLength(0)
    expect(seen.archived).toHaveLength(0)
    expect(r.failed).toHaveLength(0)   // «δεν ήρθε η ώρα» δεν είναι σφάλμα
  })

  it('αγνοεί προγραμματισμένο χωρίς id καμπάνιας — δεν υπάρχει τρόπος να επιβεβαιωθεί', async () => {
    const seen = stub({ campaigns: [sentCampaign({ State: 'queued', SenderCampaignId: null })] })
    await reconcileNewsletterArchives()
    expect(mockStats).not.toHaveBeenCalled()
    expect(seen.archived).toHaveLength(0)
  })

  it('ονομάζει την αιτία όταν το αρχείο δεν δέχεται εγγραφή', async () => {
    const r = await (async () => {
      stub({ campaigns: [sentCampaign()], archiveOk: false })
      return reconcileNewsletterArchives()
    })()
    expect(r.created).toHaveLength(0)
    expect(r.failed[0].subject).toBe('Τεύχος Οκτωβρίου')
    expect(r.failed[0].error).toContain('create')
  })

  /**
   * Απάντηση που δεν είναι λίστα σημαίνει «δεν διάβασα», ΟΧΙ «άδειο αρχείο»:
   * το δεύτερο θα έγραφε αντίγραφο κάθε τεύχους σε κάθε εκτέλεση.
   */
  it('δεν γράφει τίποτα όταν το αρχείο δεν διαβάζεται', async () => {
    const seen: any = { archived: [] }
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/newsletters') && init?.method === 'POST') {
        seen.archived.push(1); return new Response('{}', { status: 200 })
      }
      if (url.includes('/api/newsletters')) return new Response('nope', { status: 500 })
      return new Response(JSON.stringify({ data: [sentCampaign()] }), { status: 200 })
    })
    const r = await reconcileNewsletterArchives()
    expect(seen.archived).toHaveLength(0)
    expect(r.failed[0].error).toContain('δεν διαβάστηκε')
  })

  /**
   * Ίδιος τίτλος ΑΛΛΗ μέρα = δύο τεύχη, άρα δύο σελίδες — και η δεύτερη
   * χρειάζεται δικό της slug, αλλιώς ο σύνδεσμος «δες το στον browser» του
   * ενός θα άνοιγε το άλλο. Το slug λύνεται ΜΕΣΑ στην ίδια εκτέλεση, πριν
   * ξαναδιαβαστεί τίποτα.
   */
  it('δύο τεύχη με ίδιο τίτλο σε άλλες μέρες παίρνουν διαφορετικά slug', async () => {
    const YESTERDAY = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
    const seen = stub({ campaigns: [
      sentCampaign({ documentId: 'a', Subject: 'Τεύχος' }),
      sentCampaign({ documentId: 'b', Subject: 'Τεύχος', CompletedAt: `${YESTERDAY}T11:00:00.000Z` }),
    ] })
    await reconcileNewsletterArchives()
    expect(seen.archived).toHaveLength(2)
    expect(seen.archived[0].Slug).toBe('teyhos')
    expect(seen.archived[1].Slug).not.toBe('teyhos')
  })

  /** Διπλό πάτημα «Αποστολή» την ίδια μέρα = ΕΝΑ τεύχος, μία σελίδα */
  it('ίδιος τίτλος την ίδια μέρα θεωρείται το ίδιο τεύχος', async () => {
    const seen = stub({ campaigns: [
      sentCampaign({ documentId: 'a', Subject: 'Τεύχος' }),
      sentCampaign({ documentId: 'b', Subject: 'Τεύχος', CompletedAt: `${TODAY}T11:00:00.000Z` }),
    ] })
    await reconcileNewsletterArchives()
    expect(seen.archived).toHaveLength(1)
  })

  it('ένα τεύχος μόνο προς μέλη δεν γίνεται δημόσιο', async () => {
    const seen = stub({ campaigns: [sentCampaign({ Groups: ['paid', 'external'] })] })
    await reconcileNewsletterArchives()
    expect(seen.archived[0].Audience).toBe('members')
  })
})
