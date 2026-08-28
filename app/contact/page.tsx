import type { Metadata } from 'next'
import ContactVariant from '@/components/about-cool/ContactVariant'

export const metadata: Metadata = {
  title: 'Επικοινωνία',
  description: 'Επικοινωνήστε με το Culture for Change — στοιχεία επικοινωνίας για μέλη και μη μέλη του δικτύου.',
  alternates: { canonical: '/contact' },
}

// Το σώμα διαφέρει ανά στυλ μενού (Cool = κέλυφος υποσελίδων Σχετικά,
// Classic/Modern = η υπάρχουσα σελίδα) — η διακλάδωση ζει στο client switch.
export default function ContactPage() {
  return <ContactVariant />
}
