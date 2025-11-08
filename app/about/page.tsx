import Navigation from '@/components/Navigation'
import AboutHeroSection from '@/components/AboutHeroSection'
import AboutMapSection from '@/components/AboutMapSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <AboutHeroSection />
      <AboutMapSection />

      {/* Placeholder content - will be replaced with additional about sections */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-8">Additional Content</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            More sections will be added here based on the design
          </p>
        </div>
      </section>

      <Footer />
      <CookieConsent />
    </main>
  )
}
