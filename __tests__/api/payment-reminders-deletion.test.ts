import { buildRequest } from '../helpers/mockStrapi'

/**
 * Η διαγραφή εγκεκριμένων αιτήσεων που δεν πληρώθηκαν (§4α, GDPR).
 *
 * Το κρίσιμο εδώ δεν είναι ότι η διαγραφή δουλεύει — είναι ΠΟΙΟΥΣ δεν αγγίζει.
 * Κάθε test παρακάτω είναι ένας άνθρωπος που ΔΕΝ πρέπει να σβηστεί.
 */

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(), set: jest.fn(), delete: jest.fn() })),
}))

const removeApplicantFromSheet = jest.fn(async () => {})
const sheetsConfigured = jest.fn(() => true)
jest.mock('@/lib/googleSheets', () => ({
  get removeApplicantFromSheet() { return removeApplicantFromSheet },
  get sheetsConfigured() { return sheetsConfigured },
}))

import { GET } from '@/app/api/cron/payment-reminders/route'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

type App = Record<string, any>

/** Καταγράφει κάθε κλήση ώστε τα tests να ελέγχουν μέθοδο + διεύθυνση */
function mockCalls(apps: App[], overrides: { deleteOk?: boolean } = {}) {
  const calls: Array<{ method: string; url: string; body?: any }> = []
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input)
    const method = (init?.method || 'GET').toUpperCase()
    calls.push({ method, url, body: init?.body ? JSON.parse(init.body) : undefined })

    if (url.includes('/api/membership-applications?')) {
      return new Response(JSON.stringify({ data: apps }), { status: 200 })
    }
    if (method === 'DELETE' && url.includes('/api/membership-applications/')) {
      // 204 ΔΕΝ δέχεται σώμα — το undici πετάει αν του δώσεις έστω κενό string
      return overrides.deleteOk === false
        ? new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
        : new Response(null, { status: 204 })
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

describe('payment-reminders — αυτόματη διαγραφή μετά την προθεσμία', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); sheetsConfigured.mockReturnValue(true) })

  it('ζητά από το Strapi ΜΟΝΟ οπλισμένες αιτήσεις — οι υπόλοιπες δεν φτάνουν ποτέ στη διαγραφή', async () => {
    const calls = mockCalls([])
    await run()
    const list = calls.find(c => c.url.includes('/api/membership-applications?'))
    expect(list?.url).toContain('filters[AutoRemindersArmed][$eq]=true')
    expect(list?.url).toContain('filters[ApplicationState][$eq]=approved')
  })

  it('διαγράφει την αίτηση την 31η ημέρα και ειδοποιεί hello@, community@, finance@', async () => {
    const calls = mockCalls([base])
    const { json } = await run()

    expect(json.deleted).toHaveLength(1)
    expect(calls.some(c => c.method === 'DELETE' && c.url.includes('/membership-applications/app1'))).toBe(true)
    expect(removeApplicantFromSheet).toHaveBeenCalledWith('test@example.com')

    const mail = calls.find(c => c.url.includes('resend.com'))
    expect(mail?.body.to).toBe('hello@cultureforchange.net')
    expect(mail?.body.cc).toEqual(['community@cultureforchange.net', 'finance@cultureforchange.net'])
    expect(mail?.body.subject).toContain('Διαγραφή αίτησης')
    // Το γράμμα είναι το μόνο αρχείο που μένει — πρέπει να ταυτοποιεί το πρόσωπο
    expect(mail?.body.html).toContain('test@example.com')
    expect(mail?.body.html).toContain('Τεστ Χρήστης')
  })

  it('ΔΕΝ διαγράφει στην 30ή ημέρα — η προθεσμία τρέχει ακόμη', async () => {
    const calls = mockCalls([{ ...base, DecisionDate: daysAgo(30) }])
    const { json } = await run()
    expect(json.deleted).toHaveLength(0)
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })

  it('ΔΕΝ διαγράφει αίτηση χωρίς DecisionDate — απουσία αφετηρίας δεν είναι ληγμένη προθεσμία', async () => {
    const calls = mockCalls([{ ...base, DecisionDate: null }])
    const { json } = await run()
    expect(json.deleted).toHaveLength(0)
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })

  it('ΔΕΝ διαγράφει όποιον δήλωσε πληρωμή, όσο κι αν άργησε', async () => {
    const calls = mockCalls([{ ...base, DecisionDate: daysAgo(90), PaymentClaimedAt: daysAgo(80) }])
    const { json } = await run()
    expect(json.deleted).toHaveLength(0)
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })

  it('αν αποτύχει η διαγραφή στο Strapi, ΔΕΝ στέλνεται ειδοποίηση για κάτι που δεν έγινε', async () => {
    const calls = mockCalls([base], { deleteOk: false })
    const { json } = await run()
    expect(json.deleted).toHaveLength(0)
    expect(json.skipped.join(' ')).toContain('αποτυχία διαγραφής')
    expect(calls.some(c => c.url.includes('resend.com'))).toBe(false)
  })

  it('αν μείνει η γραμμή στο φύλλο, η εκκρεμότητα γράφεται στο γράμμα αντί να χαθεί', async () => {
    removeApplicantFromSheet.mockRejectedValueOnce(new Error('web app 500') as never)
    const calls = mockCalls([base])
    const { json } = await run()
    expect(json.deleted[0]).toContain('εκκρεμότητες')
    const mail = calls.find(c => c.url.includes('resend.com'))
    expect(mail?.body.html).toContain('ΕΓΚΕΚΡΙΜΕΝΑ')
  })

  it('χωρίς ρυθμισμένο φύλλο, το γράμμα ζητά χειροκίνητη διαγραφή της γραμμής', async () => {
    sheetsConfigured.mockReturnValue(false)
    const calls = mockCalls([base])
    await run()
    expect(removeApplicantFromSheet).not.toHaveBeenCalled()
    const mail = calls.find(c => c.url.includes('resend.com'))
    expect(mail?.body.html).toContain('με το χέρι')
  })

  it('η φωτογραφία της αίτησης επιχειρείται να σβηστεί από τη Βιβλιοθήκη Πολυμέσων', async () => {
    const calls = mockCalls([{ ...base, Photo: { id: 77 } }])
    await run()
    expect(calls.some(c => c.method === 'DELETE' && c.url.includes('/api/upload/files/77'))).toBe(true)
  })
})
