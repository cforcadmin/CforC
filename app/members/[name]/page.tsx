import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import Script from 'next/script'
import { getMemberBySlugOrId } from '@/lib/strapi'
import MemberDetailClient from './MemberDetailClient'

/**
 * ΕΝΑ ΑΙΤΗΜΑ, ΜΙΑ ΚΛΗΣΗ.
 *
 * Η σελίδα ζητούσε ΤΡΕΙΣ φορές το ίδιο μέλος: generateMetadata, το JSON-LD,
 * και ξανά ο πελάτης μέσα από το proxy. Φαινόταν στα logs του Strapi ως δύο
 * πανομοιότυπα ερωτήματα με διαφορά έξι δευτερολέπτων, και έκανε το
 * /api/members την πιο πολυσύχναστη διαδρομή (706 αιτήματα σε 24 ώρες).
 *
 * Το `cache` της React ενώνει τις δύο κλήσεις του ΔΙΑΚΟΜΙΣΤΗ μέσα στο ίδιο
 * αίτημα· η τρίτη φεύγει δίνοντας στον πελάτη ό,τι ήδη έχουμε. (20/10/2026)
 */
const memberOnce = cache((slug: string) => getMemberBySlugOrId(slug))

interface Props {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const slug = decodeURIComponent(name)
  try {
    const response = await memberOnce(slug)
    const member = response.data
    if (!member || member.HideProfile) return { title: 'Μέλος δεν βρέθηκε' }

    const fieldsOfWork = member.FieldsOfWork?.split(',').map((f: string) => f.trim()).filter((f: string) => f && f !== '-').join(', ') || ''
    const description = fieldsOfWork
      ? `${member.Name} — ${fieldsOfWork}. Μέλος του Culture for Change.`
      : `${member.Name} — Μέλος του Culture for Change.`
    const imageUrl = member.Image?.[0]?.url || null

    return {
      title: member.Name,
      description,
      alternates: { canonical: `/members/${slug}` },
      openGraph: {
        title: `${member.Name} | Culture for Change`,
        description,
        type: 'profile',
        ...(imageUrl && { images: [{ url: imageUrl }] }),
      },
      twitter: {
        card: imageUrl ? 'summary_large_image' : 'summary',
        title: `${member.Name} | Culture for Change`,
        description,
        ...(imageUrl && { images: [imageUrl] }),
      },
    }
  } catch {
    return { title: 'Μέλος | Culture for Change' }
  }
}

async function MemberJsonLd({ name }: { name: string }) {
  const slug = decodeURIComponent(name)
  try {
    const response = await memberOnce(slug)
    const member = response.data
    if (!member || member.HideProfile) return null

    const imageUrl = member.Image?.[0]?.url || null
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: member.Name,
      url: `https://cultureforchange.net/members/${slug}`,
      ...(imageUrl && { image: imageUrl }),
      ...(member.City && { address: { '@type': 'PostalAddress', addressLocality: member.City.split(',')[0]?.trim() } }),
      memberOf: { '@type': 'Organization', name: 'Culture for Change' },
    }

    return (
      <Script
        id={`person-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    )
  } catch {
    return null
  }
}

export default async function MemberDetailPage({ params }: Props) {
  const { name } = await params
  // Το ίδιο αποτέλεσμα που πήραν ήδη τα metadata — δεν ξαναζητιέται
  let initialMember = null
  try {
    const r = await memberOnce(decodeURIComponent(name))
    if (r.data && !r.data.HideProfile) initialMember = r.data
  } catch { /* ο πελάτης θα το φέρει μόνος του */ }

  return (
    <>
      <MemberJsonLd name={name} />
      <Suspense>
        <MemberDetailClient initialMember={initialMember} />
      </Suspense>
    </>
  )
}
