/** owedSubscriptionYears — η ΜΙΑ λογική εκκρεμών ετών (Finance υπενθύμιση + ειδοποίηση αλλαγής email). */
const { owedSubscriptionYears } = require('@/lib/subscriptionOwed')

describe('owedSubscriptionYears', () => {
  it('τίποτα πληρωμένο, παλιό μέλος → και τα δύο έτη', () => {
    expect(owedSubscriptionYears({ Payments: {}, RegistrationYear: 2023 }, 2026)).toEqual([2025, 2026])
  })
  it('1 = πληρωμένο, 0 = δεν όφειλε', () => {
    expect(owedSubscriptionYears({ Payments: { '2025': 1, '2026': 0 } }, 2026)).toEqual([])
    expect(owedSubscriptionYears({ Payments: { '2025': 1 } }, 2026)).toEqual([2026])
  })
  it('εγγραφή φέτος → το περσινό δεν μετρά', () => {
    expect(owedSubscriptionYears({ Payments: {}, RegistrationYear: 2026 }, 2026)).toEqual([2026])
  })
  it('χωρίς Payments καθόλου → και τα δύο', () => {
    expect(owedSubscriptionYears({}, 2026)).toEqual([2025, 2026])
  })
})
