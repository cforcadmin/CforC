'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import ScrollToTop from '@/components/ScrollToTop'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import AccessibilityBody from '@/components/policy-cool/AccessibilityBody'
import { PolicyCoolRoute } from '@/components/policy-cool/PolicyCoolPage'
import { useNavMode } from '@/components/nav/useNavMode'

export default function AccessibilityPage() {
  const { mode } = useNavMode()
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)

  // Handle scroll for accessibility button fade
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150

      if (scrollPosition <= fadeStart) {
        setAccessibilityButtonScale(1)
      } else if (scrollPosition >= fadeEnd) {
        setAccessibilityButtonScale(0)
      } else {
        const progress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart)
        setAccessibilityButtonScale(1 - progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Cool: η όψη του ενιαίου ΠΟΛΙΤΙΚΗ (εναλλαγή επί τόπου, χωρίς redirect)
  if (mode === 'cool') {
    return <PolicyCoolRoute section="accessibility" />
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                <div>ΔΗΛΩΣΗ</div>
                <div>ΠΡΟΣΒΑΣΙΜΟΤΗΤΑΣ</div>
              </h1>
            </div>

            {/* Accessibility Menu Trigger Button */}
            <div
              className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                transform: `translateY(-50%) scale(${accessibilityButtonScale})`,
                opacity: accessibilityButtonScale,
                pointerEvents: accessibilityButtonScale < 0.1 ? 'none' : 'auto'
              }}
            >
              <AccessibilityButton />
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-24 bg-white dark:bg-gray-900">
          <AccessibilityBody />
        </section>

        <CombinedCtaSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
