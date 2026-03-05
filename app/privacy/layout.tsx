import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Πολιτική Απορρήτου',
  description: 'Πολιτική απορρήτου και προστασίας προσωπικών δεδομένων του Culture for Change.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
