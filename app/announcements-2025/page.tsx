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
        "Κουμπί για να επιστρέψεις προς τα πάνω όταν έχεις κάνει αρκετό scroll",
        "Menu που μικραίνει και διαφανίζει όταν κάνεις scroll προς τα κάτω",
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
        "Απλοποιημένο και λειτουργικό φιλτράρισμα μελών με προσθήκη αλφαβητικής λειτουργίας",
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
            Καλώς ήρθες στη Νέα Ιστοσελίδα του Culture for Change!
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            Η ιστοσελίδα μας έχει ανανεωθεί με πολλές βελτιώσεις και νέες δυνατότητες
            που θα κάνουν την εμπειρία σου ακόμα καλύτερη!
          </p>

          {/* Beta Notice */}
          <div className="inline-block bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-2xl px-6 py-4 max-w-2xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div className="text-left">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Έκδοση Beta - Δοκιμαστική Λειτουργία
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Αυτή είναι μια δοκιμαστική έκδοση της σελίδας που περιλαμβάνει test events,
                  open calls και δοκιμαστικά προφίλ μελών. Εάν θέλεις να δοκιμάσεις το προφίλ σου,
                  μπορείς να επικοινωνήσεις με τον Γιώργο Στυλ για να σου δημιουργήσει τον λογαριασμό σου.
                </p>
              </div>
            </div>
          </div>
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
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Τα μέλη μπορούν πλέον να <strong>επεξεργάζονται το προφίλ τους</strong> μόνα τους!
              Δεν χρειάζεται πια να επικοινωνείς μαζί μας για διορθώσεις ή ενημερώσεις.
              Μπορείς να βελτιώσεις, ενημερώσεις και προσαρμόσεις το προφίλ σου όπως εσύ θέλεις,
              ανά πάσα στιγμή!
            </p>

            <div className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
              <h4 className="font-bold text-charcoal dark:text-gray-100 mb-3 flex items-center">
                <span className="mr-2">💡</span>
                Συμβουλές για το προφίλ σου
              </h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="mr-2 text-coral dark:text-coral-light flex-shrink-0">•</span>
                  <span>Αν θες να μην φαίνεται δημόσια το email σου επικοινώνησε με τον Γιώργο (Στυλ) για να το αφαιρέσει.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-coral dark:text-coral-light flex-shrink-0">•</span>
                  <span>Μπαίνοντας στο προφίλ σου θα χρειαστεί να προσθέσεις τόνους στο όνομά σου.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-coral dark:text-coral-light flex-shrink-0">•</span>
                  <span>Καλό είναι να υπάρχουν λίγα πεδιά εργασίας και πρέπει να χωρίζονται με κόμμα.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-coral dark:text-coral-light flex-shrink-0">•</span>
                  <span>Δες τι δεν υπάρχει (π.χ. πόλη, περιφέρεια κ.λπ.) και πρόσθεσέ τα.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-coral dark:text-coral-light flex-shrink-0">•</span>
                  <span>Χρειάζεται να προσθέσεις τίτλο, περιγραφή και φωτογραφίες για τα πρότζεκτ σου. Μπορείς να κάνεις copy paste την πληροφορία απ'τη σελίδα <a href="https://cultureforchange.net" target="_blank" rel="noopener noreferrer" className="text-coral dark:text-coral-light underline hover:no-underline">cultureforchange.net</a>.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-coral dark:text-coral-light flex-shrink-0">•</span>
                  <span>Προτείνουμε να βάλεις μια πρόσφατη, αντιπροσωπευτική στο τώρα φωτογραφία προφίλ. Μην ξεχνάς είναι η βιτρίνα σου!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Όλα τα χαρακτηριστικά της παλιάς σελίδας διατηρούνται, με πολλές επιπλέον βελτιώσεις!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Εργαζόμαστε συνεχώς για να βελτιώνουμε την εμπειρία σου.
            </p>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 md:p-12 mb-8">
          <div className="text-center">
            <div className="inline-block mb-4">
              <span className="text-4xl">💭</span>
            </div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-4">
              Βρήκες κάποιο λάθος; Έχεις κάποια πρόταση;
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Κάνε κλικ{' '}
              <a
                href="https://docs.google.com/document/d/1yhxZ--puZuLGIYS9-xZDbujoe250P7xyvLcZKcg1bj0/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral dark:text-coral-light font-bold underline hover:no-underline"
              >
                εδώ
              </a>
              {' '}για να μοιραστείς τις σκέψεις σου.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              Όλες οι προτάσεις θα εξεταστούν προσεκτικά και θα ληφθούν υπόψη,
              αλλά δεν μπορούμε να εγγυηθούμε ότι θα υλοποιηθούν όλες.
            </p>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 md:p-12 mb-8">
          <h2 className="text-2xl font-bold text-coral dark:text-coral-light mb-8 text-center flex items-center justify-center">
            <span className="text-3xl mr-3">📅</span>
            Χρονοδιάγραμμα Ανάπτυξης
          </h2>

          <div className="space-y-6">
            {/* Alpha Testing */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-32 font-bold text-charcoal dark:text-gray-100">
                18/11 - 10/12
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-charcoal dark:text-gray-100 mb-2">
                  Alpha Testing
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  3.5 εβδομάδες τεστάρισμα από τα μέλη της ΟΣ και την ομάδα της ιστοσελίδας για παρατηρήσεις και διορθώσεις.
                </p>
              </div>
            </div>

            {/* Beta Testing */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-32 font-bold text-charcoal dark:text-gray-100">
                10/12 - 6/1
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-charcoal dark:text-gray-100 mb-2">
                  Beta Testing
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Ενημέρωση στο newsletter (10/12) για την επικείμενη αλλαγή και προτροπή των μελών να πάνε στην ιστοσελίδα, να την ελέγξουν και να μας δώσουν feedback για λειτουργικότητα, bugs και θέματα λειτουργίας.
                </p>
              </div>
            </div>

            {/* Official Release */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-32 font-bold text-coral dark:text-coral-light">
                6/1
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-coral dark:text-coral-light mb-2">
                  Official Release 🎉
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Μεταφορά της διαχείρισης των domain στο CforC. Αλλαγή και μεταφορά της νέας ιστοσελίδας στο domain cultureforchange.net και της παλιάς ιστοσελίδας στο domain cultureforchange.gr.
                </p>
              </div>
            </div>

            {/* End of Old Site */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-32 font-bold text-gray-500 dark:text-gray-400">
                26/3
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-600 dark:text-gray-400 mb-2">
                  Τέλος Παλιάς Σελίδας
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Η παλιά σελίδα θα λήξει με τη λήξη της σύμβασης με Νεκατιβ. Μεταφορά του κώδικά τους σε δικό μας λογαριασμό.
                </p>
              </div>
            </div>
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
