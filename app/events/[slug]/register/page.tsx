import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getEventBySlug } from '@/lib/strapi'
import { resolveEventAccess } from '@/lib/eventAccess'
import type { CforcEvent } from '@/lib/types'
import RegisterGate from '@/components/events/RegisterGate'
import { stripOpenCall } from '@/lib/openCall'

export const metadata: Metadata = {
  title: 'Δήλωση συμμετοχής | Culture for Change',
  robots: { index: false, follow: false },
}

/** Η απόφαση εξαρτάται από τη συνεδρία — ποτέ από κρυφή μνήμη */
export const dynamic = 'force-dynamic'

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let ev: CforcEvent | null = null
  try { ev = (await getEventBySlug(slug)) as CforcEvent | null } catch { /* κάτω */ }
  if (!ev) notFound()

  // Η ΠΥΛΗ στον SERVER. Η οθόνη δεν αποφασίζει ποιος περνά· το μόνο που
  // κάνει είναι να δείξει το αποτέλεσμα αυτής της απόφασης.
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  const isMember = !!(decoded && decoded.type === 'session')

  const access = resolveEventAccess(ev, isMember)

  if (!access.allowed && access.reason === 'login-required') {
    // Η σελίδα σύνδεσης διαβάζει `returnTo` (app/login/page.tsx:32) — ΟΧΙ
    // `redirect`. Λάθος όνομα = σιωπηλή αγνόηση και προσγείωση στο /profile.
    redirect(`/login?returnTo=${encodeURIComponent(`/events/${slug}/register`)}`)
  }

  // Η πρόσκληση φεύγει για τον browser ΜΟΝΟ σε συνδεδεμένο μέλος. Η σελίδα
  // είναι ήδη force-dynamic και ξέρει το isMember εδώ, οπότε δεν κοστίζει
  // τίποτα — και χωρίς αυτό, «κρυμμένη» σημαίνει απλώς «πιο κάτω στον κώδικα».
  return <RegisterGate ev={isMember ? ev : stripOpenCall(ev)} access={access} isMember={isMember} />
}
