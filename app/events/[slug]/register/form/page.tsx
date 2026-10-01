import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getEventBySlug } from '@/lib/strapi'
import { resolveEventAccess } from '@/lib/eventAccess'
import type { CforcEvent } from '@/lib/types'
import RegistrationForm from '@/components/events/RegistrationForm'

export const metadata: Metadata = {
  title: 'Δήλωση συμμετοχής | Culture for Change',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

/** Τα στοιχεία του συνδεδεμένου μέλους, για προσυμπλήρωση */
async function memberPrefill(memberId: string) {
  try {
    const r = await fetch(`${STRAPI_URL}/api/members/${memberId}`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store',
    })
    if (!r.ok) return null
    const m = (await r.json())?.data
    if (!m) return null
    const parts = String(m.Name || '').trim().split(/\s+/)
    return {
      FirstName: parts[0] || '',
      LastName: parts.slice(1).join(' ') || '',
      Email: String(m.Email || '').trim(),
      Phone: String(m.Phone || '').trim(),
    }
  } catch { return null }
}

export default async function RegistrationFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let ev: CforcEvent | null = null
  try { ev = (await getEventBySlug(slug)) as CforcEvent | null } catch { /* κάτω */ }
  if (!ev) notFound()

  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  const isMember = !!(decoded && decoded.type === 'session')

  // Η ΙΔΙΑ πύλη με τη σελίδα επιλογής. Κανείς δεν φτάνει εδώ παρακάμπτοντάς την
  // γράφοντας τη διεύθυνση με το χέρι.
  const access = resolveEventAccess(ev, isMember)
  if (!access.allowed) {
    if (access.reason === 'login-required') {
      redirect(`/login?returnTo=${encodeURIComponent(`/events/${slug}/register/form`)}`)
    }
    redirect(`/events/${slug}/register`)
  }

  const prefill = isMember && decoded ? await memberPrefill(decoded.memberId) : null
  return <RegistrationForm ev={ev} isMember={isMember} prefill={prefill} />
}
