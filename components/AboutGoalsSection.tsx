'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function AboutGoalsSection() {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false)
  const [isContentVisible, setIsContentVisible] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

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

    if (headerRef.current) {
      headerObserver.observe(headerRef.current)
    }

    if (contentRef.current) {
      contentObserver.observe(contentRef.current)
    }

    return () => {
      headerObserver.disconnect()
      contentObserver.disconnect()
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
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight dark:text-gray-100">
            ΟΙ ΣΚΟΠΟΙ ΜΑΣ
          </h2>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className={`grid lg:grid-cols-2 gap-12 items-start transition-all duration-1000 delay-200 ${
            isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Image - positioned lower */}
          <div className="mt-8">
            <div className="aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden">
              <Image
                src="/about-us-our-targets.jpg"
                alt="Συμμετέχοντες σε δράση του Culture for Change συζητούν τους στόχους του δικτύου"
                width={800}
                height={600}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Bullet Points */}
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Οι γενικοί σκοποί που έχουν τεθεί από το Δίκτυο είναι πνευματικοί, εκπαιδευτικοί, κοινωνικοί, επιστημονικοί, αναπτυξιακοί, πολιτιστικοί/ πολιτισμικοί και πιο συγκεκριμένα:
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex gap-3">
                <span className="text-coral dark:text-coral-light mt-1">•</span>
                <span>Η δημιουργική εμπλοκή και συνεργασία με την κοινωνία των πολιτών για την προώθηση της κοινωνικής και πολιτισμικής καινοτομίας σε όλες τις διαστάσεις της.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-coral dark:text-coral-light mt-1">•</span>
                <span>Η ανάδειξη και εκπροσώπηση της δράσης των μελών στα ενδιαφερόμενα μέρη.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-coral dark:text-coral-light mt-1">•</span>
                <span>Η ενίσχυση των δρώντων στον τομέα  της κοινωνικής και πολιτισμικής καινοτομίας, όπου δραστηριοποιούνται τα μέλη του.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-coral dark:text-coral-light mt-1">•</span>
                <span>Η συμβολή στην ενδυνάμωση της κοινωνικής και πολιτισμικής καινοτομίας στην Ελλάδα, με απώτερο σκοπό τη βελτίωση των πρακτικών, μεθόδων και εργαλείων που χρησιμοποιούνται σύμφωνα με τις δυναμικές και τις εκάστοτε ανάγκες της κοινωνίας.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-coral dark:text-coral-light mt-1">•</span>
                <span>Η δημιουργία ευκαιριών συνεργασίας και επαγγελματικής ανάπτυξης των μελών του.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-coral dark:text-coral-light mt-1">•</span>
                <span>Η συμβολή στην περαιτέρω διασύνδεση του έργου των μελών του με τις κοινότητες στις οποίες απευθύνονται.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-coral dark:text-coral-light mt-1">•</span>
                <span>H εκπροσώπηση και η προάσπιση / συνηγορία του τομέα  της κοινωνικής και πολιτισμικής καινοτομίας σε περιπτώσεις που κριθεί σκόπιμο/απαραίτητο και σύμφωνο με τους σκοπούς του δικτύου.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
