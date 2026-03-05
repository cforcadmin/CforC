/**
 * CSRF protection via Origin header validation.
 * Returns null if the request is allowed, or an error message if blocked.
 */

const ALLOWED_ORIGINS = [
  'https://cultureforchange.net',
  'https://www.cultureforchange.net',
]

if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000')
}

export function checkCsrf(request: Request): string | null {
  const origin = request.headers.get('origin')

  // If no Origin header, check Referer as fallback
  // (some browsers omit Origin on same-origin requests, which is fine)
  if (!origin) {
    const referer = request.headers.get('referer')
    if (!referer) {
      // No origin or referer — likely a same-origin request or non-browser client
      // Allow it (rate limiting + auth handle abuse)
      return null
    }
    try {
      const refererOrigin = new URL(referer).origin
      if (!ALLOWED_ORIGINS.includes(refererOrigin)) {
        return 'Forbidden'
      }
    } catch {
      return 'Forbidden'
    }
    return null
  }

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return 'Forbidden'
  }

  return null
}
