import {
  claimsNeedingReminder, pendingClaims, pendingTotal, daysSince, ageLabel,
  REMINDER_EVERY_DAYS, type ClaimForReminder,
} from '@/lib/expenseClaimReminders'

const NOW = new Date('2026-09-21T06:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString()

const claim = (over: Partial<ClaimForReminder> = {}): ClaimForReminder => ({
  documentId: 'a1', ClaimNumber: 'ΕΞ-2026-001', MemberName: 'Αργυρώ Μπαράτα',
  Payable: 103.12, SubmittedAt: daysAgo(6), State: 'submitted', ReminderLog: null,
  ...over,
})

describe('υπενθυμίσεις εξοδολογίων', () => {
  it('η πρώτη φεύγει στις 5 ημέρες, όχι νωρίτερα', () => {
    expect(claimsNeedingReminder([claim({ SubmittedAt: daysAgo(4) })], NOW)).toHaveLength(0)
    expect(claimsNeedingReminder([claim({ SubmittedAt: daysAgo(REMINDER_EVERY_DAYS) })], NOW)).toHaveLength(1)
  })

  it('μετράει από την ΤΕΛΕΥΤΑΙΑ υπενθύμιση, όχι από την υποβολή', () => {
    const old = claim({ SubmittedAt: daysAgo(30), ReminderLog: { lastSentAt: daysAgo(2), count: 5 } })
    expect(claimsNeedingReminder([old], NOW)).toHaveLength(0)
    const due = claim({ SubmittedAt: daysAgo(30), ReminderLog: { lastSentAt: daysAgo(5), count: 5 } })
    expect(claimsNeedingReminder([due], NOW)).toHaveLength(1)
  })

  it('τα πληρωμένα και τα ακυρωμένα δεν ενοχλούν κανέναν', () => {
    const paid = claim({ State: 'paid', SubmittedAt: daysAgo(40) })
    const cancelled = claim({ State: 'cancelled', SubmittedAt: daysAgo(40) })
    expect(claimsNeedingReminder([paid, cancelled], NOW)).toHaveLength(0)
  })

  it('αντέχει χαλασμένη ημερομηνία χωρίς να στείλει τίποτα', () => {
    expect(daysSince('όχι ημερομηνία', NOW)).toBeNull()
    expect(claimsNeedingReminder([claim({ SubmittedAt: 'όχι ημερομηνία' })], NOW)).toHaveLength(0)
  })

  it('το σύνολο μετρά μόνο τα απλήρωτα και στρογγυλοποιεί σωστά', () => {
    expect(pendingTotal([
      claim({ Payable: 103.12 }), claim({ Payable: 0.1 }), claim({ Payable: 0.2 }),
      claim({ Payable: 500, State: 'paid' }),
    ])).toBe(103.42)
  })

  it('το παλαιότερο πρώτο — αυτό περιμένει περισσότερο', () => {
    const list = pendingClaims([
      claim({ ClaimNumber: 'ΕΞ-2026-003', SubmittedAt: daysAgo(1) }),
      claim({ ClaimNumber: 'ΕΞ-2026-001', SubmittedAt: daysAgo(20) }),
      claim({ ClaimNumber: 'ΕΞ-2026-002', SubmittedAt: daysAgo(10) }),
    ])
    expect(list.map(c => c.ClaimNumber)).toEqual(['ΕΞ-2026-001', 'ΕΞ-2026-002', 'ΕΞ-2026-003'])
  })

  it('η ηλικία διαβάζεται σαν ελληνικά', () => {
    expect(ageLabel(0)).toBe('σήμερα')
    expect(ageLabel(1)).toBe('χθες')
    expect(ageLabel(12)).toBe('εδώ και 12 ημέρες')
  })
})
