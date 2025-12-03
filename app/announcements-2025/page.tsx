'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function AnnouncementsPage() {
  const [showConfetti, setShowConfetti] = useState(false)

  const improvements = [
    {
      category: "Πλοήγηση & Εμπειρία Χρήστη",
      items: [
        "Κουμπί για να επιστρέψετε προς τα πάνω όταν έχετε κάνει αρκετό scroll",
        "Menu που μικραίνει και διαφανίζει όταν κάνετε scroll προς τα κάτω",
        "Πιο λεπτά sections για ταχύτερη προβολή κάθε σελίδας",
        "Γενική βελτίωση στο UI/UX με πολλές μικρές αλλαγές",
        "Dark/Light mode για καλύτερη εμπειρία ανάγνωσης"
      ]
    },
    {
      category: "Διεθνοποίηση",
      items: [
        "Μετάφραση σε 20 γλώσσες - δεν χρειάζεται πλέον να κάνουμε μόνοι μας τις μεταφράσεις!"
      ]
    },
    {
      category: "Χάρτης & Μέλη",
      items: [
        "Πραγματικά διαδραστικός χάρτης (όχι βίντεο) χωρίς διπλές καταχωρήσεις",
        "Απλοποιημένο και λειτουργικό φιλτράρισμα μελών",
        "Πιο μικρές καρτέλες μελών ανά σειρά για πιο εύκολο/γρήγορο scrolling"
      ]
    },
    {
      category: "Δραστηριότητες & Ανοιχτές Προσκλήσεις",
      items: [
        "Δυνατότητα φιλτραρίσματος στα Open Calls και τις Δράσεις",
        "Κατηγορίες 'Τρέχουσες' και 'Προηγούμενες' για καλύτερη οργάνωση",
        "Αναζήτηση με ολόκληρη την περιγραφή (όχι μόνο με τον τίτλο)",
        "Ταξινόμηση με βάση την πιο πρόσφατη ημερομηνία λήξης",
        "Στην αρχική σελίδα εμφανίζονται μόνο ενεργές προσκλήσεις (έως 4)"
      ]
    },
    {
      category: "Εγγραφή & Συμμετοχή",
      items: [
        "Ενσωματωμένη η νέα διαδικασία εγγραφής (κλικ στο έγγραφο αντί για email)",
        "Redesign της σελίδας συμμετοχής",
        "Σύνδεσμος στον Οδηγό Τσέπης για χρήσιμες πληροφορίες"
      ]
    },
    {
      category: "Σύστημα Εισόδου & Προφίλ (ΝΕΟ!)",
      items: [
        "Διαδικασία απόκτησης κωδικού πρόσβασης μέσω email",
        "Δημιουργία κωδικού πρόσβασης με ασφάλεια",
        "Σύνδεση/αποσύνδεση από τη σελίδα",
        "Προσωπική σελίδα προφίλ για κάθε μέλος",
        "Δυνατότητα επεξεργασίας προφίλ από τα ίδια τα μέλη - η πιο σημαντική αλλαγή!",
        "Εμφάνιση Ανοιχτών Προσκλήσεων μόνο σε συνδεδεμένα μέλη",
        "Επαναφορά κωδικού πρόσβασης μέσω email"
      ]
    },
    {
      category: "Τεχνικές Βελτιώσεις",
      items: [
        "Loader για αργές συνδέσεις ή όταν η βάση δεδομένων είναι σε αδράνεια",
        "Συμπλήρωση της Πολιτικής Cookies",
        "Πιο μικρές καρτέλες κάτω από το κεντρικό μενού",
        "Βελτιωμένη απεικόνιση social media με σύμβολα"
      ]
    },
    {
      category: "Επικοινωνιακό Περιεχόμενο",
      items: [
        "Ενημέρωση κειμένων: 'Ανοιχτά Καλέσματα' → 'Ανοιχτές Προσκλήσεις'",
        "Ενημέρωση κειμένων στη σελίδα Σχετικά με Εμάς",
        "Βελτιωμένη οργάνωση των υποστηρικτών και συνεργατών",
        "Καθαρότερη δομή με αφαίρεση περιττών επικεφαλίδων"
      ]
    }
  ]

  return (
    <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-6xl">🎉</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal dark:text-gray-100 mb-4">
            Καλώς ήρθατε στη Νέα Ιστοσελίδα του Culture for Change!
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
            Η ιστοσελίδα μας έχει ανανεωθεί με πολλές βελτιώσεις και νέες δυνατότητες
            που θα κάνουν την εμπειρία σας ακόμα καλύτερη!
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 md:p-12 mb-8">
          <h2 className="text-2xl font-bold text-coral dark:text-coral-light mb-8 text-center">
            Τι Έχει Αλλάξει;
          </h2>

          <div className="space-y-10">
            {improvements.map((section, idx) => (
              <div key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-8 last:pb-0">
                <h3 className="text-xl font-bold text-charcoal dark:text-gray-100 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-coral dark:bg-coral-light rounded-full mr-3"></span>
                  {section.category}
                </h3>
                <ul className="space-y-3 ml-5">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start text-gray-700 dark:text-gray-300">
                      <svg
                        className="w-5 h-5 text-coral dark:text-coral-light mr-3 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Highlight Box */}
          <div className="mt-10 p-6 bg-coral/10 dark:bg-coral-light/10 border-2 border-coral dark:border-coral-light rounded-2xl">
            <h3 className="text-lg font-bold text-charcoal dark:text-gray-100 mb-3 flex items-center">
              <span className="text-2xl mr-2">⭐</span>
              Η Πιο Σημαντική Αλλαγή
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Τα μέλη μπορούν πλέον να <strong>επεξεργάζονται το προφίλ τους</strong> μόνα τους!
              Δεν χρειάζεται πια να επικοινωνείτε μαζί μας για διορθώσεις ή ενημερώσεις.
              Μπορείτε να βελτιώσετε, ενημερώσετε και προσαρμόσετε το προφίλ σας όπως εσείς θέλετε,
              ανά πάσα στιγμή!
            </p>
          </div>

          {/* Footer Note */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Όλα τα χαρακτηριστικά της παλιάς σελίδας διατηρούνται, με πολλές επιπλέον βελτιώσεις!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Εργαζόμαστε συνεχώς για να βελτιώνουμε την εμπειρία σας.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white px-12 py-4 rounded-full text-lg font-bold transition-all transform hover:scale-105 shadow-lg"
          >
            Θέλω να πάω στη νέα σελίδα!
          </Link>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Καλή περιήγηση! 🚀
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}
