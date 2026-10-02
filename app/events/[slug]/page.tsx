import type { Metadata } from 'next'
import { loadEvent, loadEventForMetadata } from '@/lib/loadEvent'
import type { CforcEvent } from '@/lib/types'
import EventDetail from '@/components/events/EventDetail'
import { stripOpenCall } from '@/lib/openCall'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const ev = await loadEventForMetadata(slug)
  if (!ev) return { title: 'Δράση | Culture for Change' }
  return {
    title: `${ev.Title} | Culture for Change`,
    description: ev.Subtitle || 'Δράση του δικτύου Culture for Change',
    openGraph: { title: ev.Title, description: ev.Subtitle || '' },
  }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ev = await loadEvent(slug)
  // Σελίδα δημόσια ΚΑΙ στην κρυφή μνήμη για μία ώρα: ό,τι μπει εδώ το
  // διαβάζει οποιοσδήποτε. Η πρόσκληση ζει μόνο μέσα στη φόρμα.
  return <EventDetail ev={stripOpenCall(ev)} />
}
