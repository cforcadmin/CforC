import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { verifyToken } from '@/lib/auth'
import RenewalClaimConfirm from './RenewalClaimConfirm'

export const metadata: Metadata = {
  title: 'Επιβεβαίωση πληρωμής συνδρομής | Culture for Change',
  robots: { index: false, follow: false },
}

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

interface Props {
  params: Promise<{ token: string }>
}

/**
 * Landing του «Έκανα την κατάθεση» από το email υπενθύμισης συνδρομής
 * (ανανέωση μέλους). Όπως και στο payment-claim των αιτήσεων, η δήλωση
 * ΔΕΝ γίνεται στο GET (mail scanners) — χρειάζεται επιβεβαιωτικό κλικ.
 */
export default async function RenewalClaimPage({ params }: Props) {
  const { token } = await params
  const decoded = verifyToken(decodeURIComponent(token))

  let view: 'confirm' | 'invalid' | 'already' | 'uptodate' = 'invalid'
  let firstName = ''

  if (decoded && decoded.type === 'renewal-claim' && STRAPI_URL && STRAPI_API_TOKEN) {
    const res = await fetch(
      `${STRAPI_URL}/api/members/${decoded.memberId}?fields[0]=Name&fields[1]=Payments&fields[2]=RegistrationYear&fields[3]=RenewalClaimedAt`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
    )
    const member = res.ok ? (await res.json())?.data : null
    if (member) {
      firstName = String(member.Name || '').trim().split(' ')[0]
      const year = new Date().getFullYear()
      const p = (member.Payments && typeof member.Payments === 'object') ? member.Payments : {}
      const regYear = typeof member.RegistrationYear === 'number' ? member.RegistrationYear : null
      const prev = p[String(year - 1)]
      const cur = p[String(year)]
      const owesPrev = prev !== 1 && prev !== 0 && (regYear === null || regYear <= year - 1)
      const owesCur = cur !== 1 && cur !== 0
      if (!owesPrev && !owesCur) view = 'uptodate'
      else if (member.RenewalClaimedAt) view = 'already'
      else view = 'confirm'
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex flex-col">
      <Navigation />
      <main id="main-content" className="flex-1 pt-28 pb-16 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          {view === 'invalid' && (
            <>
              <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
                Ο σύνδεσμος δεν είναι έγκυρος
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Ο σύνδεσμος έχει λήξει ή δεν αντιστοιχεί σε ενεργό μέλος. Αν πιστεύεις
                ότι πρόκειται για λάθος, γράψε μας στο{' '}
                <a href="mailto:finance@cultureforchange.net" className="text-coral hover:underline">
                  finance@cultureforchange.net
                </a>.
              </p>
            </>
          )}
          {view === 'uptodate' && (
            <>
              <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
                Όλα τακτοποιημένα{firstName ? `, ${firstName}` : ''}! 🎉
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Η συνδρομή σου έχει ήδη καταχωρηθεί — δεν εκκρεμεί κάποια πληρωμή.
                Σε ευχαριστούμε!
              </p>
            </>
          )}
          {view === 'already' && (
            <>
              <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
                Το έχουμε σημειώσει{firstName ? `, ${firstName}` : ''}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Η δήλωση πληρωμής σου έχει ήδη καταχωρηθεί. Μόλις η ομάδα οικονομικών
                την επιβεβαιώσει, θα λάβεις την απόδειξή σου με email.
              </p>
            </>
          )}
          {view === 'confirm' && <RenewalClaimConfirm token={decodeURIComponent(token)} firstName={firstName} />}
        </div>
      </main>
      <Footer />
    </div>
  )
}
