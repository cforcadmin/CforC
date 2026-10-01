import type { Metadata } from 'next'
import { getEvents } from '@/lib/strapi'
import type { CforcEvent } from '@/lib/types'
import EventsContent from '@/components/events/EventsContent'

export const metadata: Metadata = {
  title: 'Δράσεις | Culture for Change',
  description: 'Οι δράσεις του δικτύου Culture for Change — συναντήσεις, Midterm, Γενική Συνέλευση.',
  openGraph: {
    title: 'Δράσεις | Culture for Change',
    description: 'Οι δράσεις του δικτύου Culture for Change.',
  },
}

/** Οι δράσεις αλλάζουν σπάνια αλλά η προθεσμία τρέχει — μία ώρα είναι αρκετή */
export const revalidate = 3600

export default async function EventsPage() {
  let events: CforcEvent[] = []
  try {
    const res = await getEvents()
    events = (res?.data || []) as CforcEvent[]
  } catch {
    // Η σελίδα δείχνει το άδειο μήνυμα· δεν σπάει επειδή δεν απάντησε το Strapi
  }
  return <EventsContent events={events} />
}
