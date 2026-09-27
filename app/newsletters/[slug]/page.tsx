import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { getNewsletterBySlug } from '@/lib/strapi'
import { verifyToken } from '@/lib/auth'
import NewsletterFrame from './NewsletterFrame'
import type { Metadata } from 'next'

/**
 * Ένα τεύχος newsletter, στη ΔΙΚΗ μας σελίδα.
 *
 * Τα παλιά τεύχη ζούσαν ως PDF στο Google Drive. Όσα φεύγουν από το OC
 * κρατούν το ίδιο το γράμμα, οπότε ανοίγουν εδώ: δεν εξαρτώνται από τον
 * λογαριασμό Google κανενός, δεν σπάνε αν μετακινηθεί ένα αρχείο, και
 * διαβάζονται στο κινητό χωρίς κατέβασμα PDF.
 *
 * ΤΟ ΓΡΑΜΜΑ ΜΠΑΙΝΕΙ ΣΕ <iframe>. Είναι ολόκληρο έγγραφο email — δικό του
 * <html>, δικά του inline styles, πίνακες πλάτους 600px. Μέσα στη σελίδα θα
 * το έβαφαν τα styles του site και θα έδειχνε αλλιώς απ' ό,τι στο
 * γραμματοκιβώτιο. Η απομόνωση είναι το ζητούμενο, όχι παρενέργεια.
 */

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const n = await getNewsletterBySlug(slug).catch(() => null)
  if (!n) return { title: 'Το τεύχος δεν βρέθηκε' }
  // Τα τεύχη των μελών δεν θέλουμε να τα δείχνει η Google
  const members = n.Audience === 'members'
  return {
    title: `${n.Title} — Culture for Change`,
    description: members ? undefined : `Newsletter του Culture for Change: ${n.Title}`,
    ...(members ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function NewsletterPage({ params }: Props) {
  const { slug } = await params
  const n = await getNewsletterBySlug(slug).catch(() => null)
  if (!n) notFound()

  // Το τεύχος που πήγε ΜΟΝΟ στα μέλη διαβάζεται μόνο από συνδεδεμένο μέλος
  if (n.Audience === 'members') {
    const token = (await cookies()).get('session')?.value
    const decoded = token ? verifyToken(token) : null
    if (!decoded || decoded.type !== 'session') {
      return (
        <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
          <Navigation />
          <main id="main-content" className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
            <h1 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-3">{n.Title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Αυτό το τεύχος στάλθηκε στα μέλη του δικτύου. Συνδέσου για να το διαβάσεις.
            </p>
            <Link href="/login" className="inline-flex items-center min-h-11 px-6 rounded-full bg-coral text-charcoal font-bold">
              Σύνδεση
            </Link>
          </main>
          <Footer />
        </div>
      )
    }
  }

  // Παλιό τεύχος χωρίς HTML: δεν έχουμε τι να δείξουμε — στέλνουμε στο Drive
  if (!n.Html) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
        <Navigation />
        <main id="main-content" className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
          <h1 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-3">{n.Title}</h1>
          {n.DriveLink ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Αυτό το τεύχος υπάρχει ως αρχείο PDF.</p>
              <a href={n.DriveLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center min-h-11 px-6 rounded-full bg-coral text-charcoal font-bold">
                Άνοιγμα PDF
              </a>
            </>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Το περιεχόμενο αυτού του τεύχους δεν είναι διαθέσιμο.</p>
          )}
        </main>
        <Footer />
      </div>
    )
  }

  const when = n.Date
    ? new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(n.Date))
    : ''

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="mb-6">
          <Link href="/profile?section=newsletters" className="text-sm text-coral dark:text-coral-light hover:underline">
            ← Όλα τα τεύχη
          </Link>
          <h1 className="text-3xl font-bold text-charcoal dark:text-gray-100 mt-3">{n.Title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 notranslate">{when}</p>
        </div>
        <NewsletterFrame html={n.Html} title={n.Title} />
      </main>
      <Footer />
    </div>
  )
}
