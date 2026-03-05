import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Σύνδεση',
  description: 'Σύνδεση στο Culture for Change.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
