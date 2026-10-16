import { cachedJson, invalidate, cacheKeys } from '@/lib/strapiCache'

/**
 * Η μνήμη είναι σβηστή όταν NODE_ENV==='test', οπότε τα τεστ τη ζητούν ρητά
 * αλλάζοντας το περιβάλλον — αλλιώς θα έλεγχαν τη σβηστή διαδρομή.
 */
const withCache = async (fn: () => Promise<void>) => {
  const prev = process.env.NODE_ENV
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true })
  try { await fn() } finally {
    Object.defineProperty(process.env, 'NODE_ENV', { value: prev, configurable: true })
  }
}

describe('Μνήμη αναγνώσεων Strapi', () => {
  beforeEach(() => invalidate())

  it('η ίδια ερώτηση μέσα στο παράθυρο δεν ξαναφεύγει', () => withCache(async () => {
    let calls = 0
    const load = async () => { calls++; return { n: calls } }
    expect(await cachedJson('k', 1000, load)).toEqual({ n: 1 })
    expect(await cachedJson('k', 1000, load)).toEqual({ n: 1 })
    expect(calls).toBe(1)
  }))

  /** Το TTL ΔΕΝ αρκεί: δύο ταυτόχρονες ίδιες ερωτήσεις ξεκινούν πριν γράψει καμία */
  it('δύο ταυτόχρονες ίδιες ερωτήσεις μοιράζονται ΜΙΑ κλήση', () => withCache(async () => {
    let calls = 0
    const load = () => { calls++; return new Promise(r => setTimeout(() => r({ ok: true }), 20)) }
    const [a, b] = await Promise.all([cachedJson('x', 1000, load), cachedJson('x', 1000, load)])
    expect(calls).toBe(1)
    expect(a).toEqual(b)
  }))

  it('λήξη του παραθύρου ⇒ νέα κλήση', () => withCache(async () => {
    let calls = 0
    const load = async () => { calls++; return calls }
    await cachedJson('t', 1, load)
    await new Promise(r => setTimeout(r, 5))
    await cachedJson('t', 1, load)
    expect(calls).toBe(2)
  }))

  it('η ακύρωση με πρόθεμα αγγίζει ΜΟΝΟ τα δικά της κλειδιά', () => withCache(async () => {
    await cachedJson('oc-tasks:boards', 1000, async () => 1)
    await cachedJson('oc-tasks:tasks', 1000, async () => 2)
    await cachedJson('members:assignable', 1000, async () => 3)
    invalidate('oc-tasks:')
    expect(cacheKeys()).toEqual(['members:assignable'])
  }))

  it('στα τεστ είναι σβηστή — αλλιώς το ένα τεστ ταΐζει το άλλο', async () => {
    let calls = 0
    const load = async () => { calls++; return calls }
    await cachedJson('off', 1000, load)
    await cachedJson('off', 1000, load)
    expect(calls).toBe(2)
  })
})
