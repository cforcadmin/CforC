import { buildRequest } from '../helpers/mockStrapi'

/**
 * Λήξη προθεσμίας πληρωμής (§4α, GDPR).
 *
 * ΤΟ ΣΥΣΤΗΜΑ ΔΕΝ ΣΒΗΝΕΙ ΥΠΟΨΗΦΙΟ ΜΕΛΟΣ. Ποτέ, για κανέναν λόγο.
 * Απόφαση ΟΣ 29/9/2026: η διαγραφή γίνεται ΧΕΙΡΟΚΙΝΗΤΑ.
 *
 * Μέχρι εκείνη τη μέρα ο κώδικας έσβηνε μόνος του αίτηση, φωτογραφία και
 * γραμμή φύλλου. Αυτά τα tests φυλάνε την ΑΝΤΙΣΤΡΟΦΗ ιδιότητα: ότι καμία
 * μελλοντική αλλαγή δεν θα ξαναφέρει αυτόματη διαγραφή.
 */

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(), set: jest.fn(), delete: jest.fn() })),
}))

import { GET } from '@/app/api/cron/payment-reminders/route'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

type App = Record<string, any>

/** Καταγράφει κάθε κλήση ώστε τα tests να ελέγχουν μέθοδο + διεύθυνση */
function mockCalls(apps: App[], overrides: { outcomeExists?: boolean; outcomeOk?: boolean } = {}) {
  const calls: Array<{ method: string; url: string; body?: any }> = []
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input)
    const method = (init?.method || 'GET').toUpperCase()
    calls.push({ method, url, body: init?.body ? JSON.parse(init.body) : undefined })

    if (url.includes('/api/oc-application-outcomes?')) {
      return new Response(JSON.stringify({ data: overrides.outcomeExists ? [{ ApplicationRef: 'app1' }] : [] }), { status: 200 })
    }
    if (url.includes('/api/oc-application-outcomes')) {
      return overrides.outcomeOk === false
        ? new Response(JSON.stringify({ error: 'nope' }), { status: 502 })
        : new Response(JSON.stringify({ data: { documentId: 'o1' } }), { status: 200 })
    }
    if (url.includes('/api/membership-applications?')) {
      return new Response(JSON.stringify({ data: apps }), { status: 200 })
    }
    return new Response(JSON.stringify({ data: [], id: 'x' }), { status: 200 })
  })
  return calls
}

const run = async () => {
  const req = buildRequest('/api/cron/payment-reminders', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  const res = await GET(req)
  return { status: res.status, json: await res.json() }
}

const base: App = {
  documentId: 'app1', FirstName: 'Τεστ', LastName: 'Χρήστης',
  Email: 'test@example.com', DecisionDate: daysAgo(31),
  Reminder15SentAt: daysAgo(16), Reminder28SentAt: daysAgo(3),
}

describe('payment-reminders — λήξη προθεσμίας ΧΩΡΙΣ αυτόματη διαγραφή', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('ζητά από το Strapi ΜΟΝΟ οπλισμένες αιτήσεις', async () => {
    const calls = mockCalls([])
    await run()
    const list = calls.find(c => c.url.includes('/api/membership-applications?'))
    expect(list?.url).toContain('filters[AutoRemindersArmed][$eq]=true')
  })

  /**
   * Η ΚΕΝΤΡΙΚΗ ΙΔΙΟΤΗΤΑ. Ό,τι κι αν συμβεί, καμία DELETE δεν φεύγει ποτέ:
   * ούτε για την αίτηση, ούτε για τη φωτογραφία, ούτε για τη γραμμή φύλλου.
   */
  it('ΚΑΜΙΑ διαγραφή, ούτε μετά τη λήξη της προθεσμίας', async () => {
    const calls = mockCalls([base])
    const { json } = await run()
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
    expect(json.deletionDue).toHaveLength(1)
  })

  it('δεν καλείται ποτέ το Apps Script για αφαίρεση γραμμής', async () => {
    const calls = mockCalls([base])
    await run()
    expect(calls.some(c => /removeApplicant/.test(JSON.stringify(c.body || '')))).toBe(false)
  })

  it('την 31η ημέρα γράφει την ΑΠΟΔΕΙΞΗ και ζητά χειροκίνητη διαγραφή', async () => {
    const calls = mockCalls([base])
    const { json } = await run()
    const proof = calls.find(c => c.method === 'POST' && c.url.includes('/api/oc-application-outcomes'))
    expect(proof).toBeTruthy()
    expect(proof!.body.data.Outcome).toBe('no-payment-30d')
    expect(proof!.body.data.Reminder15SentAt).toBeTruthy()
    expect(proof!.body.data.Reminder28SentAt).toBeTruthy()
    expect(proof!.body.data.DeletionConfirmedAt).toBeNull()
    expect(json.deletionDue[0]).toContain('Τεστ Χρήστης')
  })

  it('η απόδειξη ΔΕΝ περιέχει προσωπικό δεδομένο', async () => {
    const calls = mockCalls([base])
    await run()
    const proof = calls.find(c => c.method === 'POST' && c.url.includes('/api/oc-application-outcomes'))!
    expect(JSON.stringify(proof.body)).not.toContain('test@example.com')
    expect(JSON.stringify(proof.body)).not.toContain('Τεστ')
  })

  it('ΔΕΝ ζητά διαγραφή στην 30ή ημέρα — η προθεσμία τρέχει ακόμη', async () => {
    mockCalls([{ ...base, DecisionDate: daysAgo(30) }])
    const { json } = await run()
    expect(json.deletionDue).toHaveLength(0)
  })

  it('ΔΕΝ ζητά διαγραφή χωρίς DecisionDate — απουσία αφετηρίας δεν είναι ληγμένη προθεσμία', async () => {
    mockCalls([{ ...base, DecisionDate: null }])
    const { json } = await run()
    expect(json.deletionDue).toHaveLength(0)
  })

  it('ΔΕΝ ζητά διαγραφή για όποιον δήλωσε πληρωμή, όσο κι αν άργησε', async () => {
    const calls = mockCalls([{ ...base, PaymentClaimedAt: daysAgo(1) }])
    const { json } = await run()
    expect(json.deletionDue).toHaveLength(0)
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })

  it('αν υπάρχει ήδη απόδειξη, ΔΕΝ ξαναστέλνει το αίτημα κάθε μέρα', async () => {
    mockCalls([base], { outcomeExists: true })
    const { json } = await run()
    expect(json.deletionDue).toHaveLength(0)
  })

  it('αν δεν γραφτεί η απόδειξη, το αίτημα αναβάλλεται — δεν χάνεται σιωπηλά', async () => {
    mockCalls([base], { outcomeOk: false })
    const { json } = await run()
    expect(json.deletionDue).toHaveLength(0)
    expect(json.skipped.join(' ')).toMatch(/απόδειξη/)
  })
})
