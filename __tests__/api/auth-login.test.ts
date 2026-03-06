import { mockFetch, buildRequest } from '../helpers/mockStrapi'
import { hashPassword } from '@/lib/auth'

// Mock next/headers cookies()
const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore)),
}))

// Must import AFTER mocks are set up
import { POST } from '@/app/api/auth/login/route'

describe('POST /api/auth/login', () => {
  let fetchMock: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the rate limiter between tests by importing a fresh module
  })

  afterEach(() => {
    fetchMock?.mockRestore()
  })

  it('returns 403 for disallowed CSRF origin', async () => {
    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'Pass1234' },
      headers: { origin: 'https://evil.com' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing email or password', async () => {
    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email: '', password: '' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email', async () => {
    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'not-an-email', password: 'Pass1234' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 for member not found', async () => {
    fetchMock = mockFetch({
      '/api/members': { ok: true, data: { data: [] } },
    })

    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'unknown@example.com', password: 'Pass1234' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when no passwordHash exists', async () => {
    fetchMock = mockFetch({
      '/api/members': {
        ok: true,
        data: { data: [{ id: 1, documentId: 'doc-1', Email: 'test@example.com' }] },
      },
      '/api/auth-tokens': {
        ok: true,
        data: { data: [{ id: 1, passwordHash: null }] },
      },
    })

    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'Pass1234' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong password', async () => {
    const correctHash = await hashPassword('CorrectPass1')

    fetchMock = mockFetch({
      '/api/members': {
        ok: true,
        data: { data: [{ id: 1, documentId: 'doc-1', Email: 'test@example.com' }] },
      },
      '/api/auth-tokens': {
        ok: true,
        data: { data: [{ id: 1, documentId: 'tok-1', passwordHash: correctHash }] },
      },
    })

    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'WrongPass1' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with member data on success', async () => {
    const hash = await hashPassword('ValidPass1')

    fetchMock = mockFetch({
      '/api/members': {
        ok: true,
        data: {
          data: [{
            id: 1,
            documentId: 'doc-1',
            Name: 'Test Member',
            Email: 'test@example.com',
            Bio: [{ children: [{ text: 'Hello' }] }],
          }],
        },
      },
      '/api/auth-tokens': {
        ok: true,
        data: { data: [{ id: 1, documentId: 'tok-1', passwordHash: hash }] },
      },
    })

    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'ValidPass1' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.member.Name).toBe('Test Member')
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: '/' })
    )
  })

  it('returns 429 after rate limit exceeded', async () => {
    // Import a fresh rate limiter for this test
    const { loginLimiter } = require('@/lib/rateLimiter')

    // Burn through rate limit for this email
    const email = `ratelimit-${Date.now()}@test.com`
    for (let i = 0; i < 5; i++) {
      loginLimiter.check(email)
    }

    fetchMock = mockFetch({})

    const req = buildRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'Pass1234' },
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })
})
