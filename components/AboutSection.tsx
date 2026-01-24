'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function AboutSection() {
  const [isImageVisible, setIsImageVisible] = useState(false)
  const [isContentVisible, setIsContentVisible] = useState(false)
  const [isStatsVisible, setIsStatsVisible] = useState(false)
  const [counter1, setCounter1] = useState(0)
  const [counter2, setCounter2] = useState(0)
  const imageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsImageVisible(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    const contentObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsContentVisible(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsStatsVisible(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (imageRef.current) {
      imageObserver.observe(imageRef.current)
    }

    if (contentRef.current) {
      contentObserver.observe(contentRef.current)
    }

    if (statsRef.current) {
      statsObserver.observe(statsRef.current)
    }

    return () => {
      imageObserver.disconnect()
      contentObserver.disconnect()
      statsObserver.disconnect()
    }
  }, [])

  // Animate counters when stats become visible
  useEffect(() => {
    if (!isStatsVisible) return

    const duration = 3000 // 3 seconds
    const target1 = 10
    const target2 = 101
    const steps = 60 // 60 frames for smooth animation
    const increment1 = target1 / steps
    const increment2 = target2 / steps
    const interval = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      if (currentStep <= steps) {
        setCounter1(Math.min(Math.round(increment1 * currentStep), target1))
        setCounter2(Math.min(Math.round(increment2 * currentStep), target2))
      } else {
        clearInterval(timer)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [isStatsVisible])

  return (
    <section id="about" className="py-24 bg-gray-50 dark:bg-gray-800 -mt-[10%]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium mb-2 shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]">ΠΟΙΟΙ ΕΙΜΑΣΤΕ</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 dark:text-gray-100">
            ΤΟ CULTURE FOR CHANGE<br />ΜΕ ΜΙΑ ΜΑΤΙΑ
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Image */}
          <div
            ref={imageRef}
            className={`aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden transition-all duration-1000 ${
              isImageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <Image
              src="/Homepage_Block1.jpg"
              alt="Μέλη του δικτύου Culture for Change σε συνάντηση εργασίας"
              width={800}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className={`transition-all duration-1000 delay-200 ${
              isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h3 className="text-3xl font-bold mb-6 dark:text-gray-100">
              ΤΟ ΠΡΩΤΟ ΕΛΛΗΝΙΚΟ ΔΙΚΤΥΟ ΓΙΑ ΤΗΝ<br />
              ΚΟΙΝΩΝΙΚΗ ΚΑΙΝΟΤΟΜΙΑ ΣΤΗΝ<br />
              ΕΛΛΑΔΑ
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Μέσα απο δράση του, το δίκτυο Culture for Change, αναπτύσσει την
              κοινωνική καινοτομία στην Ελλάδα υποστηρίζοντας τους επαγγελματίες
              του πολιτισμού, αναδεικνύοντας τον θετικό αντίκτυπο που επιφέρουν
              πολιτιστικές δράσεις και έργα για την ευημερία όλων.
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div
          ref={statsRef}
          className={`grid md:grid-cols-2 gap-12 text-center transition-opacity duration-500 ${
            isStatsVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div>
            <div className="text-8xl font-bold text-charcoal dark:text-coral-light mb-2">{counter1}</div>
            <p className="text-xl font-medium dark:text-gray-200">ΕΡΓΑ</p>
          </div>
          <div>
            <div className="text-8xl font-bold text-charcoal dark:text-coral-light mb-2">{counter2}</div>
            <p className="text-xl font-medium dark:text-gray-200">ΜΕΛΗ</p>
          </div>
        </div>
      </div>
    </section>
  )
}
