import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/strapi'
import type { CforcEvent } from '@/lib/types'
import EventDetail from '@/components/events/EventDetail'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  let ev: CforcEvent | null = null
  try { ev = (await getEventBySlug(slug)) as CforcEvent | null } catch { /* τίτλος εφεδρείας */ }
  if (!ev) return { title: 'Δράση | Culture for Change' }
  return {
    title: `${ev.Title} | Culture for Change`,
    description: ev.Subtitle || 'Δράση του δικτύου Culture for Change',
    openGraph: { title: ev.Title, description: ev.Subtitle || '' },
  }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let ev: CforcEvent | null = null
  try { ev = (await getEventBySlug(slug)) as CforcEvent | null } catch { /* κάτω */ }
  if (!ev) notFound()
  return <EventDetail ev={ev} />
}
