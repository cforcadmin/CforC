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
    community: 'Κοινότητα', coordinator: 'Συντονισμός', outreach: 'Outreach', media: 'Media',
  },
  SEAT_MAILBOX: {
    admin: 'hello@cultureforchange.net', it: 'it@cultureforchange.net',
    financer: 'finance@cultureforchange.net', comms: 'communication@cultureforchange.net',
    community: 'community@cultureforchange.net', coordinator: 'coordination@cultureforchange.net',
    outreach: 'outreach@cultureforchange.net', media: 'media@cultureforchange.net',
  },
}))
const sendOcEmailResult = jest.fn(async () => ({ ok: true }))
jest.mock('@/lib/ocEmails', () => ({
  get sendOcEmailResult() { return sendOcEmailResult },
  COMMUNITY_FROM: 'Culture for Change <community@cultureforchange.net>',
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

describe('Προσχέδια που μοιράζονται δύο έδρες', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  /** Πιάνει ό,τι στάλθηκε στο Strapi, και με ποια μέθοδο */
  function capture(existing?: any) {
    const seen: { method?: string; url?: string; data?: any } = {}
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      const json = (d: any) => new Response(JSON.stringify(d), { status: 200 })
      if (url.includes('/api/members?')) return json({ data: members })
      if (url.includes('/api/working-groups')) return json({ data: [] })
      // ΠΡΟΣΟΧΗ: το strapi() της διαδρομής στέλνει ΠΑΝΤΑ method, με 'GET' ως
      // προεπιλογή — ένα `!init?.method` δεν πιάνει ποτέ την ανάγνωση.
      if (url.includes('/api/oc-campaigns/') && (!init?.method || init.method === 'GET')) {
        return json({ data: existing })
      }
      if (url.includes('/api/oc-campaigns') && (init?.method === 'POST' || init?.method === 'PUT')) {
        seen.method = init.method; seen.url = url; seen.data = JSON.parse(init.body).data
        return json({ data: { documentId: 'kept1' } })
      }
      return json({ data: {} })
    })
    return seen
  }

  const body = (extra: any = {}) => ({
    action: 'save', desk: 'comms', subject: 'Δελτίο',
    blocks: [{ type: 'text', html: '<p>κ</p>' }], selection: { allMembers: true }, ...extra,
  })

  it('χωρίς id δημιουργεί ΝΕΟ προσχέδιο', async () => {
    signedInAs('comms')
    const seen = capture()
    await post(body())
    expect(seen.method).toBe('POST')
  })

  it('με id ΕΝΗΜΕΡΩΝΕΙ το ίδιο — δεν διπλασιάζει', async () => {
    // Χωρίς αυτό, τρεις αποθηκεύσεις άφηναν τρία προσχέδια στο γραφείο
    signedInAs('comms')
    const seen = capture({ Desk: 'comms', Signer: { email: 'communication@cultureforchange.net' } })
    await post(body({ id: 'kept1' }))
    expect(seen.method).toBe('PUT')
    expect(seen.url).toContain('kept1')
  })

  it('αποθηκεύεται η ΕΠΙΛΟΓΗ, όχι μόνο οι λυμένοι παραλήπτες', async () => {
    // Αλλιώς το άνοιγμα του προσχεδίου θα έδειχνε 113 ονόματα αντί «όλα τα μέλη»
    signedInAs('media')
    const seen = capture()
    await post(body())
    expect(seen.data.Selection).toEqual({ allMembers: true })
    expect(Array.isArray(seen.data.Recipients)).toBe(true)
  })

  it('το Media συνεχίζει προσχέδιο της Επικοινωνίας — ίδιο τραπέζι', async () => {
    signedInAs('media')
    const seen = capture({ Desk: 'comms', Signer: { email: 'communication@cultureforchange.net' } })
    const r = await post(body({ id: 'kept1' }))
    expect(r.status).toBe(200)
    expect(seen.method).toBe('PUT')
  })

  it('…αλλά ΟΧΙ προσχέδιο άλλου γραφείου', async () => {
    signedInAs('media')
    capture({ Desk: 'finances', Signer: { email: 'finance@cultureforchange.net' } })
    expect((await post(body({ id: 'other1' }))).status).toBe(403)
  })

  it('το Media υπογράφει media@ ακόμη κι όταν συνεχίζει ξένο προσχέδιο', async () => {
    signedInAs('media')
    const seen = capture({ Desk: 'comms', Signer: { email: 'communication@cultureforchange.net' } })
    await post(body({ id: 'kept1' }))
    expect(seen.data.Signer.email).toBe('media@cultureforchange.net')
  })
})

describe('Αποστολή newsletter μέσω Sender', () => {
  // Οι ομάδες του Sender έρχονται από το περιβάλλον· χωρίς αυτές καμία
  // λίστα δεν λύνεται και η αποστολή κόβεται πριν καν ξεκινήσει.
  beforeAll(() => {
    process.env.SENDER_API_KEY = 'test-key'
    process.env.SENDER_GROUP_ID = 'extG'
    process.env.SENDER_PAID_GROUP_ID = 'paidG'
  })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  /** Στήνει Strapi + Sender και καταγράφει τι στάλθηκε πού */
  function stub(opts: { createOk?: boolean; sendOk?: boolean } = {}) {
    const seen: any = { sender: [], strapi: [], archive: null }
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      const json = (d: any, status = 200) => new Response(JSON.stringify(d), { status })
      if (url.includes('/api/members?')) return json({ data: members })
      if (url.includes('/api/working-groups')) return json({ data: [] })
      if (url.includes('api.sender.net/v2/campaigns') && url.endsWith('/send')) {
        seen.sender.push({ op: 'send', url })
        return opts.sendOk === false ? json({ error: 'no' }, 500) : json({ success: true })
      }
      if (url.includes('api.sender.net/v2/campaigns') && url.endsWith('/schedule')) {
        seen.sender.push({ op: 'schedule', body: JSON.parse(init.body) })
        return json({ success: true })
      }
      if (url.includes('api.sender.net/v2/campaigns')) {
        seen.sender.push({ op: 'create', body: JSON.parse(init.body) })
        return opts.createOk === false ? json({ error: 'no' }, 422) : json({ data: { id: 'snd42' } })
      }
      if (url.includes('api.sender.net')) return json({ data: [] })
      if (url.includes('/api/newsletters')) { seen.archive = JSON.parse(init.body).data; return json({ data: { documentId: 'arch1' } }) }
      if (url.includes('/api/oc-campaigns') && (init?.method === 'POST' || init?.method === 'PUT')) {
        seen.strapi.push(JSON.parse(init.body).data); return json({ data: { documentId: 'c9' } })
      }
      return json({ data: {} })
    })
    return seen
  }
  const send = (extra: any = {}) => post({
    action: 'newsletter-send', desk: 'comms', subject: 'Τεύχος Οκτωβρίου',
    blocks: [{ type: 'text', html: '<p>Γεια σου {{όνομα}}</p>' }], audiences: ['external'], ...extra,
  })

  it('δημιουργεί καμπάνια και μετά τη στέλνει — δύο βήματα', async () => {
    signedInAs('comms'); const seen = stub()
    const r = await send()
    expect(r.status).toBe(200)
    expect(seen.sender.map((x: any) => x.op)).toEqual(['create', 'send'])
  })

  it('στέλνει HTML με ετικέτες Sender, ΟΧΙ λυμένες τιμές', async () => {
    // Ένα html για όλη τη λίστα: τα ονόματα τα βάζει ο Sender ανά παραλήπτη
    signedInAs('comms'); const seen = stub()
    await send()
    const body = seen.sender[0].body
    expect(body.content).toContain('{{ firstname }}')
    expect(body.content).toContain('{{unsubscribe_link}}')
    expect(body.content_type).toBe('html')
  })

  it('υπογράφει από τη θυρίδα της έδρας', async () => {
    signedInAs('media'); const seen = stub()
    await send()
    expect(seen.sender[0].body.reply_to).toBe('media@cultureforchange.net')
  })

  it('κρατά το id της καμπάνιας του Sender — αλλιώς χάνονται τα στατιστικά', async () => {
    signedInAs('comms'); const seen = stub()
    await send()
    expect(seen.strapi[0].SenderCampaignId).toBe('snd42')
    expect(seen.strapi[0].Kind).toBe('newsletter')
    expect(seen.strapi[0].State).toBe('sent')
  })

  it('γράφει το τεύχος στο δημόσιο αρχείο, με το ΙΔΙΟ το γράμμα', async () => {
    signedInAs('comms'); const seen = stub()
    await send()
    expect(seen.archive.Title).toBe('Τεύχος Οκτωβρίου')
    expect(String(seen.archive.Html)).toContain('<!DOCTYPE html>')
    expect(seen.archive.Audience).toBe('public')
  })

  it('τεύχος μόνο προς μέλη ΔΕΝ γίνεται δημόσιο', async () => {
    signedInAs('comms'); const seen = stub()
    await send({ audiences: ['paid'] })
    expect(seen.archive.Audience).toBe('members')
  })

  it('χωρίς λίστα δεν φεύγει τίποτα', async () => {
    signedInAs('comms'); const seen = stub()
    expect((await send({ audiences: [] })).status).toBe(400)
    expect(seen.sender).toHaveLength(0)
  })

  it('αποτυχία δημιουργίας δεν στέλνει τίποτα', async () => {
    signedInAs('comms'); const seen = stub({ createOk: false })
    expect((await send()).status).toBe(502)
    expect(seen.sender.map((x: any) => x.op)).toEqual(['create'])
  })

  it('αν η καμπάνια φτιάχτηκε αλλά δεν ξεκίνησε, το λέει ΜΕ το id', async () => {
    // Χωρίς αυτό, δεύτερο πάτημα «Αποστολή» θα έφτιαχνε δεύτερη καμπάνια
    signedInAs('comms'); stub({ sendOk: false })
    const r = await send()
    expect(r.status).toBe(502)
    expect(r.json.campaignId).toBe('snd42')
    expect(r.json.error).toContain('snd42')
  })

  it('προγραμματισμός αντί άμεσης αποστολής — και ΟΧΙ αρχείο ακόμη', async () => {
    signedInAs('comms'); const seen = stub()
    const r = await send({ scheduleAt: new Date(2026, 9, 15, 9, 0, 0).toISOString() })
    expect(seen.sender.map((x: any) => x.op)).toEqual(['create', 'schedule'])
    expect(seen.sender[1].body.schedule_time).toBe('2026-10-15 09:00:00')
    expect(seen.strapi[0].State).toBe('queued')
    expect(seen.archive).toBeNull()
    expect(r.json.scheduled).toBeTruthy()
  })

  it('προειδοποιεί για πεδία που ο Sender δεν ξέρει', async () => {
    signedInAs('comms'); stub()
    const r = await send({ blocks: [{ type: 'text', html: '<p>ΑΜ {{ΑΜ}}</p>' }] })
    expect(r.json.warnings).toContain('ΑΜ')
  })

  it('άλλο γραφείο δεν στέλνει newsletter', async () => {
    signedInAs('financer'); const seen = stub()
    expect((await send({ desk: 'finances' })).status).toBe(403)
    expect(seen.sender).toHaveLength(0)
  })

  it('η δοκιμαστική πάει στη θυρίδα του συντάκτη, με γεμάτες ετικέτες', async () => {
    signedInAs('comms'); stub()
    const r = await post({
      action: 'newsletter-test', subject: 'Δ',
      blocks: [{ type: 'text', html: '<p>Γεια σου {{όνομα}}</p>' }],
    })
    expect(r.status).toBe(200)
    expect(r.json.to).toBe('communication@cultureforchange.net')
    const [to, subj, html] = sendOcEmailResult.mock.calls[0] as any[]
    expect(to).toBe('communication@cultureforchange.net')
    expect(subj).toContain('[ΔΟΚΙΜΗ]')
    expect(html).not.toContain('{{')
    expect(html).toContain('Μαρία')
  })
})

describe('Στατιστικά ανά τεύχος', () => {
  beforeAll(() => { process.env.SENDER_API_KEY = 'test-key' })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  function stub(campaign: any, senderBody?: any) {
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      const json = (d: any, status = 200) => new Response(JSON.stringify(d), { status })
      if (url.includes('/api/members?')) return json({ data: members })
      if (url.includes('/api/working-groups')) return json({ data: [] })
      if (url.includes('api.sender.net/v2/campaigns/')) {
        return senderBody === null ? json({}, 404) : json({ data: senderBody })
      }
      if (url.includes('api.sender.net')) return json({ data: [] })
      if (url.includes('/api/oc-campaigns/')) return json({ data: campaign })
      return json({ data: {} })
    })
  }
  const open1 = async () => {
    const res = await GET(buildRequest('/api/oc/campaigns?id=c1&desk=comms'))
    return { status: res.status, json: await res.json() }
  }
  const NL = {
    documentId: 'c1', Subject: 'Τεύχος', Kind: 'newsletter', Desk: 'comms',
    SenderCampaignId: 'snd7', Signer: { email: 'communication@cultureforchange.net' },
  }

  it('φέρνει τα στατιστικά από τον Sender και υπολογίζει ποσοστά', async () => {
    signedInAs('comms')
    stub(NL, { status: 'SENT', sent_time: '2026-09-27 09:06:03', recipient_count: 400, sent_count: 380, opens: 95, clicks: 19, bounces_count: 20 })
    const r = await open1()
    expect(r.json.senderStats.opens).toBe(95)
    // Ποσοστά επί των ΑΠΕΣΤΑΛΜΕΝΩΝ (380), όχι των παραληπτών (400)
    expect(r.json.senderStats.openRate).toBe(25)
    expect(r.json.senderStats.clickRate).toBe(5)
    expect(r.json.senderStats.bounces).toBe(20)
  })

  it('μήνυμα χωρίς καμπάνια Sender δεν ζητά τίποτα', async () => {
    signedInAs('comms')
    stub({ ...NL, Kind: 'message', SenderCampaignId: null })
    const r = await open1()
    expect(r.json.senderStats).toBeNull()
  })

  it('αν ο Sender δεν απαντήσει, η γραμμή ανοίγει κανονικά χωρίς στατιστικά', async () => {
    // Τα στατιστικά είναι στολίδι· το ΓΡΑΜΜΑ είναι το περιεχόμενο
    signedInAs('comms')
    stub(NL, null)
    const r = await open1()
    expect(r.status).toBe(200)
    expect(r.json.campaign.Subject).toBe('Τεύχος')
    expect(r.json.senderStats).toBeNull()
  })

  it('μηδέν απεσταλμένα δεν δίνει διαίρεση με το μηδέν', async () => {
    signedInAs('comms')
    stub(NL, { status: 'DRAFT', recipient_count: 0, sent_count: 0, opens: 0, clicks: 0 })
    const r = await open1()
    expect(r.json.senderStats.openRate).toBeNull()
    expect(r.json.senderStats.clickRate).toBeNull()
  })
})

describe('Τελική δοκιμή μέσω Sender', () => {
  beforeAll(() => {
    process.env.SENDER_API_KEY = 'test-key'
    process.env.SENDER_GROUP_ID = 'extG'
    process.env.SENDER_PAID_GROUP_ID = 'paidG'
  })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  function stub(seatStatus = 'active') {
    const seen: any = { created: null, sent: false }
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      const json = (d: any) => new Response(JSON.stringify(d), { status: 200 })
      if (url.includes('/api/members?')) return json({ data: members })
      if (url.includes('/api/working-groups')) return json({ data: [] })
      if (url.includes('/v2/subscribers/')) return json({ data: { status: { email: seatStatus } } })
      if (url.endsWith('/send')) { seen.sent = true; return json({ success: true }) }
      if (url.includes('/v2/campaigns')) { seen.created = JSON.parse(init.body); return json({ data: { id: 'tst9' } }) }
      if (url.includes('api.sender.net')) return json({ data: [] })
      return json({ data: {} })
    })
    return seen
  }
  const test1 = () => post({
    action: 'newsletter-final-test', desk: 'comms', subject: 'Τεύχος',
    blocks: [{ type: 'text', html: '<p>Γεια σου {{όνομα}}</p>' }],
  })

  it('στοχεύει την ομάδα ΜΙΑΣ θυρίδας, όχι λίστα newsletter', async () => {
    signedInAs('comms'); const seen = stub()
    const r = await test1()
    expect(r.status).toBe(200)
    expect(seen.created.groups).toEqual(['aQqRZl'])
    expect(seen.sent).toBe(true)
  })

  it('κάθε έδρα στη δική της ομάδα', async () => {
    signedInAs('media'); const seen = stub()
    await test1()
    expect(seen.created.groups).toEqual(['dPp8Xw'])
  })

  it('ο τίτλος φέρει [ΔΟΚΙΜΗ] ώστε να φιλτράρεται από τα στατιστικά', async () => {
    // Αλλιώς κάθε δοκιμή είναι καμπάνια ενός παραλήπτη με 100% άνοιγμα
    signedInAs('comms'); const seen = stub()
    await test1()
    expect(seen.created.title).toContain('[ΔΟΚΙΜΗ]')
    expect(seen.created.subject).toContain('[ΔΟΚΙΜΗ]')
  })

  it('στέλνει ΑΛΗΘΙΝΕΣ ετικέτες — εκεί είναι όλο το νόημα της τελικής δοκιμής', async () => {
    signedInAs('comms'); const seen = stub()
    await test1()
    expect(seen.created.content).toContain('{{unsubscribe_link}}')
    expect(seen.created.content).toContain('{{ firstname }}')
  })

  it('προειδοποιεί αν η θυρίδα βρεθεί απεγγεγραμμένη', async () => {
    // Μη αναστρέψιμο από API: πρέπει να το μάθει αμέσως, όχι σε έναν μήνα
    signedInAs('comms'); stub('unsubscribed')
    const r = await test1()
    expect(r.json.seatStatus).toBe('unsubscribed')
  })

  it('έδρα χωρίς ομάδα δοκιμών δεν στέλνει τελική δοκιμή', async () => {
    signedInAs('admin'); const seen = stub()
    expect((await test1()).status).toBe(400)
    expect(seen.created).toBeNull()
  })
})

describe('Κρυφά στοιχεία και αποστολή', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('γράμμα με ΜΟΝΟ κρυφά στοιχεία δεν φεύγει', async () => {
    // Τα κρυφά δεν αποδίδονται· χωρίς αυτόν τον έλεγχο θα έφευγε κενό γράμμα
    signedInAs('admin'); mockStrapi()
    const r = await post({
      action: 'queue', desk: 'admin', subject: 'Θ',
      blocks: [{ type: 'text', html: '<p>κ</p>', hidden: true }],
      selection: { allMembers: true },
    })
    expect(r.status).toBe(400)
    expect(r.json.error).toContain('κενό')
  })

  it('αρκεί ΕΝΑ ορατό στοιχείο', async () => {
    signedInAs('admin'); mockStrapi()
    const r = await post({
      action: 'queue', desk: 'admin', subject: 'Θ',
      blocks: [{ type: 'text', html: '<p>κ</p>', hidden: true }, { type: 'text', html: '<p>ν</p>' }],
      selection: { allMembers: true },
    })
    expect(r.status).toBe(200)
  })
})

describe('Μήνυμα ή newsletter', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  function capture() {
    const seen: { data?: any } = {}
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      const json = (d: any) => new Response(JSON.stringify(d), { status: 200 })
      if (url.includes('/api/members?')) return json({ data: members })
      if (url.includes('/api/working-groups')) return json({ data: [] })
      if (url.includes('api.sender.net')) return json({ data: [] })
      if (url.includes('/api/oc-campaigns') && (init?.method === 'POST' || init?.method === 'PUT')) {
        seen.data = JSON.parse(init.body).data
        return json({ data: { documentId: 'n1' } })
      }
      return json({ data: {} })
    })
    return seen
  }
  const save = (extra: any = {}) => post({
    action: 'save', desk: 'comms', subject: 'Τεύχος',
    blocks: [{ type: 'text', html: '<p>κ</p>' }], selection: {}, ...extra,
  })

  it('το είδος και οι λίστες αποθηκεύονται', async () => {
    signedInAs('comms'); const seen = capture()
    await save({ kind: 'newsletter', audiences: ['paid', 'external'] })
    expect(seen.data.Kind).toBe('newsletter')
    expect(seen.data.Groups).toEqual(['paid', 'external'])
  })

  it('άκυρη λίστα δεν περνά — ούτε οι επαφές τύπου', async () => {
    signedInAs('media'); const seen = capture()
    await save({ kind: 'newsletter', audiences: ['media', 'paid', 'ολα'] })
    expect(seen.data.Groups).toEqual(['paid'])
  })

  it('newsletter ΜΟΝΟ από την Επικοινωνία — αλλού γίνεται μήνυμα', async () => {
    // Οι λίστες και τα στατιστικά ζουν στην Επικοινωνία· τα Οικονομικά δεν
    // έχουν newsletter, όσο κι αν το ζητήσει το αίτημα.
    signedInAs('financer'); const seen = capture()
    await save({ desk: 'finances', kind: 'newsletter', audiences: ['paid'] })
    expect(seen.data.Kind).toBe('message')
  })

  it('χωρίς είδος, είναι μήνυμα', async () => {
    signedInAs('comms'); const seen = capture()
    await save()
    expect(seen.data.Kind).toBe('message')
    expect(seen.data.Groups).toEqual([])
  })

  it('η προεπισκόπηση newsletter δείχνει τη γραμμή απεγγραφής', async () => {
    signedInAs('comms'); capture()
    const r = await post({ action: 'preview', kind: 'newsletter', subject: 'Τ', blocks: [{ type: 'text', html: '<p>κ</p>' }] })
    expect(r.json.html).toContain('{{unsubscribe_link}}')
  })

  it('η προεπισκόπηση μηνύματος ΔΕΝ τη δείχνει', async () => {
    signedInAs('comms'); capture()
    const r = await post({ action: 'preview', subject: 'Τ', blocks: [{ type: 'text', html: '<p>κ</p>' }] })
    expect(r.json.html).not.toContain('unsubscribe')
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
