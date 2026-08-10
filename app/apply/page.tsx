import type { Metadata } from 'next'
import ApplyShell from '@/components/apply/ApplyShell'

export const metadata: Metadata = {
  title: 'Αίτηση Εγγραφής | Culture for Change',
  description:
    'Γίνε μέλος του Culture for Change — του πρώτου ελληνικού δικτύου κοινωνικής καινοτομίας για πολιτιστική και πολιτική αλλαγή.',
  alternates: { canonical: '/apply' },
}

export default function ApplyPage() {
  return <ApplyShell />
}
