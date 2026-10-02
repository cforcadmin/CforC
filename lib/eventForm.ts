/**
 * Η φόρμα της δήλωσης — ΚΑΝΟΝΕΣ, χωρίς οθόνη και χωρίς δίκτυο.
 *
 * Ό,τι κρίνει «τι φαίνεται» και «τι λείπει» ζει εδώ, ώστε να ισχύει ΤΟ ΙΔΙΟ
 * στην οθόνη και στη διαδρομή. Ο server ΞΑΝΑΕΛΕΓΧΕΙ ό,τι έστειλε η φόρμα:
 * έλεγχος μόνο στον browser είναι διακόσμηση.
 */

import type { CforcEvent, EventCapacity, EventSession, EventOptionBlock } from '@/lib/types'
import { visibleForCapacity, sortSessions, sortOptions } from '@/lib/events'

export const CAPACITY_LABELS: Record<EventCapacity, string> = {
  'member': 'Μέλος CforC',
  'member-ban': 'Μέλος CforC & υπότροφος START / BAN',
  'non-member-ban': 'Υπότροφος START / BAN (όχι μέλος CforC)',
  'non-member': 'Ούτε μέλος ούτε υπότροφος',
  'other': 'Άλλο',
}

/** Ποιες ιδιότητες θεωρούνται ΜΕΛΟΣ — ορίζουν και τι επιτρέπεται να δηλώσει */
export const MEMBER_CAPACITIES: EventCapacity[] = ['member', 'member-ban']

/**
 * Ποιοι αποζημιώνονται — και άρα ποιοι παίρνουν τον σύνδεσμο του εξοδολογίου.
 *
 * Τα μέλη του CforC και οι υπότροφοι START / BAN. Όποιος δεν είναι τίποτα
 * από τα δύο δεν καλύπτεται, και ΔΕΝ πρέπει να λάβει σύνδεσμο: μια υπόσχεση
 * που δεν υπάρχει είναι χειρότερη από σιωπή, και η ανάκλησή της πέφτει πάνω
 * σε κάποιον που έχει ήδη αγοράσει εισιτήριο.
 */
export const REIMBURSED_CAPACITIES: EventCapacity[] = ['member', 'member-ban', 'non-member-ban']

export const isReimbursed = (c: EventCapacity | '' | null | undefined): boolean =>
  !!c && REIMBURSED_CAPACITIES.includes(c as EventCapacity)

export type SessionChoice = 'in-person' | 'online' | 'absent'

export interface RegistrationDraft {
  FirstName: string
  LastName: string
  Email: string
  Phone: string
  Capacity: EventCapacity | ''
  CapacityOther: string
  SessionChoices: Record<string, SessionChoice>
  OptionAnswers: Record<string, string>
  Dietary: string
  DietaryConsent: boolean
  AgendaTopic: string
  GeneralComments: string
  Consent: boolean
}

export const emptyDraft = (): RegistrationDraft => ({
  FirstName: '', LastName: '', Email: '', Phone: '',
  Capacity: '', CapacityOther: '',
  SessionChoices: {}, OptionAnswers: {},
  Dietary: '', DietaryConsent: false,
  AgendaTopic: '', GeneralComments: '',
  Consent: false,
})

/** Οι ιδιότητες που προσφέρει ΑΥΤΗ η δράση — ποτέ όλες από προεπιλογή */
export function offeredCapacities(ev: Pick<CforcEvent, 'Capacities'>): EventCapacity[] {
  const list = ev.Capacities
  if (!Array.isArray(list) || list.length === 0) {
    // Χωρίς ρητή δήλωση, η ασφαλής προεπιλογή είναι ΜΟΝΟ μέλη: μια δράση που
    // ξέχασε το πεδίο δεν ανοίγει κατά λάθος σε όλους.
    return ['member']
  }
  return list.filter((c): c is EventCapacity => c in CAPACITY_LABELS)
}

/** Οι συνεδρίες που βλέπει αυτή η ιδιότητα, ταξινομημένες */
export function visibleSessions(ev: Pick<CforcEvent, 'Sessions'>, capacity: EventCapacity | ''): EventSession[] {
  return sortSessions(ev.Sessions).filter(s => visibleForCapacity(s, capacity || null))
}

/** Τα μπλοκ logistics που βλέπει αυτή η ιδιότητα, ταξινομημένα */
export function visibleOptions(ev: Pick<CforcEvent, 'Options'>, capacity: EventCapacity | ''): EventOptionBlock[] {
  return sortOptions(ev.Options).filter(o => visibleForCapacity(o, capacity || null))
}

/** Οι επιλογές μιας συνεδρίας — η 1.β του Midterm δεν έχει διαδικτυακή */
export function sessionChoices(s: EventSession): Array<{ value: SessionChoice; label: string }> {
  const out: Array<{ value: SessionChoice; label: string }> = []
  if (s.AllowInPerson !== false) out.push({ value: 'in-person', label: 'Δια ζώσης παρουσία' })
  if (s.AllowOnline) out.push({ value: 'online', label: 'Διαδικτυακή παρακολούθηση' })
  out.push({ value: 'absent', label: 'Δε θα το παρακολουθήσω' })
  return out
}

const emailLooksValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim())

/**
 * Τι λείπει. Επιστρέφει ΜΗΝΥΜΑ ή null — ίδιο σχήμα με το validateClaim.
 *
 * `isMember` = η δήλωση γίνεται από συνδεδεμένο μέλος. Τότε δεν ζητάμε
 * συγκατάθεση διπλής επιβεβαίωσης: η ταυτότητα είναι ήδη αποδεδειγμένη.
 */
/**
 * Απάντησε «Ναι» στην ερώτηση της ατζέντας;
 *
 * Η ερώτηση ζει σε option-block με Key 'agenda'. Όταν ΔΕΝ υπάρχει τέτοιο
 * μπλοκ σε αυτή τη δράση — ή δεν το βλέπει αυτή η ιδιότητα — τα πεδία των
 * θεμάτων δεν έχουν λόγο να εμφανιστούν και τίποτα δεν απαιτείται.
 */
export function agendaWanted(
  ev: Pick<CforcEvent, 'Options'>,
  d: Pick<RegistrationDraft, 'Capacity' | 'OptionAnswers'>,
): boolean {
  const block = visibleOptions(ev as any, d.Capacity).find(o => o.Key === 'agenda')
  if (!block) return false
  return d.OptionAnswers?.agenda === 'yes'
}

export function validateRegistration(
  ev: Pick<CforcEvent, 'Capacities' | 'Sessions' | 'Options'>,
  d: RegistrationDraft,
  isMember: boolean,
): string | null {
  if (!String(d.FirstName || '').trim()) return 'Συμπλήρωσε το όνομά σου'
  if (!String(d.LastName || '').trim()) return 'Συμπλήρωσε το επίθετό σου'
  if (!emailLooksValid(d.Email)) return 'Το email δεν είναι έγκυρο'
  if (!String(d.Phone || '').trim()) return 'Συμπλήρωσε ένα τηλέφωνο επικοινωνίας'

  const offered = offeredCapacities(ev)
  if (!d.Capacity) return 'Διάλεξε την ιδιότητά σου'
  if (!offered.includes(d.Capacity)) return 'Η ιδιότητα που διάλεξες δεν ισχύει για αυτή τη δράση'
  if (d.Capacity === 'other' && !String(d.CapacityOther || '').trim()) {
    return 'Γράψε μας την ιδιότητά σου'
  }

  // Οι συνεδρίες: απαντιούνται ΟΛΕΣ όσες βλέπει αυτή η ιδιότητα — το «δε θα
  // το παρακολουθήσω» είναι απάντηση, η σιωπή δεν είναι.
  for (const s of visibleSessions(ev, d.Capacity)) {
    const answer = d.SessionChoices?.[String(s.id)]
    if (!answer) return `Δήλωσε συμμετοχή για: ${s.Title}`
    const allowed = sessionChoices(s).map(c => c.value)
    if (!allowed.includes(answer)) return `Μη έγκυρη επιλογή για: ${s.Title}`
  }

  for (const o of visibleOptions(ev, d.Capacity)) {
    if (!o.Required) continue
    if (o.Key === 'dietary') continue // τα διατροφικά δεν είναι ΠΟΤΕ υποχρεωτικά
    if (!String(d.OptionAnswers?.[o.Key] || '').trim()) return `Απάντησε: ${o.Title}`
  }

  // Το «Ναι» στην ατζέντα ΥΠΟΣΧΕΤΑΙ θέμα — αλλιώς δεν σημαίνει τίποτα.
  // Τα γενικά σχόλια μένουν προαιρετικά: υποχρεωτικά θα γέμιζαν με παύλες
  // από ανθρώπους που έχουν θέμα αλλά τίποτα άλλο να πουν.
  if (agendaWanted(ev, d) && !String(d.AgendaTopic || '').trim()) {
    return 'Γράψε το θέμα που προτείνεις για την ατζέντα'
  }

  // ΑΡΘΡΟ 9: διατροφικά χωρίς ρητή συγκατάθεση δεν αποθηκεύονται ΠΟΤΕ.
  if (String(d.Dietary || '').trim() && !d.DietaryConsent) {
    return 'Για να κρατήσουμε τις διατροφικές σου ανάγκες χρειαζόμαστε τη ρητή συγκατάθεσή σου'
  }

  if (!isMember && !d.Consent) return 'Χρειάζεται να αποδεχτείς την ενημέρωση για τα προσωπικά δεδομένα'

  return null
}
