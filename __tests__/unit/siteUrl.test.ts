/**
 * Η φρουρά που έλειπε στις 8/10/2026: το email «ο μήνας είναι έτοιμος» έφυγε
 * από τον τοπικό διακομιστή και έφτασε στο Admin με κουμπί προς
 * http://localhost:3000/oc. Ο έλεγχος πρέπει να είναι για https — όχι για
 * «υπάρχει τιμή», που είναι ακριβώς ό,τι έκανε το `|| 'https://…'`.
 */

const load = async (value?: string) => {
  jest.resetModules()
  const prev = process.env.NEXT_PUBLIC_SITE_URL
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = value
  const mod = await import('@/lib/siteUrl')
  process.env.NEXT_PUBLIC_SITE_URL = prev
  return mod
}

const CANONICAL = 'https://www.cultureforchange.net'

describe('PUBLIC_SITE_URL', () => {
  it('ΔΕΝ δέχεται localhost — ό,τι κι αν λέει το περιβάλλον', async () => {
    for (const v of ['http://localhost:3000', 'http://localhost:3000/', 'http://127.0.0.1:3000']) {
      expect((await load(v)).PUBLIC_SITE_URL).toBe(CANONICAL)
    }
  })

  it('δεν δέχεται ούτε http σε πραγματικό τομέα', async () => {
    expect((await load('http://www.cultureforchange.net')).PUBLIC_SITE_URL).toBe(CANONICAL)
  })

  it('πέφτει στο κανονικό όταν λείπει ή είναι κενό', async () => {
    expect((await load(undefined)).PUBLIC_SITE_URL).toBe(CANONICAL)
    expect((await load('   ')).PUBLIC_SITE_URL).toBe(CANONICAL)
  })

  it('δέχεται https και κόβει την κατάληξη «/»', async () => {
    expect((await load('https://staging.cultureforchange.net/')).PUBLIC_SITE_URL)
      .toBe('https://staging.cultureforchange.net')
  })

  it('το host βγαίνει χωρίς πρωτόκολλο και χωρίς διαδρομή', async () => {
    expect((await load('http://localhost:3000')).PUBLIC_SITE_HOST).toBe('www.cultureforchange.net')
  })
})

describe('ocUrl', () => {
  it('φτιάχνει σύνδεσμο ενότητας με άγκιστρο', async () => {
    const { ocUrl } = await load('http://localhost:3000')
    expect(ocUrl('admin')).toBe(`${CANONICAL}/oc#admin`)
    expect(ocUrl('finances')).toBe(`${CANONICAL}/oc#finances`)
  })

  it('χωρίς ενότητα δίνει σκέτο /oc', async () => {
    const { ocUrl } = await load(undefined)
    expect(ocUrl()).toBe(`${CANONICAL}/oc`)
  })

  /** Η διεύθυνση μπαίνει σε email — ποτέ δεν πρέπει να δείχνει σε μηχάνημα ανάπτυξης */
  it('κανένας σύνδεσμος δεν περιέχει localhost', async () => {
    const { ocUrl, PUBLIC_SITE_URL } = await load('http://localhost:3000')
    for (const url of [PUBLIC_SITE_URL, ocUrl(), ocUrl('admin')]) {
      expect(url).not.toMatch(/localhost|127\.0\.0\.1/)
      expect(url.startsWith('https://')).toBe(true)
    }
  })
})
