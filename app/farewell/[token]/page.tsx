import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { verifyToken } from '@/lib/auth'
import FarewellForm from './FarewellForm'

export const metadata: Metadata = {
  title: 'Φόρμα Αποχώρησης | Culture for Change',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ token: string }>
}

/**
 * Φόρμα αποχώρησης — landing του link στο αποχαιρετιστήριο email.
 * Ανώνυμη από προεπιλογή· το όνομα συμπληρώνεται ΜΟΝΟ αν το μέλος
 * τσεκάρει την επιλογή (προέρχεται από το signed token, όχι από input).
 */
export default async function FarewellPage({ params }: Props) {
  const { token } = await params
  const decoded = verifyToken(decodeURIComponent(token))
  const valid = !!decoded && decoded.type === 'exit-survey'
  const memberName = valid && decoded.type === 'exit-survey' ? decoded.name : ''

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex flex-col">
      <Navigation />
      <main id="main-content" className="flex-1 pt-28 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {valid ? (
            <FarewellForm token={decodeURIComponent(token)} memberName={memberName} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-center">
              <h1 className="text-2xl font-bold text-charcoal dark:text-coral mb-4">
                Ο σύνδεσμος δεν είναι έγκυρος
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Ο σύνδεσμος έχει λήξει. Αν θέλεις να μοιραστείς τη γνώμη σου, γράψε μας στο{' '}
                <a href="mailto:community@cultureforchange.net" className="text-coral hover:underline">
                  community@cultureforchange.net
                </a>.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
