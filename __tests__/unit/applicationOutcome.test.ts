/**
 * Η απόδειξη ότι τηρήθηκε η διαδικασία — απόφαση ΟΣ 29/9/2026.
 *
 * Το υποψήφιο μέλος ΔΕΝ διαγράφεται ποτέ αυτόματα. Η απόδειξη γράφεται όταν
 * λήξει η προθεσμία και μένει αφού κάποιος άνθρωπος κάνει τη διαγραφή.
 *
 * Δύο ιδιότητες που ΔΕΝ επιτρέπεται να σπάσουν:
 *   1. Καμία απόδειξη με προσωπικό δεδομένο μέσα.
 *   2. Καμία σιωπηλή αποτυχία — αν δεν γραφτεί, ο καλών το μαθαίνει.
 */
import { recordOutcome, outcomeExists, type OutcomeRecord } from '@/lib/applicationOutcome'

const base: OutcomeRecord = {
  ApplicationRef: 'abc123xyz',
  Outcome: 'no-payment-30d',
  DecisionDate: '2026-08-20T10:00:00.000Z',
  DeadlineExpiredAt: '2026-09-29T10:00:00.000Z',
  DaysElapsed: 40,
  Reminder15SentAt: '2026-09-04T08:00:00.000Z',
  Reminder28SentAt: '2026-09-17T08:00:00.000Z',
  DeletionRequestedAt: '2026-09-29T10:00:00.000Z',
  DeletionConfirmedAt: null,
}

describe('Απόδειξη διαδικασίας απόρριψης', () => {
  const calls: { url: string; method: string; body: any }[] = []
  beforeEach(() => {
    calls.length = 0
    global.fetch = jest.fn(async (url: any, init: any = {}) => {
      calls.push({ url: String(url), method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null })
      if (String(url).includes('filters[ApplicationRef]')) {
        return { ok: true, status: 200, json: async () => ({ data: [] }) } as any
      }
      return { ok: true, status: 200, json: async () => ({ data: { documentId: 'new' } }) } as any
    }) as any
  })

  it('γράφει την απόδειξη και γυρίζει true', async () => {
    expect(await recordOutcome(base)).toBe(true)
    const post = calls.find(c => c.method === 'POST')!
    expect(post.body.data.Outcome).toBe('no-payment-30d')
    expect(post.body.data.DaysElapsed).toBe(40)
  })

  it('ΚΑΝΕΝΑ προσωπικό δεδομένο δεν φεύγει προς το Strapi', async () => {
    await recordOutcome(base)
    const post = calls.find(c => c.method === 'POST')!
    const keys = Object.keys(post.body.data)
    for (const forbidden of ['Email', 'email', 'Name', 'FirstName', 'LastName', 'Phone', 'Hash']) {
      expect(keys).not.toContain(forbidden)
    }
    // ούτε κρυμμένο μέσα σε τιμή
    expect(JSON.stringify(post.body)).not.toMatch(/@/)
  })

  it('αποθηκεύει ΤΙΣ ΥΠΕΝΘΥΜΙΣΕΙΣ — αυτές αποδεικνύουν τη διαδικασία', async () => {
    await recordOutcome(base)
    const post = calls.find(c => c.method === 'POST')!
    expect(post.body.data.Reminder15SentAt).toBeTruthy()
    expect(post.body.data.Reminder28SentAt).toBeTruthy()
  })

  it('αν υπάρχει ήδη απόδειξη, ΔΕΝ γράφει δεύτερη', async () => {
    global.fetch = jest.fn(async (url: any) => {
      if (String(url).includes('filters[ApplicationRef]')) {
        return { ok: true, status: 200, json: async () => ({ data: [{ ApplicationRef: 'abc123xyz' }] }) } as any
      }
      throw new Error('δεν έπρεπε να γράψει')
    }) as any
    expect(await recordOutcome(base)).toBe(true)
  })

  /**
   * Αν το Strapi δεν απαντά, γυρίζει false και ο καλών αναβάλλει το αίτημα
   * διαγραφής για αύριο — δεν στέλνει γράμμα για κάτι που δεν καταγράφηκε.
   */
  it('αποτυχία εγγραφής → false, ώστε ο καλών να αναβάλει', async () => {
    global.fetch = jest.fn(async () => { throw new Error('δίκτυο') }) as any
    expect(await recordOutcome(base)).toBe(false)
  })

  it('502 από το Strapi → false, όχι σιωπηλή επιτυχία', async () => {
    global.fetch = jest.fn(async (url: any) => {
      if (String(url).includes('filters[ApplicationRef]')) {
        return { ok: true, status: 200, json: async () => ({ data: [] }) } as any
      }
      return { ok: false, status: 502, json: async () => ({}) } as any
    }) as any
    expect(await recordOutcome(base)).toBe(false)
  })

  it('η χειροκίνητη διαγραφή μένει ΑΚΑΤΑΓΡΑΦΗ ώσπου να γίνει', async () => {
    await recordOutcome(base)
    const post = calls.find(c => c.method === 'POST')!
    expect(post.body.data.DeletionRequestedAt).toBeTruthy()
    expect(post.body.data.DeletionConfirmedAt).toBeNull()
  })

  it('outcomeExists: κενή λίστα σημαίνει όχι', async () => {
    expect(await outcomeExists('δεν-υπάρχει')).toBe(false)
  })
})
