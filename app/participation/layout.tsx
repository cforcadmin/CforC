import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Συμμετοχή',
  description: 'Γίνε μέλος του Culture for Change — μάθε πώς μπορείς να συμμετάσχεις στο δίκτυο κοινωνικής καινοτομίας.',
  alternates: { canonical: '/participation' },
}

export default function ParticipationLayout({ children }: { children: React.ReactNode }) {
  return children
}
