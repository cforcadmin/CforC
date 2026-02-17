import type { Metadata } from 'next'
import { getProjectEntryBySlug } from '@/lib/strapi'
import EntryDetail from '@/components/EntryDetail'

interface Props {
  params: Promise<{ slug: string; entrySlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entrySlug } = await params
  try {
    const response = await getProjectEntryBySlug(entrySlug)
    const entry = response.data?.[0]
    if (!entry) return { title: 'Καταχώρηση δεν βρέθηκε | Culture for Change' }

    const imageUrl = entry.cover_image
      ? (Array.isArray(entry.cover_image) && entry.cover_image.length > 0
        ? entry.cover_image[0].url
        : typeof entry.cover_image === 'object' && 'url' in entry.cover_image
          ? entry.cover_image.url
          : null)
      : null

    const isPrivate = entry.visibility === 'private'

    return {
      title: `${entry.title} | Culture for Change`,
      description: entry.category || `Καταχώρηση: ${entry.title}`,
      ...(isPrivate && {
        robots: { index: false, follow: false },
      }),
      openGraph: {
        title: `${entry.title} | Culture for Change`,
        description: entry.category || `Καταχώρηση: ${entry.title}`,
        ...(imageUrl && { images: [{ url: imageUrl }] }),
      },
    }
  } catch {
    return { title: 'Καταχώρηση | Culture for Change' }
  }
}

export default async function EntryPage({ params }: Props) {
  const { slug, entrySlug } = await params
  return <EntryDetail projectSlug={slug} entrySlug={entrySlug} />
}
