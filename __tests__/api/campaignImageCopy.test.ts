import { buildRequest } from '../helpers/mockStrapi'

/**
 * Το αντίγραφο εικόνας — η βάση του διπλασιασμού μπλοκ.
 *
 * Κρίσιμο: κάθε αντίγραφο παίρνει ΔΙΚΟ ΤΟΥ αρχείο. Αν μοιράζονταν mediaId,
 * το «Αφαίρεση» στο ένα μπλοκ θα έσβηνε την εικόνα του άλλου — και στα
 * γραμματοκιβώτια όσων είχαν ήδη λάβει το γράμμα.
 */
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(() => undefined), set: jest.fn(), delete: jest.fn() })),
}))
const resolveOcAccess = jest.fn()
jest.mock('@/lib/ocRoles', () => ({ get resolveOcAccess() { return resolveOcAccess } }))
const verifyToken = jest.fn()
jest.mock('@/lib/auth', () => ({ get verifyToken() { return verifyToken } }))
jest.mock('sharp', () => jest.fn())

import { POST } from '@/app/api/oc/campaigns/image/route'
import { cookies } from 'next/headers'

function signedInAs(seat: string) {
  verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
  resolveOcAccess.mockResolvedValue({ isBoard: true, seats: [seat] })
  ;(cookies as jest.Mock).mockResolvedValue({
    get: (n: string) => (n === 'session' ? { value: 'tok' } : n === 'oc-last-seat' ? { value: seat } : undefined),
    set: jest.fn(), delete: jest.fn(),
  })
}

const MEDIA = 'https://faithful-crystal-a2269c9fd9.media.strapiapp.com/photo_abc.png'

const copy = async (src: string) => {
  const res = await POST(buildRequest('/api/oc/campaigns/image', {
    method: 'POST', body: { action: 'copy', src },
  }))
  return { status: res.status, json: await res.json() }
}

describe('Αντίγραφο εικόνας για διπλασιασμό μπλοκ', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('το αντίγραφο έχει ΝΕΟ mediaId, όχι το ίδιο', async () => {
    signedInAs('financer')
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url === MEDIA) {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/png' } })
      }
      if (url.includes('/api/upload') && init?.method === 'POST') {
        return new Response(JSON.stringify([{ id: 99, url: 'https://x/copy_1.png', name: 'copy_1.png' }]), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    })
    const r = await copy(MEDIA)
    expect(r.status).toBe(200)
    expect(r.json.id).toBe(99)
    expect(r.json.url).toBe('https://x/copy_1.png')
  })

  it('αντιγράφει ΜΟΝΟ από τη δική μας Βιβλιοθήκη', async () => {
    // Χωρίς αυτό, η διαδρομή θα κατέβαζε ό,τι διεύθυνση της δώσεις — και θα
    // ήταν εργαλείο για να χτυπηθεί εσωτερικό δίκτυο μέσω του server μας.
    signedInAs('it')
    const spy = jest.spyOn(global, 'fetch')
    for (const bad of [
      'https://evil.example.com/x.png',
      'http://169.254.169.254/latest/meta-data/',
      'https://media.strapiapp.com.evil.com/x.png',
    ]) {
      const r = await copy(bad)
      expect(r.status).toBe(400)
    }
    expect(spy).not.toHaveBeenCalled()
  })

  it('απορρίπτει ό,τι δεν είναι αποδεκτή εικόνα', async () => {
    signedInAs('it')
    jest.spyOn(global, 'fetch').mockImplementation(async () =>
      new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'text/html' } }))
    expect((await copy(MEDIA)).status).toBe(400)
  })

  it('έδρα χωρίς γραφείο αποστολής δεν αντιγράφει', async () => {
    verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
    resolveOcAccess.mockResolvedValue({ isBoard: false, seats: [] })
    ;(cookies as jest.Mock).mockResolvedValue({
      get: (n: string) => (n === 'session' ? { value: 'tok' } : undefined),
      set: jest.fn(), delete: jest.fn(),
    })
    expect((await copy(MEDIA)).status).toBe(403)
  })
})
