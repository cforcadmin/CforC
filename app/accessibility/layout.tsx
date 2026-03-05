import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Προσβασιμότητα',
  description: 'Δήλωση προσβασιμότητας του ιστότοπου Culture for Change.',
  alternates: { canonical: '/accessibility' },
}

export default function AccessibilityLayout({ children }: { children: React.ReactNode }) {
  return children
}
