import type { Metadata } from 'next'
import { getMemberBySlugOrId } from '@/lib/strapi'
import ProjectDetailClient from './ProjectDetailClient'

interface Props {
  params: Promise<{ name: string; project: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name, project } = await params
  const memberSlug = decodeURIComponent(name)
  const projectName = decodeURIComponent(project)

  try {
    const response = await getMemberBySlugOrId(memberSlug)
    const member = response.data
    if (!member) return { title: 'Έργο δεν βρέθηκε' }

    const isProject1 = member.Project1Title === projectName
    const isProject2 = member.Project2Title === projectName
    const title = isProject1 ? member.Project1Title : isProject2 ? member.Project2Title : projectName
    const pictures = isProject1 ? member.Project1Pictures : isProject2 ? member.Project2Pictures : null
    const imageUrl = pictures?.[0]?.url || null

    const description = `${title} — Έργο από ${member.Name}, μέλος του Culture for Change.`

    return {
      title: `${title} — ${member.Name}`,
      description,
      alternates: { canonical: `/members/${memberSlug}/${encodeURIComponent(projectName)}` },
      openGraph: {
        title: `${title} | ${member.Name}`,
        description,
        ...(imageUrl && { images: [{ url: imageUrl }] }),
      },
      twitter: {
        card: imageUrl ? 'summary_large_image' : 'summary',
        title: `${title} | ${member.Name}`,
        description,
        ...(imageUrl && { images: [imageUrl] }),
      },
    }
  } catch {
    return { title: 'Έργο Μέλους | Culture for Change' }
  }
}

export default function ProjectDetailPage() {
  return <ProjectDetailClient />
}
