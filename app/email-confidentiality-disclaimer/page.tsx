import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'

export const metadata: Metadata = {
  title: 'Email Confidentiality Disclaimer | Culture for Change',
  description: 'Email confidentiality and disclaimer notice for Culture for Change communications.',
  robots: { index: false, follow: false },
}

export default function EmailDisclaimerPage() {
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-none dark:text-coral">
                <div>EMAIL</div>
                <div>DISCLAIMER</div>
              </h1>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* English */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-charcoal dark:bg-gray-700 text-white text-sm font-bold flex-shrink-0">EN</span>
                <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Confidentiality Notice</h2>
              </div>

              <div className="bg-[#F5F0EB] dark:bg-gray-800 rounded-3xl p-8 sm:p-10 border-l-4 border-coral dark:border-coral-light">
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-coral dark:text-coral-light flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    The information contained in this message is intended for the addressee only and may contain classified information. If you are not the addressee, please delete this message and notify the sender; you should not copy or distribute this message or disclose its contents to anyone.
                  </p>
                </div>

                <hr className="my-6 border-gray-300 dark:border-gray-600" />

                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-coral dark:text-coral-light flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Any views or opinions expressed in this message are those of the individual(s) and not necessarily of the organization. No reliance may be placed on this message without written confirmation from an authorised representative of its contents.
                  </p>
                </div>

                <hr className="my-6 border-gray-300 dark:border-gray-600" />

                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-coral dark:text-coral-light flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    No guarantee is implied that this message or any attachment is virus free or has not been intercepted and amended.
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-16">
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">GR / EL</span>
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Greek */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-coral dark:bg-coral-light text-white dark:text-gray-900 text-sm font-bold flex-shrink-0">EL</span>
                <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Ειδοποίηση Εμπιστευτικότητας</h2>
              </div>

              <div className="bg-[#F5F0EB] dark:bg-gray-800 rounded-3xl p-8 sm:p-10 border-l-4 border-charcoal dark:border-gray-400">
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-charcoal dark:text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Οι πληροφορίες που περιέχονται σε αυτό το μήνυμα προορίζονται μόνο για τον παραλήπτη και ενδέχεται να περιέχουν απόρρητες πληροφορίες. Εάν δεν είστε ο παραλήπτης, διαγράψτε αυτό το μήνυμα και ενημερώστε τον αποστολέα. Δε πρέπει να αντιγράψετε ή να διανείμετε αυτό το μήνυμα ή να αποκαλύψετε τα περιεχόμενά του σε οποιονδήποτε.
                  </p>
                </div>

                <hr className="my-6 border-gray-300 dark:border-gray-600" />

                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-charcoal dark:text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Οποιεσδήποτε απόψεις που εκφράζονται σε αυτό το μήνυμα είναι αυτές του ατόμου (-ων) και όχι απαραίτητα του οργανισμού. Καμία εμπιστοσύνη δεν μπορεί να δοθεί σε αυτό το μήνυμα χωρίς γραπτή επιβεβαίωση από εξουσιοδοτημένο εκπρόσωπο για το περιεχόμενό του.
                  </p>
                </div>

                <hr className="my-6 border-gray-300 dark:border-gray-600" />

                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-charcoal dark:text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Δεν υπάρχει καμία εγγύηση ότι αυτό το μήνυμα ή οποιοδήποτε συνημμένο είναι απαλλαγμένο από ιούς ή δεν έχει υποκλαπεί και τροποποιηθεί.
                  </p>
                </div>
              </div>
            </div>

            {/* Document reference */}
            <div className="text-center text-xs text-gray-400 dark:text-gray-500">
              <p>Culture for Change</p>
              <p className="mt-1">GDPR-IT-05 | 1st Edition, January 2026</p>
            </div>

          </div>
        </section>
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
