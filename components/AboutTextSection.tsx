'use client'

import { useEffect, useRef, useState } from 'react'

export default function AboutTextSection() {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false)
  const [isTextVisible, setIsTextVisible] = useState(false)
  const [isStatsVisible, setIsStatsVisible] = useState(false)
  const [counter1, setCounter1] = useState(0)
  const [counter2, setCounter2] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

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

    const textObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsTextVisible(true)
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

    if (headerRef.current) {
      headerObserver.observe(headerRef.current)
    }

    if (textRef.current) {
      textObserver.observe(textRef.current)
    }

    if (statsRef.current) {
      statsObserver.observe(statsRef.current)
    }

    return () => {
      headerObserver.disconnect()
      textObserver.disconnect()
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
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`mb-12 transition-all duration-1000 ${
            isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className="text-coral dark:text-coral-light text-sm font-medium mb-4">ΠΟΙΟΙ ΕΙΜΑΣΤΕ</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight dark:text-gray-100">
            ΛΙΓΑ ΛΟΓΙΑ ΓΙΑ ΤΟ<br />
            CULTURE FOR CHANGE
          </h2>
        </div>

        {/* Text Content */}
        <div
          ref={textRef}
          className={`grid lg:grid-cols-2 gap-12 mb-24 transition-all duration-1000 delay-200 ${
            isTextVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Left Column */}
          <div className="space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold leading-tight dark:text-gray-100">
              Είμαστε το πρώτο ελληνικό Δίκτυο που<br />
              εκπροσωπεί τη φωνή περισσότερων από 100<br />
              επαγγελματιών
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              διαφορετικού ακαδημαϊκού υπόβαθρου και πολλαπλών δεξιοτήτων από όλη
              τη χώρα, συμπεριλαμβανομένων ενδεικτικά, πολιτιστικών διαχειριστών,
              καλλιτεχνών, νομικών, επιστημόνων συμπεριφοράς, σχεδιαστών
              αρχιτεκτόνων, πολεοδόμων, περιβαλλοντολόγων και άλλων ειδικοτήτων,
              που συνεργάζονται με κοινές απόψεις και πρακτικές γύρω από την έννοια
              της Πολιτιστικής Καινοτομία.
            </p>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Υποστηρίζουμε και αναδεικνύουμε τις πρωτοβουλίες των μελών μας,
              παρέχοντάς τους δομές, πρακτικές, κατευθυντήριες γραμμές και ευκαιρίες
              συνεχιζόμενης εκπαίδευσης. Σκοπός μας είναι να τους βοηθήσουμε να
              γεφυρώσουν την πραγματικότητά τους, καθώς και να συνεργαστούν
              δημιουργικά με άλλα άτομα, δίκτυα και οργανισμούς, και να κάνουν το έργο
              τους πιο ενικτό (και μαγικό), βιώσιμο και αποτελεσματικό, με απώτερο στόχο
              την υλοποίηση του Πολιτιστικού τομέα και της Πολιτιστικής Αλλαγής στην
              Ελλάδα και σε όλο τον κόσμο.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Ονομαζόμαστε Culture for Change (Πολιτισμός για την Αλλαγή) επειδή
              στοχεύουμε να προκαλέσουμε Αλλαγή στον τρόπο που βλέπουμε,
              αισθανόμαστε και αλληλεπιδρούμε μέσω των πολιτιστικών μας
              δραστηριοτήτων. Αλλαγή για τους ανθρώπους και τους οργανισμούς με τους
              οποίους συνεργαζόμαστε. Αλλαγή για τις κοινότητες των μελών μας.
              Αλλαγή για εμάς. Αλλαγή για τον πλανήτη μας. Αλλαγή για τον Πολιτισμό
              και Πολιτισμό για την Αλλαγή.
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
            <div className="text-8xl font-bold text-coral dark:text-coral-light mb-2">{counter1}</div>
            <p className="text-xl font-medium dark:text-gray-200">ΕΡΓΑ</p>
          </div>
          <div>
            <div className="text-8xl font-bold text-coral dark:text-coral-light mb-2">{counter2}</div>
            <p className="text-xl font-medium dark:text-gray-200">ΜΕΛΗ</p>
          </div>
        </div>
      </div>
    </section>
  )
}
