'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const offerings = [
  {
    image: '/about-us-what-we-offer.jpg',
    imagePosition: 'left',
    title: 'ΕΝΙΣΧΥΣΗ ΤΗΣ\nΚΟΙΝΩΝΙΚΟΠΟΛΙΤΙΣΤΙΚΗΣ\nΚΑΙΝΟΤΟΜΙΑΣ',
    content: `Ενισχύουμε την κοινωνικοπολιτιστική καινοτομία στην Ελλάδα δημοσιεύοντας αναλύσεις, δείχνοντάς την πρακτική της αξία και ενδυναμώνοντας τα άτομα και τα έργα των επαγγελματιών μας. Αυξάνουμε την ευαισθητοποίηση σε επίπεδο δημόσιας πολιτικής για τις σχετικές νέες πρακτικές και ενισχύουμε τους νέους που εμπλέκονται σε εργασίαν στον κοινωνικοπολιτιστικό τομέα να ενημερωθούν, να εκπαιδευθούν και να αποκτήσουν ευρείες πρακτικές Ενδεικτικά
- συμβουλευτική
- ευκαιρίες διάταξης
- εργαστήρια ανάπτυξης ικανοτήτων`,
  },
  {
    image: '/about-us-what-we-offer2.jpg',
    imagePosition: 'right',
    title: 'ΠΡΟΩΘΗΣΗ ΤΟΥ ΚΟΙΝΩΝΙΚΟΥ\nΑΝΤΙΚΤΥΠΟΥ',
    content: `Μέσα των επιτρόπων και των ομάδων εργασίας του Δικτύου μας, δημοσιεύουμε, συνεχιζόμαστε και καθοδηγούμε σωλήνως και εκπτώσεις με στόχο την κοινωνική αντίτυπο. Οι εκδηλώσεις του περιλαμβάνουν
- εκδόσεις
- παρουσιάσεις
- έρευνα
- προγράμματα ενεργοποίησης κοινότητας`,
  },
  {
    image: '/about-us-what-we-offer3.jpg',
    imagePosition: 'left',
    title: 'ΣΥΝΗΓΟΡΙΑ ΥΠΕΡ ΤΗΣ ΣΥΣΤΗΜΙΚΗΣ\nΑΛΛΑΓΗΣ',
    content: `Υποστηρίζουμε την κοινωνικοπολιτιστική καινοτομία μέσω συνεργασιών με τον δημόσιο και ιδιωτικό τομέα, φορείς της πολιτισμούς, υποστηρίζοντας τους επαγγελματίες να αναπτύξουν τη δική τους πρακτική με τρόπο που δημιουργικό, αποτελεσματικό, μπαίνοντας ένα να γραφειοκρατική εμβόλα που παραλύουν τις δράσεις των κοινοτήτων μας. Προωθούμε μεγάλα αφηγήματα που καταγράφουν συνεργάζονται, ξεκινάμε και λογίζουμε σε βοήθεια ενέργειας πολιτών και οργανισμούς στην εφαρμογή τους.`,
  },
]

export default function AboutOfferSection() {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false)
  const [visibleSections, setVisibleSections] = useState<number[]>([])
  const headerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const headerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsHeaderVisible(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (headerRef.current) {
      headerObserver.observe(headerRef.current)
    }

    const sectionObservers = sectionRefs.current.map((ref, index) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleSections((prev) => [...new Set([...prev, index])])
            }
          })
        },
        { threshold: 0.1 }
      )

      if (ref) {
        observer.observe(ref)
      }

      return observer
    })

    return () => {
      headerObserver.disconnect()
      sectionObservers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`mb-16 transition-all duration-1000 ${
            isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className="text-coral dark:text-coral-light text-sm font-medium mb-4">ΤΙ ΚΑΝΟΥΜΕ</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight dark:text-gray-100">
            ΤΙ ΠΡΟΣΦΕΡΟΥΜΕ
          </h2>
        </div>

        {/* Offerings */}
        <div className="space-y-24">
          {offerings.map((offering, index) => (
            <div
              key={index}
              ref={(el) => {
                sectionRefs.current[index] = el
              }}
              className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${
                visibleSections.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              {offering.imagePosition === 'left' ? (
                <>
                  {/* Image */}
                  <div className="aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden">
                    <Image
                      src={offering.image}
                      alt={offering.title}
                      width={800}
                      height={600}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-6 whitespace-pre-line leading-tight dark:text-gray-100">
                      {offering.title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {offering.content}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Text */}
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-6 whitespace-pre-line leading-tight dark:text-gray-100">
                      {offering.title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {offering.content}
                    </p>
                  </div>

                  {/* Image */}
                  <div className="aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden">
                    <Image
                      src={offering.image}
                      alt={offering.title}
                      width={800}
                      height={600}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
