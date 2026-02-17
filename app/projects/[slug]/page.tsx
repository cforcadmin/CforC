import type { Metadata } from 'next'
import { getProjectBySlug } from '@/lib/strapi'
import ProjectDetail from '@/components/ProjectDetail'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const response = await getProjectBySlug(slug)
    const project = response.data?.[0]
    if (!project) return { title: 'Έργο δεν βρέθηκε | Culture for Change' }

    const imageUrl = project.cover_image
      ? (Array.isArray(project.cover_image) && project.cover_image.length > 0
        ? project.cover_image[0].url
        : typeof project.cover_image === 'object' && 'url' in project.cover_image
          ? project.cover_image.url
          : null)
      : null

    return {
      title: `${project.title} | Culture for Change`,
      description: project.short_description || `Έργο: ${project.title}`,
      openGraph: {
        title: `${project.title} | Culture for Change`,
        description: project.short_description || `Έργο: ${project.title}`,
        ...(imageUrl && { images: [{ url: imageUrl }] }),
      },
    }
  } catch {
    return { title: 'Έργο | Culture for Change' }
  }
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  return <ProjectDetail slug={slug} />
}
