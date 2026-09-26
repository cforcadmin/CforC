import { buildRequest } from '../helpers/mockStrapi'

/**
 * Η στράγγιση της ουράς. Η αποστολή ΔΕΝ ανακαλείται, οπότε τα tests εδώ
 * ελέγχουν κυρίως ότι κανείς δεν λαμβάνει δύο φορές και ότι το όριο κρατά.
 */

jest.mock('next/headers', () => ({ cookies: jest.fn() }))
const sendOcEmailResult = jest.fn(async () => ({ ok: true }))
jest.mock('@/lib/ocEmails', () => ({
  get sendOcEmailResult() { return sendOcEmailResult },
}))

import { GET } from '@/app/api/cron/campaign-drain/route'

const recip = (n: number) => Array.from({ length: n }, (_, i) => ({
  email: `m${i}@x.gr`, name: `Μέλος ${i}`, via: 'all', am: i, status: 'pending', attempts: 0,
}))

function mockStrapi(campaigns: any[]) {
  const writes: any[] = []
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const method = (init?.method || 'GET').toUpperCase()
    if (method === 'PUT') {
      writes.push(JSON.parse(init.body).data)
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    }
    if (url.includes('/api/oc-campaigns?')) {
      return new Response(JSON.stringify({ data: campaigns }), { status: 200 })
    }
    return new Response(JSON.stringify({ data: {} }), { status: 200 })
  })
  return writes
}

const run = async () => {
  const res = await GET(buildRequest('/api/cron/campaign-drain', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  }))
  return { status: res.status, json: await res.json() }
}

const campaign = (over: any = {}) => ({
  documentId: 'c1', Subject: 'Θέμα', Blocks: [{ type: 'text', html: 'Γεια {{όνομα}}' }],
  Recipients: recip(3), State: 'queued', ...over,
})

describe('Φράγμα', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('χωρίς μυστικό → 401', async () => {
    const res = await GET(buildRequest('/api/cron/campaign-drain'))
    expect(res.status).toBe(401)
  })
})

describe('Στράγγιση', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('στέλνει σε όλους και κλείνει την καμπάνια', async () => {
    mockStrapi([campaign()])
    const { json } = await run()
    expect(json.sent).toBe(3)
    expect(sendOcEmailResult).toHaveBeenCalledTimes(3)
  })

  it('ΔΕΝ ξαναστέλνει σε όποιον έχει ήδη λάβει', async () => {
    const r = recip(3)
    r[0].status = 'sent'
    r[1].status = 'sent'
    mockStrapi([campaign({ Recipients: r })])
    const { json } = await run()
    expect(json.sent).toBe(1)
    expect(sendOcEmailResult).toHaveBeenCalledWith('m2@x.gr', expect.anything(), expect.anything(), expect.anything())
  })

  it('γράφει ΜΕΤΑ ΑΠΟ ΚΑΘΕ email — ένα timeout δεν ξαναστέλνει τα σταλμένα', async () => {
    const writes = mockStrapi([campaign()])
    await run()
    // 1 για State:sending, 3 για κάθε παραλήπτη, 1 για το κλείσιμο
    const perRecipient = writes.filter(w => Array.isArray(w.Recipients))
    expect(perRecipient).toHaveLength(3)
    expect(perRecipient[0].SentCount).toBe(1)
    expect(perRecipient[2].SentCount).toBe(3)
  })

  it('το ημερήσιο όριο κόβει τη ροή', async () => {
    mockStrapi([campaign({ Recipients: recip(200) })])
    const { json } = await run()
    expect(json.sent).toBe(80)
    expect(json.report.join(' ')).toContain('απομένουν 120')
  }, 60000)

  it('κάθε CC μετράει ξεχωριστά στο όριο', async () => {
    mockStrapi([campaign({ Recipients: recip(200), Cc: ['a@x.gr', 'b@x.gr', 'c@x.gr'] })])
    const { json } = await run()
    // 1 + 3 CC = 4 ανά παραλήπτη → 80 / 4 = 20
    expect(json.sent).toBe(20)
  }, 60000)

  it('τα merge fields λύνονται ανά παραλήπτη', async () => {
    mockStrapi([campaign({ Recipients: recip(1) })])
    await run()
    const html = sendOcEmailResult.mock.calls[0][2] as unknown as string
    expect(html).toContain('Γεια Μέλος')
    expect(html).not.toContain('{{όνομα}}')
  })

  it('η αποτυχία σημειώνεται και ξαναδοκιμάζεται αύριο', async () => {
    sendOcEmailResult.mockResolvedValueOnce({ ok: false, error: 'bounce' } as never)
    const writes = mockStrapi([campaign({ Recipients: recip(1) })])
    const { json } = await run()
    expect(json.sent).toBe(0)
    const last = writes.filter(w => Array.isArray(w.Recipients)).pop()
    expect(last.Recipients[0].status).toBe('failed')
    expect(last.Recipients[0].attempts).toBe(1)
    expect(last.FailedCount).toBe(1)
  })

  it('μετά από 3 αποτυχίες σταματά να ξαναδοκιμάζει', async () => {
    const r = recip(1)
    r[0].status = 'failed'; r[0].attempts = 3
    mockStrapi([campaign({ Recipients: r })])
    const { json } = await run()
    expect(json.sent).toBe(0)
    expect(sendOcEmailResult).not.toHaveBeenCalled()
  })

  it('υπογράφει με τον ΑΠΟΘΗΚΕΥΜΕΝΟ υπογράφοντα, όχι τον τρέχοντα', async () => {
    mockStrapi([campaign({
      Recipients: recip(1),
      Signer: { name: 'Σόνια Ντόβα', role: 'Γραμματεία', email: 'hello@cultureforchange.net' },
    })])
    await run()
    const opts = sendOcEmailResult.mock.calls[0][3] as any
    expect(opts.from).toContain('hello@cultureforchange.net')
    expect(sendOcEmailResult.mock.calls[0][2]).toContain('Σόνια Ντόβα')
  })
})
