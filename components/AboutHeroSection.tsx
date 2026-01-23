'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AccessibilityButton } from './AccessibilityMenu'

export default function AboutHeroSection() {
  const [scrollY, setScrollY] = useState(0)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)

      // Handle accessibility button fade
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

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <section className="relative -bottom-20">
      {/* Orange Card with Title - 25% viewport height */}
      <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
            <div>ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</div>
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

      {/* Image Section with Parallax */}
      <div className="relative bottom-56 w-full h-[80vh] bg-gray-900 -mt-10 rounded-3xl overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
            willChange: 'transform'
          }}
        >
          <Image
            src="/about-us.jpg"
            alt="Ομαδική φωτογραφία μελών του δικτύου Culture for Change"
            fill
            className="object-cover"
            priority
            quality={90}
          />
          {/* Overlay for better text contrast if needed */}
          <div className="absolute inset-0 bg-black/10" />
        </div>
      </div>
    </section>
  )
}
