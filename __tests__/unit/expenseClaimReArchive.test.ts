/**
 * Επανάληψη αρχειοθέτησης εξοδολογίου.
 *
 * Το κρίσιμο εδώ δεν είναι ότι «ανεβάζει»: είναι ΠΟΥ ανεβάζει. Ένα εξοδολόγιο
 * του Σεπτεμβρίου που ξανα-ανεβαίνει τον Οκτώβριο πρέπει να πάει στον φάκελο
 * του ΣΕΠΤΕΜΒΡΙΟΥ, αλλιώς χαλά η μηνιαία συμφωνία.
 */

const archiveExpenseClaim = jest.fn(async () => ({ ok: true, folderUrl: 'https://drive/f', pdfUrl: 'https://drive/p', pdfId: 'p1' }))
const archiveConfigured = jest.fn(() => true)
const generateExpenseClaimPdf = jest.fn(async () => new Uint8Array([1, 2, 3]))

jest.mock('@/lib/expenseClaimArchive', () => ({
  get archiveExpenseClaim() { return archiveExpenseClaim },
  get archiveConfigured() { return archiveConfigured },
}))
jest.mock('@/lib/expenseClaimPdf', () => ({
  get generateExpenseClaimPdf() { return generateExpenseClaimPdf },
}))

import { reArchiveExpenseClaim } from '@/lib/expenseClaimReArchive'

const claim = (over: any = {}) => ({
  ClaimNumber: 'ΕΞ-2026-002',
  MemberName: 'Έφη Πρόικου', MemberEmail: 'efi@example.gr',
  AccountHolder: 'Έφη Πρόικου', Iban: 'GR7101401420142002320005140',
  EventType: 'Συνάντηση', EventStart: '2026-09-20', EventEnd: '2026-09-20',
  TravelLegs: [], Lines: [], Total: 39.78, Advance: 0, Payable: 39.78,
  SubmittedAt: '2026-09-28T09:00:00.000Z',
  Attachments: [],
  ...over,
})

describe('Επανάληψη αρχειοθέτησης', () => {
  afterEach(() => { jest.clearAllMocks(); archiveConfigured.mockReturnValue(true) })

  it('ανεβάζει στον μήνα της ΥΠΟΒΟΛΗΣ, όχι της επανάληψης', async () => {
    await reArchiveExpenseClaim(claim({ SubmittedAt: '2026-09-28T09:00:00.000Z' }))
    expect(archiveExpenseClaim).toHaveBeenCalledWith(expect.objectContaining({ month: '2026-09' }))
  })

  it('ο μήνας μετριέται σε ώρα Αθήνας — τα μεσάνυχτα UTC ανήκουν στην επόμενη μέρα εδώ', async () => {
    // 30/9 23:30 UTC = 1/10 02:30 Αθήνα → Οκτώβριος
    await reArchiveExpenseClaim(claim({ SubmittedAt: '2026-09-30T23:30:00.000Z' }))
    expect(archiveExpenseClaim).toHaveBeenCalledWith(expect.objectContaining({ month: '2026-10' }))
  })

  it('κατεβάζει τα συνημμένα από τη Βιβλιοθήκη και τα στέλνει base64', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([65, 66]), { status: 200 }) as any,
    )
    await reArchiveExpenseClaim(claim({
      Attachments: [{ url: 'https://media/x.pdf', name: 'x.pdf', mime: 'application/pdf' }],
    }))
    const arg = archiveExpenseClaim.mock.calls[0]![0] as any
    expect(arg.attachments).toHaveLength(1)
    expect(arg.attachments[0]).toMatchObject({ name: 'x.pdf', mime: 'application/pdf', base64: 'QUI=' })
    jest.restoreAllMocks()
  })

  it('συνημμένο που δεν κατεβαίνει ΔΕΝ ακυρώνει την αρχειοθέτηση — μετριέται', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 404 }) as any)
    const r = await reArchiveExpenseClaim(claim({
      Attachments: [{ url: 'https://media/missing.pdf', name: 'missing.pdf', mime: 'application/pdf' }],
    }))
    expect(r.ok).toBe(true)
    expect(r.missingAttachments).toBe(1)
    jest.restoreAllMocks()
  })

  it('χωρίς ρυθμισμένο Apps Script δεν προσπαθεί καν', async () => {
    archiveConfigured.mockReturnValue(false)
    const r = await reArchiveExpenseClaim(claim())
    expect(r.ok).toBe(false)
    expect(archiveExpenseClaim).not.toHaveBeenCalled()
  })

  it('χωρίς αριθμό εξοδολογίου σταματά — ο αριθμός είναι το όνομα του αρχείου', async () => {
    const r = await reArchiveExpenseClaim(claim({ ClaimNumber: '' }))
    expect(r.ok).toBe(false)
    expect(archiveExpenseClaim).not.toHaveBeenCalled()
  })
})
