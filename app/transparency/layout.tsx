import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Διαφάνεια',
  description: 'Στοιχεία διαφάνειας και οικονομικές αναφορές του Culture for Change.',
  alternates: { canonical: '/transparency' },
}

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return children
}
