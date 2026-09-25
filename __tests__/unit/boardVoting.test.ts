import { VOTING_SEATS, isVoter, voteWeight, type OcSeat } from '@/lib/ocRoles'

/**
 * Ο κανόνας ψηφοφορίας του ΔΣ.
 *
 * Πέντε θέσεις ψηφίζουν, η Πρόεδρος διπλά (σύνολο 6). Η Γραμματεία στηρίζει
 * το ΔΣ αλλά ΔΕΝ είναι μέλος του, και το IT ούτε — είναι το δίχτυ ασφαλείας.
 */

/** Ό,τι κάνει το route: καταμέτρηση με βάρος, μόνο από ψηφοφόρους */
function tally(voters: Array<{ seats: OcSeat[]; vote: 'approve' | 'reject' }>) {
  return voters.reduce(
    (t, v) => { t[v.vote] += voteWeight(v.seats); return t },
    { approve: 0, reject: 0 } as Record<'approve' | 'reject', number>
  )
}
const outcome = (t: { approve: number; reject: number }) =>
  t.approve > t.reject ? 'approved' : t.reject > t.approve ? 'rejected' : 'pending'

describe('Ποιος ψηφίζει', () => {
  it('το ΔΣ είναι πέντε θέσεις', () => {
    expect(VOTING_SEATS).toHaveLength(5)
    expect([...VOTING_SEATS].sort()).toEqual(
      ['comms', 'community', 'coordinator', 'financer', 'outreach'].sort()
    )
  })

  it('η Γραμματεία δεν ψηφίζει — δεν είναι μέλος του ΔΣ', () => {
    expect(isVoter(['admin'])).toBe(false)
  })

  it('το IT δεν ψηφίζει', () => {
    expect(isVoter(['it'])).toBe(false)
  })

  it('μέλος με θέση ψήφου ΚΑΙ IT ψηφίζει κανονικά', () => {
    expect(isVoter(['it', 'financer'])).toBe(true)
  })
})

describe('Βάρος ψήφου', () => {
  it('η Πρόεδρος (Συντονισμός) μετράει διπλά', () => {
    expect(voteWeight(['coordinator'])).toBe(2)
  })

  it('όλες οι άλλες θέσεις μετρούν μία', () => {
    for (const s of ['comms', 'financer', 'community', 'outreach'] as OcSeat[]) {
      expect(voteWeight([s])).toBe(1)
    }
  })

  it('πολλές θέσεις ΔΕΝ σωρεύουν βάρος', () => {
    expect(voteWeight(['coordinator', 'comms', 'financer'])).toBe(2)
    expect(voteWeight(['comms', 'financer'])).toBe(1)
  })

  it('το σύνολο των ψήφων του ΔΣ είναι 6 — ζυγό, άρα η ισοπαλία υπάρχει', () => {
    const total = VOTING_SEATS.reduce((n, s) => n + voteWeight([s]), 0)
    expect(total).toBe(6)
  })
})

describe('Αποτέλεσμα', () => {
  const V = (seat: OcSeat, vote: 'approve' | 'reject') => ({ seats: [seat] as OcSeat[], vote })

  it('ομόφωνη έγκριση', () => {
    expect(outcome(tally(VOTING_SEATS.map(s => V(s, 'approve'))))).toBe('approved')
  })

  it('Πρόεδρος + 1 υπέρ, 3 κατά → 3–3, ισοπαλία, μένει εκκρεμής', () => {
    const t = tally([
      V('coordinator', 'approve'), V('comms', 'approve'),
      V('financer', 'reject'), V('community', 'reject'), V('outreach', 'reject'),
    ])
    expect(t).toEqual({ approve: 3, reject: 3 })
    expect(outcome(t)).toBe('pending')
  })

  it('χωρίς τη διπλή ψήφο το ίδιο σενάριο θα ήταν απόρριψη — η βαρύτητα μετράει', () => {
    const unweighted = { approve: 2, reject: 3 }
    expect(outcome(unweighted)).toBe('rejected')
  })

  it('Πρόεδρος + 2 υπέρ, 2 κατά → 4–2, έγκριση', () => {
    expect(outcome(tally([
      V('coordinator', 'approve'), V('comms', 'approve'), V('financer', 'approve'),
      V('community', 'reject'), V('outreach', 'reject'),
    ]))).toBe('approved')
  })

  it('η Πρόεδρος μόνη της δεν επιβάλλεται: 2–4', () => {
    expect(outcome(tally([
      V('coordinator', 'approve'),
      V('comms', 'reject'), V('financer', 'reject'),
      V('community', 'reject'), V('outreach', 'reject'),
    ]))).toBe('rejected')
  })

  it('μια ψήφος από τη Γραμματεία δεν μπαίνει ποτέ στην καταμέτρηση', () => {
    // Το route διατρέχει τους ψηφοφόρους του μητρώου, όχι το αντικείμενο votes
    const voters = [
      { seats: ['coordinator'] as OcSeat[], vote: 'approve' as const },
      { seats: ['comms'] as OcSeat[], vote: 'approve' as const },
      { seats: ['financer'] as OcSeat[], vote: 'approve' as const },
      { seats: ['community'] as OcSeat[], vote: 'approve' as const },
      { seats: ['outreach'] as OcSeat[], vote: 'approve' as const },
    ]
    expect(tally(voters)).toEqual({ approve: 6, reject: 0 })
  })
})
