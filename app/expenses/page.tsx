import type { Metadata } from 'next'
import ExpenseClaimShell from '@/components/expenses/ExpenseClaimShell'

export const metadata: Metadata = {
  title: 'Εξοδολόγιο | Culture for Change',
  description: 'Υποβολή εξοδολογίου για κάλυψη εξόδων μετακίνησης, διαμονής και διατροφής σε δράσεις του δικτύου.',
  alternates: { canonical: '/expenses' },
  robots: { index: false, follow: false },
}

/**
 * `?event=midterm-2026` προεπιλέγει την αφορμή και ανοίγει την πύλη της
 * δράσης. Χωρίς παράμετρο, η φόρμα είναι ακριβώς ό,τι ήταν.
 */
export default async function ExpensesPage(
  { searchParams }: { searchParams: Promise<{ event?: string; t?: string }> },
) {
  const sp = await searchParams
  return <ExpenseClaimShell eventSlug={sp?.event || null} claimToken={sp?.t || null} />
}
