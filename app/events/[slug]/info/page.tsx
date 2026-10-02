import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getEventBySlug } from '@/lib/strapi'
import type { CforcEvent } from '@/lib/types'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import { renderDocumentHtml } from '@/lib/campaignBlocks'
import { infoDocFor } from '@/lib/eventInfoDoc'
import { dateRangeLabel } from '@/lib/events'

export const metadata: Metadata = {
  title: 'Πληροφορίες | Culture for Change',
  // Λογιστικά της διοργάνωσης, όχι περιεχόμενο για αναζήτηση
  robots: { index: false, follow: false },
}

/** Η έκδοση εξαρτάται από τη ΣΥΝΕΔΡΙΑ — ποτέ από κρυφή μνήμη */
export const dynamic = 'force-dynamic'

/**
 * Το ενημερωτικό της δράσης, σε δύο εκδόσεις.
 *
 * Α για τα μέλη, Β για τους υπόλοιπους. Η επιλογή γίνεται ΣΤΟΝ SERVER και
 * στέλνεται μόνο η μία: οι ενότητες των μελών δεν φεύγουν ποτέ προς browser
 * χωρίς συνεδρία — «δεν φαίνεται» σημαίνει «δεν στάλθηκε» (μάθημα 2/10/2026,
 * όταν το κείμενο της ανοιχτής πρόσκλησης βρέθηκε στον πηγαίο κώδικα).
 *
 * Η ΟΨΗ είναι των email: τα ίδια μπλοκ που χτίζουν τα newsletter, ώστε το
 * έγγραφο να μοιάζει με ό,τι ήδη λαμβάνουν τα μέλη. Γι' αυτό και μένει
 * λευκή κάρτα σταθερού πλάτους — είναι ΕΓΓΡΑΦΟ, όχι σελίδα.
 */
export default async function EventInfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let ev: CforcEvent | null = null
  try { ev = (await getEventBySlug(slug)) as CforcEvent | null } catch { /* κάτω */ }
  if (!ev) notFound()

  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  const isMember = !!(decoded && decoded.type === 'session')

  // Ίδια κεφαλίδα και υπογραφή με τα email των μελών — όχι αντίγραφό τους
  const html = renderDocumentHtml({
    title: `${ev.Title} — Πληροφορίες`,
    blocks: infoDocFor(isMember),
  })

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <Link href={`/events/${ev.Slug}`} className="text-sm font-bold text-coral dark:text-coral-light hover:underline">
          ← {ev.Title}
        </Link>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-charcoal dark:text-white">
          Πληροφορίες
        </h1>
        <p className="mt-2 mb-8 text-gray-600 dark:text-gray-300">
          {dateRangeLabel(ev.StartDate, ev.EndDate)}{ev.City ? ` · ${ev.City}` : ''}
        </p>

        {/* Λευκό ΠΑΝΤΑ, και στο σκοτεινό θέμα: το περιεχόμενο κουβαλά τα
            δικά του χρώματα από τα μπλοκ των email, φτιαγμένα για λευκό
            φόντο. Σε σκούρα κάρτα θα έβγαινε μαύρο σε μαύρο. */}
        {/* ΠΙΟ ΠΛΑΤΙΑ ΑΠΟ ΓΡΑΜΜΑ: τα μπλοκ είναι φτιαγμένα για τα 640px ενός
            email, όπου ο αναγνώστης σαρώνει. Εδώ είναι ΕΓΓΡΑΦΟ που διαβάζεται,
            και στο στενό πλάτος οι παράγραφοι στοιβάζονταν. Οι πίνακες είναι
            width=100%, οπότε απλώνουν· κρατάμε όριο για να μη γίνει η γραμμή
            τόσο μακριά που να χάνεται το μάτι στην επιστροφή. */}
        <div className="mx-auto rounded-3xl bg-white shadow-sm overflow-hidden"
          style={{ maxWidth: 900 }}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/events/${ev.Slug}/register`}
            className="inline-flex items-center px-6 py-3 rounded-full bg-coral text-charcoal font-bold hover:brightness-105 transition">
            Δήλωση συμμετοχής
          </Link>
          <Link href={`/events/${ev.Slug}`}
            className="inline-flex items-center px-6 py-3 rounded-full border border-gray-300 dark:border-gray-600 font-bold text-charcoal dark:text-gray-100">
            Η σελίδα της δράσης
          </Link>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
