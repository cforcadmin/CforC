/**
 * Η καταχώρηση συνδρομής στο Μητρώο (Επισκόπηση → Συνδρομές).
 *
 * Η κρίσιμη συμπεριφορά είναι η επανάληψη: μετρημένα 3/3, η κλήση που ΟΝΤΩΣ
 * γράφει χάνει την απάντησή της σε κρύα εκκίνηση ενώ η εγγραφή γίνεται.
 */

process.env.SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/TEST/exec'
process.env.SHEET_WEBAPP_SECRET = 'test-secret'

const { recordSubscriptionYearInSheet } = require('@/lib/googleSheets')

const ok = JSON.stringify({ ok: true, recorded: { am: '34', year: 2026, row: 36, col: 22 } })

function respond(...bodies: Array<{ status?: number; body: string }>) {
  const sent: any[] = []
  jest.spyOn(global, 'fetch').mockImplementation(async (_u: any, init?: any) => {
    const i = sent.length
    sent.push(JSON.parse(init.body))
    const r = bodies[Math.min(i, bodies.length - 1)]
    return new Response(r.body, { status: r.status ?? 200 })
  })
  return sent
}

describe('recordSubscriptionYearInSheet', () => {
  afterEach(() => jest.restoreAllMocks())

  it('στέλνει ΑΜ, έτος και τιμή στη σωστή ενέργεια', async () => {
    const sent = respond({ body: ok })
    await recordSubscriptionYearInSheet(34, 2026)
    expect(sent[0]).toMatchObject({ action: 'recordSubscriptionYear', am: '34', year: 2026, value: 1 })
  })

  it('το έτος περνιέται ΡΗΤΑ — δύο χρονιές, δύο κλήσεις', async () => {
    const sent = respond({ body: ok })
    await recordSubscriptionYearInSheet(34, 2025)
    await recordSubscriptionYearInSheet(34, 2026)
    expect(sent.map(s => s.year)).toEqual([2025, 2026])
  })

  it('ξαναδοκιμάζει όταν χαθεί η απάντηση σε κρύα εκκίνηση', async () => {
    const sent = respond({ status: 404, body: '<!DOCTYPE html>' }, { body: ok })
    await expect(recordSubscriptionYearInSheet(34, 2026)).resolves.toBeUndefined()
    expect(sent).toHaveLength(2)
  }, 20000)

  it('δεν ξαναδοκιμάζει όταν το script απαντά οριστικά «δεν βρέθηκε ΑΜ»', async () => {
    const sent = respond({ body: JSON.stringify({ ok: false, error: 'Δεν βρέθηκε μέλος με ΑΜ 99999' }) })
    await expect(recordSubscriptionYearInSheet(99999, 2026)).rejects.toThrow('99999')
    expect(sent).toHaveLength(1)
  }, 20000)

  it('χωρίς ΑΜ δεν στέλνει τίποτα', async () => {
    const sent = respond({ body: ok })
    await expect(recordSubscriptionYearInSheet('', 2026)).rejects.toThrow('ΑΜ')
    expect(sent).toHaveLength(0)
  })
})
