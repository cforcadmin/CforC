'use client'

import Link from 'next/link'
import { descriptionHtml, hasDescription } from '@/lib/eventRichText'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import CookieConsent from '@/components/CookieConsent'
import { useAuth } from '@/components/AuthProvider'
import type { CforcEvent } from '@/lib/types'
import {
  eventPhase, dateRangeLabel, registrationClosed, athensToday, sortSessions, grDate,
} from '@/lib/events'

/**
 * Η σελίδα μιας δράσης — δημόσια, ακόμη κι όταν η δήλωση είναι μόνο για μέλη.
 *
 * Η ΠΥΛΗ δεν είναι εδώ: το κουμπί της δήλωσης οδηγεί στη φόρμα, και ο server
 * αποφασίζει ποιος περνά (Audience). Μια σελίδα που κρύβεται ολόκληρη δεν
 * μπορεί να μοιραστεί ούτε να βρεθεί — και το πρόγραμμα δεν είναι μυστικό.
 */
export default function EventDetail({ ev }: { ev: CforcEvent }) {
  /* Ο σύνδεσμος «Όλες οι δράσεις» ΜΟΝΟ για συνδεδεμένους.
     Η σελίδα μοιράζεται δημόσια — όποιος έρχεται από το γράμμα ήρθε για
     ΑΥΤΗ τη δράση, και δεν τον στέλνουμε να περιηγηθεί σε λίστα που τον
     αφορά μόνο εν μέρει. Ο έλεγχος γίνεται στον browser ΕΠΙΤΗΔΕΣ: η
     σελίδα μένει έτσι στην κρυφή μνήμη (revalidate 3600) αντί να γίνει
     δυναμική για ένα σύνδεσμο. */
  const { isAuthenticated, isLoading } = useAuth()
  const today = athensToday()
  const phase = eventPhase(ev, today)
  const closed = registrationClosed(ev, today)
  const sessions = sortSessions(ev.Sessions)
  const membersOnly = ev.Audience === 'member'

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* isLoading: δεν δείχνουμε σύνδεσμο που θα εξαφανιστεί μπροστά
            στα μάτια του αναγνώστη μόλις λυθεί η συνεδρία. */}
        {!isLoading && isAuthenticated && (
          <Link href="/events" className="text-sm font-bold text-coral dark:text-coral-light hover:underline">
            ← Όλες οι δράσεις
          </Link>
        )}

        <header className="mt-4 mb-8">
          <p className="text-sm font-bold text-coral dark:text-coral-light mb-2">
            {dateRangeLabel(ev.StartDate, ev.EndDate)}
            {ev.City ? ` · ${ev.City}` : ''}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white">{ev.Title}</h1>
          {ev.Subtitle && <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">{ev.Subtitle}</p>}
          {(ev.Venue || ev.HostedBy) && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {ev.Venue}{ev.Venue && ev.HostedBy ? ' · ' : ''}
              {ev.HostedBy && <>Με τη φιλοξενία: {ev.HostedBy}</>}
            </p>
          )}
        </header>

        {/* ── Η πρόσκληση ── */}
        {/* Η περιγραφή γράφεται πλέον με έντονα, λίστες και συνδέσμους, άρα
            αποθηκεύεται ως HTML. Οι ΠΑΛΙΕΣ περιγραφές είναι απλό κείμενο και
            περνούν από την ίδια συνάρτηση — βγαίνουν παράγραφοι, ακριβώς όπως
            τις έδειχνε το whitespace-pre-line. Ο καθαριστής είναι του
            ΙΣΤΟΤΟΠΟΥ, όχι του γράμματος: δεν καρφώνει χρώμα, ώστε το
            dark:prose-invert να δουλέψει. */}
        {hasDescription(ev.Description) && (
          <section className="mb-10">
            <h2 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-4">Η ΠΡΟΣΚΛΗΣΗ</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-charcoal dark:text-gray-200"
              dangerouslySetInnerHTML={{ __html: descriptionHtml(ev.Description) }} />
          </section>
        )}
        {hasDescription(ev.DescriptionEn) && (
          <details className="mb-10">
            <summary className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 cursor-pointer">
              ENGLISH VERSION
            </summary>
            <div className="prose prose-lg dark:prose-invert max-w-none mt-4 text-charcoal dark:text-gray-200"
              dangerouslySetInnerHTML={{ __html: descriptionHtml(ev.DescriptionEn) }} />
          </details>
        )}

        {/* ── Το πρόγραμμα ── */}
        {sessions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-4">ΠΡΟΓΡΑΜΜΑ</h2>
            <ul className="grid gap-3">
              {sessions.map(s => (
                <li key={s.id} className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5">
                  <p className="font-bold text-charcoal dark:text-white">{s.Title}</p>
                  {s.Subtitle && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{s.Subtitle}</p>}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {sessionWhen(s.StartsAt, s.EndsAt)}
                    {/* Λέγεται ΕΔΩ γιατί δεν είναι ίδιο παντού: κάποιες συνεδρίες
                        δεν έχουν διαδικτυακή παρακολούθηση. */}
                    {s.AllowOnline ? ' · δια ζώσης ή διαδικτυακά' : ' · μόνο δια ζώσης'}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Η δήλωση ── */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-6 sm:p-8 mb-10">
          {phase === 'past' ? (
            <p className="text-gray-600 dark:text-gray-300">
              Η δράση ολοκληρώθηκε στις {grDate(ev.EndDate)}.
            </p>
          ) : closed ? (
            <>
              <p className="font-bold text-charcoal dark:text-white mb-1">Οι δηλώσεις συμμετοχής έκλεισαν.</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Αν θέλεις να συμμετάσχεις, γράψε μας στο{' '}
                <a href="mailto:hello@cultureforchange.net" className="text-coral dark:text-coral-light hover:underline">
                  hello@cultureforchange.net
                </a>.
              </p>
            </>
          ) : (
            <>
              <span className="flex flex-wrap items-baseline gap-3 mb-3">
                <span className="font-bold text-charcoal dark:text-white">Δήλωσε συμμετοχή</span>
                {ev.RegistrationDeadline && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Προθεσμία: <strong className="notranslate">{grDate(ev.RegistrationDeadline)}</strong>
                  </span>
                )}
              </span>
              {membersOnly && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Η δράση είναι για τα μέλη του δικτύου — θα χρειαστεί να συνδεθείς.
                </p>
              )}
              {/* ΣΥΝΔΕΔΕΜΕΝΟΣ: κατευθείαν στη φόρμα. Η πύλη ρωτά «είσαι μέλος;»
                  και σε κάποιον που έχει ήδη συνδεθεί η ερώτηση είναι φόρος.
                  ΑΠΟΣΥΝΔΕΔΕΜΕΝΟΣ: περνά από την πύλη, που δίνει ΚΑΙ τις
                  πληροφορίες — γι' αυτό το κουμπί δεν λέει μόνο «δήλωση». */}
              {!isLoading && isAuthenticated ? (
                <Link href={`/events/${ev.Slug}/register/form`}
                  className="inline-flex items-center px-6 py-3 rounded-full bg-coral text-charcoal font-bold hover:brightness-105 transition">
                  Δήλωση συμμετοχής
                </Link>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Για περισσότερες πληροφορίες και για να δηλώσεις συμμετοχή, πάτησε εδώ.
                  </p>
                  <Link href={`/events/${ev.Slug}/register`}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-coral text-charcoal font-bold hover:brightness-105 transition">
                    Πληροφορίες και δήλωση συμμετοχής
                  </Link>
                </>
              )}
            </>
          )}
        </div>


        {/* ── Το υλικό ── */}
        {Array.isArray(ev.Resources) && ev.Resources.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-4">ΥΛΙΚΟ</h2>
            <ul className="grid gap-2">
              {[...ev.Resources]
                .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
                .map(r => {
                  const file: any = Array.isArray(r.File) ? r.File[0] : r.File
                  const href = r.Url || file?.url || ''
                  if (!href) return null
                  return (
                    <li key={r.id}>
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="flex flex-wrap items-baseline gap-2 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-3 hover:border-coral transition-colors">
                        <span className="font-bold text-charcoal dark:text-white">{r.Label}</span>
                        {/* Το μέγεθος φαίνεται ΕΠΙΤΗΔΕΣ: το όριο των 5MB είναι
                            σύμβαση, όχι επιβολή — ένα βαρύ αρχείο πρέπει να
                            φαίνεται, και σε όποιον κατεβάζει με δεδομένα κινητού. */}
                        {file?.size && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            {fileLabel(file)}
                          </span>
                        )}
                        {!file && r.Url && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">σύνδεσμος ↗</span>
                        )}
                      </a>
                    </li>
                  )
                })}
            </ul>
          </section>
        )}

      </main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />
    </div>
  )
}

/** «PDF · 1,2 MB» — το Strapi δίνει το μέγεθος σε KB */
function fileLabel(file: { ext?: string; size?: number }): string {
  const ext = String(file.ext || '').replace('.', '').toUpperCase()
  const mb = typeof file.size === 'number' ? file.size / 1024 : 0
  const size = mb >= 1 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${Math.round((file.size || 0))} KB`
  return [ext, size].filter(Boolean).join(' · ')
}

/** «Παρασκευή 20 Νοεμβρίου, 18:00–21:00» */
function sessionWhen(startsAt: string, endsAt?: string): string {
  if (!startsAt) return ''
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('el-GR', { timeZone: 'Europe/Athens', ...opts }).format(d)
  }
  const day = fmt(startsAt, { weekday: 'long', day: 'numeric', month: 'long' })
  const from = fmt(startsAt, { hour: '2-digit', minute: '2-digit' })
  const to = endsAt ? fmt(endsAt, { hour: '2-digit', minute: '2-digit' }) : ''
  if (!day) return ''
  return `${day}, ${from}${to ? `–${to}` : ''}`
}
