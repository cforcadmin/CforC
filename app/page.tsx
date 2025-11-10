import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
import AboutSection from '@/components/AboutSection'
import ActivitiesSection from '@/components/ActivitiesSection'
// import MapSection from '@/components/MapSection'
import OpenCallsSection from '@/components/OpenCallsSection'
import BecomeMemberSection from '@/components/BecomeMemberSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation pageTitle="CULTURE FOR CHANGE" />
      <HeroSection />
      <AboutSection />
      <ActivitiesSection />
      {/* <MapSection /> */}
      <OpenCallsSection />
      <BecomeMemberSection />
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  )
}
