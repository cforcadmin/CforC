'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import NewsletterSection from '@/components/NewsletterSection'
import Link from 'next/link'

export default function ParticipationPage() {
  const handleOpenForm = () => {
    window.open('https://docs.google.com/forms/d/1J1Crq3_PIx0r2Qn8w3rv621m-_B30wan8x5xpVbxcSc/edit', '_blank')
  }

  return (
    <main className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none">
              GET INVOLVED
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="pt-32 pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section 1: Two-column layout with text */}
          <div className="mb-20">
            <p className="text-coral text-sm font-medium mb-2 uppercase">Γίνε Μέλος</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-12">
              ΘΕΛΩ ΝΑ ΓΙΝΩ ΜΕΛΟΣ
            </h2>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  Θέλεις να συμμετέχεις στο πιο ενεργό δίκτυο με στόχο την πολιτιστική αλλαγή; Γίνε μέλος στο Σωματείο Culture for Change!
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Το ετήσιο κόστος συμμετοχής στο Σωματείο είναι 35€, η εγγραφή είναι 10€. Η Γενική Συνέλευση λαμβάνει χώρα μία φορά το χρόνο κατά το πρώτο τρίμηνο του έτους και το ΔΣ έχει διετή θητεία. Κάθε χρόνο, πραγματοποιείται 1 interim meeting με κάλυψη μέρους των εξόδων των μελών σε διαφορετική πόλη/περιοχή της Ελλάδας κάθε φορά, με τη συνεργασία μελών του δικτύου που λειτουργούν ως local hosts. Τα μέλη έχουν πρόσβαση σε{' '}
                  <Link
                    href="/OdigosTsepis2025.pdf"
                    target="_blank"
                    className="text-coral hover:underline font-medium"
                  >
                    προνόμια
                  </Link>
                  {' '}όπως: Συμμετοχή, Δικτύωση, Ανάπτυξη Ικανοτήτων, Συνηγορία, Υποστήριξη, και ευκαιρίες Απασχόλησης.
                </p>
                <Link
                  href="/OdigosTsepis2025.pdf"
                  target="_blank"
                  className="inline-block text-coral hover:underline font-medium mt-4"
                >
                  Διάβασε τις Οδηγίες μας
                </Link>
              </div>

              {/* Right Column */}
              <div className="bg-gray-50 rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-6">
                  Γιατί να εγγραφώ στο CforC;
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Το CforC έχει ως στόχο την ενίσχυση ατόμων και οργανισμών που επιδιώκουν την πολιτιστική αλλαγή σε μεγάλη κλίμακα που θέτουν την κοινωνικοπολιτιστική καινοτομία στο επίκεντρο όλων των δράσεών τους. Αυτές οι κατευθυντήριες γραμμές δημιουργήθηκαν για να μας βοηθήσουν να συνεργαστούμε καλύτερα ώστε να επιτύχουμε οικιστικό αντίκτυπο.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Feature boxes with icons/visuals */}
          <div className="mb-20">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-orange-50 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3">Πιστεύεις στη δύναμη του συλλογικού αντίκτυπου.</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Θέλεις να συνεργάζεσαι με ανθρώπους από διάφορες κοινότητες, κλάδους και υπόβαθρα και να δημιουργείς ουσιαστικές συνδέσεις μαζί τους. Γνωρίζεις πόσο σημαντικές είναι οι αξιόπιστες συνεργασίες για την επιτυχία των έργων κοινωνικής και πολιτιστικής καινοτομίας.
                </p>
              </div>

              <div className="bg-orange-50 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3">Αναγνωρίζεις την εμπειρία και εξειδίκευση της κοινότητας.</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Κατανοείς ότι ο κοινωνικοπολιτιστικός μετασχηματισμός είναι μια διαδικασία και όχι ένα τελικό προϊόν. Βάζεις πάντα την κοινότητα σε προτεραιότητα όταν συμμετέχεις και συνηγορείς υπέρ ενός δικτύου.
                </p>
              </div>

              <div className="bg-orange-50 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3">Προσεγγίζεις την κοινωνικοπολιτιστική καινοτομία ολιστικά.</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Έχεις ένα δημιουργικό τρόπο να βλέπεις πώς στοιχεία διαφορετικά (και ίσως ιδιαίτερα) μπορούν να συνδυαστούν για να δημιουργήσουν ένα εξαιρετικό αποτέλεσμα.
                </p>
              </div>

              <div className="bg-orange-50 rounded-2xl p-6">
                <div className="w-12 h-12 bg-coral rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-3">Δείχνεις σεβασμό.</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Εκτιμάς τις απόψεις και τις κουλτούρες των άλλων ανθρώπων. Στις συζητήσεις σου, πρώτα ακούς και επικοινωνείς από την οπτική γωνία του "εγώ".
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Call-to-action with button */}
          <div className="bg-gradient-to-br from-coral to-orange-400 rounded-3xl p-12 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Έτοιμος να γίνεις μέλος;
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              Συμπλήρωσε τη φόρμα εγγραφής και θα επικοινωνήσουμε μαζί σου σύντομα για τα επόμενα βήματα!
            </p>
            <button
              onClick={handleOpenForm}
              className="bg-white text-coral px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ΣΥΜΠΛΗΡΩΣΕ ΤΗ ΦΟΡΜΑ ΕΓΓΡΑΦΗΣ
            </button>
            <p className="text-sm mt-6 opacity-90">
              Με την υποβολή συμφωνείτε με τους{' '}
              <Link href="/terms" className="underline hover:no-underline">
                όρους
              </Link>
              {' '}και τις{' '}
              <Link href="/privacy" className="underline hover:no-underline">
                προϋποθέσεις
              </Link>
              {' '}μας.
            </p>
          </div>
        </div>
      </section>

      <NewsletterSection />
      <Footer />
      <CookieConsent />
    </main>
  )
}
