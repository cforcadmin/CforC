import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'
import { fetchAgenda, agendaDocUrl, agendaConfigured } from '@/lib/googleDocs'

export const maxDuration = 60

/**
 * Ημερήσια διάταξη — ανάγνωση του εγγράφου πρακτικών.
 * Ορατή σε όλο το ΔΣ· καμία εγγραφή, το έγγραφο μένει η πηγή αλήθειας.
 */
export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })

  const { meetings, error } = await fetchAgenda(3)
  return NextResponse.json({
    meetings,
    docUrl: agendaDocUrl(),
    configured: agendaConfigured(),
    error: error || null,
  })
}
