import { mockFetch, buildRequest } from '../helpers/mockStrapi'
import { generateMagicLinkToken, hashToken, hashPassword } from '@/lib/auth'

// Mock next/headers cookies()
const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore)),
}))

import { POST } from '@/app/api/auth/set-password/route'

// Each test gets a unique IP so the shared rate limiter doesn't interfere
let testIpCounter = 0
function uniqueIp() {
  return `10.99.0.${++testIpCounter}`
}

describe('POST /api/auth/set-password', () => {
  let fetchMock: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('returns 403 for bad CSRF origin', async () => {
    const req = buildRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token: 'x', password: 'Passw0rd!' },
      headers: { origin: 'https://evil.com' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing token or password', async () => {
    const req = buildRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token: '', password: '' },
      headers: { 'x-forwarded-for': uniqueIp() },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for weak password', async () => {
    const token = generateMagicLinkToken('m1', 'test@example.com')
    const req = buildRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token, password: 'weak' },
      headers: { 'x-forwarded-for': uniqueIp() },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 for invalid token', async () => {
    const req = buildRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token: 'bad-jwt', password: 'ValidPass1!' },
      headers: { 'x-forwarded-for': uniqueIp() },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token not found in database', async () => {
    const token = generateMagicLinkToken('m1', 'test@example.com')

    fetchMock = mockFetch({
      '/api/auth-tokens': { ok: true, data: { data: [] } },
    })

    const req = buildRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token, password: 'ValidPass1!' },
      headers: { 'x-forwarded-for': uniqueIp() },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for expired database token', async () => {
    const token = generateMagicLinkToken('m1', 'test@example.com')
    const tokenHash = hashToken(token)

    fetchMock = mockFetch({
      '/api/auth-tokens': {
        ok: true,
        data: {
          data: [{
            id: 1,
            documentId: 'at-1',
            email: 'test@example.com',
            tokenHash,
            tokenType: 'magic-link',
            tokenExpiry: new Date(Date.now() - 3600_000).toISOString(), // expired
          }],
        },
      },
    })

    const req = buildRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token, password: 'ValidPass1!' },
      headers: { 'x-forwarded-for': uniqueIp() },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 and sets session cookie on success', async () => {
    const token = generateMagicLinkToken('m1', 'test@example.com')
    const tokenHash = hashToken(token)

    fetchMock = mockFetch({
      '/api/auth-tokens': {
        ok: true,
        data: {
          data: [{
            id: 1,
            documentId: 'at-1',
            email: 'test@example.com',
            tokenHash,
            tokenType: 'magic-link',
            tokenExpiry: new Date(Date.now() + 3600_000).toISOString(),
          }],
        },
      },
      '/api/members': {
        ok: true,
        data: {
          data: [{
            id: 1,
            documentId: 'doc-1',
            Name: 'Test User',
            Email: 'test@example.com',
            Bio: [{ children: [{ text: 'Hello' }] }],
          }],
        },
      },
    })

    const req = buildRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token, password: 'ValidPass1!' },
      headers: { 'x-forwarded-for': uniqueIp() },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.member.Name).toBe('Test User')
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    )
  })
})
