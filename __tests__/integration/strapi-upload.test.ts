/**
 * Strapi upload integration tests — exercises CVE-2026-22707 (MIME bypass).
 *
 * Uses native FormData + Blob to match the production code path in
 * app/api/members/update/route.ts (which uses globalThis.FormData).
 *
 * - Valid PNG should upload and return a file with mime: 'image/png'.
 * - File with .png extension/MIME but actual non-image content should be
 *   rejected after upgrading to v5.37.0+. On vulnerable versions the
 *   rejection test will fail — that failure is the signal that the
 *   upgrade is needed.
 *
 * Uploaded test files are deleted in afterAll.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

const HAS_STRAPI = Boolean(STRAPI_URL && STRAPI_TOKEN && !STRAPI_URL.includes('localhost:1337'))

const itIfStrapi = HAS_STRAPI ? it : it.skip
const describeIfStrapi = HAS_STRAPI ? describe : describe.skip

// 1×1 transparent PNG
const VALID_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cf' +
    'c0c0c0000005000101a0a06ff800000000049454e44ae426082',
  'hex'
)

// Looks like a PNG by extension/MIME claim, but content is HTML/JS
const FAKE_PNG_HTML = Buffer.from(
  '<html><body><script>alert("xss")</script></body></html>',
  'utf-8'
)

const uploadedFileIds: number[] = []

async function uploadFile(buffer: Buffer, filename: string, contentType: string) {
  const fd = new FormData()
  fd.append('files', new Blob([buffer], { type: contentType }), filename)

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: fd,
  })

  const text = await res.text()
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text }
  }

  return { status: res.status, ok: res.ok, body }
}

async function deleteFile(id: number) {
  await fetch(`${STRAPI_URL}/api/upload/files/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
  }).catch(() => {})
}

beforeAll(() => {
  if (!HAS_STRAPI) {
    // eslint-disable-next-line no-console
    console.warn('[integration] STRAPI_URL/STRAPI_API_TOKEN not configured — skipping Strapi upload tests')
  }
})

afterAll(async () => {
  for (const id of uploadedFileIds) {
    await deleteFile(id)
  }
})

describeIfStrapi('Strapi upload', () => {
  itIfStrapi('accepts a valid PNG and returns mime image/png', async () => {
    const { status, ok, body } = await uploadFile(VALID_PNG, `cforc-test-${Date.now()}.png`, 'image/png')
    expect(ok).toBe(true)
    expect([200, 201]).toContain(status)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    expect(body[0].url).toBeDefined()
    expect(body[0].mime).toBe('image/png')

    if (body[0].id) uploadedFileIds.push(body[0].id)
  })

  itIfStrapi('rejects file with .png extension but non-image content (CVE-2026-22707)', async () => {
    const { status, ok, body } = await uploadFile(
      FAKE_PNG_HTML,
      `cforc-fake-${Date.now()}.png`,
      'image/png'
    )

    if (ok && Array.isArray(body) && body[0]?.id) {
      uploadedFileIds.push(body[0].id)
    }

    // Post-fix (v5.37+): Strapi should reject mismatched MIME with 4xx.
    // Pre-fix: Strapi accepts (ok:true) — this is the upgrade signal.
    expect(ok).toBe(false)
    expect(status).toBeGreaterThanOrEqual(400)
    expect(status).toBeLessThan(500)
  })
})
