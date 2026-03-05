import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Μέλη',
  description: 'Γνωρίστε τα μέλη του Culture for Change — καλλιτέχνες, ακτιβιστές και επαγγελματίες κοινωνικής καινοτομίας στην Ελλάδα.',
  alternates: { canonical: '/members' },
}

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children
}
