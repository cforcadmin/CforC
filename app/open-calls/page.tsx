'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollToTop from '@/components/ScrollToTop'
import OpenCallsContent from '@/components/OpenCallsContent'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import { useAuth } from '@/components/AuthProvider'

const memberNavItems = [
  { label: 'Προφίλ', href: '/profile' },
  { label: 'Ανοιχτές Προσκλήσεις', href: '/open-calls' },
  { label: 'Εκπαιδευτικό Υλικό', href: '/open-calls' },
  { label: 'Δίκτυα / Κοινότητες', href: '/open-calls' },
  { label: 'Ομάδες Εργασίας', href: '/open-calls' },
  { label: 'Οδηγός Τσέπης', href: '/open-calls' },
  { label: 'Newsletters', href: '/open-calls' },
]

export default function OpenCallsPage() {
  const { user } = useAuth()
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

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className={`bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 ${user ? 'min-h-[25vh] py-10' : 'h-[25vh]'} flex items-center rounded-b-3xl relative z-10`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                <div>ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</div>
              </h1>
              {user && (
                <div className="flex flex-wrap gap-2">
                  {memberNavItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        item.label === 'Ανοιχτές Προσκλήσεις'
                          ? 'bg-coral-dark dark:bg-coral text-white'
                          : 'bg-charcoal/80 dark:bg-gray-700 text-white hover:bg-charcoal dark:hover:bg-gray-600'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
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

        <OpenCallsContent />

        <NewsletterSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
