// Shared in-memory store for form submissions
// Note: This works in development and single-server deployments
// For production with multiple serverless instances, consider using Redis or a database

interface Submission {
  submittedAt: string
  expiresAt: number
}

// Global store that persists across API calls
const globalForSubmissions = globalThis as unknown as {
  submittedForms: Map<string, Submission> | undefined
}

export const submittedForms = globalForSubmissions.submittedForms ?? new Map<string, Submission>()

if (process.env.NODE_ENV !== 'production') {
  globalForSubmissions.submittedForms = submittedForms
}

// For production, also persist to global
globalForSubmissions.submittedForms = submittedForms

export const EXPIRY_TIME = 30 * 60 * 1000 // 30 minutes

export function addSubmission(trackingId: string, submittedAt?: string) {
  submittedForms.set(trackingId, {
    submittedAt: submittedAt || new Date().toISOString(),
    expiresAt: Date.now() + EXPIRY_TIME
  })
  cleanupExpired()
}

export function checkSubmission(trackingId: string): boolean {
  cleanupExpired()
  return submittedForms.has(trackingId)
}

export function removeSubmission(trackingId: string) {
  submittedForms.delete(trackingId)
}

function cleanupExpired() {
  const now = Date.now()
  for (const [key, value] of submittedForms.entries()) {
    if (value.expiresAt < now) {
      submittedForms.delete(key)
    }
  }
}
