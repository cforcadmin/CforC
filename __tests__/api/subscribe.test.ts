import { mockFetch, buildRequest } from '../helpers/mockStrapi'

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

import { POST as subscribe } from '@/app/api/subscribe/route'
import { GET as confirm } from '@/app/api/subscribe/confirm/route'
import { generateNewsletterToken } from '@/lib/auth'
import { newsletterLimiter } from '@/lib/rateLimiter'

describe('POST /api/subscribe', () => {
  let fetchMock: jest.SpyInstance

  beforeEach(() => {
    // Reset rate limiter between tests to avoid leaking state
    newsletterLimiter.reset('unknown')
  })

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('returns 400 for invalid email', async () => {
    const req = buildRequest('/api/subscribe', {
      method: 'POST',
      body: { email: 'not-valid' },
    })
    const res = await subscribe(req)
    expect(res.status).toBe(400)
  })

  it('returns silent success for honeypot-filled requests', async () => {
    const req = buildRequest('/api/subscribe', {
      method: 'POST',
      body: { email: 'bot@example.com', website: 'http://spam.com' },
    })
    const res = await subscribe(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns silent success for suspicious email patterns', async () => {
    const req = buildRequest('/api/subscribe', {
      method: 'POST',
      body: { email: 'a.b.c.d.e@example.com' },
    })
    const res = await subscribe(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('sends confirmation email for valid subscription', async () => {
    fetchMock = mockFetch({
      'api.resend.com/emails': { ok: true, data: { id: 'email-1' } },
    })

    // Use a unique IP to avoid rate limit from other tests
    const req = buildRequest('/api/subscribe', {
      method: 'POST',
      body: { email: 'valid@example.com' },
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    const res = await subscribe(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    // Verify fetch was called with Resend API
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns 403 for bad CSRF origin', async () => {
    const req = buildRequest('/api/subscribe', {
      method: 'POST',
      body: { email: 'test@example.com' },
      headers: { origin: 'https://evil.com' },
    })
    const res = await subscribe(req)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/subscribe/confirm', () => {
  let fetchMock: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('redirects with error for missing token', async () => {
    const req = buildRequest('/api/subscribe/confirm')
    const res = await confirm(req)
    expect(res.status).toBe(307) // NextResponse.redirect
    expect(res.headers.get('location')).toContain('subscribe_error=expired')
  })

  it('redirects with error for invalid token', async () => {
    const req = buildRequest('/api/subscribe/confirm?token=bad-token')
    const res = await confirm(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('subscribe_error=expired')
  })

  it('redirects with already-subscribed error for duplicates', async () => {
    const token = generateNewsletterToken('dup@example.com')

    fetchMock = mockFetch({
      'newsletter-subscribers?filters': {
        ok: true,
        data: { data: [{ id: 1, Email: 'dup@example.com' }] },
      },
    })

    const req = buildRequest(`/api/subscribe/confirm?token=${encodeURIComponent(token)}`)
    const res = await confirm(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('subscribe_error=already')
  })

  it('creates subscriber and redirects on success', async () => {
    const token = generateNewsletterToken('new@example.com')

    fetchMock = mockFetch({
      'newsletter-subscribers?filters': {
        ok: true,
        data: { data: [] },
      },
      'newsletter-subscribers': {
        ok: true,
        status: 200,
        data: { data: { id: 1, Email: 'new@example.com' } },
      },
      'api.resend.com/emails': { ok: true, data: { id: 'email-1' } },
      'api.sender.net': { ok: true, data: {} },
    })

    const req = buildRequest(`/api/subscribe/confirm?token=${encodeURIComponent(token)}`)
    const res = await confirm(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('subscribed=true')
  })
})
