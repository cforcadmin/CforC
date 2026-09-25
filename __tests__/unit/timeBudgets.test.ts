import fs from 'fs'

process.env.SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/TEST/exec'
process.env.SHEET_WEBAPP_SECRET = 'test-secret'
const { recordSubscriptionYearInSheet } = require('@/lib/googleSheets')

/**
 * Τα χρονικά όρια.
 *
 * Μια κρύα κλήση στο Apps Script θέλει 40–60s (μετρημένο 25/9: 43,8 και 57,7).
 * Τρεις προσπάθειες επί δύο τέτοιες κλήσεις στην ίδια διαδρομή ξεπερνούν και
 * τα 300s, οπότε δεν αρκεί να ανέβει το maxDuration — ο βρόχος πρέπει να
 * σταματά μόνος του πριν τον σκοτώσει η πλατφόρμα στη μέση μιας εγγραφής.
 */

describe('Φραγμός χρόνου στον βρόχο επανάληψης', () => {
  afterEach(() => jest.restoreAllMocks())

  it('σταματά χωρίς νέα προσπάθεια όταν έχει περάσει το budget', async () => {
    let now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    const calls: number[] = []
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      calls.push(1)
      now += 200_000            // η πρώτη κλήση έφαγε μόνη της το budget
      return new Response('<!DOCTYPE html>', { status: 404 })
    })
    await expect(recordSubscriptionYearInSheet(34, 2026)).rejects.toThrow('λήξη χρόνου')
    expect(calls).toHaveLength(1)   // καμία δεύτερη προσπάθεια
  })

  it('μέσα στο budget ξαναδοκιμάζει κανονικά', async () => {
    let now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    const calls: number[] = []
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      calls.push(1)
      now += 1_000
      return calls.length === 1
        ? new Response('<!DOCTYPE html>', { status: 404 })
        : new Response(JSON.stringify({ ok: true, recorded: {} }), { status: 200 })
    })
    await expect(recordSubscriptionYearInSheet(34, 2026)).resolves.toBeUndefined()
    expect(calls).toHaveLength(2)
  }, 20000)

  it('και οι τρεις βρόχοι έχουν φραγμό', () => {
    const gs = fs.readFileSync('lib/googleSheets.ts', 'utf8')
    const fin = fs.readFileSync('lib/financeSheet.ts', 'utf8')
    expect((gs.match(/const deadline = Date\.now\(\)/g) || []).length).toBe(2)
    expect((fin.match(/const deadline = Date\.now\(\)/g) || []).length).toBe(1)
  })
})

describe('maxDuration στις αργές διαδρομές', () => {
  it('αποδείξεις και cron διαγραφής στα 300s', () => {
    for (const f of ['app/api/oc/receipts/route.ts', 'app/api/cron/payment-reminders/route.ts']) {
      expect(fs.readFileSync(f, 'utf8')).toContain('export const maxDuration = 300')
    }
  })
})
