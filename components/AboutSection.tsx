'use client'

import { useEffect, useRef, useState } from 'react'

export default function AboutSection() {
  const [isImageVisible, setIsImageVisible] = useState(false)
  const [isContentVisible, setIsContentVisible] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

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

    if (imageRef.current) {
      imageObserver.observe(imageRef.current)
    }

    if (contentRef.current) {
      contentObserver.observe(contentRef.current)
    }

    return () => {
      imageObserver.disconnect()
      contentObserver.disconnect()
    }
  }, [])

  return (
    <section id="about" className="py-24 bg-gray-50 -mt-[10%]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-coral text-sm font-medium mb-2">ΠΡΟΣ ΕΙΚΑΣΤΕ</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            ΤΟ CULTURE FOR CHANGE<br />ΜΕ ΜΙΑ ΜΑΤΙΑ
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Image */}
          <div
            ref={imageRef}
            className={`aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden transition-all duration-1000 ${
              isImageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="w-full h-full flex items-center justify-center bg-charcoal/10">
              <span className="text-gray-500">Community Image</span>
            </div>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className={`transition-all duration-1000 delay-200 ${
              isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
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
