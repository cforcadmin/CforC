'use client'

import { useEffect, useRef, useState } from 'react'

const coreValues = [
  {
    title: 'ΟΡΑΜΑ',
    content: 'Οραμα του Culture for Change είναι να συμβάλει στην ενδυνάμωση της κοινωνικο-πολιτιστικής καινοτομίας στην Ελλάδα, με σημείωμ σκοπό τη δημιουργία μιας κοινωνίας όπου ανθρώπινες και φυσικές πηγές χρησιμοποιούνται σταδιακά με τις διαδικασίες και τις ελευθερίες προόδους και διαλάξις της κοινωνίας.',
  },
  {
    title: 'ΑΠΟΣΤΟΛΗ',
    content: 'Αποστολή του Culture for Change είναι να δημιουργεί διαδικασίες διοργάνωσης και αναπληξης για τα μέλη του, να αναδεικνύει και διασφαλίζει που αξία τους στο να συνδιάσουν με την κοινωνία πολιτιστικά πολιτισμού καινοτομία στα εκδηλώσεων μιας μέρη των παρελαυσής',
  },
  {
    title: 'ΑΞΙΕΣ',
    content: 'Αρχές και Αξίες Νομιμότητα, Ισότητα, Διαφάνεια, Συμμετοχική Δημοκρατία, Αλληλεγγύη και Βιωσιμότητα, Πολιδεξιότητα Αυτοτέλεια Αποσπασματα, Διατηρισμένα Ανάλογ Αποδικήθη Εργαζών: Συλλογική Λήψη Αποφάσεων.',
  },
]

export default function AboutCoreSection() {
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
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className="text-coral dark:text-coral-light text-sm font-medium mb-4">ΤΟ ΤΡΙΠΤΥΧΟ ΜΑΣ</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight dark:text-gray-100">
            Ο ΠΥΡΗΝΑΣ ΜΑΣ
          </h2>
        </div>

        {/* Core Values Grid */}
        <div className="grid md:grid-cols-3 gap-12">
          {coreValues.map((value, index) => (
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
              <h3 className="text-xl md:text-2xl font-bold mb-4 dark:text-gray-100">{value.title}</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{value.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
