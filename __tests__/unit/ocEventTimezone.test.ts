import { athensLocalToUtcIso, utcIsoToAthensLocal } from '@/lib/ocEventForm'

it('Αθήνα ⇄ UTC, χειμώνα και καλοκαίρι', () => {
  // Νοέμβριος: EET (+2)
  expect(athensLocalToUtcIso('2026-11-13T10:00')).toBe('2026-11-13T08:00:00.000Z')
  expect(athensLocalToUtcIso('2026-11-13T19:00')).toBe('2026-11-13T17:00:00.000Z')
  expect(utcIsoToAthensLocal('2026-11-13T08:00:00.000Z')).toBe('2026-11-13T10:00')
  expect(utcIsoToAthensLocal('2026-11-13T17:00:00.000Z')).toBe('2026-11-13T19:00')

  // Ιούλιος: EEST (+3) — η διαφορά ΔΕΝ είναι σταθερή
  expect(athensLocalToUtcIso('2026-07-10T10:00')).toBe('2026-07-10T07:00:00.000Z')
  expect(utcIsoToAthensLocal('2026-07-10T07:00:00.000Z')).toBe('2026-07-10T10:00')

  // Κλειστός κύκλος: ό,τι γράφει ο συντάκτης, αυτό ξαναβλέπει
  for (const local of ['2026-11-13T10:00', '2026-07-10T23:30', '2026-03-29T04:00', '2026-01-01T00:00']) {
    expect(utcIsoToAthensLocal(athensLocalToUtcIso(local))).toBe(local)
  }
  expect(athensLocalToUtcIso('')).toBe('')
  expect(utcIsoToAthensLocal(null)).toBe('')
})
