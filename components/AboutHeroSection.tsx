'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function AboutHeroSection() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <section className="relative h-screen overflow-hidden bg-coral">
      {/* Parallax Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
          willChange: 'transform'
        }}
      >
        <Image
          src="/about-us.jpg"
          alt="Culture for Change Team"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {/* Overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-coral/40 via-coral/30 to-coral/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold text-charcoal leading-none tracking-tight">
            ABOUT US
          </h1>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
        <svg
          className="w-6 h-6 text-charcoal"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  )
}
