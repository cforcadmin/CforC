import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { verifyToken } from '@/lib/auth'
import ClaimConfirm from './ClaimConfirm'

export const metadata: Metadata = {
  title: 'Επιβεβαίωση πληρωμής | Culture for Change',
  robots: { index: false, follow: false },
}

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

interface Props {
  params: Promise<{ token: string }>
}

/**
 * Landing του link «Πλήρωσα» από τα emails έγκρισης/υπενθύμισης.
 * Η δήλωση ΔΕΝ γίνεται στο GET (τα mail scanners προ-επισκέπτονται links) —
 * χρειάζεται ένα επιβεβαιωτικό κλικ που καλεί το /api/payment-claim.
 */
export default async function PaymentClaimPage({ params }: Props) {
  const { token } = await params
  const decoded = verifyToken(decodeURIComponent(token))

  let view: 'confirm' | 'invalid' | 'already' | 'completed' = 'invalid'
  let firstName = ''

  if (decoded && decoded.type === 'payment-claim' && STRAPI_URL && STRAPI_API_TOKEN) {
    const res = await fetch(
      `${STRAPI_URL}/api/membership-applications/${decoded.applicationId}?fields[0]=FirstName&fields[1]=ApplicationState&fields[2]=PaymentClaimedAt`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
    )
    const app = res.ok ? (await res.json())?.data : null
    if (app) {
      firstName = String(app.FirstName || '').trim()
      if (app.ApplicationState === 'completed') view = 'completed'
      else if (app.ApplicationState !== 'approved') view = 'invalid'
      else if (app.PaymentClaimedAt) view = 'already'
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
                Ο σύνδεσμος έχει λήξει ή δεν αντιστοιχεί σε ενεργή αίτηση. Αν πιστεύεις
                ότι πρόκειται για λάθος, γράψε μας στο{' '}
                <a href="mailto:finance@cultureforchange.net" className="text-coral hover:underline">
                  finance@cultureforchange.net
                </a>.
              </p>
            </>
          )}
          {view === 'completed' && (
            <>
              <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
                Η εγγραφή σου έχει ολοκληρωθεί! 🎉
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Η πληρωμή σου έχει ήδη επιβεβαιωθεί και το προφίλ σου είναι ενεργό.
                Έλεγξε το email σου για τις οδηγίες πρώτης σύνδεσης.
              </p>
            </>
          )}
          {view === 'already' && (
            <>
              <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
                Το έχουμε σημειώσει{firstName ? `, ${firstName}` : ''}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Η δήλωση πληρωμής σου έχει ήδη καταχωρηθεί. Η ομάδα οικονομικών θα την
                επιβεβαιώσει σύντομα και θα ολοκληρώσουμε την εγγραφή σου — θα λάβεις
                email με τις οδηγίες πρώτης σύνδεσης.
              </p>
            </>
          )}
          {view === 'confirm' && <ClaimConfirm token={decodeURIComponent(token)} firstName={firstName} />}
        </div>
      </main>
      <Footer />
    </div>
  )
}
