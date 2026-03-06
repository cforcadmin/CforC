import { mockFetch, buildRequest } from '../helpers/mockStrapi'
import { generateSessionToken, generateMagicLinkToken } from '@/lib/auth'

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

import { POST } from '@/app/api/members/update/route'

describe('POST /api/members/update', () => {
  let fetchMock: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('returns 401 for no session cookie', async () => {
    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Name: 'Test' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for invalid session token', async () => {
    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Name: 'Test' },
      cookies: { session: 'bad-token' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong token type', async () => {
    const magicToken = generateMagicLinkToken('m1', 'a@b.com')
    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Name: 'Test' },
      cookies: { session: magicToken },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CSRF violation', async () => {
    const token = generateSessionToken('m1', 'a@b.com')
    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Name: 'Test' },
      headers: { origin: 'https://evil.com' },
      cookies: { session: token },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for empty name', async () => {
    const token = generateSessionToken('m1', 'a@b.com')

    fetchMock = mockFetch({})

    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Name: '  ' },
      cookies: { session: token },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty email', async () => {
    const token = generateSessionToken('m1', 'a@b.com')

    fetchMock = mockFetch({})

    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Email: '' },
      cookies: { session: token },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email format', async () => {
    const token = generateSessionToken('m1', 'a@b.com')

    fetchMock = mockFetch({})

    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Email: 'not-an-email' },
      cookies: { session: token },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 for duplicate email', async () => {
    const token = generateSessionToken('m1', 'a@b.com')

    fetchMock = mockFetch({
      '/api/members?filters[Email]': {
        ok: true,
        data: { data: [{ id: 99 }] },
      },
    })

    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Email: 'taken@example.com' },
      cookies: { session: token },
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 200 for valid update', async () => {
    const token = generateSessionToken('doc-1', 'test@example.com')

    const memberData = {
      id: 1, documentId: 'doc-1', Name: 'Old Name',
      Email: 'test@example.com', City: 'Athens',
    }

    // The route makes multiple fetch calls in order:
    // 1. Email uniqueness check: /api/members?filters[Email]...
    // 2. Find member by documentId: /api/members?filters[documentId]...
    // 3. Populated member: /api/members/doc-1?populate=*
    // 4. Update: PUT /api/members/doc-1
    // 5. Profile change logs: /api/profile-change-logs
    // We use a custom mock to handle the order
    let callIndex = 0
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url || ''
      callIndex++

      if (url.includes('filters[Email]')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('filters[documentId]')) {
        return new Response(JSON.stringify({ data: [memberData] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('/api/members/doc-1')) {
        return new Response(JSON.stringify({ data: memberData }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('profile-change-logs')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      // Default success for any other calls (PUT update, etc.)
      return new Response(JSON.stringify({ data: memberData }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    const req = buildRequest('/api/members/update', {
      method: 'POST',
      body: { Name: 'New Name', Email: 'new@example.com', City: 'Thessaloniki' },
      cookies: { session: token },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
