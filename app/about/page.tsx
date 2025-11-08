import Navigation from '@/components/Navigation'
import AboutHeroSection from '@/components/AboutHeroSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <AboutHeroSection />

      {/* Placeholder content - will be replaced with actual about content */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-8">Σχετικά με εμάς</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Περιεχόμενο για τη σελίδα About Us - θα προστεθεί σύντομα
          </p>
        </div>
      </section>

      <Footer />
      <CookieConsent />
    </main>
  )
}
