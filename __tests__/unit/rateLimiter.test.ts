import { RateLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter(3, 60_000) // 3 requests per 60s
  })

  it('allows requests up to maxRequests', () => {
    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(true)
  })

  it('blocks after limit exceeded', () => {
    limiter.check('a')
    limiter.check('a')
    limiter.check('a')
    const result = limiter.check('a')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetTime).toBeGreaterThan(Date.now())
  })

  it('tracks remaining count', () => {
    expect(limiter.check('a').remaining).toBe(2)
    expect(limiter.check('a').remaining).toBe(1)
    expect(limiter.check('a').remaining).toBe(0)
  })

  it('resets after window expires', () => {
    jest.useFakeTimers()
    const now = Date.now()
    jest.setSystemTime(now)

    limiter.check('a')
    limiter.check('a')
    limiter.check('a')
    expect(limiter.check('a').allowed).toBe(false)

    // Advance past window
    jest.setSystemTime(now + 61_000)
    expect(limiter.check('a').allowed).toBe(true)

    jest.useRealTimers()
  })

  it('cleanup removes expired entries, preserves active ones', () => {
    jest.useFakeTimers()
    const now = Date.now()
    jest.setSystemTime(now)

    limiter.check('expired-key')
    limiter.check('active-key')

    // Advance past window — expired-key should be cleaned
    jest.setSystemTime(now + 61_000)

    // Touch active-key so it gets a new window
    limiter.check('active-key')

    limiter.cleanup()

    // expired-key resets (allows again), active-key keeps its count
    expect(limiter.check('expired-key').remaining).toBe(2) // fresh window
    expect(limiter.check('active-key').remaining).toBe(1)  // had 2, now 1

    jest.useRealTimers()
  })

  describe('getRateLimitErrorMessage', () => {
    it('returns Greek message with minutes', () => {
      const msg = getRateLimitErrorMessage(Date.now() + 5 * 60 * 1000)
      expect(msg).toContain('λεπτά')
    })

    it('returns Greek message with hours for >60min', () => {
      const msg = getRateLimitErrorMessage(Date.now() + 90 * 60 * 1000)
      expect(msg).toContain('ώρα')
    })
  })
})
