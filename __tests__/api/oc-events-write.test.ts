import { buildRequest } from '../helpers/mockStrapi'

/**
 * ΠΟΙΟΣ ΓΡΑΦΕΙ ΔΡΑΣΕΙΣ. Η δράση είναι δημόσια σελίδα με φόρμα που μαζεύει
 * προσωπικά δεδομένα — το φράγμα είναι το σημαντικό εδώ, όχι τα πεδία.
 */

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(() => undefined) })),
}))
const resolveOcAccess = jest.fn()
jest.mock('@/lib/ocRoles', () => ({
  get resolveOcAccess() { return resolveOcAccess },
}))
const verifyToken = jest.fn()
jest.mock('@/lib/auth', () => ({ get verifyToken() { return verifyToken } }))

import { POST, PUT } from '@/app/api/oc/events/route'
import { cookies } from 'next/headers'

function signedInAs(seat: string | null, opts: { seatMode?: string; seats?: string[] } = {}) {
  verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
  resolveOcAccess.mockResolvedValue({ isBoard: true, seats: opts.seats ?? (seat ? [seat] : []) })
  ;(cookies as jest.Mock).mockResolvedValue({
    get: (n: string) =>
      n === 'session' ? { value: 'tok' }
        : n === 'oc-last-seat' && seat ? { value: seat }
          : n === 'oc-seat-mode' && opts.seatMode ? { value: opts.seatMode } : undefined,
  })
}

const DRAFT = {
  Title: 'Δοκιμαστική δράση',
  StartDate: '2026-11-20',
  EndDate: '2026-11-22',
  Audience: 'member',
}

const post = async (body: any = DRAFT) => {
  const res = await POST(buildRequest('/api/oc/events', { method: 'POST', body }))
  return { status: res.status, json: await res.json() }
}

/** Strapi που δεν βρίσκει τίποτα: κανένα slug πιασμένο, καμία δήλωση */
function emptyStrapi(onCreate?: (body: any) => void) {
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    if (init?.method === 'POST' && url.includes('/api/events')) {
      onCreate?.(JSON.parse(init.body).data)
      return new Response(JSON.stringify({ data: { documentId: 'new1' } }), { status: 200 })
    }
    return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 0 } } }), { status: 200 })
  })
}

describe('Φράγμα έδρας', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('η Γραμματεία δημιουργεί', async () => {
    signedInAs('admin'); emptyStrapi()
    expect((await post()).status).toBe(200)
  })

  it('το IT δημιουργεί', async () => {
    signedInAs('it'); emptyStrapi()
    expect((await post()).status).toBe(200)
  })

  it.each(['financer', 'community', 'comms', 'coordinator', 'outreach', 'media'])(
    'ο/η %s ΔΕΝ δημιουργεί', async seat => {
      signedInAs(seat); emptyStrapi()
      const r = await post()
      expect(r.status).toBe(403)
      expect(r.json.error).toMatch(/Γραμματεία και το IT/)
    })

  it('χωρίς συνεδρία στο ΔΣ: 403', async () => {
    verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
    resolveOcAccess.mockResolvedValue({ isBoard: false, seats: [] })
    ;(cookies as jest.Mock).mockResolvedValue({ get: (n: string) => n === 'session' ? { value: 'tok' } : undefined })
    emptyStrapi()
    expect((await post()).status).toBe(403)
  })

  it('χωρίς σύνδεση: 401', async () => {
    verifyToken.mockReturnValue(null)
    ;(cookies as jest.Mock).mockResolvedValue({ get: () => undefined })
    emptyStrapi()
    expect((await post()).status).toBe(401)
  })

  /* Το «ενεργώ ως» ισχύει και εδώ: η δημιουργία δράσης είναι ΕΡΓΑΣΙΑ της
     έδρας, όχι προσωπική κρίση όπως η ψήφος. */
  it('IT που ενεργεί ως Γραμματεία: περνά', async () => {
    signedInAs('it', { seatMode: 'admin:act' }); emptyStrapi()
    expect((await post()).status).toBe(200)
  })
  it('IT σε ΠΡΟΕΠΙΣΚΟΠΗΣΗ ως Ταμίας: κρίνεται ως IT, περνά', async () => {
    signedInAs('it', { seatMode: 'financer:view' }); emptyStrapi()
    expect((await post()).status).toBe(200)
  })
  it('Ταμίας με πλαστό cookie «admin:act»: ΔΕΝ περνά', async () => {
    signedInAs('financer', { seatMode: 'admin:act' }); emptyStrapi()
    expect((await post()).status).toBe(403)
  })
})

describe('Διεύθυνση (slug)', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('βγαίνει από τον τίτλο όταν λείπει', async () => {
    signedInAs('admin')
    let sent: any = null
    emptyStrapi(b => { sent = b })
    await post()
    expect(sent.Slug).toBe('dokimastiki-drasi')
  })

  it('πιασμένο slug: 409, χωρίς να γραφτεί τίποτα', async () => {
    signedInAs('admin')
    let created = false
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('filters[Slug]')) {
        return new Response(JSON.stringify({ data: [{ documentId: 'other', Slug: 'dokimastiki-drasi' }] }), { status: 200 })
      }
      if (init?.method === 'POST') { created = true }
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    })
    const r = await post()
    expect(r.status).toBe(409)
    expect(created).toBe(false)
  })

  /* Η διεύθυνση έχει ήδη σταλεί σε γράμματα — δεν μετακινείται από κάτω */
  it('αλλαγή slug σε δράση ΜΕ δηλώσεις: 409 και επιστροφή του παλιού', async () => {
    signedInAs('admin')
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/events/ev1')) {
        return new Response(JSON.stringify({ data: { Slug: 'midterm-2026', Title: 'Παλιά' } }), { status: 200 })
      }
      if (url.includes('/api/event-registrations')) {
        return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 42 } } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 0 } } }), { status: 200 })
    })
    const res = await PUT(buildRequest('/api/oc/events', {
      method: 'PUT', body: { ...DRAFT, documentId: 'ev1', Slug: 'allo-slug' },
    }))
    const j = await res.json()
    expect(res.status).toBe(409)
    expect(j.lockedSlug).toBe('midterm-2026')
    expect(j.error).toMatch(/42 δηλώσεις/)
  })

  it('ΙΔΙΟ slug σε δράση με δηλώσεις: περνά κανονικά', async () => {
    signedInAs('admin')
    let put = false
    jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/events/ev1') && init?.method === 'PUT') {
        put = true
        return new Response(JSON.stringify({ data: { documentId: 'ev1' } }), { status: 200 })
      }
      if (url.includes('/api/events/ev1')) {
        return new Response(JSON.stringify({ data: { Slug: 'midterm-2026' } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 42 } } }), { status: 200 })
    })
    const res = await PUT(buildRequest('/api/oc/events', {
      method: 'PUT', body: { ...DRAFT, documentId: 'ev1', Slug: 'midterm-2026' },
    }))
    expect(res.status).toBe(200)
    expect(put).toBe(true)
  })
})

describe('Έλεγχος πεδίων', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('λάθος ημερομηνίες: 400 με ΟΛΑ τα λάθη', async () => {
    signedInAs('admin'); emptyStrapi()
    const r = await post({ ...DRAFT, EndDate: '2026-11-19' })
    expect(r.status).toBe(400)
    expect(r.json.errors).toContain('Η λήξη είναι πριν την έναρξη')
  })

  it('άδειο σώμα: 400, όχι 500', async () => {
    signedInAs('admin'); emptyStrapi()
    expect((await post({})).status).toBe(400)
  })
})
