/**
 * Η ανοιχτή πρόσκληση μέσα στη φόρμα δήλωσης — ΚΑΝΟΝΕΣ, χωρίς οθόνη.
 *
 * Το μέλος γράφει την πρότασή του ΜΕΣΑ στην αίτηση: δεν στέλνει email, δεν
 * περιμένει κανέναν να του ανοίξει φόρμα. Εδώ ζει μόνο το «τι φαίνεται» και
 * «τι λείπει», ώστε να ισχύει το ίδιο στην οθόνη και στη διαδρομή.
 *
 * ΔΥΟ ΑΝΕΞΑΡΤΗΤΕΣ ΠΡΟΫΠΟΘΕΣΕΙΣ, ΤΕΣΣΕΡΙΣ ΚΑΤΑΣΤΑΣΕΙΣ: η ενότητα θέλει ΚΑΙ
 * ιδιότητα που τη βλέπει ΚΑΙ προθεσμία που δεν έχει περάσει. Οι μισές
 * καταστάσεις είναι το πραγματικό πεδίο σφαλμάτων — μοιάζουν ενεργές και
 * μπλοκάρουν μια υποβολή για ερώτηση που κανείς δεν βλέπει. Γι' αυτό ισχύει
 * ένας κανόνας: ό,τι δεν ΦΑΙΝΕΤΑΙ, δεν ΑΠΑΙΤΕΙΤΑΙ.
 */

import type { EventCapacity } from '@/lib/types'
import { athensToday } from '@/lib/events'

export interface EventOpenCall {
  Title: string
  Intro?: string
  Question: string
  TimeSlots?: string
  TypeOptions?: string
  FreeTypeLabel?: string
  Deadline?: string
  ContactEmail?: string
  VisibleFor?: EventCapacity[] | null
  CollectInForm?: boolean
}

export interface ProposalDraft {
  /** '' = αναπάντητη. Η ερώτηση είναι υποχρεωτική όταν φαίνεται. */
  wants: '' | 'yes' | 'no'
  EventProposalTitle: string
  TimeSlot: string
  TypeOfEvent: string
  ProposalCost: string
  ProposalDuration: string
  ProposalLink: string
  /** Η διεύθυνση του ανεβασμένου αρχείου — το ανέβασμα γίνεται πριν την υποβολή */
  ProposalPromoImage: string
  ProposalPromoImageId: string
}

export const emptyProposal = (): ProposalDraft => ({
  wants: '',
  EventProposalTitle: '', TimeSlot: '', TypeOfEvent: '',
  ProposalCost: '', ProposalDuration: '', ProposalLink: '',
  ProposalPromoImage: '', ProposalPromoImageId: '',
})

/**
 * Μία επιλογή ανά γραμμή.
 *
 * Προτιμήθηκε από πίνακα JSON επειδή ο κατάλογος γράφεται σε ένα κουτί
 * κειμένου: τρεις γραμμές αντί για `[{"value":…}]` σε κουτί κώδικα.
 */
export function parseLines(text?: string | null): string[] {
  return String(text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

/** Έχει περάσει η προθεσμία της πρόσκλησης; (σύγκριση συμβολοσειρών, ώρα Αθήνας) */
export function openCallClosed(oc: EventOpenCall | null | undefined, today = athensToday()): boolean {
  if (!oc?.Deadline) return false
  return today > String(oc.Deadline)
}

/**
 * Φαίνεται η ενότητα σε αυτή την ιδιότητα, αυτή τη μέρα;
 *
 * Κενό VisibleFor = όλες, όπως και στα option-block. Η ιδιότητα `''` (δεν
 * έχει διαλέξει ακόμη) δεν βλέπει τίποτα: τα πεδία εμφανίζονται μόλις
 * δηλωθεί ποιος είναι.
 */
export function openCallVisible(
  oc: EventOpenCall | null | undefined,
  capacity: EventCapacity | '',
  today = athensToday(),
): boolean {
  if (!oc || !oc.Title || !capacity) return false
  if (openCallClosed(oc, today)) return false
  const vis = oc.VisibleFor
  if (Array.isArray(vis) && vis.length > 0 && !vis.includes(capacity)) return false
  return true
}

/**
 * Βγάζει την πρόσκληση από τη δράση ΠΡΙΝ φύγει για τον browser.
 *
 * Το να την κρύβει η οθόνη ΔΕΝ αρκεί: η δράση ταξιδεύει ολόκληρη μέσα στο
 * φορτίο της σελίδας, οπότε όποιος κοιτάξει τον πηγαίο κώδικα τη διαβάζει
 * κανονικά — συνδεδεμένος ή όχι. «Δεν φαίνεται» σημαίνει «δεν στάλθηκε».
 *
 * Επαληθεύτηκε ζωντανά στις 2/10/2026: το κείμενο της πρόσκλησης υπήρχε στον
 * πηγαίο κώδικα και των δύο δημόσιων σελίδων για ανώνυμο επισκέπτη.
 */
export function stripOpenCall<T extends { OpenCall?: unknown }>(ev: T): T {
  if (!ev || ev.OpenCall == null) return ev
  const { OpenCall, ...rest } = ev
  return rest as T
}

/** Μαζεύει πεδία πρότασης ή είναι μόνο ανακοίνωση; */
export const collectsInForm = (oc: EventOpenCall | null | undefined): boolean =>
  !!oc && oc.CollectInForm !== false

/**
 * Ζητείται κόστος για αυτό το είδος δράσης;
 *
 * Η δωρεάν δράση δεν έχει κόστος να δηλωθεί — και ένα υποχρεωτικό «0» θα
 * γέμιζε τη στήλη με μηδενικά που δεν σημαίνουν τίποτα.
 */
export function costApplies(oc: EventOpenCall | null | undefined, type: string): boolean {
  const free = String(oc?.FreeTypeLabel || '').trim()
  if (!free || !type) return !!type
  return type.trim() !== free
}

/**
 * Τι λείπει από την πρόταση.
 *
 * Υποχρεωτικά όταν απαντήσει «Ναι»: τίτλος, πότε, είδος, διάρκεια, εικόνα.
 * Ο σύνδεσμος μένει προαιρετικός — δεν έχουν όλοι ιστοσελίδα. Το κόστος
 * ζητείται μόνο όταν η δράση δεν είναι δωρεάν.
 */
export function validateProposal(
  oc: EventOpenCall | null | undefined,
  p: ProposalDraft,
  capacity: EventCapacity | '',
  today = athensToday(),
): string | null {
  if (!openCallVisible(oc, capacity, today)) return null
  if (!collectsInForm(oc)) return null
  if (!p.wants) return `Απάντησε: ${oc!.Question}`
  if (p.wants === 'no') return null

  if (!String(p.EventProposalTitle || '').trim()) return 'Γράψε τον τίτλο της δράσης που προτείνεις'

  const slots = parseLines(oc!.TimeSlots)
  if (!String(p.TimeSlot || '').trim()) return 'Διάλεξε πότε μπορεί να γίνει η δράση'
  if (slots.length && !slots.includes(p.TimeSlot)) return 'Η επιλογή για το πότε δεν ισχύει'

  const types = parseLines(oc!.TypeOptions)
  if (!String(p.TypeOfEvent || '').trim()) return 'Διάλεξε το είδος της δράσης'
  if (types.length && !types.includes(p.TypeOfEvent)) return 'Το είδος δράσης που διάλεξες δεν ισχύει'

  if (!String(p.ProposalDuration || '').trim()) return 'Γράψε πόσο θα διαρκέσει'
  if (!String(p.ProposalPromoImage || '').trim()) return 'Ανέβασε μια εικόνα για την προβολή της δράσης'

  if (costApplies(oc, p.TypeOfEvent)) {
    const raw = String(p.ProposalCost || '').trim().replace(',', '.')
    if (!raw) return 'Γράψε το συνολικό κόστος'
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return 'Το κόστος δεν είναι έγκυρος αριθμός'
  }

  const link = String(p.ProposalLink || '').trim()
  if (link && !/^https?:\/\/\S+$/i.test(link)) return 'Ο σύνδεσμος πρέπει να ξεκινά με http:// ή https://'

  return null
}

/** Το κόστος σε αριθμό για το Strapi — κενό όταν δεν ζητήθηκε */
export function costValue(oc: EventOpenCall | null | undefined, p: ProposalDraft): number | null {
  if (p.wants !== 'yes' || !costApplies(oc, p.TypeOfEvent)) return null
  const n = Number(String(p.ProposalCost || '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
