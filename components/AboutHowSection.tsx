'use client'

import { useEffect, useRef, useState } from 'react'

const items = [
  {
    number: '01',
    title: 'ΠΡΟΣΦΟΡΑ\nΔΡΑΣΤΗΡΙΟΤΗΤΩΝ\nΔΙΚΤΥΩΣΗΣ',
  },
  {
    number: '02',
    title: 'ΔΗΜΙΟΥΡΓΙΑ\nΔΙΕΠΙΣΤΗΜΟΝΙΚΩΝ\nΕΚΔΗΛΩΣΕΩΝ ΚΑΙ\nΠΡΟΓΡΑΜΜΑΤΩΝ',
  },
  {
    number: '03',
    title: 'ΔΙΟΡΓΑΝΩΣΗ\nΠΡΟΓΡΑΜΜΑΤΩΝ\nΑΝΑΠΤΥΞΗΣ ΙΚΑΝΟΤΗΤΩΝ',
  },
  {
    number: '04',
    title: 'ΥΛΟΠΟΙΗΣΗ\nΠΡΟΓΡΑΜΜΑΤΩΝ\nΕΝΕΡΓΟΠΟΙΗΣΗΣ\nΚΟΙΝΟΤΗΤΩΝ',
  },
  {
    number: '05',
    title: 'ΣΥΝΗΓΟΡΙΑ ΠΟΛΙΤΙΣΤΙΚΩΝ\nΠΟΛΙΤΙΚΩΝ',
  },
]

export default function AboutHowSection() {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false)
  const [visibleItems, setVisibleItems] = useState<number[]>([])
  const headerRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

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

    const itemObservers = itemsRef.current.map((ref, index) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleItems((prev) => [...new Set([...prev, index])])
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
      itemObservers.forEach((observer) => observer.disconnect())
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
          <p className="text-coral dark:text-coral-light text-sm font-medium mb-4">ΠΩΣ ΤΟ ΚΑΝΟΥΜΕ</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight dark:text-gray-100">
            ΠΩΣ ΤΟ CFORC<br />
            ΠΡΟΩΘΕΙ ΤΗΝ ΑΛΛΑΓΗ;
          </h2>
        </div>

        {/* Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {items.map((item, index) => (
            <div
              key={index}
              ref={(el) => {
                itemsRef.current[index] = el
              }}
              className={`transition-all duration-1000 ${
                visibleItems.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <p className="text-coral dark:text-coral-light text-3xl font-bold mb-4">{item.number}</p>
              <h3 className="text-xl md:text-2xl font-bold leading-tight whitespace-pre-line dark:text-gray-100">
                {item.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
