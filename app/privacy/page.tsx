import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none">
              <div>ΠΟΛΙΤΙΚΗ</div>
              <div>ΑΠΟΡΡΗΤΟΥ</div>
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none text-gray-700">
            <h2 className="text-3xl font-bold mb-8 text-charcoal">ΠΟΛΙΤΙΚΗ ΠΡΟΣΤΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ ΠΡΟΣΩΠΙΚΟΥ ΧΑΡΑΚΤΗΡΑ</h2>

            <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
              <p>Το περιεχόμενο θα προστεθεί σύντομα...</p>
            </div>
          </div>
        </div>
      </section>

      <NewsletterSection />
      <Footer />
      <CookieConsent />
    </main>
  )
}
