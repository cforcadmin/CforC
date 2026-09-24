/**
 * Η επανάληψη στο removeApplicantFromSheet.
 *
 * Το cron τρέχει μία φορά την ημέρα, άρα κάθε πραγματική διαγραφή πέφτει σε
 * κρύο Apps Script — ακριβώς εκεί που μετρήθηκε 2/2 αποτυχίες: μια φορά σελίδα
 * HTML 404 και μια φορά το κείμενο του doGet, ενώ η εκτέλεση είχε ολοκληρωθεί
 * κανονικά. Χωρίς επανάληψη, το email ειδοποίησης θα έλεγε ψέματα.
 */

process.env.SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/TEST/exec'
process.env.SHEET_WEBAPP_SECRET = 'test-secret'

const { removeApplicantFromSheet } = require('@/lib/googleSheets')

const okBody = JSON.stringify({ ok: true, cleared: { blockFound: true, sheet: 'Νέα Μέλη', row: 0 } })

function respond(...bodies: Array<{ status?: number; body: string }>) {
  const calls: number[] = []
  jest.spyOn(global, 'fetch').mockImplementation(async () => {
    const i = calls.length
    calls.push(i)
    const r = bodies[Math.min(i, bodies.length - 1)]
    return new Response(r.body, { status: r.status ?? 200 })
  })
  return calls
}

describe('removeApplicantFromSheet — κρύα εκκίνηση', () => {
  afterEach(() => jest.restoreAllMocks())

  it('περνά με τη μία όταν το script είναι ζεστό', async () => {
    const calls = respond({ body: okBody })
    await expect(removeApplicantFromSheet('a@b.gr')).resolves.toBeUndefined()
    expect(calls).toHaveLength(1)
  })

  it('ξαναδοκιμάζει όταν γυρίσει σελίδα HTML αντί για JSON', async () => {
    const calls = respond({ status: 404, body: '<!DOCTYPE html><html>…' }, { body: okBody })
    await expect(removeApplicantFromSheet('a@b.gr')).resolves.toBeUndefined()
    expect(calls).toHaveLength(2)
  }, 20000)

  it('ξαναδοκιμάζει όταν απαντήσει το doGet αντί για την ενέργεια', async () => {
    // 200, αλλά σκέτο κείμενο — αυτό ακριβώς ήρθε στην πρώτη κρύα κλήση
    const calls = respond({ body: 'CforC OC bridge: ενεργή ✓' }, { body: okBody })
    await expect(removeApplicantFromSheet('a@b.gr')).resolves.toBeUndefined()
    expect(calls).toHaveLength(2)
  }, 20000)

  it('μετά από 3 αποτυχίες πετάει, ώστε να γραφτεί ως εκκρεμότητα στο email', async () => {
    const calls = respond({ status: 500, body: 'boom' })
    await expect(removeApplicantFromSheet('a@b.gr')).rejects.toThrow('3 προσπάθειες')
    expect(calls).toHaveLength(3)
  }, 20000)

  it('δεν ξαναδοκιμάζει όταν το script απαντά καθαρά ok:false — δεν είναι δικτυακό', async () => {
    const calls = respond({ body: JSON.stringify({ ok: false, error: 'Δεν βρέθηκε το μπλοκ ΕΓΚΕΚΡΙΜΕΝΑ' }) })
    await expect(removeApplicantFromSheet('a@b.gr')).rejects.toThrow('ΕΓΚΕΚΡΙΜΕΝΑ')
    expect(calls).toHaveLength(1)   // καμία επανάληψη: η απάντηση ήταν οριστική
  }, 20000)
})
