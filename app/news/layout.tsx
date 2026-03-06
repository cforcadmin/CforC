import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Νέα',
  description: 'Δείτε τα νέα του Culture for Change — εκδηλώσεις, εργαστήρια, δράσεις και πρωτοβουλίες κοινωνικής καινοτομίας.',
  alternates: { canonical: '/news' },
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
