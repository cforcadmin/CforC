import { NextRequest } from 'next/server'
import { mockFetch } from '../helpers/mockStrapi'

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(), set: jest.fn(), delete: jest.fn() })),
}))

import { POST as apply } from '@/app/api/apply/route'
import { applyLimiter } from '@/lib/rateLimiter'

/**
 * Αίτηση εγγραφής (/apply) — ο δρόμος που ακολουθεί πλέον και το κουμπί
 * «ΘΕΛΩ ΝΑ ΕΓΓΡΑΦΩ!» της σελίδας Συμμετοχή.
 *
 * Ελέγχουμε ό,τι κρατά την αίτηση καθαρή πριν φτάσει στο Strapi: υποχρεωτικά
 * πεδία, φωτογραφία, όροι, ΑΦΜ — και δύο μετασχηματισμούς που έχουν ήδη
 * σπάσει στο παρελθόν (FieldsOfActivity ως πίνακας, κενά προαιρετικά πεδία
 * που ΔΕΝ πρέπει να σταλούν).
 */

// Κάθε δοκιμή με δικό της IP: ο applyLimiter επιτρέπει 3 αιτήσεις/ώρα
let ipCounter = 0
const nextIp = () => `10.20.0.${++ipCounter}`

function jpeg(bytes = 64): File {
  return new File([new Uint8Array(bytes)], 'photo.jpg', { type: 'image/jpeg' })
}

/** Πλήρης, έγκυρη αίτηση — οι επιμέρους δοκιμές χαλάνε ένα πεδίο τη φορά */
function validPayload(overrides: Record<string, any> = {}) {
  return {
    FirstName: 'Μαρία', LastName: 'Παπαδοπούλου', Profession: 'Εικαστικός',
    AgeRange: '35-44', Gender: 'Γυναίκα', Disability: 'Όχι',
    ResidenceCity: 'Αθήνα', ResidenceRegion: 'Αττική', Address: 'Ερμού 1',
    ActivityCityA: 'Αθήνα', Email: 'maria@example.com', Phone: '6944123456',
    Bio: 'Σύντομο βιογραφικό.', Education: 'ΑΣΚΤ',
    BoschAlumni: 'Όχι', StartFellow: 'Όχι',
    Experience: 'Δέκα χρόνια στον χώρο.',
    FieldsOfActivity: 'Εικαστικά, Εκπαίδευση',
    EmploymentStatus: ['Ελεύθερος επαγγελματίας'],
    ActionFormats: ['Εργαστήρια'], AudienceGroups: ['Νέοι'],
    Themes: ['Βιωσιμότητα'], Challenges: ['Χρηματοδότηση'],
    AcceptStatute: true, AcceptRegulation: true, AcceptPrivacy: true,
    ...overrides,
  }
}

function buildApplyRequest(opts: {
  data?: Record<string, any>
  photo?: File | null
  honeypot?: string
  origin?: string
  ip?: string
} = {}) {
  const { data = validPayload(), photo = jpeg(), honeypot = '', origin = 'http://localhost:3000' } = opts
  const form = new FormData()
  form.append('data', JSON.stringify(data))
  if (photo) form.append('photo', photo, photo.name)
  form.append('website_hp', honeypot)
  return new NextRequest(new URL('/api/apply', 'http://localhost:3000'), {
    method: 'POST',
    headers: { origin, 'x-forwarded-for': opts.ip || nextIp() },
    body: form,
  } as any)
}

/** Οι απαντήσεις που περιμένει η διαδρομή: upload → εγγραφή → email */
function happyPathFetch() {
  return mockFetch({
    'api/upload': { ok: true, data: [{ id: 42 }] },
    'api/membership-applications': { ok: true, data: { data: { documentId: 'doc-abc' } } },
    'api.resend.com': { ok: true, data: { id: 'email-1' } },
  })
}

describe('POST /api/apply', () => {
  let fetchMock: jest.SpyInstance | undefined

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
    fetchMock = undefined
  })

  it('δέχεται πλήρη αίτηση: ανεβάζει φωτογραφία και δημιουργεί εγγραφή', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.id).toBe('doc-abc')

    const urls = fetchMock!.mock.calls.map(c => String(c[0]))
    expect(urls.some(u => u.includes('/api/upload'))).toBe(true)
    expect(urls.some(u => u.includes('/api/membership-applications'))).toBe(true)
  })

  it('στέλνει το FieldsOfActivity ως πίνακα και παραλείπει τα κενά προαιρετικά πεδία', async () => {
    fetchMock = happyPathFetch()
    await apply(buildApplyRequest({ data: validPayload({ TaxId: '', Website: '' }) }))

    const createCall = fetchMock!.mock.calls.find(c => String(c[0]).includes('/api/membership-applications'))
    expect(createCall).toBeDefined()
    const sent = JSON.parse(String((createCall![1] as any).body)).data
    expect(sent.FieldsOfActivity).toEqual(['Εικαστικά', 'Εκπαίδευση'])
    expect(sent).not.toHaveProperty('TaxId')
    expect(sent).not.toHaveProperty('Website')
    expect(sent.Photo).toBe(42)
    expect(sent.ApplicationState).toBe('submitted')
  })

  it('απαντά σιωπηλά «επιτυχία» στο honeypot χωρίς να γράψει τίποτα', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ honeypot: 'http://spam.example' }))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(fetchMock!).not.toHaveBeenCalled()
  })

  it('απορρίπτει αίτηση χωρίς φωτογραφία', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ photo: null }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/φωτογραφία/i)
  })

  it('απορρίπτει φωτογραφία σε μη επιτρεπτό τύπο', async () => {
    fetchMock = happyPathFetch()
    const pdf = new File([new Uint8Array(32)], 'cv.pdf', { type: 'application/pdf' })
    const res = await apply(buildApplyRequest({ photo: pdf }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/JPG\/PNG\/WebP/)
  })

  it('απορρίπτει φωτογραφία πάνω από 5MB', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ photo: jpeg(5 * 1024 * 1024 + 1) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/5MB/)
  })

  it.each([
    ['FirstName', ''],
    ['Experience', '   '],
    ['Education', ''],
  ])('απορρίπτει αίτηση με κενό υποχρεωτικό πεδίο %s', async (field, value) => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ data: validPayload({ [field]: value }) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain(field)
  })

  it('απορρίπτει αίτηση με άδειο υποχρεωτικό πολλαπλής επιλογής', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ data: validPayload({ Themes: [] }) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Themes')
  })

  it('απορρίπτει μη έγκυρο email και μη έγκυρο τηλέφωνο', async () => {
    fetchMock = happyPathFetch()
    const bad = await apply(buildApplyRequest({ data: validPayload({ Email: 'not-an-email' }) }))
    expect(bad.status).toBe(400)
    expect((await bad.json()).error).toMatch(/email/i)

    const shortPhone = await apply(buildApplyRequest({ data: validPayload({ Phone: '69441' }) }))
    expect(shortPhone.status).toBe(400)
    expect((await shortPhone.json()).error).toMatch(/τηλέφωνο/i)
  })

  it('απορρίπτει βιογραφικό πάνω από 200 λέξεις', async () => {
    fetchMock = happyPathFetch()
    const bio = Array.from({ length: 201 }, (_, i) => `λέξη${i}`).join(' ')
    const res = await apply(buildApplyRequest({ data: validPayload({ Bio: bio }) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/200/)
  })

  it('απαιτεί αποδοχή και των τριών κειμένων', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ data: validPayload({ AcceptPrivacy: false }) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/αποδοχή/i)
  })

  it('απορρίπτει ΑΦΜ που δεν έχει 9 ψηφία', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ data: validPayload({ TaxId: '1234' }) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/9 ψηφία/)
  })

  it('σε τιμολόγιο εταιρείας ζητά επωνυμία, διεύθυνση και εταιρικό ΑΦΜ', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({
      data: validPayload({ ReceiptType: 'Εταιρεία', CompanyName: 'ΑΒΓ ΑΕ', CompanyAddress: 'Σταδίου 5', CompanyTaxId: '12345' }),
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/ΑΦΜ εταιρείας/)
  })

  it('μπλοκάρει αίτηση από ξένο origin (CSRF)', async () => {
    fetchMock = happyPathFetch()
    const res = await apply(buildApplyRequest({ origin: 'https://evil.example' }))
    expect(res.status).toBe(403)
  })

  it('κόβει στην 4η αίτηση από το ίδιο IP μέσα στην ίδια ώρα', async () => {
    fetchMock = happyPathFetch()
    const ip = '10.30.0.99'
    applyLimiter.reset(ip)
    for (let i = 0; i < 3; i++) {
      const ok = await apply(buildApplyRequest({ ip }))
      expect(ok.status).toBe(200)
    }
    const blocked = await apply(buildApplyRequest({ ip }))
    expect(blocked.status).toBe(429)
    applyLimiter.reset(ip)
  })

  it('δεν χάνει την αίτηση όταν αποτύχει το email επιβεβαίωσης', async () => {
    fetchMock = mockFetch({
      'api/upload': { ok: true, data: [{ id: 7 }] },
      'api/membership-applications': { ok: true, data: { data: { documentId: 'doc-xyz' } } },
      'api.resend.com': { ok: false, status: 500 },
    })
    const res = await apply(buildApplyRequest())
    expect(res.status).toBe(200)
    expect((await res.json()).id).toBe('doc-xyz')
  })

  it('επιστρέφει 502 όταν αποτύχει το ανέβασμα της φωτογραφίας', async () => {
    fetchMock = mockFetch({ 'api/upload': { ok: false, status: 500 } })
    const res = await apply(buildApplyRequest())
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/φωτογραφίας/)
  })

  it('επιστρέφει 502 όταν αποτύχει η δημιουργία της εγγραφής', async () => {
    fetchMock = mockFetch({
      'api/upload': { ok: true, data: [{ id: 9 }] },
      'api/membership-applications': { ok: false, status: 500 },
    })
    const res = await apply(buildApplyRequest())
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/υποβολής/)
  })
})
