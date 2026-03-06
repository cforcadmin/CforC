import {
  addSubmission,
  checkSubmission,
  removeSubmission,
  submittedForms,
  EXPIRY_TIME,
} from '@/lib/membershipSubmissions'

describe('membershipSubmissions', () => {
  beforeEach(() => {
    submittedForms.clear()
  })

  it('addSubmission + checkSubmission returns true', () => {
    addSubmission('track-1')
    expect(checkSubmission('track-1')).toBe(true)
  })

  it('unknown ID returns false', () => {
    expect(checkSubmission('nonexistent')).toBe(false)
  })

  it('removeSubmission clears entry', () => {
    addSubmission('track-2')
    removeSubmission('track-2')
    expect(checkSubmission('track-2')).toBe(false)
  })

  it('expired entries cleaned up', () => {
    jest.useFakeTimers()
    const now = Date.now()
    jest.setSystemTime(now)

    addSubmission('track-3')

    // Advance past expiry time
    jest.setSystemTime(now + EXPIRY_TIME + 1000)

    // checkSubmission triggers cleanup internally
    expect(checkSubmission('track-3')).toBe(false)

    jest.useRealTimers()
  })
})
