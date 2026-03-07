'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function AboutMapPreview() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsVisible(true)
        })
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={sectionRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight dark:text-gray-100">
            ΠΡΟΩΘΟΥΜΕ ΕΝΕΡΓΑ ΤΗΝ ΠΟΛΙΤΙΣΤΙΚΗ<br />
            ΑΛΛΑΓΗ ΣΕ ΟΛΟΚΛΗΡΗ ΤΗΝ ΕΛΛΑΔΑ
          </h2>
        </div>

        {/* Map Preview Card */}
        <div
          className={`transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Link
            href="/map"
            className="group block relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300"
          >
            {/* Map image */}
            <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-gray-100 dark:bg-gray-700">
              <Image
                src="/map-of-greece.jpg"
                alt="Διαδραστικός χάρτης μελών του Culture for Change"
                fill
                className="object-contain md:object-cover"
              />

              {/* Overlay that darkens on hover */}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300" />

              {/* CTA overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl px-8 py-6 text-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-lg md:text-xl font-bold text-charcoal dark:text-gray-100">
                      ΕΞΕΡΕΥΝΗΣΕ ΤΟΝ ΧΑΡΤΗ
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Δες πού βρίσκονται τα μέλη μας σε όλη την Ελλάδα και το εξωτερικό
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
