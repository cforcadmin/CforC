import { mockFetch, buildRequest } from '../helpers/mockStrapi'
import { generateMagicLinkToken, hashToken } from '@/lib/auth'

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'mock-email-id' }),
    },
  })),
}))

import { POST as requestMagicLink } from '@/app/api/auth/request-magic-link/route'
import { POST as verifyMagicLink } from '@/app/api/auth/verify-magic-link/route'

describe('POST /api/auth/request-magic-link', () => {
  let fetchMock: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('returns 400 for invalid email', async () => {
    const req = buildRequest('/api/auth/request-magic-link', {
      method: 'POST',
      body: { email: 'not-valid' },
    })
    const res = await requestMagicLink(req)
    expect(res.status).toBe(400)
  })

  it('returns success even when email not found (no enumeration)', async () => {
    fetchMock = mockFetch({
      '/api/members': { ok: true, data: { data: [] } },
    })

    const req = buildRequest('/api/auth/request-magic-link', {
      method: 'POST',
      body: { email: 'nonexistent@example.com' },
    })
    const res = await requestMagicLink(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns success when member exists (sends email)', async () => {
    fetchMock = mockFetch({
      '/api/members': {
        ok: true,
        data: { data: [{ id: 1, documentId: 'doc-1', Email: 'test@example.com' }] },
      },
      '/api/auth-tokens': {
        ok: true,
        data: { data: [] },
      },
    })

    const req = buildRequest('/api/auth/request-magic-link', {
      method: 'POST',
      body: { email: 'test@example.com' },
    })
    const res = await requestMagicLink(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe('POST /api/auth/verify-magic-link', () => {
  let fetchMock: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('returns 400 for missing token', async () => {
    const req = buildRequest('/api/auth/verify-magic-link', {
      method: 'POST',
      body: {},
    })
    const res = await verifyMagicLink(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 for invalid/expired token', async () => {
    const req = buildRequest('/api/auth/verify-magic-link', {
      method: 'POST',
      body: { token: 'invalid-jwt' },
    })
    const res = await verifyMagicLink(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token not found in database', async () => {
    const token = generateMagicLinkToken('m1', 'test@example.com')

    fetchMock = mockFetch({
      '/api/auth-tokens': { ok: true, data: { data: [] } },
    })

    const req = buildRequest('/api/auth/verify-magic-link', {
      method: 'POST',
      body: { token },
    })
    const res = await verifyMagicLink(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with email+memberId for valid token', async () => {
    const token = generateMagicLinkToken('m1', 'test@example.com')
    const tokenHash = hashToken(token)

    fetchMock = mockFetch({
      '/api/auth-tokens': {
        ok: true,
        data: {
          data: [{
            id: 1,
            email: 'test@example.com',
            tokenHash,
            tokenType: 'magic-link',
            tokenExpiry: new Date(Date.now() + 3600_000).toISOString(),
          }],
        },
      },
    })

    const req = buildRequest('/api/auth/verify-magic-link', {
      method: 'POST',
      body: { token },
    })
    const res = await verifyMagicLink(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.email).toBe('test@example.com')
    expect(json.memberId).toBe('m1')
  })

  it('returns 401 for expired token in database', async () => {
    const token = generateMagicLinkToken('m1', 'test@example.com')
    const tokenHash = hashToken(token)

    fetchMock = mockFetch({
      '/api/auth-tokens': {
        ok: true,
        data: {
          data: [{
            id: 1,
            email: 'test@example.com',
            tokenHash,
            tokenType: 'magic-link',
            tokenExpiry: new Date(Date.now() - 3600_000).toISOString(), // expired
          }],
        },
      },
    })

    const req = buildRequest('/api/auth/verify-magic-link', {
      method: 'POST',
      body: { token },
    })
    const res = await verifyMagicLink(req)
    expect(res.status).toBe(401)
  })
})
