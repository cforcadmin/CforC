import { strapiFetch, isTransportFailure } from '@/lib/strapiFetch'

/**
 * Ο ΚΑΝΟΝΑΣ ΑΣΦΑΛΕΙΑΣ ΤΟΥ ΚΟΙΝΟΥ fetch.
 *
 * Η επανάληψη είναι ακίνδυνη μόνο για κλήσεις που δεν πειράζει να γίνουν
 * δύο φορές. Αν αυτό σπάσει, το τίμημα δεν είναι σφάλμα στην οθόνη — είναι
 * δεύτερη εγγραφή εσόδου ή δεύτερη απόδειξη, που κανένα σύστημα δεν
 * ανακαλύπτει· τη βρίσκει άνθρωπος που τυχαίνει να κοιτάξει.
 */

const reset = () => {
  const e: any = new TypeError('fetch failed')
  e.cause = { code: 'ECONNRESET', syscall: 'read', errno: -54 }
  return e
}
const ok = () => new Response('{}', { status: 200 })

describe('strapiFetch', () => {
  beforeEach(() => jest.restoreAllMocks())

  it('ξαναπροσπαθεί τις αναγνώσεις', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => { n++; if (n < 3) throw reset(); return ok() })
    await strapiFetch('https://s/api/x')
    expect(n).toBe(3)
  })

  it.each(['PUT', 'DELETE', 'HEAD'])('ξαναπροσπαθεί το %s — ταυτοδύναμο', async method => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => { n++; if (n < 2) throw reset(); return ok() })
    await strapiFetch('https://s/api/x', { method, body: '{}' })
    expect(n).toBe(2)
  })

  /** ΤΟ ΚΡΙΣΙΜΟ: δεύτερο POST = δεύτερη εγγραφή. */
  it('ΔΕΝ ξαναπροσπαθεί ΠΟΤΕ το POST', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => { n++; throw reset() })
    await expect(strapiFetch('https://s/api/x', { method: 'POST', body: '{}' })).rejects.toThrow()
    expect(n).toBe(1)
  })

  /**
   * Το σώμα-ροή (ανέβασμα αρχείου) διαβάζεται ΜΙΑ φορά· η δεύτερη
   * προσπάθεια θα έστελνε άδειο σώμα και θα έμοιαζε με επιτυχία.
   */
  it('ΔΕΝ ξαναπροσπαθεί όταν το σώμα δεν ξαναδιαβάζεται', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => { n++; throw reset() })
    const fd = new FormData()
    fd.append('files', new Blob(['x']), 'a.png')
    await expect(strapiFetch('https://s/api/upload', { method: 'PUT', body: fd })).rejects.toThrow()
    expect(n).toBe(1)
  })

  it('δεν ξαναπροσπαθεί όταν το Strapi ΑΠΑΝΤΗΣΕ με σφάλμα', async () => {
    let n = 0
    jest.spyOn(global, 'fetch').mockImplementation(async () => { n++; return new Response('{}', { status: 500 }) })
    const r = await strapiFetch('https://s/api/x')
    expect(r.status).toBe(500)
    expect(n).toBe(1)
  })

  /** Ένα timeout που ζητήσαμε εμείς δεν είναι πεσμένη σύνδεση. */
  it('η ακύρωση δεν μετράει ως αστοχία μεταφοράς', () => {
    expect(isTransportFailure(new DOMException('aborted', 'AbortError'))).toBe(false)
    expect(isTransportFailure(reset())).toBe(true)
    expect(isTransportFailure(new Error('κάτι άλλο'))).toBe(false)
  })
})
