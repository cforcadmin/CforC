'use client'

// Η αρχική ανά στυλ μενού: Cool = HomeCool (βάση Α1), Classic/Modern = η
// υπάρχουσα σελίδα γραμμή προς γραμμή. Ίδιο μοτίβο με το /about.

import { Suspense } from 'react'
import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
import AboutSection from '@/components/AboutSection'
import ActivitiesSection from '@/components/ActivitiesSection'
import OpenCallsSection from '@/components/OpenCallsSection'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import SubscriptionToast from '@/components/SubscriptionToast'
import HomeCool from './HomeCool'
import { useNavMode } from '@/components/nav/useNavMode'

export default function HomeVariantSwitch() {
  const { mode } = useNavMode()

  if (mode === 'cool') {
    return <HomeCool />
  }

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Suspense>
        <SubscriptionToast />
      </Suspense>
      <Navigation />
      <main id="main-content">
        <HeroSection />
        <AboutSection />
        <ActivitiesSection />
        {/* <MapSection /> */}
        <OpenCallsSection />
        <CombinedCtaSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
