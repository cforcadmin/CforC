import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
import AboutSection from '@/components/AboutSection'
import ActivitiesSection from '@/components/ActivitiesSection'
// import MapSection from '@/components/MapSection'
import OpenCallsSection from '@/components/OpenCallsSection'
import NewsletterSection from '@/components/NewsletterSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <AboutSection />
      <ActivitiesSection />
      {/* <MapSection /> */}
      <OpenCallsSection />
      <NewsletterSection />
      <Footer />
      <CookieConsent />
    </main>
  )
}
