'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import CookieConsent from '@/components/CookieConsent'
import type { CforcEvent } from '@/lib/types'
import { eventPhase, dateRangeLabel, registrationClosed, athensToday } from '@/lib/events'
import { upperGreek } from '@/lib/campaignBlocks'

/**
 * Η λίστα των δράσεων — δημόσια.
 *
 * Το αρχείο ΔΕΝ κρύβεται πίσω από κουμπί «δες παλιότερα»: οι περασμένες
 * δράσεις είναι η ιστορία του δικτύου και κάποιος τις ψάχνει επίτηδες. Μπαίνουν
 * σε δικό τους τμήμα, κλειστό στην αρχή όταν είναι πολλές.
 */
export default function EventsContent({ events }: { events: CforcEvent[] }) {
  const today = athensToday()
  const [showPast, setShowPast] = useState(false)

  const { current, upcoming, past } = useMemo(() => {
    const c: CforcEvent[] = []; const u: CforcEvent[] = []; const p: CforcEvent[] = []
    for (const ev of events) {
      const phase = eventPhase(ev, today)
      if (phase === 'running') c.push(ev)
      else if (phase === 'upcoming') u.push(ev)
      else p.push(ev)
    }
    // Οι επόμενες: η πιο κοντινή πρώτη. Οι περασμένες: η πιο πρόσφατη πρώτη.
    u.sort((a, b) => a.StartDate.localeCompare(b.StartDate))
    p.sort((a, b) => b.StartDate.localeCompare(a.StartDate))
    return { current: c, upcoming: u, past: p }
  }, [events, today])

  const hasAny = events.length > 0

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <header className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-charcoal dark:text-white mb-3">Δράσεις</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
            Οι συναντήσεις του δικτύου — το Midterm και η Γενική Συνέλευση κάθε χρόνο,
            μαζί με ό,τι άλλο διοργανώνουμε για τα μέλη και τους φίλους του CforC.
          </p>
        </header>

        {!hasAny && (
          <p className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-8 text-gray-600 dark:text-gray-300">
            Δεν υπάρχουν δράσεις αυτή τη στιγμή. Γράψου στο newsletter για να μαθαίνεις πρώτος.
          </p>
        )}

        {current.length > 0 && (
          <Section title="Γίνεται τώρα">
            {current.map(ev => <EventCard key={ev.documentId} ev={ev} today={today} highlight />)}
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section title="Επόμενες">
            {upcoming.map(ev => <EventCard key={ev.documentId} ev={ev} today={today} highlight />)}
          </Section>
        )}

        {past.length > 0 && (
          <section className="mt-12">
            <button type="button" onClick={() => setShowPast(v => !v)}
              aria-expanded={showPast}
              className="flex items-baseline gap-3 text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 hover:text-coral transition-colors">
              ΑΡΧΕΙΟ
              <span className="text-sm font-normal normal-case tracking-normal">
                {past.length} {past.length === 1 ? 'δράση' : 'δράσεις'}
              </span>
              <span aria-hidden="true" className={`transition-transform ${showPast ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showPast && (
              <div className="grid gap-4 mt-4">
                {past.map(ev => <EventCard key={ev.documentId} ev={ev} today={today} />)}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-4">{upperGreek(title)}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function EventCard({ ev, today, highlight }: { ev: CforcEvent; today: string; highlight?: boolean }) {
  const closed = registrationClosed(ev, today)
  const phase = eventPhase(ev, today)
  return (
    <Link href={`/events/${ev.Slug}`}
      className={`block rounded-3xl border p-6 sm:p-8 transition-colors bg-white dark:bg-gray-800 ${
        highlight
          ? 'border-coral hover:border-coral shadow-sm'
          : 'border-gray-200 dark:border-gray-600 hover:border-coral'}`}>
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <span className="text-sm font-bold text-coral dark:text-coral-light">
          {dateRangeLabel(ev.StartDate, ev.EndDate)}
        </span>
        {ev.City && <span className="text-sm text-gray-600 dark:text-gray-400">· {ev.City}</span>}
        {phase === 'running' && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-coral text-charcoal">ΓΙΝΕΤΑΙ ΤΩΡΑ</span>
        )}
        {phase === 'upcoming' && !closed && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            ΑΝΟΙΧΤΕΣ ΔΗΛΩΣΕΙΣ
          </span>
        )}
        {phase === 'upcoming' && closed && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            ΟΙ ΔΗΛΩΣΕΙΣ ΕΚΛΕΙΣΑΝ
          </span>
        )}
      </span>
      <h3 className="text-xl sm:text-2xl font-bold text-charcoal dark:text-white">{ev.Title}</h3>
      {ev.Subtitle && <p className="mt-1 text-gray-600 dark:text-gray-300">{ev.Subtitle}</p>}
      {ev.HostedBy && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Με τη φιλοξενία: {ev.HostedBy}</p>
      )}
    </Link>
  )
}
