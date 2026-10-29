/**
 * updateMemberEmailInSheet — ίδια πειθαρχία με το removeApplicantFromSheet:
 * επανάληψη σε κρύα εκκίνηση, ΟΧΙ επανάληψη σε καθαρό ok:false, και
 * `lostReply` όταν η απάντηση χάθηκε — ώστε «0 κελιά» μετά από χαμένη
 * απάντηση να μη διαβαστεί ως «δεν υπήρχε».
 */

process.env.SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/TEST/exec'
process.env.SHEET_WEBAPP_SECRET = 'test-secret'

const { updateMemberEmailInSheet } = require('@/lib/googleSheets')

const okBody = JSON.stringify({ ok: true, replaced: 3, sheets: ['Επισκόπηση (1)', 'Συνδρομές (1)', 'Νέα Μέλη (1)'] })
const zeroBody = JSON.stringify({ ok: true, replaced: 0, sheets: [] })

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

describe('updateMemberEmailInSheet', () => {
  afterEach(() => jest.restoreAllMocks())

  it('γυρίζει πλήθος και φύλλα όταν το script είναι ζεστό', async () => {
    const calls = respond({ body: okBody })
    await expect(updateMemberEmailInSheet('old@b.gr', 'new@b.gr')).resolves.toEqual({
      replaced: 3, sheets: ['Επισκόπηση (1)', 'Συνδρομές (1)', 'Νέα Μέλη (1)'], lostReply: false,
    })
    expect(calls).toHaveLength(1)
  })

  it('στέλνει την ενέργεια updateEmail με παλιό και νέο email', async () => {
    respond({ body: okBody })
    await updateMemberEmailInSheet('old@b.gr', 'new@b.gr')
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body).toMatchObject({ action: 'updateEmail', oldEmail: 'old@b.gr', newEmail: 'new@b.gr', secret: 'test-secret' })
  })

  it('ξαναδοκιμάζει σε HTML και σημειώνει lostReply όταν η επανάληψη βρει 0 κελιά', async () => {
    const calls = respond({ status: 404, body: '<!DOCTYPE html><html>…' }, { body: zeroBody })
    await expect(updateMemberEmailInSheet('old@b.gr', 'new@b.gr')).resolves.toEqual({
      replaced: 0, sheets: [], lostReply: true,
    })
    expect(calls).toHaveLength(2)
  }, 20000)

  it('ξαναδοκιμάζει όταν απαντήσει το doGet αντί για την ενέργεια', async () => {
    const calls = respond({ body: 'CforC OC bridge: ενεργή ✓' }, { body: okBody })
    await expect(updateMemberEmailInSheet('old@b.gr', 'new@b.gr')).resolves.toMatchObject({ replaced: 3, lostReply: true })
    expect(calls).toHaveLength(2)
  }, 20000)

  it('μετά από 3 αποτυχίες πετάει', async () => {
    const calls = respond({ status: 500, body: 'boom' })
    await expect(updateMemberEmailInSheet('old@b.gr', 'new@b.gr')).rejects.toThrow('3 προσπάθειες')
    expect(calls).toHaveLength(3)
  }, 20000)

  it('δεν ξαναδοκιμάζει σε καθαρό ok:false — π.χ. άγνωστη ενέργεια πριν μπει ο κώδικας', async () => {
    const calls = respond({ body: JSON.stringify({ ok: false, error: 'Άγνωστη ενέργεια: updateEmail' }) })
    await expect(updateMemberEmailInSheet('old@b.gr', 'new@b.gr')).rejects.toThrow('updateEmail')
    expect(calls).toHaveLength(1)
  }, 20000)
})
