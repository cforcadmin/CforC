import { buildRequest } from '../helpers/mockStrapi'

/**
 * Η ΑΠΟΘΗΚΕΥΣΗ ΟΤΑΝ ΤΟ ΔΙΚΤΥΟ ΦΤΑΙΕΙ.
 *
 * 20/10/2026: η δημοσίευση ενός άρθρου έσκασε με `read ECONNRESET` — η
 * σύνδεση προς το Strapi πέθανε πριν φτάσει το αίτημα (μετρημένο: καμία
 * εγγραφή δεν δημιουργήθηκε, και δώδεκα αμέσως επόμενες εγγραφές πέρασαν).
 * Η οθόνη είπε «Εσωτερικό σφάλμα».
 *
 * Ο κίνδυνος της προφανούς διόρθωσης είναι ΔΥΟ άρθρα: μια αποτυχία στο
 * διάβασμα δεν λέει αν το Strapi πρόλαβε να γράψει. Γι' αυτό πριν από κάθε
 * επανάληψη ρωτάμε αν η εγγραφή υπάρχει ήδη.
 */

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(() => undefined), set: jest.fn(), delete: jest.fn() })),
}))
const resolveOcAccess = jest.fn()
jest.mock('@/lib/ocRoles', () => ({
  get resolveOcAccess() { return resolveOcAccess },
  SEAT_LABELS: {}, SEAT_MAILBOX: {},
}))
const verifyToken = jest.fn()
jest.mock('@/lib/auth', () => ({ get verifyToken() { return verifyToken } }))

import { POST } from '@/app/api/oc/content/route'
import { cookies } from 'next/headers'

function signedIn() {
  verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
  resolveOcAccess.mockResolvedValue({ isBoard: true, seats: ['comms'] })
  ;(cookies as jest.Mock).mockResolvedValue({
    get: (n: string) => (n === 'session' ? { value: 'tok' } : n === 'oc-last-seat' ? { value: 'comms' } : undefined),
    set: jest.fn(), delete: jest.fn(),
  })
}

/** Ακριβώς η μορφή που πετάει το undici όταν σπάει η πρίζα */
const connectionReset = () => {
  const e: any = new TypeError('fetch failed')
  e.cause = { code: 'ECONNRESET', syscall: 'read', errno: -54 }
  return e
}

const jsonOf = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const saveBody = {
  action: 'save', type: 'news',
  fields: {
    Title: 'Το άρθρο', Date: '2026-11-14', Excerpt: 'Η περίληψη',
    ImageAltText: 'Μια εικόνα', Visuals: { mediaId: 7, src: '/uploads/a.jpg' },
    Slug: 'to-arthro',
  },
  blocks: [{ type: 'text', html: '<p>Σώμα.</p>' }],
}

const callSave = () => POST(buildRequest('http://localhost/api/oc/content', {
  method: 'POST', body: saveBody,
}) as any)

/** Οι κλήσεις που έφυγαν, χωρισμένες σε «γράψε» και «ρώτα» */
const splitCalls = (fetchMock: jest.SpyInstance) => {
  const calls = fetchMock.mock.calls.map(([url, init]: any) => ({
    url: String(url), method: (init?.method || 'GET').toUpperCase(),
  }))
  return {
    creates: calls.filter(c => c.method === 'POST'),
    lookups: calls.filter(c => c.method === 'GET'),
  }
}

describe('δημοσίευση όταν πέφτει η σύνδεση με το Strapi', () => {
  beforeEach(() => { jest.restoreAllMocks(); signedIn() })

  it('ΔΕΝ γράφει δεύτερο άρθρο όταν το πρώτο είχε περάσει', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (_u: any, init?: any) => {
      if ((init?.method || 'GET').toUpperCase() === 'POST') throw connectionReset()
      /* ο μάρτυρας: το άρθρο ΥΠΑΡΧΕΙ ήδη */
      return jsonOf({ data: [{ Slug: 'to-arthro' }] })
    })

    const res = await callSave()
    const { creates } = splitCalls(fetchMock)

    expect(res.status).toBe(200)
    expect(creates).toHaveLength(1)   // καμία επανάληψη
  })

  it('ξαναστέλνει ΜΙΑ φορά όταν το άρθρο δεν έφτασε ποτέ', async () => {
    let attempt = 0
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (_u: any, init?: any) => {
      if ((init?.method || 'GET').toUpperCase() !== 'POST') return jsonOf({ data: [] })
      attempt++
      if (attempt === 1) throw connectionReset()
      return jsonOf({ data: { documentId: 'new-1' } })
    })

    const res = await callSave()
    const { creates } = splitCalls(fetchMock)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, id: 'new-1' })
    expect(creates).toHaveLength(2)
  })

  it('άγνωστη κατάσταση δεν μαντεύεται: αν δεν απαντά ούτε η ερώτηση, καμία επανάληψη', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () => { throw connectionReset() })

    const res = await callSave()
    const { creates } = splitCalls(fetchMock)

    expect(res.status).toBe(503)
    expect(creates).toHaveLength(1)
    expect((await res.json()).error).toContain('δεν απάντησε')
  })

  /** «Εσωτερικό σφάλμα» έστελνε τον συντάκτη να ψάξει το κείμενό του. */
  it('λέει ότι φταίει το δίκτυο, και ότι δεν χάθηκε τίποτα', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => { throw connectionReset() })
    const text = (await (await callSave()).json()).error
    expect(text).toContain('τίποτα δεν αποθηκεύτηκε')
    expect(text).not.toContain('Εσωτερικό σφάλμα')
  })

  it('το σφάλμα του Strapi φτάνει στον συντάκτη, όχι σκέτο «HTTP 400»', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (_u: any, init?: any) =>
      (init?.method || 'GET').toUpperCase() === 'POST'
        ? jsonOf({ error: { message: 'ValidationError', details: { errors: [{ path: ['Description'], message: 'Description must be defined' }] } } }, 400)
        : jsonOf({ data: [] }))

    const res = await callSave()
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Description must be defined')
  })
})
