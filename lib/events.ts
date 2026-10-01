/**
 * Δράσεις — καθαρές συναρτήσεις, κοινές για οθόνη και διαδρομές.
 *
 * Ό,τι κρίνει «τρέχουσα / επόμενη / περασμένη» ή «ποιος βλέπει τι» ζει ΕΔΩ
 * και ΜΟΝΟ εδώ. Δύο αντίγραφα της ίδιας κρίσης αποκλίνουν σιωπηλά, και μετά
 * η λίστα λέει άλλα από τη σελίδα της δράσης.
 */

import type { CforcEvent, EventCapacity, EventSession, EventOptionBlock } from '@/lib/types'

export type EventPhase = 'upcoming' | 'running' | 'past'

/** Η μέρα σε Αθήνα, ως YYYY-MM-DD — οι δράσεις είναι ΜΕΡΕΣ, όχι στιγμές */
export function athensToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

/**
 * Τρέχουσα, επόμενη ή περασμένη.
 *
 * Σύγκριση ΣΥΜΒΟΛΟΣΕΙΡΩΝ YYYY-MM-DD: δεν περνά από Date, άρα δεν υπάρχει
 * περιθώριο να μετακινήσει μια ζώνη ώρας τη δράση κατά μία μέρα. Η τελευταία
 * μέρα μετρά ΟΛΟΚΛΗΡΗ — μια δράση που τελειώνει σήμερα δεν είναι «περασμένη».
 */
export function eventPhase(ev: Pick<CforcEvent, 'StartDate' | 'EndDate'>, today = athensToday()): EventPhase {
  if (ev.EndDate < today) return 'past'
  if (ev.StartDate > today) return 'upcoming'
  return 'running'
}

/** Έκλεισε η προθεσμία δήλωσης; Χωρίς προθεσμία, ανοιχτή ως τη λήξη. */
export function registrationClosed(ev: Pick<CforcEvent, 'EndDate' | 'RegistrationDeadline' | 'RegistrationOpen'>, today = athensToday()): boolean {
  if (ev.RegistrationOpen === false) return true
  const deadline = ev.RegistrationDeadline || ev.EndDate
  return deadline < today
}

/**
 * Βλέπει αυτή την ιδιότητα το στοιχείο;
 *
 * Κενό ή απόν VisibleFor = ΟΛΟΙ. Αυτό είναι επίτηδες: μια δράση που ξεχνά να
 * συμπληρώσει το πεδίο δείχνει τα πάντα, αντί να κρύψει σιωπηλά το πρόγραμμα.
 */
export function visibleForCapacity(
  item: Pick<EventSession | EventOptionBlock, 'VisibleFor'>,
  capacity: EventCapacity | null,
): boolean {
  const list = item.VisibleFor
  if (!Array.isArray(list) || list.length === 0) return true
  if (!capacity) return false
  return list.includes(capacity)
}

/** Ταξινόμηση: SortOrder πρώτα, ώρα έναρξης ως εφεδρεία */
export function sortSessions(sessions: EventSession[] = []): EventSession[] {
  return [...sessions].sort((a, b) =>
    (a.SortOrder ?? 0) - (b.SortOrder ?? 0) || String(a.StartsAt).localeCompare(String(b.StartsAt)))
}

export function sortOptions(options: EventOptionBlock[] = []): EventOptionBlock[] {
  return [...options].sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
}

/** 2026-11-20 → 20/11/2026 */
export const grDate = (iso: string) =>
  (/^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : '—')

/** «20–22 Νοεμβρίου 2026» ή «20/11/2026» όταν είναι μονοήμερη */
export function dateRangeLabel(start: string, end: string): string {
  if (!start) return '—'
  if (!end || end === start) return grDate(start)
  const [ys, ms, ds] = start.slice(0, 10).split('-')
  const [ye, me, de] = end.slice(0, 10).split('-')
  const MONTHS = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
    'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου']
  const monthName = (m: string) => MONTHS[Number(m) - 1] || m
  if (ys === ye && ms === me) return `${Number(ds)}–${Number(de)} ${monthName(ms)} ${ys}`
  if (ys === ye) return `${Number(ds)} ${monthName(ms)} – ${Number(de)} ${monthName(me)} ${ys}`
  return `${grDate(start)} – ${grDate(end)}`
}
