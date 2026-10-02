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
  'member-ban': 'Μέλος CforC & υπότροφος START',
  'non-member-ban': 'Υπότροφος START (όχι μέλος CforC)',
  'non-member': 'Ούτε μέλος ούτε υπότροφος',
  'other': 'Άλλο',
}

/** Ποιες ιδιότητες θεωρούνται ΜΕΛΟΣ — ορίζουν και τι επιτρέπεται να δηλώσει */
export const MEMBER_CAPACITIES: EventCapacity[] = ['member', 'member-ban']

/**
 * Ποιος υποβάλλει εξοδολόγιο ΜΟΝΟΣ ΤΟΥ, από τη φόρμα.
 *
 * Μόνο τα μέλη του CforC — υπότροφοι BAN ή όχι. ΔΕΝ είναι δεύτερη λίστα:
 * είναι ακριβώς το MEMBER_CAPACITIES, και γράφεται έτσι ώστε να μην μπορούν
 * ποτέ να αποκλίνουν. Το όνομα υπάρχει για να εξηγεί ΓΙΑΤΙ μπαίνει το φράγμα
 * εκεί όπου μπαίνει.
 *
 * Οι υπόλοιποι ΔΕΝ μένουν ακάλυπτοι — ο όρος του συγχρηματοδότη τηρείται,
 * αλλά με άνθρωπο: η γραμματεία τους ειδοποιεί με email και τακτοποιεί την
 * αποζημίωση χειροκίνητα (απόφαση 2/10/2026). Αυτοματοποιούμε ό,τι αξίζει,
 * όχι ό,τι γίνεται.
 */
export const isReimbursed = (c: EventCapacity | '' | null | undefined): boolean =>
  !!c && MEMBER_CAPACITIES.includes(c as EventCapacity)

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
/**
 * Οι ιδιότητες που ταιριάζουν στον ΔΡΟΜΟ απ' όπου ήρθε κάποιος.
 *
 * Ο συνδεδεμένος βλέπει μόνο τις ιδιότητες μέλους· όποιος πέρασε από το «δεν
 * είμαι μέλος» βλέπει μόνο τις υπόλοιπες. Πριν από αυτό, ένας ανώνυμος
 * μπορούσε να διαλέξει «Μέλος CforC», να συμπληρώσει ολόκληρη τη φόρμα και να
 * μάθει στην υποβολή ότι έπρεπε να συνδεθεί — αδιέξοδο στο τέλος της δουλειάς
 * αντί για απουσία επιλογής στην αρχή.
 *
 * Το «other» μένει όπου το έβαλε η δράση: δεν ξέρουμε τι είναι, και δεν το
 * χρεώνουμε σε καμία από τις δύο πλευρές χωρίς λόγο.
 */
export function capacitiesForPath(
  ev: Pick<CforcEvent, 'Capacities'>,
  isMember: boolean,
): EventCapacity[] {
  const offered = offeredCapacities(ev)
  return offered.filter(c => (isMember ? MEMBER_CAPACITIES.includes(c) : !MEMBER_CAPACITIES.includes(c)))
}

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
