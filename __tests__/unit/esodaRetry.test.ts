/**
 * Η επανάληψη στο ΕΣΟΔΑ. Οι αποδείξεις 366/367 (25/9/2026) είχαν γραμμή στο
 * φύλλο αλλά SheetSynced:false — η γραφή πέτυχε, η απάντηση χάθηκε.
 */
process.env.FINANCE_SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/FIN/exec'
process.env.FINANCE_SHEET_WEBAPP_SECRET = 'test-secret'

const { appendReceiptToEsoda } = require('@/lib/financeSheet')
const row = { number: 368, amount: 35, issueDate: '2026-09-25', memberName: 'Τεστ' }

function respond(...bodies: Array<{ status?: number; body: string }>) {
  const calls: number[] = []
  jest.spyOn(global, 'fetch').mockImplementation(async () => {
    const i = calls.length; calls.push(i)
    const r = bodies[Math.min(i, bodies.length - 1)]
    return new Response(r.body, { status: r.status ?? 200 })
  })
  return calls
}

describe('appendReceiptToEsoda', () => {
  afterEach(() => jest.restoreAllMocks())

  it('περνά με τη μία όταν το script είναι ζεστό', async () => {
    const calls = respond({ body: JSON.stringify({ ok: true, aa: '9.4' }) })
    await expect(appendReceiptToEsoda(row)).resolves.toMatchObject({ ok: true, aa: '9.4' })
    expect(calls).toHaveLength(1)
  })

  it('ξαναδοκιμάζει όταν γυρίσει HTML αντί για JSON', async () => {
    const calls = respond({ status: 404, body: '<!DOCTYPE html>' }, { body: JSON.stringify({ ok: true, duplicate: true }) })
    const r = await appendReceiptToEsoda(row)
    expect(r.ok).toBe(true)
    // Το script αναγνωρίζει τη γραμμή που είχε ήδη γράψει — καμία διπλοεγγραφή
    expect(r.duplicate).toBe(true)
    expect(calls).toHaveLength(2)
  }, 20000)

  it('δεν ξαναδοκιμάζει σε καθαρή άρνηση του script', async () => {
    const calls = respond({ body: JSON.stringify({ ok: false, error: 'λάθος layout' }) })
    await expect(appendReceiptToEsoda(row)).resolves.toMatchObject({ ok: false, error: 'λάθος layout' })
    expect(calls).toHaveLength(1)
  }, 20000)

  it('μετά από 3 χαμένες απαντήσεις επιστρέφει αποτυχία', async () => {
    const calls = respond({ status: 500, body: 'boom' })
    const r = await appendReceiptToEsoda(row)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('3 προσπάθειες')
    expect(calls).toHaveLength(3)
  }, 20000)
})
