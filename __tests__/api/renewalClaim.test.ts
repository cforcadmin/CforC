/**
 * Ανανέωση συνδρομής — το αποδεικτικό είναι ΥΠΟΧΡΕΩΤΙΚΟ.
 *
 * Το σκέτο κουμπί επέτρεπε δήλωση χωρίς πληρωμή: μέλη το πάτησαν ενώ η τράπεζα
 * είχε γυρίσει πίσω τα χρήματα. Τα tests εδώ φυλάνε ότι δεν γυρίζει πίσω.
 */

jest.mock('@/lib/ocEmails', () => ({
  sendOcEmail: jest.fn(async () => true),
  FINANCE_EMAIL: 'finance@cultureforchange.net',
}))

const verifyToken = jest.fn()
jest.mock('@/lib/auth', () => ({ get verifyToken() { return verifyToken } }))

import { POST } from '@/app/api/renewal-claim/route'

const MEMBER = { id: 7, documentId: 'm7', Name: 'Μαρία Π.', Email: 'm@x.gr', AM: 34, Payments: {}, RegistrationYear: 2024 }

function mockStrapi(over: any = {}) {
  const seen: any = {}
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const json = (d: any, status = 200) => new Response(JSON.stringify(d), { status })
    if (url.includes('/api/upload')) {
      seen.uploaded = true
      return json([{ id: 99, url: 'https://media/renewal.pdf' }])
    }
    if (url.includes('/api/members/') && init?.method === 'PUT') {
      seen.put = JSON.parse(init.body).data
      if (over.putStatus) return json({}, over.putStatus)
      return json({ data: {} })
    }
    if (url.includes('/api/members/')) return json({ data: { ...MEMBER, ...over.member } })
    return json({ data: {} })
  })
  return seen
}

const req = (body: BodyInit | null, type?: string) =>
  new Request('http://localhost/api/renewal-claim', {
    method: 'POST', body, ...(type ? { headers: { 'content-type': type } } : {}),
  }) as any

const form = (file?: File) => {
  const fd = new FormData()
  fd.append('token', 'tok')
  if (file) fd.append('receipt', file)
  return fd
}

const pdf = (bytes = 100) =>
  new File([new Uint8Array(bytes)], 'apodeixi.pdf', { type: 'application/pdf' })

beforeEach(() => {
  process.env.STRAPI_URL = 'http://strapi'
  process.env.STRAPI_API_TOKEN = 't'
  verifyToken.mockReturnValue({ type: 'renewal-claim', memberId: 'm7' })
})
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

describe('Δήλωση ανανέωσης', () => {
  it('ΧΩΡΙΣ αποδεικτικό απορρίπτεται — αυτό είναι όλο το νόημα', async () => {
    mockStrapi()
    const res = await POST(req(form()))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('receipt required')
  })

  it('παλιό JSON αίτημα (σκέτο κουμπί) απορρίπτεται κι αυτό', async () => {
    mockStrapi()
    const res = await POST(req(JSON.stringify({ token: 'tok' }), 'application/json'))
    expect(res.status).toBe(422)
  })

  it('με αποδεικτικό PDF καταχωρείται και συνδέεται', async () => {
    const seen = mockStrapi()
    const res = await POST(req(form(pdf())))
    expect(res.status).toBe(200)
    expect(seen.uploaded).toBe(true)
    expect(seen.put.RenewalReceipt).toBe(99)
    expect(seen.put.RenewalClaimedAt).toBeTruthy()
  })

  it('εικόνα γίνεται δεκτή — χάρτινο παραστατικό ταμείου', async () => {
    mockStrapi()
    const img = new File([new Uint8Array(10)], 'p.jpg', { type: 'image/jpeg' })
    expect((await POST(req(form(img)))).status).toBe(200)
  })

  it('άλλος τύπος αρχείου απορρίπτεται', async () => {
    mockStrapi()
    const doc = new File([new Uint8Array(10)], 'a.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const res = await POST(req(form(doc)))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('bad type')
  })

  it('αρχείο πάνω από 10MB απορρίπτεται', async () => {
    mockStrapi()
    const res = await POST(req(form(pdf(10 * 1024 * 1024 + 1))))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('too large')
  })

  it('άκυρο token δεν φτάνει ποτέ στο ανέβασμα', async () => {
    const seen = mockStrapi()
    verifyToken.mockReturnValue(null)
    expect((await POST(req(form(pdf())))).status).toBe(401)
    expect(seen.uploaded).toBeUndefined()
  })

  it('ξαναδήλωση κρατά την ΠΡΩΤΗ ημερομηνία αλλά δέχεται νέο αποδεικτικό', async () => {
    const seen = mockStrapi({ member: { RenewalClaimedAt: '2026-01-01T00:00:00.000Z' } })
    const res = await POST(req(form(pdf())))
    expect(res.status).toBe(200)
    expect(seen.put.RenewalClaimedAt).toBeUndefined()
    expect(seen.put.RenewalReceipt).toBe(99)
  })
})
