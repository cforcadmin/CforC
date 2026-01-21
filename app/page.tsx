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
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        <HeroSection />
        <AboutSection />
        <ActivitiesSection />
        {/* <MapSection /> */}
        <OpenCallsSection />
        <BecomeMemberSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
