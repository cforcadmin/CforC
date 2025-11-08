'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function AboutSection() {
  const imageRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (imageRef.current) {
      observer.observe(imageRef.current)
    }

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current)
      }
    }
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
          {/* Image with fade-in animation */}
          <div
            ref={imageRef}
            className="aspect-[4/3] rounded-3xl overflow-hidden transition-opacity duration-1000 ease-out"
            style={{
              opacity: isVisible ? 1 : 0
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
