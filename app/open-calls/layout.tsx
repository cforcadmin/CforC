import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ανοιχτές Προσκλήσεις',
  description: 'Ανοιχτές προσκλήσεις και ευκαιρίες συμμετοχής από το Culture for Change.',
  alternates: { canonical: '/open-calls' },
}

export default function OpenCallsLayout({ children }: { children: React.ReactNode }) {
  return children
}
