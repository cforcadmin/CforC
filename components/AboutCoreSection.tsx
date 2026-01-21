'use client'

import { useEffect, useRef, useState } from 'react'

const coreValues = [
  {
    title: 'ΟΡΑΜΑ',
    content: 'Όραμα του Culture for Change είναι να συμβάλει στην ενδυνάμωση της κοινωνικό-πολιτισμικής καινοτομίας στην Ελλάδα, με απώτερο σκοπό τη βελτίωση των πρακτικών, μεθόδων και εργαλείων που χρησιμοποιούνται σύμφωνα με τις δυναμικές, και τις εκάστοτε προκλήσεις και ανάγκες της κοινωνίας.',
  },
  {
    title: 'ΑΠΟΣΤΟΛΗ',
    content: 'Αποστολή του Culture for Change είναι να δημιουργεί ευκαιρίες συνεργασίας και ανάπτυξης για τα μέλη του, να συνδράμει στη διασύνδεσή του έργου τους με τις κοινότητες στις οποίες απευθύνονται και να αναδεικνύει την κοινωνικό-πολιτισμική καινοτομία στα ενδιαφερόμενα μέρη (stakeholders).',
  },
  {
    title: 'ΑΞΙΕΣ',
    content: 'Αρχές και Αξίες Νομιμότητα, Ισότητα, Διαφάνεια, Συμμετοχικότητα, Αλληλεγγύη και Βιωσιμότητα, Περιβαλλοντολογικό Αποτύπωμα, Διατομεακότητα, Κοινωνικός Αντίκτυπος, Καινοτόμες Μέθοδοι Εργασίας, Συλλογική Λήψη Αποφάσεων.',
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
          <span className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium mb-4 shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]">ΤΟ ΤΡΙΠΤΥΧΟ ΜΑΣ</span>
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
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                {value.title === 'ΟΡΑΜΑ' && (
                  <>
                    <strong>Όραμα</strong>{value.content.substring(5)}
                  </>
                )}
                {value.title === 'ΑΠΟΣΤΟΛΗ' && (
                  <>
                    <strong>Αποστολή</strong>{value.content.substring(8)}
                  </>
                )}
                {value.title === 'ΑΞΙΕΣ' && (
                  <>
                    <strong>Αρχές και Αξίες</strong>{value.content.substring(15)}
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
