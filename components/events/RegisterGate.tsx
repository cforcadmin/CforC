'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import type { CforcEvent } from '@/lib/types'
import type { EventAccess } from '@/lib/eventAccess'
import { dateRangeLabel, grDate } from '@/lib/events'

/**
 * Η πόρτα της δήλωσης — δύο δρόμοι, μία φόρμα από πίσω.
 *
 * ΔΕΝ ρωτάει «είσαι μέλος;» σε συνδεδεμένο άνθρωπο: το ξέρουμε ήδη και η
 * ερώτηση θα ήταν φόρος σε όσους έκαναν ήδη τον κόπο να συνδεθούν.
 *
 * Οι προτροπές για newsletter και εγγραφή στο δίκτυο ΔΕΝ είναι εδώ. Μπαίνουν
 * ΜΕΤΑ την υποβολή (απόφαση Γιώργου, 1/10/2026): πριν τελειώσει κανείς αυτό
 * που ήρθε να κάνει, κάθε άλλη προτροπή είναι εμπόδιο.
 */
export default function RegisterGate({
  ev, access, isMember,
}: { ev: CforcEvent; access: EventAccess; isMember: boolean }) {
  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <Link href={`/events/${ev.Slug}`} className="text-sm font-bold text-coral dark:text-coral-light hover:underline">
          ← {ev.Title}
        </Link>

        <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-charcoal dark:text-white">
          Δήλωση συμμετοχής
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {dateRangeLabel(ev.StartDate, ev.EndDate)}{ev.City ? ` · ${ev.City}` : ''}
        </p>

        {!access.allowed && (access.reason === 'closed' || access.reason === 'past') && (
          <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-6 sm:p-8">
            <p className="font-bold text-charcoal dark:text-white mb-1">
              {access.reason === 'past'
                ? 'Η δράση ολοκληρώθηκε.'
                : 'Οι δηλώσεις συμμετοχής έκλεισαν.'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {access.reason === 'past'
                ? `Τελείωσε στις ${grDate(ev.EndDate)}.`
                : ev.RegistrationDeadline
                  ? `Η προθεσμία ήταν ${grDate(ev.RegistrationDeadline)}.`
                  : 'Η προθεσμία πέρασε.'}
              {' '}Γράψε μας στο{' '}
              <a href="mailto:hello@cultureforchange.net" className="text-coral dark:text-coral-light hover:underline">
                hello@cultureforchange.net
              </a>{' '}αν θέλεις να συμμετάσχεις.
            </p>
          </div>
        )}

        {access.allowed && access.mode === 'member' && (
          <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-6 sm:p-8">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Είσαι συνδεδεμένος — τα στοιχεία σου μπαίνουν μόνα τους και μπορείς να τα διορθώσεις.
            </p>
            <Link href={`/events/${ev.Slug}/register/form`}
              className="inline-flex items-center px-6 py-3 rounded-full bg-coral text-charcoal font-bold hover:brightness-105 transition">
              Συνέχεια στη δήλωση
            </Link>
          </div>
        )}

        {access.allowed && access.mode === 'choose' && (
          <>
            <p className="mt-8 text-gray-600 dark:text-gray-300">
              Για να προσυμπληρώσουμε τα στοιχεία σου και να συνδέσουμε τη δήλωση με το προφίλ σου:
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Door
                title="Είμαι μέλος του CforC"
                body="Συνδέσου και η δήλωση θα έρθει συμπληρωμένη, με τα στοιχεία του προφίλ σου."
                cta="Σύνδεση"
                href={`/login?returnTo=${encodeURIComponent(`/events/${ev.Slug}/register`)}`}
                primary
              />
              <Door
                title="Δεν είμαι μέλος"
                body="Δήλωσε κανονικά συμμετοχή. Θα σου στείλουμε ένα email για να επιβεβαιώσεις τη διεύθυνσή σου."
                cta="Δήλωση συμμετοχής"
                href={`/events/${ev.Slug}/register/form`}
              />
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Δεν θυμάσαι αν είσαι μέλος; Διάλεξε «Σύνδεση» — αν δεν έχεις λογαριασμό, γύρνα πίσω
              και δήλωσε ως μη μέλος. Τίποτα δεν χάνεται.
            </p>
          </>
        )}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}

function Door({ title, body, cta, href, primary }: {
  title: string; body: string; cta: string; href: string; primary?: boolean
}) {
  return (
    <div className={`rounded-3xl border p-6 flex flex-col bg-white dark:bg-gray-800 ${
      primary ? 'border-coral' : 'border-gray-200 dark:border-gray-600'}`}>
      <h2 className="font-bold text-lg text-charcoal dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 flex-1">{body}</p>
      <Link href={href}
        className={`mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-full font-bold text-sm transition ${
          primary
            ? 'bg-coral text-charcoal hover:brightness-105'
            : 'border-2 border-coral text-coral dark:text-coral-light hover:bg-coral hover:text-charcoal'}`}>
        {cta}
      </Link>
    </div>
  )
}
