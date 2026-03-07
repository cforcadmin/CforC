import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import ContactContent from '@/components/ContactContent'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'

export const metadata: Metadata = {
  title: 'Επικοινωνία',
  description: 'Επικοινωνήστε με το Culture for Change — στοιχεία επικοινωνίας για μέλη και μη μέλη του δικτύου.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-[#F5F0EB] dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-charcoal dark:text-gray-100 mb-4">
              Επικοινωνία
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-12 max-w-2xl">
              Επιλέξτε τον τρόπο επικοινωνίας που σου ταιριάζει.
            </p>
            <ContactContent />
          </div>
        </section>
        <CombinedCtaSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
