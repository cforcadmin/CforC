import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ομάδα Συντονισμού',
  description: 'Η ομάδα συντονισμού του Culture for Change.',
  alternates: { canonical: '/coordination-team' },
}

export default function CoordinationTeamLayout({ children }: { children: React.ReactNode }) {
  return children
}
