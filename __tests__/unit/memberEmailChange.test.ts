/**
 * Αλλαγή email στον Sender: το API δεν αλλάζει διεύθυνση, άρα νέος
 * συνδρομητής → διαγραφή παλιού. Το τεστ κλειδώνει τη ΣΕΙΡΑ (ο παλιός
 * σβήνεται ΜΟΝΟ αφού στάθηκε ο νέος) και τα τέσσερα αποτελέσματα.
 */

process.env.SENDER_API_KEY = 'k'
process.env.SENDER_PAID_GROUP_ID = 'paid1'
process.env.STRAPI_URL = 'http://strapi.test'
process.env.STRAPI_API_TOKEN = 't'

const { changeSenderSubscriberEmail, changeNewsletterSubscriberEmail } = require('@/lib/memberEmailChange')

type Call = { url: string; method: string; body: any }
function respondBy(handler: (c: Call) => { status?: number; body?: any }) {
  const calls: Call[] = []
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const c = { url: String(input), method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null }
    calls.push(c)
    const r = handler(c)
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), { status: r.status ?? 200 })
  })
  return calls
}

describe('changeSenderSubscriberEmail', () => {
  afterEach(() => jest.restoreAllMocks())

  it('νέος συνδρομητής με όνομα + ομάδα, μετά διαγραφή παλιού', async () => {
    const calls = respondBy(c => {
      if (c.method === 'GET') return { body: { data: { email: 'old@b.gr', firstname: 'Μαρία', lastname: 'Π.' } } }
      return { body: { success: true } }
    })
    await expect(changeSenderSubscriberEmail('old@b.gr', 'new@b.gr')).resolves.toMatchObject({ state: 'done' })
    expect(calls.map(c => c.method)).toEqual(['GET', 'POST', 'DELETE'])
    expect(calls[1].body).toMatchObject({ email: 'new@b.gr', firstname: 'Μαρία', lastname: 'Π.', groups: ['paid1'] })
    expect(calls[2].body).toEqual({ subscribers: ['old@b.gr'] })
  })

  it('παλιός ανύπαρκτος στον Sender → παραλείπεται, τίποτα δεν γράφεται', async () => {
    const calls = respondBy(() => ({ status: 404, body: { message: 'not found' } }))
    await expect(changeSenderSubscriberEmail('old@b.gr', 'new@b.gr')).resolves.toMatchObject({ state: 'skipped' })
    expect(calls).toHaveLength(1)
  })

  it('νέος υπάρχει ήδη → μπαίνει στην ομάδα, ο παλιός σβήνεται', async () => {
    const calls = respondBy(c => {
      if (c.method === 'GET') return { body: { data: { email: 'old@b.gr' } } }
      if (c.method === 'POST' && /\/subscribers$/.test(c.url)) return { status: 422, body: { message: 'exists' } }
      return { body: { success: true } }
    })
    const r = await changeSenderSubscriberEmail('old@b.gr', 'new@b.gr')
    expect(r.state).toBe('done')
    expect(calls.map(c => c.method)).toEqual(['GET', 'POST', 'POST', 'DELETE'])
    expect(calls[2].url).toMatch(/\/subscribers\/groups\/paid1$/)
  })

  it('αποτυχία διαγραφής παλιού → ΑΠΕΤΥΧΕ με οδηγία, ο νέος μένει', async () => {
    respondBy(c => {
      if (c.method === 'DELETE') return { status: 500, body: { message: 'boom' } }
      if (c.method === 'GET') return { body: { data: { email: 'old@b.gr' } } }
      return { body: { success: true } }
    })
    const r = await changeSenderSubscriberEmail('old@b.gr', 'new@b.gr')
    expect(r.state).toBe('failed')
    expect(r.detail).toMatch(/σβήσε τον με το χέρι/)
  })

  it('αποτυχία δημιουργίας νέου → ΑΠΕΤΥΧΕ και ο παλιός ΔΕΝ σβήνεται', async () => {
    const calls = respondBy(c => {
      if (c.method === 'GET') return { body: { data: { email: 'old@b.gr' } } }
      return { status: 500, body: { message: 'boom' } }
    })
    const r = await changeSenderSubscriberEmail('old@b.gr', 'new@b.gr')
    expect(r.state).toBe('failed')
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })
})

describe('changeNewsletterSubscriberEmail (Strapi)', () => {
  afterEach(() => jest.restoreAllMocks())

  it('ενημερώνει την εγγραφή με το παλιό email', async () => {
    const calls = respondBy(c => {
      if (c.method === 'GET' && /old%40b\.gr/.test(c.url)) return { body: { data: [{ documentId: 'abc', Email: 'old@b.gr' }] } }
      if (c.method === 'GET') return { body: { data: [] } }
      return { body: { data: {} } }
    })
    await expect(changeNewsletterSubscriberEmail('old@b.gr', 'new@b.gr')).resolves.toMatchObject({ state: 'done' })
    const put = calls.find(c => c.method === 'PUT')!
    expect(put.url).toMatch(/newsletter-subscribers\/abc$/)
    expect(put.body).toEqual({ data: { Email: 'new@b.gr' } })
  })

  it('υπάρχουν και τα δύο → σβήνει το παλιό, κρατά το νέο', async () => {
    const calls = respondBy(c => {
      if (c.method === 'GET') return { body: { data: [{ documentId: /old%40/.test(c.url) ? 'old1' : 'new1' }] } }
      return { body: {} }
    })
    await expect(changeNewsletterSubscriberEmail('old@b.gr', 'new@b.gr')).resolves.toMatchObject({ state: 'done' })
    const del = calls.find(c => c.method === 'DELETE')!
    expect(del.url).toMatch(/newsletter-subscribers\/old1$/)
    expect(calls.some(c => c.method === 'PUT')).toBe(false)
  })

  it('καμία εγγραφή → παραλείπεται', async () => {
    respondBy(() => ({ body: { data: [] } }))
    await expect(changeNewsletterSubscriberEmail('old@b.gr', 'new@b.gr')).resolves.toMatchObject({ state: 'skipped' })
  })
})
