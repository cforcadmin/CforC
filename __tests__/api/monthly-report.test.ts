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

  it('returns success with "no changes" when no logs', async () => {
    fetchMock = mockFetch({
      '/api/profile-change-logs': {
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

  it('sends email + CSV when logs exist', async () => {
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
      'api.resend.com/emails': { ok: true, data: { id: 'email-1' } },
    })

    const req = buildRequest('/api/admin/monthly-profile-report', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.members).toBe(1)

    // Verify email was sent with attachment
    const emailCall = fetchMock.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('resend.com')
    )
    expect(emailCall).toBeDefined()
    const emailBody = JSON.parse(emailCall[1].body)
    expect(emailBody.attachments).toHaveLength(1)
    expect(emailBody.attachments[0].filename).toContain('.csv')
  })
})
