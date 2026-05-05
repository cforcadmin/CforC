import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Ανοιχτές Προσκλήσεις',
  description: 'Ανοιχτές προσκλήσεις και ευκαιρίες συμμετοχής από το Culture for Change.',
  alternates: { canonical: '/open-calls' },
  // Members-only content: keep crawlers out so the page does not surface in
  // search results (e.g. Google Image search returning users to /open-calls)
  robots: { index: false, follow: false },
}

export default async function OpenCallsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    redirect('/login?returnTo=/open-calls')
  }
  return children
}
