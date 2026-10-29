/**
 * Ποια έτη συνδρομής εκκρεμούν για ένα μέλος — ΜΙΑ λογική, ίδια με την
 * Επισκόπηση του Μητρώου: Payments[έτος] = 1 πληρωμένο, 0 δεν όφειλε,
 * οτιδήποτε άλλο εκκρεμεί. Το προηγούμενο έτος μετρά μόνο αν το μέλος
 * ήταν ήδη εγγεγραμμένο τότε (RegistrationYear).
 *
 * Χρησιμοποιείται από την υπενθύμιση συνδρομής (Οικονομικά) και από την
 * ειδοποίηση αλλαγής email (Ασφάλεια++), ώστε οι δύο να μη διαφωνούν ποτέ.
 */
export const SUBSCRIPTION_FEE = 35

export function owedSubscriptionYears(
  member: { Payments?: unknown; RegistrationYear?: unknown },
  year = new Date().getFullYear(),
): number[] {
  const p = (member.Payments && typeof member.Payments === 'object') ? member.Payments as Record<string, unknown> : {}
  const regYear = typeof member.RegistrationYear === 'number' ? member.RegistrationYear : null
  const owed: number[] = []
  const prev = p[String(year - 1)]
  if (prev !== 1 && prev !== 0 && (regYear === null || regYear <= year - 1)) owed.push(year - 1)
  const cur = p[String(year)]
  if (cur !== 1 && cur !== 0) owed.push(year)
  return owed
}
