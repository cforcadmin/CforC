import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Προφίλ',
  description: 'Επεξεργασία προφίλ μέλους Culture for Change.',
  alternates: { canonical: '/profile' },
  robots: { index: false, follow: false },
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
