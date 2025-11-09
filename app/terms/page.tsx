import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Navigation />

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Όροι και Προϋποθέσεις
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 leading-relaxed mb-6">
              Το περιεχόμενο αυτής της σελίδας θα ενημερωθεί σύντομα με τους όρους και τις προϋποθέσεις του Culture for Change.
            </p>

            {/* Placeholder content - will be filled by user */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
              <p>Το περιεχόμενο θα προστεθεί σύντομα...</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <CookieConsent />
    </main>
  )
}
