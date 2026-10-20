/**
 * ΜΙΑ ΠΕΣΜΕΝΗ ΣΥΝΔΕΣΗ ΔΕΝ ΡΙΧΝΕΙ ΟΛΟΚΛΗΡΗ ΤΗ ΣΕΛΙΔΑ.
 *
 * 20/10/2026, μετρημένο: σε ~60 κλήσεις προς το Strapi Cloud τέσσερις
 * γύρισαν `ECONNRESET` — σε ριπές, και δύο φορές ΔΥΟ στη σειρά. Μία τέτοια
 * αστοχία μέσα σε server component πετούσε την απόδοση στο `app/error.tsx`:
 * ο επισκέπτης έβλεπε σελίδα σφάλματος επειδή μια πρίζα ήταν μπαγιάτικη.
 *
 * Οι ΑΝΑΓΝΩΣΕΙΣ επαναλαμβάνονται — είναι ακίνδυνο. Οι ΕΓΓΡΑΦΕΣ όχι: μια
 * εγγραφή που δεν απάντησε μπορεί να έχει ήδη περάσει.
 */

const connectionReset = () => {
  const e: any = new TypeError('fetch failed')
  e.cause = { code: 'ECONNRESET', syscall: 'read', errno: -54 }
  return e
}

const okJson = (data: any = { data: [] }) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })

describe('Οι αναγνώσεις του Strapi αντέχουν πεσμένη σύνδεση', () => {
  const realEnv = { ...process.env }
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.resetModules()
    process.env.STRAPI_URL = 'https://strapi.example'
    process.env.STRAPI_API_TOKEN = 'tok'
  })
  afterEach(() => { process.env = { ...realEnv } })

  const load = async () => (await import('@/lib/strapi')) as any

  it('ξαναπροσπαθεί και περνά, αντί να ρίξει τη σελίδα', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      n++
      if (n === 1) throw connectionReset()
      return okJson({ data: [{ id: 1 }] })
    })
    const { getActivities } = await load()
    await expect(getActivities()).resolves.toBeDefined()
    expect(n).toBe(2)
  })

  /** Δύο στη σειρά ΣΥΝΕΒΗΣΑΝ στη μέτρηση — μία επανάληψη δεν τις καλύπτει. */
  it('αντέχει ΔΥΟ διαδοχικές αστοχίες', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      n++
      if (n <= 2) throw connectionReset()
      return okJson({ data: [] })
    })
    const { getActivities } = await load()
    await expect(getActivities()).resolves.toBeDefined()
    expect(n).toBe(3)
  })

  it('δεν προσπαθεί για πάντα — τρεις φορές και σταματά', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => { n++; throw connectionReset() })
    const { getActivities } = await load()
    await expect(getActivities()).rejects.toThrow()
    expect(n).toBe(3)
  })

  /** Ένα 500 του Strapi ΔΕΝ είναι πεσμένη σύνδεση: απαντήθηκε. */
  it('δεν επαναλαμβάνει απάντηση σφάλματος του Strapi', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      n++
      return new Response('{}', { status: 500 })
    })
    const { getActivities } = await load()
    await expect(getActivities()).rejects.toThrow()
    expect(n).toBe(1)
  })
})
