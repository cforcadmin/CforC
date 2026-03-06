import { mockFetch, buildRequest } from '../helpers/mockStrapi'

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

import { GET } from '@/app/api/admin/monthly-profile-report/route'

describe('GET /api/admin/monthly-profile-report', () => {
  let fetchMock: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  it('returns 401 for missing authorization', async () => {
    const req = buildRequest('/api/admin/monthly-profile-report')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong authorization', async () => {
    const req = buildRequest('/api/admin/monthly-profile-report', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns success with "no changes" when no logs and no subscribers', async () => {
    fetchMock = mockFetch({
      '/api/profile-change-logs': {
        ok: true,
        data: { data: [] },
      },
      '/api/newsletter-subscribers': {
        ok: true,
        data: { data: [] },
      },
    })

    const req = buildRequest('/api/admin/monthly-profile-report', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toContain('No changes')
  })

  it('sends email with profile changes and subscriber CSVs', async () => {
    fetchMock = mockFetch({
      '/api/profile-change-logs': {
        ok: true,
        data: {
          data: [
            {
              memberName: 'Μαρία Παπαδοπούλου',
              memberEmail: 'maria@example.com',
              changedFields: 'Όνομα, Βιογραφικό',
              changedAt: new Date().toISOString(),
            },
          ],
        },
      },
      '/api/newsletter-subscribers': {
        ok: true,
        data: {
          data: [
            {
              Email: 'subscriber@example.com',
              ConfirmedAt: new Date().toISOString(),
            },
          ],
        },
      },
      'api.resend.com/emails': { ok: true, data: { id: 'email-1' } },
    })

    const req = buildRequest('/api/admin/monthly-profile-report', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.profileChanges).toBe(1)
    expect(json.newSubscribers).toBe(1)

    // Verify email was sent with both attachments
    const emailCall = fetchMock.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('resend.com')
    )
    expect(emailCall).toBeDefined()
    const emailBody = JSON.parse(emailCall[1].body)
    expect(emailBody.attachments).toHaveLength(2)
    expect(emailBody.attachments[0].filename).toContain('profile-changes')
    expect(emailBody.attachments[1].filename).toContain('new-subscribers')
    expect(emailBody.subject).toContain('Μηνιαία Αναφορά')
  })

  it('sends email with only subscribers when no profile changes', async () => {
    fetchMock = mockFetch({
      '/api/profile-change-logs': {
        ok: true,
        data: { data: [] },
      },
      '/api/newsletter-subscribers': {
        ok: true,
        data: {
          data: [
            {
              Email: 'new@example.com',
              ConfirmedAt: new Date().toISOString(),
            },
          ],
        },
      },
      'api.resend.com/emails': { ok: true, data: { id: 'email-2' } },
    })

    const req = buildRequest('/api/admin/monthly-profile-report', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.profileChanges).toBe(0)
    expect(json.newSubscribers).toBe(1)

    // Verify only subscriber CSV attached
    const emailCall = fetchMock.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('resend.com')
    )
    const emailBody = JSON.parse(emailCall[1].body)
    expect(emailBody.attachments).toHaveLength(1)
    expect(emailBody.attachments[0].filename).toContain('new-subscribers')
  })
})
