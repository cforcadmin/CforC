'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function AboutSection() {
  const imageRef = useRef<HTMLDivElement>(null)
  const [imageOffset, setImageOffset] = useState(100)

  useEffect(() => {
    const handleScroll = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect()
        const windowHeight = window.innerHeight

        // Calculate offset based on scroll position
        // When section enters viewport, image starts at +100px and moves to 0
        if (rect.top < windowHeight && rect.bottom > 0) {
          const progress = Math.max(0, Math.min(1, (windowHeight - rect.top) / windowHeight))
          setImageOffset(-200 + (progress * 200))
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section id="about" className="py-24 bg-gray-50 -mt-[10%]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-coral text-sm font-medium mb-2">ΠΟΙΟΙ ΕΙΜΑΣΤΕ</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            ΤΟ CULTURE FOR CHANGE<br />ΜΕ ΜΙΑ ΜΑΤΙΑ
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Image with smooth scroll animation */}
          <div
            ref={imageRef}
            className="aspect-[4/3] rounded-3xl overflow-hidden"
            style={{
              transform: `translateY(${imageOffset}px)`,
              transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
            <Image
              src="/Homepage_Block1.jpg"
              alt="Culture for Change Community"
              width={800}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div>
            <h3 className="text-3xl font-bold mb-6">
              ΤΟ ΠΡΩΤΟ ΕΛΛΗΝΙΚΟ ΔΙΚΤΥΟ ΓΙΑ ΤΗΝ<br />
              ΚΟΙΝΩΝΙΚΗ ΚΑΙΝΟΤΟΜΙΑ ΣΤΗΝ<br />
              ΕΛΛΑΔΑ
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Μέσα από δράση του, το δίκτυο Culture for Change, αναπτύσσει την
              κοινωνική καινοτομία στην Ελλάδα υποστηρίζοντας τους επαγγελματίες
              του πολιτισμού που ιδρύουν ή διαχειρίζονται πολυσύλλεκτες καινοτόμες
              δράσεις και έργα για την ευημερία όλων.
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-2 gap-12 text-center">
          <div>
            <div className="text-8xl font-bold text-coral mb-2">10</div>
            <p className="text-xl font-medium">ΕΡΓΑ</p>
          </div>
          <div>
            <div className="text-8xl font-bold text-coral mb-2">101</div>
            <p className="text-xl font-medium">ΜΕΛΗ</p>
          </div>
        </div>
      </div>
    </section>
  )
}
