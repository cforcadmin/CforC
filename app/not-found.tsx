import type { Metadata } from 'next'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Η σελίδα δεν βρέθηκε | Culture for Change',
  robots: { index: false, follow: false },
}

/**
 * 404 με την ταυτότητα του CforC.
 *
 * Η προεπιλογή του Next είναι μαύρη οθόνη με αγγλικό «This page could not be
 * found» — μοιάζει με βλάβη του μηχανήματος, όχι με σελίδα του δικτύου. Όποιος
 * τη δει νομίζει ότι έσπασε ο ιστότοπος, και φεύγει.
 *
 * ΔΕΝ είναι μόνο διακόσμηση: δίνει δρόμους. Ο συνηθέστερος λόγος να φτάσει
 * κάποιος εδώ είναι παλιός σύνδεσμος από email ή γράμμα — γι' αυτό τα κουμπιά
 * δείχνουν εκεί όπου πιθανότατα πήγαινε.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex flex-col">
      <Navigation />
      <main id="main-content" className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center">
        <p className="text-7xl sm:text-8xl font-bold text-coral notranslate">404</p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-charcoal dark:text-white">
          Αυτή η σελίδα δεν βρέθηκε
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          Μπορεί ο σύνδεσμος να είναι παλιός, ή να έχει αλλάξει η διεύθυνση.
          Τίποτα δεν χάθηκε — δοκίμασε από εδώ.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/"
            className="px-6 py-3 rounded-full bg-coral text-charcoal font-bold hover:brightness-105 transition">
            Αρχική
          </Link>
          <Link href="/events"
            className="px-6 py-3 rounded-full border border-gray-300 dark:border-gray-600 font-bold text-charcoal dark:text-gray-100 hover:border-coral transition">
            Δράσεις
          </Link>
          <Link href="/members"
            className="px-6 py-3 rounded-full border border-gray-300 dark:border-gray-600 font-bold text-charcoal dark:text-gray-100 hover:border-coral transition">
            Μέλη
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          Αν έφτασες εδώ από σύνδεσμο που σου στείλαμε εμείς, πες μας το στο{' '}
          <a href="mailto:hello@cultureforchange.net" className="text-coral dark:text-coral-light hover:underline">
            hello@cultureforchange.net
          </a>{' '}— είναι δικό μας λάθος, όχι δικό σου.
        </p>
      </main>
      <Footer />
    </div>
  )
}
