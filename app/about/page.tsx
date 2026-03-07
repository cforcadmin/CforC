import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import AboutHeroSection from '@/components/AboutHeroSection'
import AboutMapPreview from '@/components/AboutMapPreview'
import AboutVideoSection from '@/components/AboutVideoSection'
import AboutTextSection from '@/components/AboutTextSection'
import AboutHowSection from '@/components/AboutHowSection'
import AboutOfferSection from '@/components/AboutOfferSection'
import AboutCoreSection from '@/components/AboutCoreSection'
import AboutGoalsSection from '@/components/AboutGoalsSection'
import AboutPartnersSection from '@/components/AboutPartnersSection'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'

export const metadata: Metadata = {
  title: 'Σχετικά με εμάς',
  description: 'Μάθετε για το Culture for Change — το πρώτο ελληνικό δίκτυο κοινωνικής καινοτομίας για πολιτιστική και πολιτική αλλαγή.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        <AboutHeroSection />
        <AboutTextSection />
        <AboutMapPreview />
        <AboutVideoSection />
        <AboutHowSection />
        <AboutOfferSection />
        <AboutCoreSection />
        <AboutGoalsSection />
        <AboutPartnersSection />
        <CombinedCtaSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
