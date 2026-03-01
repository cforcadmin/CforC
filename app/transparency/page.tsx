'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import ScrollToTop from '@/components/ScrollToTop'
import { AccessibilityButton } from '@/components/AccessibilityMenu'

export default function TransparencyPage() {
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

  const handleOpenStatute = () => {
    window.open('https://drive.google.com/file/d/1YGUoy8xfiIzClZlMF9PwZcN5M6ej-9Vc/view?usp=sharing', '_blank')
  }

  const handleOpenFinancialReport = () => {
    window.open('https://cdn.prod.website-files.com/63cfcf33f1ef1a3c759687cf/687a184788aced4680af799e_%CE%9F%CE%B9%CE%BA%CE%BF%CE%BD%CE%BF%CE%BC%CE%B9%CE%BA%CE%BF%CC%81%CF%82%20%CE%91%CF%80%CE%BF%CE%BB%CE%BF%CE%B3%CE%B9%CF%83%CE%BC%CE%BF%CC%81%CF%82%20CforC%202024%20Singed.pdf', '_blank')
  }

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                ΔΙΑΦΑΝΕΙΑ
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

      {/* Main Content Section */}
      <section className="pt-32 pb-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Introduction Section */}
          <div className="bg-white dark:bg-gray-700 rounded-3xl p-12 text-center">
            <p className="text-gray-700 dark:text-gray-300 text-lg max-w-4xl mx-auto leading-relaxed">
              Η διαφάνεια είναι μία από τις κύριες αξίες του CforC, την οποία εφαρμόζουμε με τον διαμοιρασμό των οικονομικών μας στοιχείων και του καταστατικού χάρτη του οργανισμού μας.
            </p>
          </div>

          {/* Statute Section */}
          <div className="bg-white dark:bg-gray-700 rounded-3xl p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-8 dark:text-gray-100">ΚΑΤΑΣΤΑΤΙΚΟ</h3>
            <button
              onClick={handleOpenStatute}
              className="bg-charcoal dark:bg-gray-600 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-8 py-4 rounded-full text-lg font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-all duration-300"
            >
              ΚΑΤΑΣΤΑΤΙΚΟ
            </button>
          </div>

          {/* Financial Report Section */}
          <div className="bg-white dark:bg-gray-700 rounded-3xl p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-8 dark:text-gray-100">
              ΟΙΚΟΝΟΜΙΚΟΣ ΑΠΟΛΟΓΙΣΜΟΣ 2024
            </h3>
            <button
              onClick={handleOpenFinancialReport}
              className="bg-charcoal dark:bg-gray-600 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-8 py-4 rounded-full text-lg font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-all duration-300"
            >
              ΑΠΟΛΟΓΙΣΜΟΣ 2024
            </button>
          </div>
        </div>
      </section>

      <CombinedCtaSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
