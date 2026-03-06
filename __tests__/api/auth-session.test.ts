import { mockFetch, buildRequest } from '../helpers/mockStrapi'
import { generateSessionToken, generateMagicLinkToken } from '@/lib/auth'

// Mock next/headers cookies()
const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore)),
}))

import { GET } from '@/app/api/auth/session/route'

describe('GET /api/auth/session', () => {
  let fetchMock: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('returns 401 when no cookie', async () => {
    mockCookieStore.get.mockReturnValue(undefined)

    const req = buildRequest('/api/auth/session')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('No active session')
  })

  it('returns 401 for invalid token', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'invalid-token' })

    const req = buildRequest('/api/auth/session')
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mockCookieStore.delete).toHaveBeenCalledWith('session')
  })

  it('returns 401 for wrong token type (magic-link)', async () => {
    const magicToken = generateMagicLinkToken('m1', 'a@b.com')
    mockCookieStore.get.mockReturnValue({ value: magicToken })

    const req = buildRequest('/api/auth/session')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when member not found in Strapi', async () => {
    const token = generateSessionToken('nonexistent', 'a@b.com')
    mockCookieStore.get.mockReturnValue({ value: token })

    fetchMock = mockFetch({
      '/api/members': { ok: true, data: { data: [] } },
    })

    const req = buildRequest('/api/auth/session')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns 200 with member data for valid session', async () => {
    const token = generateSessionToken('doc-1', 'test@example.com')
    mockCookieStore.get.mockReturnValue({ value: token })

    fetchMock = mockFetch({
      '/api/members': {
        ok: true,
        data: {
          data: [{
            id: 1,
            documentId: 'doc-1',
            Name: 'Test User',
            Email: 'test@example.com',
          }],
        },
      },
    })

    const req = buildRequest('/api/auth/session')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.member.Name).toBe('Test User')
  })
})

// Test logout in the same file since it's simple
describe('POST /api/auth/logout', () => {
  // Re-import for logout
  let logoutPOST: any

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/logout/route')
    logoutPOST = mod.POST
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('deletes cookie and returns success', async () => {
    const req = buildRequest('/api/auth/logout', {
      method: 'POST',
    })
    const res = await logoutPOST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockCookieStore.delete).toHaveBeenCalledWith('session')
  })

  it('returns 403 for bad CSRF', async () => {
    const req = buildRequest('/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    })
    const res = await logoutPOST(req)
    expect(res.status).toBe(403)
  })
})
