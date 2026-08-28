'use client'

// Το /about έχει δύο σώματα: στο Cool τη νέα δομή 7 ενοτήτων (brief 3a),
// σε Classic/Modern την υπάρχουσα σελίδα ΑΝΕΓΓΙΧΤΗ. Η διακλάδωση ζει εδώ
// (client) ώστε το app/about/page.tsx να κρατά το metadata ως server component.

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
import { CoolAboutRoute } from './AboutCoolPage'
import { useNavMode } from '@/components/nav/useNavMode'

export default function AboutVariantSwitch() {
  const { mode } = useNavMode()

  if (mode === 'cool') {
    return <CoolAboutRoute section="diktyo" />
  }

  // Classic / Modern: η σελίδα όπως ήταν, γραμμή προς γραμμή
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
