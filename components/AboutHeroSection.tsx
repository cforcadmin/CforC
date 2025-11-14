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
    <section className="relative -bottom-20">
      {/* Orange Card with Title - 25% viewport height */}
      <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
            <div>ABOUT US</div>
          </h1>
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
            alt="Culture for Change Team"
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
