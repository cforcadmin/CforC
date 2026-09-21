/**
 * Υπενθυμίσεις εξοδολογίων: κάθε 5 ημέρες, όσο μένει απλήρωτο.
 *
 * Ο κανόνας είναι απλός και ηθελημένα αυστηρός — κάποιος έβαλε λεφτά από
 * την τσέπη του για το δίκτυο. Η πρώτη υπενθύμιση φεύγει 5 ημέρες μετά την
 * υποβολή, και ύστερα κάθε 5 ημέρες, μέχρι να σημειωθεί η πληρωμή.
 *
 * Η μνήμη κρατιέται στο ReminderLog της ίδιας της εγγραφής ({lastSentAt,
 * count}), ώστε μια δεύτερη εκτέλεση του cron την ίδια μέρα να μη στείλει
 * δεύτερο email.
 */

export const REMINDER_EVERY_DAYS = 5

export interface ClaimForReminder {
  documentId: string
  ClaimNumber: string
  MemberName: string
  MemberEmail?: string | null
  Payable: number
  SubmittedAt: string
  State: string
  ReminderLog?: { lastSentAt?: string; count?: number } | null
  FolderUrl?: string | null
}

const DAY = 86400000

/** Ημέρες από μια στιγμή μέχρι το «τώρα», σε ακέραιες ημέρες */
export function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return Math.floor((now.getTime() - t) / DAY)
}

/**
 * Ποια εξοδολόγια χρειάζονται υπενθύμιση τώρα.
 *
 * Μετράμε από την τελευταία υπενθύμιση· αν δεν έχει σταλεί καμία, από την
 * υποβολή. Έτσι μια καθυστερημένη εκτέλεση του cron δεν στέλνει σωρό.
 */
export function claimsNeedingReminder(claims: ClaimForReminder[], now: Date): ClaimForReminder[] {
  return claims.filter(c => {
    if (c.State !== 'submitted') return false
    const since = daysSince(c.ReminderLog?.lastSentAt || c.SubmittedAt, now)
    return since !== null && since >= REMINDER_EVERY_DAYS
  })
}

/** Όσα περιμένουν πληρωμή, ταξινομημένα με το παλαιότερο πρώτο */
export function pendingClaims<T extends { State: string; SubmittedAt: string }>(claims: T[]): T[] {
  return claims
    .filter(c => c.State === 'submitted')
    .sort((a, b) => String(a.SubmittedAt).localeCompare(String(b.SubmittedAt)))
}

/** Το σύνολο που οφείλεται — αυτό που θα φύγει από τον λογαριασμό */
export function pendingTotal(claims: Array<{ State: string; Payable: number }>): number {
  const sum = claims
    .filter(c => c.State === 'submitted')
    .reduce((s, c) => s + (Number(c.Payable) || 0), 0)
  return Math.round((sum + Number.EPSILON) * 100) / 100
}

/** «εδώ και 12 ημέρες» — η ηλικία που δείχνει το OC και λέει το email */
export function ageLabel(days: number | null): string {
  if (days === null) return '—'
  if (days === 0) return 'σήμερα'
  if (days === 1) return 'χθες'
  return `εδώ και ${days} ημέρες`
}
