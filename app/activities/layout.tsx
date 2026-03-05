import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Δραστηριότητες',
  description: 'Δείτε τις δραστηριότητες του Culture for Change — εκδηλώσεις, εργαστήρια, δράσεις και πρωτοβουλίες κοινωνικής καινοτομίας.',
  alternates: { canonical: '/activities' },
}

export default function ActivitiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
