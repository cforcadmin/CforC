import Navigation from '@/components/Navigation'
import AboutHeroSection from '@/components/AboutHeroSection'
import AboutMapSection from '@/components/AboutMapSection'
import AboutVideoSection from '@/components/AboutVideoSection'
import AboutTextSection from '@/components/AboutTextSection'
import AboutHowSection from '@/components/AboutHowSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <AboutHeroSection />
      <AboutMapSection />
      <AboutVideoSection />
      <AboutTextSection />
      <AboutHowSection />

      <Footer />
      <CookieConsent />
    </main>
  )
}
