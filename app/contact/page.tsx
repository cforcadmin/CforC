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
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                <div>ΕΠΙΚΟΙΝΩΝΙΑ</div>
              </h1>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="pt-32 pb-24 bg-[#F5F0EB] dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-12 max-w-2xl">
              Επίλεξε τον τρόπο επικοινωνίας που σου ταιριάζει.
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
