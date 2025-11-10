import Navigation from '@/components/Navigation'
import AboutHeroSection from '@/components/AboutHeroSection'
import AboutMapSection from '@/components/AboutMapSection'
import AboutVideoSection from '@/components/AboutVideoSection'
import AboutTextSection from '@/components/AboutTextSection'
import AboutHowSection from '@/components/AboutHowSection'
import AboutOfferSection from '@/components/AboutOfferSection'
import AboutCoreSection from '@/components/AboutCoreSection'
import AboutGoalsSection from '@/components/AboutGoalsSection'
import AboutPartnersSection from '@/components/AboutPartnersSection'
import BecomeMemberSection from '@/components/BecomeMemberSection'
import NewsletterSection from '@/components/NewsletterSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navigation pageTitle="ABOUT US" />
      <AboutHeroSection />
      <AboutMapSection />
      <AboutVideoSection />
      <AboutTextSection />
      <AboutHowSection />
      <AboutOfferSection />
      <AboutCoreSection />
      <AboutGoalsSection />
      <AboutPartnersSection />
      <BecomeMemberSection />
      <NewsletterSection />

      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  )
}
