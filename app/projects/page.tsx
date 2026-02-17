import type { Metadata } from 'next'
import ProjectsContent from '@/components/ProjectsContent'

export const metadata: Metadata = {
  title: 'Έργα | Culture for Change',
  description: 'Τα έργα και οι πρωτοβουλίες του Culture for Change',
  openGraph: {
    title: 'Έργα | Culture for Change',
    description: 'Τα έργα και οι πρωτοβουλίες του Culture for Change',
  },
}

export default function ProjectsPage() {
  return <ProjectsContent />
}
