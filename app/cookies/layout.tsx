import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Πολιτική Cookies',
  description: 'Πολιτική cookies του ιστότοπου Culture for Change.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
