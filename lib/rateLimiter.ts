// Simple in-memory rate limiter
// For production with multiple instances, consider using Redis

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.storage.get(key)

    // No previous entry or window has expired
    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs
      }
      this.storage.set(key, newEntry)

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: newEntry.resetTime
      }
    }

    // Within the rate limit window
    if (entry.count < this.maxRequests) {
      entry.count++
      this.storage.set(key, entry)

      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetTime: entry.resetTime
      }
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  reset(key: string): void {
    this.storage.delete(key)
  }

  // Clean up expired entries (call periodically)
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.storage.entries()) {
      if (now >= entry.resetTime) {
        this.storage.delete(key)
      }
    }
  }
}

// Rate limiters for different operations
export const magicLinkLimiter = new RateLimiter(
  3, // 3 requests
  60 * 60 * 1000 // per hour
)

export const loginLimiter = new RateLimiter(
  5, // 5 attempts
  15 * 60 * 1000 // per 15 minutes
)

export const newsletterLimiter = new RateLimiter(
  3, // 3 subscriptions
  60 * 60 * 1000 // per hour per IP
)

// Clean up expired entries every 10 minutes
setInterval(() => {
  magicLinkLimiter.cleanup()
  loginLimiter.cleanup()
  newsletterLimiter.cleanup()
}, 10 * 60 * 1000)

// Helper function to get user-friendly error messages
export function getRateLimitErrorMessage(resetTime: number): string {
  const now = Date.now()
  const minutesRemaining = Math.ceil((resetTime - now) / (60 * 1000))

  if (minutesRemaining > 60) {
    const hoursRemaining = Math.ceil(minutesRemaining / 60)
    return `Παρακαλώ δοκιμάστε ξανά σε ${hoursRemaining} ώρα${hoursRemaining > 1 ? 'ες' : ''}`
  }

  return `Παρακαλώ δοκιμάστε ξανά σε ${minutesRemaining} λεπτά`
}
