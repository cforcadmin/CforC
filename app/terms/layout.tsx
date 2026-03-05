import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Όροι Χρήσης',
  description: 'Όροι χρήσης του ιστότοπου Culture for Change.',
  alternates: { canonical: '/terms' },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
