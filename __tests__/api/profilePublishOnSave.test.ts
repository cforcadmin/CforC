import { buildRequest } from '../helpers/mockStrapi'
import { generateSessionToken } from '@/lib/auth'

/**
 * Πότε μια αποθήκευση προφίλ ΔΗΜΟΣΙΕΥΕΙ το μέλος.
 *
 * Ο κανόνας «πάντα HideProfile:false» φτιάχτηκε για τη ράμπα εισόδου, όταν τα
 * προφίλ γεννιούνταν κρυμμένα και δημοσιεύονταν αφού το μέλος συμπλήρωνε
 * φωτογραφία και στοιχεία. Είχε όμως μια σοβαρή παρενέργεια: η διαγραφή
 * μέλους μηδενίζει το ΑΜ και κρύβει το προφίλ, οπότε ένα μέλος που είχε
 * αποχωρήσει ΕΠΑΝΕΡΧΟΤΑΝ δημόσια μόλις άλλαζε ένα οποιοδήποτε πεδίο.
 *
 * Κριτήριο πλέον: υπάρχει ΑΜ — δηλαδή «είναι στο μητρώο».
 */
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ get: jest.fn(), set: jest.fn(), delete: jest.fn() })),
}))

import { POST } from '@/app/api/members/update/route'

/** Στήνει το Strapi και επιστρέφει ό,τι γράφτηκε στο PUT του μέλους */
function mockMember(member: Record<string, any>) {
  const put: { body: any } = { body: null }
  jest.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const json = (d: any) => new Response(JSON.stringify(d), { status: 200 })
    // Αναζήτηση διπλότυπου email → κανένα
    if (url.includes('filters[Email]')) return json({ data: [] })
    if (url.includes('filters[documentId]')) return json({ data: [member] })
    if (url.match(/\/api\/members\/\d+/) && init?.method === 'PUT') {
      put.body = JSON.parse(init.body).data
      return json({ data: { ...member } })
    }
    return json({ data: member })
  })
  return put
}

const save = async (name = 'Νέο όνομα') => {
  const token = generateSessionToken('m1', 'a@b.com')
  return POST(buildRequest('/api/members/update', {
    method: 'POST', body: { Name: name }, cookies: { session: token },
  }))
}

const BASE = { id: 7, documentId: 'm1', Name: 'Παλιό', Email: 'a@b.com', HideProfile: true }

describe('Δημοσίευση προφίλ με την αποθήκευση', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('μέλος του μητρώου δημοσιεύεται όταν σώσει το προφίλ του', async () => {
    // Τα 24 παλιά κρυμμένα μέλη: έχουν ΑΜ και περιμένουν αυτή τη ράμπα
    const put = mockMember({ ...BASE, AM: 47 })
    await save()
    expect(put.body.HideProfile).toBe(false)
  })

  it('μέλος που ΑΠΟΧΩΡΗΣΕ δεν επανέρχεται δημόσια αλλάζοντας ένα πεδίο', async () => {
    // Η διαγραφή μηδενίζει το ΑΜ και κρύβει το προφίλ
    const put = mockMember({ ...BASE, AM: null, AdminNotes: 'Διαγραφή από OC 26/9/2026 (πρώην ΑΜ 12)' })
    await save()
    expect(put.body.HideProfile).toBeUndefined()
  })

  it('λογαριασμός χωρίς ΑΜ δεν δημοσιεύεται ποτέ μόνος του', async () => {
    // π.χ. δοκιμαστικοί λογαριασμοί, ή πρόσωπα εκτός μητρώου
    const put = mockMember({ ...BASE, AM: null })
    await save()
    expect(put.body.HideProfile).toBeUndefined()
  })

  it('η αποθήκευση ΔΕΝ ξανακρύβει ένα ήδη δημόσιο μέλος', async () => {
    const put = mockMember({ ...BASE, AM: 3, HideProfile: false })
    await save()
    expect(put.body.HideProfile).toBe(false)
  })

  it('το αποχωρήσαν μέλος ΣΩΖΕΙ κανονικά — απλώς μένει κρυμμένο', async () => {
    // Δεν μπλοκάρουμε την αποθήκευση· μόνο τη δημοσίευση. Ο λογαριασμός
    // παραμένει χρηστικός, όπως ορίζει η «ήπια αφαίρεση».
    const put = mockMember({ ...BASE, AM: null })
    const res = await save('Αλλαγμένο όνομα')
    expect(res.status).toBe(200)
    expect(put.body.Name).toBe('Αλλαγμένο όνομα')
    expect(put.body.HideProfile).toBeUndefined()
  })
})
