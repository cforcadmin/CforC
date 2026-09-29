/** Εγγραφή: το αποδεικτικό είναι πια ΥΠΟΧΡΕΩΤΙΚΟ, όπως και στην ανανέωση. */

jest.mock('@/lib/ocEmails', () => ({
  sendOcEmail: jest.fn(async () => true),
  paymentClaimNoticeHtml: jest.fn(() => ({ subject: 's', html: 'h' })),
  FINANCE_EMAIL: 'finance@cultureforchange.net',
}))
const verifyToken = jest.fn()
jest.mock('@/lib/auth', () => ({ get verifyToken() { return verifyToken } }))

import { POST } from '@/app/api/payment-claim/route'

function mockStrapi() {
  const seen: any = {}
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const json = (d: any) => new Response(JSON.stringify(d), { status: 200 })
    if (url.includes('/api/upload')) { seen.uploaded = true; return json([{ id: 5, url: 'https://m/r.pdf' }]) }
    if (url.includes('/api/membership-applications/') && init?.method === 'PUT') {
      seen.put = JSON.parse(init.body).data; return json({ data: {} })
    }
    if (url.includes('/api/membership-applications/')) {
      return json({ data: { documentId: 'a1', ApplicationState: 'approved', FirstName: 'Α', LastName: 'Β', Email: 'a@b.gr' } })
    }
    return json({ data: {} })
  })
  return seen
}

const post = (fd: FormData) =>
  POST(new Request('http://localhost/api/payment-claim', { method: 'POST', body: fd }) as any)

const form = (file?: File) => {
  const fd = new FormData()
  fd.append('token', 'tok')
  if (file) fd.append('receipt', file)
  return fd
}

beforeEach(() => {
  process.env.STRAPI_URL = 'http://strapi'
  process.env.STRAPI_API_TOKEN = 't'
  verifyToken.mockReturnValue({ type: 'payment-claim', applicationId: 'a1' })
})
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

it('ΧΩΡΙΣ αποδεικτικό απορρίπτεται', async () => {
  mockStrapi()
  const res = await post(form())
  expect(res.status).toBe(422)
  expect((await res.json()).error).toBe('receipt required')
})

it('παλιό JSON αίτημα απορρίπτεται κι αυτό', async () => {
  mockStrapi()
  const res = await POST(new Request('http://localhost/api/payment-claim', {
    method: 'POST', body: JSON.stringify({ token: 'tok' }), headers: { 'content-type': 'application/json' },
  }) as any)
  expect(res.status).toBe(422)
})

it('με PDF καταχωρείται και συνδέεται', async () => {
  const seen = mockStrapi()
  const res = await post(form(new File([new Uint8Array(9)], 'r.pdf', { type: 'application/pdf' })))
  expect(res.status).toBe(200)
  expect(seen.uploaded).toBe(true)
  expect(seen.put.PaymentReceipt).toBe(5)
})

it('εικόνα δεκτή, άλλος τύπος όχι', async () => {
  mockStrapi()
  const img = new File([new Uint8Array(9)], 'r.jpg', { type: 'image/jpeg' })
  expect((await post(form(img))).status).toBe(200)
  const bad = new File([new Uint8Array(9)], 'r.txt', { type: 'text/plain' })
  expect((await post(form(bad))).status).toBe(422)
})
