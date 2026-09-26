import { buildRequest } from '../helpers/mockStrapi'

/**
 * Η διαδρομή της μαζικής αποστολής. Το πιο σημαντικό εδώ είναι το ΦΡΑΓΜΑ:
 * το γράμμα φτάνει σε αληθινούς ανθρώπους και δεν παίρνει πίσω.
 */

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(() => undefined), set: jest.fn(), delete: jest.fn() })),
}))
const resolveOcAccess = jest.fn()
const getBoardRoster = jest.fn(async () => [])
const getSeatHolder = jest.fn(async () => ({ name: 'Σόνια Ντόβα', engName: 'Sonia Ntova' }))
jest.mock('@/lib/ocRoles', () => ({
  get resolveOcAccess() { return resolveOcAccess },
  get getBoardRoster() { return getBoardRoster },
  get getSeatHolder() { return getSeatHolder },
  SEAT_LABELS: {
    admin: 'Γραμματεία', it: 'IT', financer: 'Ταμίας', comms: 'Επικοινωνία',
    community: 'Κοινότητα', coordinator: 'Συντονισμός', outreach: 'Outreach',
  },
  SEAT_MAILBOX: {
    admin: 'hello@cultureforchange.net', it: 'it@cultureforchange.net',
    financer: 'finance@cultureforchange.net', comms: 'communication@cultureforchange.net',
    community: 'community@cultureforchange.net', coordinator: 'coordination@cultureforchange.net',
    outreach: 'outreach@cultureforchange.net',
  },
}))
const verifyToken = jest.fn()
jest.mock('@/lib/auth', () => ({ get verifyToken() { return verifyToken } }))

import { GET, POST, DELETE } from '@/app/api/oc/campaigns/route'
import { cookies } from 'next/headers'

function signedInAs(seat: string | null, isBoard = true) {
  verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
  resolveOcAccess.mockResolvedValue({ isBoard, seats: seat ? [seat] : [] })
  ;(cookies as jest.Mock).mockResolvedValue({
    get: (n: string) => (n === 'session' ? { value: 'tok' } : n === 'oc-last-seat' && seat ? { value: seat } : undefined),
    set: jest.fn(), delete: jest.fn(),
  })
}

const members = [
  { documentId: 'a', Name: 'Μαρία Κ', Email: 'maria@x.gr', AM: 34, Payments: { '2026': 1 } },
  { documentId: 'b', Name: 'Νίκος Β', Email: 'nikos@x.gr', AM: 55, Payments: { '2026': 0 } },
]

function mockStrapi() {
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    if (url.includes('/api/members?')) return new Response(JSON.stringify({ data: members }), { status: 200 })
    if (url.includes('/api/working-groups')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
    if (url.includes('/api/oc-campaigns')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
    return new Response(JSON.stringify({ data: {} }), { status: 200 })
  })
}

const post = async (body: any) => {
  const res = await POST(buildRequest('/api/oc/campaigns', { method: 'POST', body }))
  return { status: res.status, json: await res.json() }
}

describe('Φράγμα πρόσβασης', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('χωρίς σύνδεση → 401', async () => {
    verifyToken.mockReturnValue(null)
    ;(cookies as jest.Mock).mockResolvedValue({ get: () => undefined, set: jest.fn(), delete: jest.fn() })
    expect((await POST(buildRequest('/api/oc/campaigns', { method: 'POST', body: {} }))).status).toBe(401)
  })

  it('μη μέλος ΔΣ → 403', async () => {
    signedInAs('admin', false)
    expect((await post({ action: 'resolve' })).status).toBe(403)
  })

  it('μέλος ΔΣ με πολλές έδρες και χωρίς επιλεγμένη → 403', async () => {
    // Χωρίς ενεργή έδρα δεν ξέρουμε ΑΠΟ ΠΟΙΑ ΘΥΡΙΔΑ θα έφευγε το γράμμα
    verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
    resolveOcAccess.mockResolvedValue({ isBoard: true, seats: ['financer', 'comms'] })
    ;(cookies as jest.Mock).mockResolvedValue({
      get: (n: string) => (n === 'session' ? { value: 'tok' } : undefined),
      set: jest.fn(), delete: jest.fn(),
    })
    expect((await post({ action: 'resolve' })).status).toBe(403)
  })

  // Κάθε έδρα έχει πλέον δικό της γραφείο αποστολής στη δική της ενότητα
  it.each([
    ['admin', 'Γραμματεία'], ['it', 'IT'], ['financer', 'Ταμίας'],
    ['community', 'Κοινότητα'], ['comms', 'Επικοινωνία'],
    ['coordinator', 'Συντονισμός'], ['outreach', 'Outreach'],
  ])('%s → περνά', async (seat) => {
    signedInAs(seat); mockStrapi()
    expect((await post({ action: 'resolve', selection: { allMembers: true } })).status).toBe(200)
  })
})

describe('Θυρίδα ανά έδρα', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  // Η ΘΥΡΙΔΑ βγαίνει από την ενεργή έδρα, όχι από την ενότητα: η ίδια οθόνη
  // στην Επισκόπηση υπογράφει coordination@ για τον Συντονισμό και outreach@
  // για το Outreach.
  it.each([
    ['coordinator', 'coordination@cultureforchange.net'],
    ['outreach', 'outreach@cultureforchange.net'],
    ['community', 'community@cultureforchange.net'],
    ['financer', 'finance@cultureforchange.net'],
    ['comms', 'communication@cultureforchange.net'],
    ['admin', 'hello@cultureforchange.net'],
  ])('%s υπογράφει από %s', async (seat, mailbox) => {
    signedInAs(seat); mockStrapi()
    const r = await GET(buildRequest('/api/oc/campaigns'))
    const j = await r.json()
    expect(j.signer.email).toBe(mailbox)
  })

  it('το αποθηκευμένο Signer παγώνει τη θυρίδα της έδρας που συνέθεσε', async () => {
    signedInAs('financer')
    let saved: any = null
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/members?')) return new Response(JSON.stringify({ data: members }), { status: 200 })
      if (url.includes('/api/working-groups')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
      if (url.includes('/api/oc-campaigns') && init?.method === 'POST') {
        saved = JSON.parse(init.body).data
        return new Response(JSON.stringify({ data: { documentId: 'new1' } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    })
    await post({ action: 'save', subject: 'Δ', blocks: [{ type: 'text', html: '<p>γεια</p>' }], selection: { allMembers: true } })
    expect(saved.Signer.email).toBe('finance@cultureforchange.net')
    expect(saved.Signer.role).toBe('Ταμίας')
  })
})

describe('Κάθε γραφείο έχει δικό του γραμματοκιβώτιο', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  // Η μονάδα διαχωρισμού είναι το ΓΡΑΦΕΙΟ (η ενότητα), όχι το πρόσωπο. Η
  // Επισκόπηση είναι ένα κοινό τραπέζι: Συντονισμός και Outreach βλέπουν τα
  // ίδια Απεσταλμένα. Τα Οικονομικά δεν βλέπουν τίποτα από αυτά.
  const rows = [
    { documentId: 'c1', Subject: 'Ταμείο', Desk: 'finances', Signer: { email: 'finance@cultureforchange.net' } },
    { documentId: 'c2', Subject: 'Κοινότητα', Desk: 'members', Signer: { email: 'community@cultureforchange.net' } },
    { documentId: 'c3', Subject: 'Παλιό', Signer: null },
    { documentId: 'c4', Subject: 'Της Έφης', Desk: 'overview', Signer: { email: 'coordination@cultureforchange.net' } },
    { documentId: 'c5', Subject: 'Της Δήμητρας', Desk: 'overview', Signer: { email: 'outreach@cultureforchange.net' } },
    { documentId: 'c6', Subject: 'Του IT στα Οικονομικά', Desk: 'finances', Signer: { email: 'it@cultureforchange.net' } },
  ]
  function mockList(data = rows) {
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/members?')) return new Response(JSON.stringify({ data: members }), { status: 200 })
      if (url.includes('/api/working-groups')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
      if (url.includes('/api/oc-campaigns')) return new Response(JSON.stringify({ data }), { status: 200 })
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    })
  }
  const subjects = async (desk?: string) => {
    const q = desk ? `?desk=${desk}` : ''
    const j = await (await GET(buildRequest(`/api/oc/campaigns${q}`))).json()
    return j.campaigns.map((c: any) => c.Subject)
  }

  it('τα Οικονομικά βλέπουν μόνο το δικό τους γραφείο', async () => {
    signedInAs('financer'); mockList()
    expect(await subjects('finances')).toEqual(['Ταμείο', 'Του IT στα Οικονομικά'])
  })

  it('η Επισκόπηση είναι ΚΟΙΝΗ — ο Συντονισμός βλέπει και του Outreach', async () => {
    signedInAs('coordinator'); mockList()
    expect(await subjects('overview')).toEqual(['Της Έφης', 'Της Δήμητρας'])
  })

  it('…και το Outreach βλέπει ακριβώς τα ίδια', async () => {
    signedInAs('outreach'); mockList()
    expect(await subjects('overview')).toEqual(['Της Έφης', 'Της Δήμητρας'])
  })

  it('τα Μέλη δεν βλέπουν τίποτα από τα Οικονομικά', async () => {
    signedInAs('community'); mockList()
    expect(await subjects('members')).toEqual(['Κοινότητα'])
  })

  it('παλιές εγγραφές χωρίς γραφείο πάνε στη Διαχείριση — την ως τώρα κοινή δεξαμενή', async () => {
    signedInAs('admin'); mockList()
    expect(await subjects('admin')).toEqual(['Παλιό'])
  })

  it('το IT βλέπει το γραφείο στο οποίο κάθεται, όχι έναν σωρό', async () => {
    signedInAs('it'); mockList()
    expect(await subjects('members')).toEqual(['Κοινότητα'])
    expect(await subjects('overview')).toEqual(['Της Έφης', 'Της Δήμητρας'])
  })

  it('ζητούμενο γραφείο εκτός αρμοδιότητας αγνοείται — πέφτει στο δικό του', async () => {
    // Χωρίς αυτό, ένα χειροκίνητο ?desk=finances θα άνοιγε τα Οικονομικά
    signedInAs('community'); mockList()
    expect(await subjects('finances')).toEqual(['Κοινότητα'])
  })

  it('χωρίς γραμμένο Desk, το γραφείο βγαίνει από τη θυρίδα του υπογράφοντα', async () => {
    // Η περίοδος πριν βγει το πεδίο στο Strapi Cloud: ο διαχωρισμός ισχύει ήδη
    signedInAs('coordinator')
    mockList([
      { documentId: 'x1', Subject: 'Συντονισμού', Signer: { email: 'coordination@cultureforchange.net' } },
      { documentId: 'x2', Subject: 'Outreach', Signer: { email: 'outreach@cultureforchange.net' } },
      { documentId: 'x3', Subject: 'Ταμείου', Signer: { email: 'finance@cultureforchange.net' } },
    ])
    expect(await subjects('overview')).toEqual(['Συντονισμού', 'Outreach'])
  })

  it('το γραφείο γράφεται τη στιγμή της σύνθεσης', async () => {
    signedInAs('it')
    let saved: any = null
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/members?')) return new Response(JSON.stringify({ data: members }), { status: 200 })
      if (url.includes('/api/working-groups')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
      if (url.includes('/api/oc-campaigns') && init?.method === 'POST') {
        saved = JSON.parse(init.body).data
        return new Response(JSON.stringify({ data: { documentId: 'n1' } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    })
    // Το IT υπογράφει πάντα it@ — μόνο το γραμμένο Desk λέει σε ποιο τραπέζι
    // καθόταν. Γι' αυτό δεν αρκεί να το συμπεράνουμε από την υπογραφή.
    await post({ action: 'save', desk: 'finances', subject: 'Δ', blocks: [{ type: 'text', html: '<p>ν</p>' }], selection: {} })
    expect(saved.Desk).toBe('finances')
    expect(saved.Signer.email).toBe('it@cultureforchange.net')
  })

  it('δεν διαγράφεται μήνυμα άλλου γραφείου', async () => {
    signedInAs('financer')
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/oc-campaigns/c2')) {
        return new Response(JSON.stringify({ data: { State: 'sent', Blocks: [], Desk: 'members', Signer: { email: 'community@cultureforchange.net' } } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 })
    })
    expect((await DELETE(buildRequest('/api/oc/campaigns?id=c2', { method: 'DELETE' }))).status).toBe(403)
  })

  it('δεν αρχειοθετείται μήνυμα άλλου γραφείου', async () => {
    signedInAs('community')
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/oc-campaigns/c1')) {
        return new Response(JSON.stringify({ data: { Desk: 'finances', Signer: { email: 'finance@cultureforchange.net' } } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    })
    expect((await post({ action: 'archive', id: 'c1' })).status).toBe(403)
  })

  it('το Outreach ΑΡΧΕΙΟΘΕΤΕΙ μήνυμα του Συντονισμού — ίδιο τραπέζι', async () => {
    signedInAs('outreach')
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/oc-campaigns/c4')) {
        return new Response(JSON.stringify({ data: { Desk: 'overview', Signer: { email: 'coordination@cultureforchange.net' } } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    })
    expect((await post({ action: 'archive', id: 'c4' })).status).toBe(200)
  })
})

describe('resolve', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('επιστρέφει πλήθος, ημέρες και περίληψη', async () => {
    const { json } = await post({ action: 'resolve', selection: { allMembers: true } })
    expect(json.count).toBe(2)
    expect(json.days).toBe(1)
    expect(json.summary).toBe('2 παραλήπτες · μία αποστολή')
  })

  it('φιλτράρει κατά κατάσταση συνδρομής', async () => {
    const { json } = await post({ action: 'resolve', selection: { paymentStatus: { year: 2026, paid: false } } })
    expect(json.recipients.map((r: any) => r.email)).toEqual(['nikos@x.gr'])
  })
})

describe('preview', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('αποδίδει τα μπλοκ και λύνει τα merge fields', async () => {
    const { json } = await post({
      action: 'preview', subject: 'Γεια {{όνομα}}',
      blocks: [{ type: 'text', html: 'Αγαπητή {{όνομα}}, ΑΜ {{ΑΜ}}.' }],
    })
    expect(json.subject).toContain('Μαρία')
    expect(json.html).toContain('Αγαπητή Μαρία, ΑΜ 34.')
    expect(json.html).not.toContain('{{όνομα}}')
  })
})

describe('queue', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('αρνείται καμπάνια χωρίς παραλήπτες', async () => {
    const r = await post({ action: 'queue', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }], selection: {} })
    expect(r.status).toBe(400)
    expect(r.json.errors).toContain('Δεν έχει επιλεγεί κανένας παραλήπτης')
  })

  it('αρνείται κενό μήνυμα', async () => {
    const r = await post({ action: 'queue', subject: 'Θ', blocks: [], selection: { allMembers: true } })
    expect(r.json.errors).toContain('Το μήνυμα είναι κενό')
  })

  it('το προσχέδιο ΔΕΝ ελέγχεται — αποθηκεύεται ημιτελές', async () => {
    expect((await post({ action: 'save', subject: '', blocks: [], selection: {} })).status).toBe(200)
  })
})

describe('Υπογραφή', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('υπογράφει η ΕΔΡΑ που συνθέτει — όνομα κατόχου και θυρίδα', async () => {
    const { json } = await post({ action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }] })
    expect(json.html).toContain('Σόνια Ντόβα')
    expect(json.html).toContain('hello@cultureforchange.net')
    expect(json.html).toContain('Γραμματεία')
  })

  it('η εμφάνιση του υποσέλιδου αλλάζει ανεξάρτητα από το περιεχόμενο', async () => {
    const a = await post({ action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }], footerLook: 'plain' })
    const b = await post({ action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }], footerLook: 'dark' })
    // Και τα δύο υπογράφονται, αλλά η «Σκούρη ζώνη» βάφει το υποσέλιδο
    expect(a.json.html).toContain('Σόνια Ντόβα')
    expect(b.json.html).toContain('Σόνια Ντόβα')
    expect(a.json.html).not.toContain('background-color:#2D2D2D;border-radius:16px')
    expect(b.json.html).toContain('background-color:#2D2D2D;border-radius:16px')
  })

  it('άγνωστο στυλ δεν ρίχνει τη διαδρομή — πέφτει στο βασικό', async () => {
    const { status, json } = await post({
      action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }],
      footerStyle: 'άγνωστο', footerLook: 'κάτι-άλλο', headerStyle: 'ακόμη-ένα',
    })
    expect(status).toBe(200)
    expect(json.html).toContain('Σόνια Ντόβα')
  })

  it('οι δύο άξονες είναι ανεξάρτητοι — «Ως δίκτυο» σε σκούρη ζώνη', async () => {
    const { json } = await post({
      action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }],
      footerStyle: 'organisation', footerLook: 'dark',
    })
    // Χωρίς πρόσωπο και χωρίς χαιρετισμό, αλλά με τη σκούρη ζώνη
    expect(json.html).not.toContain('Σόνια Ντόβα')
    expect(json.html).not.toContain('Φιλικά,')
    expect(json.html).toContain('background-color:#2D2D2D;border-radius:16px')
  })
})

describe('Αρχειοθέτηση και διαγραφή', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  /** Καταγράφει κάθε κλήση, ώστε να ελέγχουμε ΤΙ σβήστηκε */
  function mockWith(campaign: any, others: any[] = []) {
    const calls: Array<{ method: string; url: string; body?: any }> = []
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      const method = (init?.method || 'GET').toUpperCase()
      calls.push({ method, url, body: init?.body ? JSON.parse(init.body) : undefined })
      if (url.includes('/api/oc-campaigns?pagination[limit]=200')) {
        return new Response(JSON.stringify({ data: others }), { status: 200 })
      }
      if (url.includes('/api/oc-campaigns/') && method === 'GET') {
        return new Response(JSON.stringify({ data: campaign }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    })
    return calls
  }

  const del = async (id: string) => {
    const res = await DELETE(buildRequest(`/api/oc/campaigns?id=${id}`, { method: 'DELETE' }))
    return { status: res.status, json: await res.json() }
  }

  it('η αρχειοθέτηση δεν αγγίζει τίποτα άλλο', async () => {
    signedInAs('admin'); mockStrapi()
    const { status } = await post({ action: 'archive', id: 'c1', archived: true })
    expect(status).toBe(200)
  })

  it('η διαγραφή σβήνει τις εικόνες που κρατά ΜΟΝΟ αυτή', async () => {
    signedInAs('admin')
    const calls = mockWith(
      { documentId: 'c1', State: 'sent', Subject: 'Θ', Blocks: [{ type: 'image', mediaId: 11 }, { type: 'card', mediaId: 12 }] },
      [],
    )
    const { json } = await del('c1')
    expect(json.imagesDeleted).toBe(2)
    expect(calls.some(c => c.method === 'DELETE' && c.url.includes('/upload/files/11'))).toBe(true)
    expect(calls.some(c => c.method === 'DELETE' && c.url.includes('/upload/files/12'))).toBe(true)
  })

  it('ΔΕΝ σβήνει εικόνα που χρησιμοποιεί άλλη καμπάνια', async () => {
    signedInAs('admin')
    const calls = mockWith(
      { documentId: 'c1', State: 'sent', Subject: 'Θ', Blocks: [{ type: 'image', mediaId: 11 }] },
      [{ documentId: 'c2', Blocks: [{ type: 'image', mediaId: 11 }] }],
    )
    const { json } = await del('c1')
    expect(json.imagesDeleted).toBe(0)
    expect(json.imagesKept).toBe(1)
    expect(calls.some(c => c.url.includes('/upload/files/11'))).toBe(false)
  })

  it('βρίσκει και τα πρωτότυπα πίσω από σημασμένες εικόνες', async () => {
    signedInAs('admin')
    const calls = mockWith(
      { documentId: 'c1', State: 'sent', Subject: 'Θ', Blocks: [{ type: 'image', mediaId: 20, origMediaId: 21 }] },
      [],
    )
    await del('c1')
    for (const id of [20, 21]) {
      expect(calls.some(c => c.method === 'DELETE' && c.url.includes(`/upload/files/${id}`))).toBe(true)
    }
  })

  it('αρνείται διαγραφή καμπάνιας που στέλνει αυτή τη στιγμή', async () => {
    signedInAs('admin')
    mockWith({ documentId: 'c1', State: 'sending', Subject: 'Θ', Blocks: [] })
    const { status, json } = await del('c1')
    expect(status).toBe(409)
    expect(json.error).toContain('σε εξέλιξη')
  })
})
