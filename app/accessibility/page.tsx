import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollToTop from '@/components/ScrollToTop'

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                <div>ΔΗΛΩΣΗ</div>
                <div>ΠΡΟΣΒΑΣΙΜΟΤΗΤΑΣ</div>
              </h1>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">

              {/* Introduction */}
              <div className="bg-coral/10 dark:bg-coral-light/10 rounded-2xl p-8 mb-12">
                <p className="text-lg leading-relaxed mb-0">
                  Το Culture for Change δεσμεύεται να διασφαλίζει την ψηφιακή προσβασιμότητα για όλους τους χρήστες,
                  συμπεριλαμβανομένων ατόμων με αναπηρίες. Εργαζόμαστε συνεχώς για τη βελτίωση της εμπειρίας χρήστη
                  και την εφαρμογή των σχετικών προτύπων προσβασιμότητας.
                </p>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
                Τελευταία ενημέρωση: Ιανουάριος 2026
              </p>

              {/* Compliance Standards */}
              <h2 className="text-3xl font-bold mb-8 text-charcoal dark:text-gray-100">ΠΡΟΤΥΠΑ ΣΥΜΜΟΡΦΩΣΗΣ</h2>

              <p className="mb-6 leading-relaxed">
                Ο ιστότοπός μας στοχεύει στη συμμόρφωση με τις <strong>Οδηγίες για την Προσβασιμότητα
                του Περιεχομένου του Ιστού (WCAG) 2.2 επιπέδου AA</strong>. Αυτές οι οδηγίες εξηγούν πώς
                μπορούμε να κάνουμε το περιεχόμενο του ιστού πιο προσβάσιμο για άτομα με διάφορες αναπηρίες,
                όπως οπτικές, ακουστικές, κινητικές ή γνωστικές.
              </p>

              <p className="mb-12 leading-relaxed">
                Η συμμόρφωση με αυτές τις οδηγίες βοηθά επίσης στη βελτίωση της χρηστικότητας του ιστότοπου
                για όλους τους χρήστες.
              </p>

              {/* Accessibility Features */}
              <h2 className="text-3xl font-bold mb-8 text-charcoal dark:text-gray-100">ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ ΠΡΟΣΒΑΣΙΜΟΤΗΤΑΣ</h2>

              <p className="mb-6 leading-relaxed">
                Ο ιστότοπός μας περιλαμβάνει τα ακόλουθα χαρακτηριστικά προσβασιμότητας:
              </p>

              <h3 className="text-2xl font-bold mb-4 mt-8 text-charcoal dark:text-gray-100">Πλοήγηση με Πληκτρολόγιο</h3>
              <ul className="mb-6 space-y-2">
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Σύνδεσμος παράκαμψης:</strong> Πατήστε Tab στην αρχή κάθε σελίδας για να μεταβείτε απευθείας στο κύριο περιεχόμενο</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Πλήρης πλοήγηση:</strong> Όλα τα διαδραστικά στοιχεία είναι προσβάσιμα μέσω πληκτρολογίου</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Ορατοί δείκτες εστίασης:</strong> Κάθε στοιχείο εμφανίζει ευκρινή περίγραμμα όταν εστιάζεται</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Παγίδες εστίασης σε modals:</strong> Η εστίαση παραμένει εντός των διαλόγων μέχρι να κλείσουν</span>
                </li>
              </ul>

              <h3 className="text-2xl font-bold mb-4 mt-8 text-charcoal dark:text-gray-100">Υποστήριξη Αναγνωστών Οθόνης</h3>
              <ul className="mb-6 space-y-2">
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Σημασιολογική HTML:</strong> Χρήση κατάλληλων HTML5 στοιχείων και ARIA ρόλων</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Περιοχές ARIA live:</strong> Δυναμικό περιεχόμενο ανακοινώνεται αυτόματα</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Εναλλακτικό κείμενο:</strong> Όλες οι εικόνες περιλαμβάνουν περιγραφικό κείμενο</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Ιεραρχία επικεφαλίδων:</strong> Σωστή δομή επικεφαλίδων για εύκολη πλοήγηση</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Περιοχές ορόσημα:</strong> Χρήση banner, navigation, main και contentinfo roles</span>
                </li>
              </ul>

              <h3 className="text-2xl font-bold mb-4 mt-8 text-charcoal dark:text-gray-100">Οπτικά Χαρακτηριστικά</h3>
              <ul className="mb-6 space-y-2">
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Σκοτεινή λειτουργία:</strong> Εναλλαγή μεταξύ φωτεινού και σκοτεινού θέματος</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Αντίθεση χρωμάτων:</strong> Επαρκής αντίθεση κειμένου σύμφωνα με WCAG AA</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Αποφυγή κίνησης:</strong> Σεβασμός της προτίμησης prefers-reduced-motion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Μεγέθυνση κειμένου:</strong> Ο ιστότοπος παραμένει λειτουργικός με μεγέθυνση έως 200%</span>
                </li>
              </ul>

              <h3 className="text-2xl font-bold mb-4 mt-8 text-charcoal dark:text-gray-100">Φόρμες και Αλληλεπίδραση</h3>
              <ul className="mb-12 space-y-2">
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Ετικέτες πεδίων:</strong> Όλα τα πεδία φόρμας έχουν σαφείς ετικέτες</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Μηνύματα σφαλμάτων:</strong> Τα σφάλματα ανακοινώνονται σε αναγνώστες οθόνης</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Κουμπιά και σύνδεσμοι:</strong> Σαφείς περιγραφές για όλα τα διαδραστικά στοιχεία</span>
                </li>
              </ul>

              {/* Known Limitations */}
              <h2 className="text-3xl font-bold mb-8 text-charcoal dark:text-gray-100">ΓΝΩΣΤΟΙ ΠΕΡΙΟΡΙΣΜΟΙ</h2>

              <p className="mb-6 leading-relaxed">
                Παρά τις προσπάθειές μας, ορισμένα μέρη του ιστότοπου μπορεί να μην είναι πλήρως προσβάσιμα:
              </p>

              <ul className="mb-12 space-y-2">
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Google Translate widget:</strong> Το widget μετάφρασης είναι τρίτου μέρους και δεν ελέγχουμε πλήρως την προσβασιμότητά του</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Ενσωματωμένο περιεχόμενο:</strong> Βίντεο YouTube και άλλο ενσωματωμένο περιεχόμενο υπόκειται στις πολιτικές προσβασιμότητας των αντίστοιχων πλατφορμών</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Εικόνες χρηστών:</strong> Το εναλλακτικό κείμενο για εικόνες που ανεβάζουν τα μέλη εξαρτάται από την παροχή περιγραφής από τους ίδιους</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span><strong>Αρχεία PDF:</strong> Ορισμένα έγγραφα PDF μπορεί να μην είναι πλήρως προσβάσιμα</span>
                </li>
              </ul>

              {/* Compatible Technologies */}
              <h2 className="text-3xl font-bold mb-8 text-charcoal dark:text-gray-100">ΤΕΧΝΟΛΟΓΙΕΣ ΣΥΜΒΑΤΟΤΗΤΑΣ</h2>

              <h3 className="text-2xl font-bold mb-4 mt-8 text-charcoal dark:text-gray-100">Υποστηριζόμενοι Περιηγητές</h3>
              <ul className="mb-6 space-y-2">
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span>Google Chrome (τελευταίες 2 εκδόσεις)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span>Mozilla Firefox (τελευταίες 2 εκδόσεις)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span>Safari (τελευταίες 2 εκδόσεις)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span>Microsoft Edge (τελευταίες 2 εκδόσεις)</span>
                </li>
              </ul>

              <h3 className="text-2xl font-bold mb-4 mt-8 text-charcoal dark:text-gray-100">Δοκιμασμένοι Αναγνώστες Οθόνης</h3>
              <ul className="mb-12 space-y-2">
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span>NVDA με Firefox (Windows)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span>VoiceOver με Safari (macOS και iOS)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral dark:text-coral-light mr-2">•</span>
                  <span>TalkBack με Chrome (Android)</span>
                </li>
              </ul>

              {/* Report Issues */}
              <h2 className="text-3xl font-bold mb-8 text-charcoal dark:text-gray-100">ΑΝΑΦΟΡΑ ΠΡΟΒΛΗΜΑΤΩΝ</h2>

              <p className="mb-6 leading-relaxed">
                Αν αντιμετωπίσετε οποιοδήποτε πρόβλημα προσβασιμότητας στον ιστότοπό μας ή έχετε προτάσεις
                για βελτίωση, παρακαλούμε επικοινωνήστε μαζί μας:
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 mb-6">
                <h3 className="font-bold mb-4 text-charcoal dark:text-gray-100">Στοιχεία Επικοινωνίας</h3>
                <p className="mb-2">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:it@cultureforchange.net"
                    className="text-coral dark:text-coral-light hover:underline"
                    title="Αποστολή email για θέματα προσβασιμότητας"
                  >
                    it@cultureforchange.net
                  </a>
                </p>
                <p className="mb-2">
                  <strong>Τηλέφωνο:</strong>{' '}
                  <a
                    href="tel:+306976225704"
                    className="text-coral dark:text-coral-light hover:underline"
                    title="Τηλεφωνική επικοινωνία"
                  >
                    +30 697 622 5704
                  </a>
                </p>
                <p>
                  <strong>Διεύθυνση:</strong> Λεωφόρος Αλεξάνδρας 48, 114 73, Αθήνα
                </p>
              </div>

              <p className="mb-12 leading-relaxed">
                Θα προσπαθήσουμε να απαντήσουμε στο αίτημά σας εντός <strong>5 εργάσιμων ημερών</strong>
                και να επιλύσουμε το πρόβλημα το συντομότερο δυνατό.
              </p>

              {/* Review Date */}
              <h2 className="text-3xl font-bold mb-8 text-charcoal dark:text-gray-100">ΗΜΕΡΟΜΗΝΙΑ ΕΛΕΓΧΟΥ</h2>

              <p className="mb-6 leading-relaxed">
                Η τελευταία αξιολόγηση προσβασιμότητας του ιστότοπου πραγματοποιήθηκε τον <strong>Ιανουάριο 2026</strong>.
              </p>

              <p className="mb-12 leading-relaxed">
                Πραγματοποιούμε τακτικούς ελέγχους προσβασιμότητας και ενημερώνουμε τον ιστότοπο
                σύμφωνα με τις τελευταίες οδηγίες και βέλτιστες πρακτικές.
              </p>

              {/* Commitment */}
              <div className="bg-coral/10 dark:bg-coral-light/10 rounded-2xl p-8 border-l-4 border-coral dark:border-coral-light">
                <h3 className="font-bold mb-4 text-charcoal dark:text-gray-100">Η Δέσμευσή μας</h3>
                <p className="leading-relaxed mb-0">
                  Το Culture for Change πιστεύει στην ισοτιμία και τη συμπερίληψη. Δεσμευόμαστε να παρέχουμε
                  έναν ιστότοπο που είναι προσβάσιμος στο ευρύτερο δυνατό κοινό, ανεξάρτητα από τεχνολογία
                  ή ικανότητα. Συνεχίζουμε να αναζητούμε λύσεις που θα φέρουν όλες τις λειτουργίες και
                  το περιεχόμενό μας εντός των προτύπων προσβασιμότητας.
                </p>
              </div>

            </div>
          </div>
        </section>

        <NewsletterSection />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
