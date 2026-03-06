import { checkCsrf } from '@/lib/csrf'

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers,
  })
}

describe('checkCsrf', () => {
  it('allows localhost:3000 origin', () => {
    const req = makeRequest({ origin: 'http://localhost:3000' })
    expect(checkCsrf(req)).toBeNull()
  })

  it('allows cultureforchange.net origin', () => {
    const req = makeRequest({ origin: 'https://cultureforchange.net' })
    expect(checkCsrf(req)).toBeNull()
  })

  it('allows www.cultureforchange.net origin', () => {
    const req = makeRequest({ origin: 'https://www.cultureforchange.net' })
    expect(checkCsrf(req)).toBeNull()
  })

  it('blocks unknown origin', () => {
    const req = makeRequest({ origin: 'https://evil.com' })
    expect(checkCsrf(req)).toBe('Forbidden')
  })

  it('allows request with no origin and no referer (same-origin)', () => {
    const req = makeRequest({})
    expect(checkCsrf(req)).toBeNull()
  })

  it('allows valid referer when origin is absent', () => {
    const req = makeRequest({ referer: 'http://localhost:3000/page' })
    expect(checkCsrf(req)).toBeNull()
  })

  it('blocks request with invalid referer', () => {
    const req = makeRequest({ referer: 'https://evil.com/page' })
    expect(checkCsrf(req)).toBe('Forbidden')
  })

  it('blocks request with malformed referer', () => {
    const req = makeRequest({ referer: 'not-a-url' })
    expect(checkCsrf(req)).toBe('Forbidden')
  })
})
