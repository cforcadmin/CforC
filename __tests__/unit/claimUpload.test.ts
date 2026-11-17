import {
  readJsonResponse, tooLargeMessage, totalBytes, shrinkImageFile, MAX_REQUEST_BYTES,
} from '@/lib/claimUpload'

const mk = (body: string, init: ResponseInit) => new Response(body, init)

describe('readJsonResponse', () => {
  it('returns data on OK JSON', async () => {
    const r = await readJsonResponse(mk('{"claimNumber":"ΕΞ-2026-012","payable":18.28}', { status: 200 }))
    expect(r.error).toBeNull()
    expect(r.data.claimNumber).toBe('ΕΞ-2026-012')
  })

  it('turns the Vercel 413 text into a human message, never a parser error', async () => {
    const r = await readJsonResponse(mk('Request Entity Too Large', { status: 413 }))
    expect(r.error).toMatch(/πολύ μεγάλα/)
    expect(r.error).not.toMatch(/Unexpected token|JSON/)
    expect(r.data).toBeNull()
  })

  it('uses the server error message when the body is JSON', async () => {
    const r = await readJsonResponse(mk('{"error":"Λείπει η υπογραφή"}', { status: 400 }))
    expect(r.error).toBe('Λείπει η υπογραφή')
  })

  it('falls back to the status code when a non-OK body is not JSON', async () => {
    const r = await readJsonResponse(mk('<html>Bad Gateway</html>', { status: 502 }))
    expect(r.error).toMatch(/502/)
  })
})

describe('size gate', () => {
  it('sums file sizes', () => {
    expect(totalBytes([{ size: 10 }, { size: 32 }])).toBe(42)
  })
  it('message states both the total and the limit, in MB, with what to do', () => {
    const m = tooLargeMessage(6 * 1024 * 1024)
    expect(m).toMatch(/6 MB/)
    expect(m).toMatch(/4 MB/)
    expect(m).toMatch(/PDF/)
  })
  it('limit stays under the Vercel 4.5 MB cap', () => {
    expect(MAX_REQUEST_BYTES).toBeLessThan(4.5 * 1024 * 1024)
  })
})

describe('shrinkImageFile outside a browser', () => {
  it('returns the same file untouched when there is no canvas (PDF, small file, node)', async () => {
    const pdf = new File([new Uint8Array(10)], 'a.pdf', { type: 'application/pdf' })
    expect(await shrinkImageFile(pdf)).toBe(pdf)
    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'IMG_1.jpeg', { type: 'image/jpeg' })
    // node: δεν υπάρχει createImageBitmap/document → πρωτότυπο, χωρίς throw
    expect(await shrinkImageFile(big)).toBe(big)
  })
})
