import { NextRequest } from 'next/server'

/**
 * Mock global.fetch to intercept Strapi/Resend calls.
 * Returns the mock so tests can configure per-URL responses.
 */
export function mockFetch(responses: Record<string, { ok: boolean; status?: number; data?: any }> = {}) {
  const mockFn = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    // Find matching response by URL substring
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(response.data ?? {}), {
          status: response.status ?? (response.ok ? 200 : 500),
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Default: return empty success
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  return mockFn
}

/**
 * Build a NextRequest for testing API route handlers.
 */
export function buildRequest(
  url: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    cookies?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, cookies = {} } = options

  const reqHeaders = new Headers(headers)
  // Set origin for CSRF — default to allowed localhost
  if (!reqHeaders.has('origin')) {
    reqHeaders.set('origin', 'http://localhost:3000')
  }

  const cookieStrings = Object.entries(cookies).map(([k, v]) => `${k}=${v}`)
  if (cookieStrings.length) {
    reqHeaders.set('cookie', cookieStrings.join('; '))
  }

  const init: RequestInit = {
    method,
    headers: reqHeaders,
  }

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
    reqHeaders.set('content-type', 'application/json')
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}
