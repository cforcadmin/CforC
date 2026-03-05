import type { Metadata } from 'next'
import Script from 'next/script'
import { getActivityById } from '@/lib/strapi'
import { extractTextFromBlocks } from '@/lib/renderBlocks'
import ActivityDetailClient from './ActivityDetailClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const response = await getActivityById(decodeURIComponent(slug))
    const activity = response.data
    if (!activity) return { title: 'Δραστηριότητα δεν βρέθηκε' }

    const description = extractTextFromBlocks(activity.Description)?.slice(0, 160) || ''
    const imageUrl = activity.Visuals?.[0]?.url || null

    return {
      title: activity.Title,
      description,
      alternates: { canonical: `/activities/${slug}` },
      openGraph: {
        title: activity.Title,
        description,
        type: 'article',
        publishedTime: activity.Date,
        ...(imageUrl && { images: [{ url: imageUrl }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: activity.Title,
        description,
        ...(imageUrl && { images: [imageUrl] }),
      },
    }
  } catch {
    return { title: 'Δραστηριότητα | Culture for Change' }
  }
}

async function ActivityJsonLd({ slug }: { slug: string }) {
  try {
    const response = await getActivityById(decodeURIComponent(slug))
    const activity = response.data
    if (!activity) return null

    const description = extractTextFromBlocks(activity.Description)?.slice(0, 300) || ''
    const imageUrl = activity.Visuals?.[0]?.url || null

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: activity.Title,
      description,
      datePublished: activity.Date,
      dateModified: activity.updatedAt,
      ...(imageUrl && { image: imageUrl }),
      author: { '@type': 'Organization', name: 'Culture for Change' },
      publisher: {
        '@type': 'Organization',
        name: 'Culture for Change',
        url: 'https://cultureforchange.net',
      },
    }

    return (
      <Script
        id={`activity-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    )
  } catch {
    return null
  }
}

export default async function ActivityDetailPage({ params }: Props) {
  const { slug } = await params
  return (
    <>
      <ActivityJsonLd slug={slug} />
      <ActivityDetailClient />
    </>
  )
}
