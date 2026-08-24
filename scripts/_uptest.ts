import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { randomBytes } from 'crypto'

async function main() {
  const { getAccessToken, SCOPES } = await import('../lib/googleAuth')
  const token = await getAccessToken(SCOPES.driveWrite)
  const SIZE = 18 * 1024 * 1024
  const bytes = randomBytes(SIZE)

  // 1. Συνεδρία όπως τη φτιάχνει η διαδρομή μας — με Origin του localhost
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'application/pdf',
      'X-Upload-Content-Length': String(SIZE),
      Origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ name: 'ΔΟΚΙΜΗ-18MB-να-διαγραφεί.pdf', parents: ['1QrZV0ixXvjITBsU95AHmoeg2Kqa2RJj9'] }),
  })
  console.log('συνεδρία:', res.status, res.ok ? '✓' : (await res.text()).slice(0, 200))
  const url = res.headers.get('location')
  if (!url) return

  // 2. PUT 18MB στη συνεδρία (όπως ο browser, χωρίς CORS)
  const put = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: bytes as any,
    // @ts-ignore — απαιτείται από το undici για body-stream
    duplex: 'half',
  })
  const j: any = await put.json().catch(() => null)
  console.log('PUT 18MB:', put.status, j?.id ? `✓ id=${j.id} μέγεθος=${(Number(j.size ?? SIZE)/1024/1024).toFixed(1)}MB` : 'χωρίς id')
  console.log('CORS στο PUT; access-control-allow-origin =', put.headers.get('access-control-allow-origin') ?? '(απουσιάζει)')

  // 3. Καθάρισμα
  if (j?.id) {
    const del = await fetch(`https://www.googleapis.com/drive/v3/files/${j.id}?supportsAllDrives=true`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    console.log('οριστική διαγραφή δοκιμαστικού:', del.status === 204 ? '✓' : del.status)
  }
}
main()
