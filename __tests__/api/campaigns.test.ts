import { buildRequest } from '../helpers/mockStrapi'

/**
 * Η διαδρομή της μαζικής αποστολής. Το πιο σημαντικό εδώ είναι το ΦΡΑΓΜΑ:
 * το γράμμα φτάνει σε αληθινούς ανθρώπους και δεν παίρνει πίσω.
 */

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(() => undefined), set: jest.fn(), delete: jest.fn() })),
}))
const resolveOcAccess = jest.fn()
const getBoardRoster = jest.fn(async () => [])
const getSeatHolder = jest.fn(async () => ({ name: 'Σόνια Ντόβα', engName: 'Sonia Ntova' }))
jest.mock('@/lib/ocRoles', () => ({
  get resolveOcAccess() { return resolveOcAccess },
  get getBoardRoster() { return getBoardRoster },
  get getSeatHolder() { return getSeatHolder },
  SEAT_LABELS: { admin: 'Γραμματεία', it: 'IT', financer: 'Ταμίας' },
  SEAT_MAILBOX: { admin: 'hello@cultureforchange.net', it: 'it@cultureforchange.net', financer: 'finance@cultureforchange.net' },
}))
const verifyToken = jest.fn()
jest.mock('@/lib/auth', () => ({ get verifyToken() { return verifyToken } }))

import { GET, POST } from '@/app/api/oc/campaigns/route'
import { cookies } from 'next/headers'

function signedInAs(seat: string | null, isBoard = true) {
  verifyToken.mockReturnValue({ type: 'session', memberId: 'me' })
  resolveOcAccess.mockResolvedValue({ isBoard, seats: seat ? [seat] : [] })
  ;(cookies as jest.Mock).mockResolvedValue({
    get: (n: string) => (n === 'session' ? { value: 'tok' } : n === 'oc-last-seat' && seat ? { value: seat } : undefined),
    set: jest.fn(), delete: jest.fn(),
  })
}

const members = [
  { documentId: 'a', Name: 'Μαρία Κ', Email: 'maria@x.gr', AM: 34, Payments: { '2026': 1 } },
  { documentId: 'b', Name: 'Νίκος Β', Email: 'nikos@x.gr', AM: 55, Payments: { '2026': 0 } },
]

function mockStrapi() {
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    if (url.includes('/api/members?')) return new Response(JSON.stringify({ data: members }), { status: 200 })
    if (url.includes('/api/working-groups')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
    if (url.includes('/api/oc-campaigns')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
    return new Response(JSON.stringify({ data: {} }), { status: 200 })
  })
}

const post = async (body: any) => {
  const res = await POST(buildRequest('/api/oc/campaigns', { method: 'POST', body }))
  return { status: res.status, json: await res.json() }
}

describe('Φράγμα πρόσβασης', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('χωρίς σύνδεση → 401', async () => {
    verifyToken.mockReturnValue(null)
    ;(cookies as jest.Mock).mockResolvedValue({ get: () => undefined, set: jest.fn(), delete: jest.fn() })
    expect((await POST(buildRequest('/api/oc/campaigns', { method: 'POST', body: {} }))).status).toBe(401)
  })

  it('μη μέλος ΔΣ → 403', async () => {
    signedInAs('admin', false)
    expect((await post({ action: 'resolve' })).status).toBe(403)
  })

  it('μέλος ΔΣ σε άλλη έδρα (Ταμίας) → 403', async () => {
    signedInAs('financer')
    const r = await post({ action: 'resolve' })
    expect(r.status).toBe(403)
    expect(r.json.error).toContain('Γραμματεία')
  })

  it('Γραμματεία → περνά', async () => {
    signedInAs('admin'); mockStrapi()
    expect((await post({ action: 'resolve', selection: { allMembers: true } })).status).toBe(200)
  })

  it('IT → περνά (υποστήριξη)', async () => {
    signedInAs('it'); mockStrapi()
    expect((await post({ action: 'resolve', selection: {} })).status).toBe(200)
  })
})

describe('resolve', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('επιστρέφει πλήθος, ημέρες και περίληψη', async () => {
    const { json } = await post({ action: 'resolve', selection: { allMembers: true } })
    expect(json.count).toBe(2)
    expect(json.days).toBe(1)
    expect(json.summary).toBe('2 παραλήπτες · μία αποστολή')
  })

  it('φιλτράρει κατά κατάσταση συνδρομής', async () => {
    const { json } = await post({ action: 'resolve', selection: { paymentStatus: { year: 2026, paid: false } } })
    expect(json.recipients.map((r: any) => r.email)).toEqual(['nikos@x.gr'])
  })
})

describe('preview', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('αποδίδει τα μπλοκ και λύνει τα merge fields', async () => {
    const { json } = await post({
      action: 'preview', subject: 'Γεια {{όνομα}}',
      blocks: [{ type: 'text', html: 'Αγαπητή {{όνομα}}, ΑΜ {{ΑΜ}}.' }],
    })
    expect(json.subject).toContain('Μαρία')
    expect(json.html).toContain('Αγαπητή Μαρία, ΑΜ 34.')
    expect(json.html).not.toContain('{{όνομα}}')
  })
})

describe('queue', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('αρνείται καμπάνια χωρίς παραλήπτες', async () => {
    const r = await post({ action: 'queue', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }], selection: {} })
    expect(r.status).toBe(400)
    expect(r.json.errors).toContain('Δεν έχει επιλεγεί κανένας παραλήπτης')
  })

  it('αρνείται κενό μήνυμα', async () => {
    const r = await post({ action: 'queue', subject: 'Θ', blocks: [], selection: { allMembers: true } })
    expect(r.json.errors).toContain('Το μήνυμα είναι κενό')
  })

  it('το προσχέδιο ΔΕΝ ελέγχεται — αποθηκεύεται ημιτελές', async () => {
    expect((await post({ action: 'save', subject: '', blocks: [], selection: {} })).status).toBe(200)
  })
})

describe('Υπογραφή', () => {
  beforeEach(() => { signedInAs('admin'); mockStrapi() })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('υπογράφει η ΕΔΡΑ που συνθέτει — όνομα κατόχου και θυρίδα', async () => {
    const { json } = await post({ action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }] })
    expect(json.html).toContain('Σόνια Ντόβα')
    expect(json.html).toContain('hello@cultureforchange.net')
    expect(json.html).toContain('Γραμματεία')
  })

  it('η εμφάνιση του υποσέλιδου αλλάζει ανεξάρτητα από το περιεχόμενο', async () => {
    const a = await post({ action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }], footerLook: 'plain' })
    const b = await post({ action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }], footerLook: 'dark' })
    // Και τα δύο υπογράφονται, αλλά η «Σκούρη ζώνη» βάφει το υποσέλιδο
    expect(a.json.html).toContain('Σόνια Ντόβα')
    expect(b.json.html).toContain('Σόνια Ντόβα')
    expect(a.json.html).not.toContain('background-color:#2D2D2D;border-radius:16px')
    expect(b.json.html).toContain('background-color:#2D2D2D;border-radius:16px')
  })

  it('άγνωστο στυλ δεν ρίχνει τη διαδρομή — πέφτει στο βασικό', async () => {
    const { status, json } = await post({
      action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }],
      footerStyle: 'άγνωστο', footerLook: 'κάτι-άλλο', headerStyle: 'ακόμη-ένα',
    })
    expect(status).toBe(200)
    expect(json.html).toContain('Σόνια Ντόβα')
  })

  it('οι δύο άξονες είναι ανεξάρτητοι — «Ως δίκτυο» σε σκούρη ζώνη', async () => {
    const { json } = await post({
      action: 'preview', subject: 'Θ', blocks: [{ type: 'text', html: 'x' }],
      footerStyle: 'organisation', footerLook: 'dark',
    })
    // Χωρίς πρόσωπο και χωρίς χαιρετισμό, αλλά με τη σκούρη ζώνη
    expect(json.html).not.toContain('Σόνια Ντόβα')
    expect(json.html).not.toContain('Φιλικά,')
    expect(json.html).toContain('background-color:#2D2D2D;border-radius:16px')
  })
})
