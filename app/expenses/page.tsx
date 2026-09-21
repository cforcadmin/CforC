import type { Metadata } from 'next'
import ExpenseClaimShell from '@/components/expenses/ExpenseClaimShell'

export const metadata: Metadata = {
  title: 'Εξοδολόγιο | Culture for Change',
  description: 'Υποβολή εξοδολογίου για κάλυψη εξόδων μετακίνησης, διαμονής και διατροφής σε δράσεις του δικτύου.',
  alternates: { canonical: '/expenses' },
  robots: { index: false, follow: false },
}

export default function ExpensesPage() {
  return <ExpenseClaimShell />
}
