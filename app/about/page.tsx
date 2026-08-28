import type { Metadata } from 'next'
import AboutVariantSwitch from '@/components/about-cool/AboutVariantSwitch'

export const metadata: Metadata = {
  title: 'Σχετικά με εμάς',
  description: 'Μάθετε για το Culture for Change — το πρώτο ελληνικό δίκτυο κοινωνικής καινοτομίας για πολιτιστική και πολιτική αλλαγή.',
  alternates: { canonical: '/about' },
}

// Το σώμα της σελίδας διαφέρει ανά στυλ μενού (Cool = νέα δομή brief 3a,
// Classic/Modern = η υπάρχουσα) — η διακλάδωση ζει στο client switch.
export default function AboutPage() {
  return <AboutVariantSwitch />
}
