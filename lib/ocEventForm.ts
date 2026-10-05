import type { EventCapacity } from '@/lib/types'
import { CAPACITY_LABELS } from '@/lib/eventForm'

/**
 * Η ΔΡΑΣΗ όπως τη γράφει το OC — έλεγχος και κανονικοποίηση, χωρίς δίκτυο.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΡΧΕΙΟ: η φόρμα και η διαδρομή πρέπει να κρίνουν ΤΑ ΙΔΙΑ.
 * Όταν ο έλεγχος ζει μέσα στη διαδρομή, η οθόνη μαντεύει — και η μόνη
 * απάντηση που παίρνει ο συντάκτης είναι ένα 400 αφού πατήσει «Αποθήκευση».
 *
 * ΤΙ ΔΕΝ ΚΑΝΕΙ: δεν αποφασίζει ποιος επιτρέπεται να γράψει. Αυτό είναι έδρα,
 * και ζει στη διαδρομή.
 *
 * ΟΙ ΠΡΟΕΠΙΛΟΓΕΣ ΕΙΝΑΙ ΣΙΩΠΗΛΕΣ ΣΥΜΒΑΣΕΙΣ ΤΟΥ ΚΩΔΙΚΑ, και τις σέβεται:
 * κενό `Capacities` σημαίνει «μόνο μέλη» (lib/eventForm), κενό `VisibleFor`
 * σημαίνει «όλοι» (lib/events). Γι' αυτό ΔΕΝ γράφουμε ποτέ `[]` εκεί που το
 * κενό έχει άλλο νόημα από το «τίποτα» — γράφουμε `null`.
 */

export const OPTION_KEYS = ['travel', 'transport', 'accommodation', 'dietary', 'lunch', 'dinner', 'agenda'] as const
export type OptionKey = (typeof OPTION_KEYS)[number]

export const OPTION_KEY_LABELS: Record<OptionKey, string> = {
  travel: 'Μετακίνηση',
  transport: 'Μεταφορά επί τόπου',
  accommodation: 'Διαμονή',
  dietary: 'Διατροφικές ανάγκες',
  lunch: 'Γεύμα',
  dinner: 'Δείπνο',
  agenda: 'Ατζέντα',
}

export const AUDIENCES = ['member', 'non-member'] as const
export type Audience = (typeof AUDIENCES)[number]

export interface EventSessionDraft {
  Title: string
  Subtitle?: string | null
  StartsAt: string
  EndsAt?: string | null
  AllowInPerson?: boolean
  AllowOnline?: boolean
  VisibleFor?: EventCapacity[] | null
  SortOrder?: number
}

export interface EventOptionDraft {
  Key: OptionKey
  Title: string
  Description?: string | null
  Required?: boolean
  Choices?: string[] | null
  VisibleFor?: EventCapacity[] | null
  SortOrder?: number
}

export interface EventOpenCallDraft {
  Title: string
  Intro?: string | null
  Question: string
  TimeSlots?: string | null
  TypeOptions?: string | null
  FreeTypeLabel?: string | null
  Deadline?: string | null
  ContactEmail?: string | null
  VisibleFor?: EventCapacity[] | null
  CollectInForm?: boolean
}

export interface EventResourceDraft {
  Label: string
  Url?: string | null
  File?: number | null
  SortOrder?: number
}

export interface EventDraft {
  Title: string
  Slug: string
  Subtitle?: string | null
  Description?: string | null
  DescriptionEn?: string | null
  StartDate: string
  EndDate: string
  RegistrationDeadline?: string | null
  Venue?: string | null
  City?: string | null
  HostedBy?: string | null
  Audience: Audience
  Capacities?: EventCapacity[] | null
  RegistrationOpen?: boolean
  ConsentText?: string | null
  ConsentVersion?: string | null
  PersonalDataMonths?: number | null
  DietaryPurgeDays?: number | null
  Cover?: number | null
  Sessions?: EventSessionDraft[]
  Options?: EventOptionDraft[]
  OpenCall?: EventOpenCallDraft | null
  Resources?: EventResourceDraft[]
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  /** Έτοιμο για το `data` του Strapi — μόνο όταν ok */
  payload?: Record<string, any>
}

const str = (v: unknown): string => String(v ?? '').trim()
const nullable = (v: unknown): string | null => str(v) || null
const isDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v)
const isDateTime = (v: string): boolean => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)

/**
 * Το slug είναι ΔΙΕΥΘΥΝΣΗ, όχι τίτλος.
 *
 * Τα ελληνικά γίνονται λατινικά γιατί το `/events/5ο-CforC-Midterm` σπάει σε
 * κάθε αντιγραφή-επικόλληση και σε κάθε γραμματοκιβώτιο που κωδικοποιεί
 * αλλιώς. Οι τόνοι φεύγουν με NFD — «Δράση» και «Δραση» δεν επιτρέπεται να
 * δώσουν δύο διαφορετικές διευθύνσεις.
 */
const GREEK_MAP: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
}

export function slugify(input: string): string {
  const base = String(input || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  let out = ''
  for (const ch of base) out += GREEK_MAP[ch] ?? ch
  return out
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Κρατά μόνο ιδιότητες που υπάρχουν· κενό → null, ποτέ [] */
function capacities(v: unknown): EventCapacity[] | null {
  if (!Array.isArray(v)) return null
  const keep = v.filter((c): c is EventCapacity => typeof c === 'string' && c in CAPACITY_LABELS)
  return keep.length ? [...new Set(keep)] : null
}

function sessions(list: unknown, errors: string[]): any[] {
  if (!Array.isArray(list)) return []
  return list.map((s: any, i: number) => {
    const title = str(s?.Title)
    const startsAt = str(s?.StartsAt)
    if (!title) errors.push(`Συνεδρία ${i + 1}: λείπει ο τίτλος`)
    if (!isDateTime(startsAt)) errors.push(`Συνεδρία ${i + 1} («${title || '—'}»): λείπει ή είναι άκυρη η ώρα έναρξης`)
    const endsAt = str(s?.EndsAt)
    if (endsAt && !isDateTime(endsAt)) errors.push(`Συνεδρία ${i + 1}: άκυρη ώρα λήξης`)
    if (endsAt && isDateTime(startsAt) && endsAt < startsAt) {
      errors.push(`Συνεδρία ${i + 1} («${title}»): η λήξη είναι πριν την έναρξη`)
    }
    // ΚΑΙ τα δύο κλειστά = συνεδρία που δεν δηλώνεται με κανέναν τρόπο
    const inPerson = s?.AllowInPerson !== false
    const online = s?.AllowOnline !== false
    if (!inPerson && !online) {
      errors.push(`Συνεδρία ${i + 1} («${title}»): πρέπει να επιτρέπει δια ζώσης ή διαδικτυακά`)
    }
    return {
      Title: title,
      Subtitle: nullable(s?.Subtitle),
      StartsAt: startsAt,
      EndsAt: endsAt || null,
      AllowInPerson: inPerson,
      AllowOnline: online,
      VisibleFor: capacities(s?.VisibleFor),
      SortOrder: Number.isFinite(Number(s?.SortOrder)) ? Number(s.SortOrder) : i,
    }
  })
}

function options(list: unknown, errors: string[]): any[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  return list.map((o: any, i: number) => {
    const key = str(o?.Key)
    const title = str(o?.Title)
    if (!OPTION_KEYS.includes(key as OptionKey)) {
      errors.push(`Μπλοκ ${i + 1}: άγνωστο είδος «${key || '—'}»`)
    } else if (seen.has(key)) {
      // Δύο μπλοκ με το ίδιο Key: η φόρμα θα έδειχνε δύο ίδιες ερωτήσεις και
      // η απάντηση αποθηκεύεται ΑΝΑ KEY — η μία θα έσβηνε την άλλη.
      errors.push(`Το μπλοκ «${OPTION_KEY_LABELS[key as OptionKey]}» υπάρχει δύο φορές`)
    } else {
      seen.add(key)
    }
    if (!title) errors.push(`Μπλοκ ${i + 1}: λείπει ο τίτλος`)
    const choices = Array.isArray(o?.Choices)
      ? o.Choices.map((c: unknown) => str(c)).filter(Boolean) : []
    return {
      Key: key,
      Title: title,
      Description: nullable(o?.Description),
      Required: !!o?.Required,
      Choices: choices.length ? choices : null,
      VisibleFor: capacities(o?.VisibleFor),
      SortOrder: Number.isFinite(Number(o?.SortOrder)) ? Number(o.SortOrder) : i,
    }
  })
}

function openCall(oc: any, errors: string[]): any | null {
  if (!oc) return null
  const title = str(oc.Title)
  const question = str(oc.Question)
  // Μισοσυμπληρωμένη ανοιχτή πρόσκληση = ερώτηση χωρίς ερώτηση στη φόρμα
  if (!title && !question) return null
  if (!title) errors.push('Ανοιχτή πρόσκληση: λείπει ο τίτλος')
  if (!question) errors.push('Ανοιχτή πρόσκληση: λείπει η ερώτηση προς το μέλος')
  const deadline = str(oc.Deadline)
  if (deadline && !isDate(deadline)) errors.push('Ανοιχτή πρόσκληση: άκυρη προθεσμία')
  const email = str(oc.ContactEmail)
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.push('Ανοιχτή πρόσκληση: άκυρο email επικοινωνίας')
  }
  return {
    Title: title,
    Intro: nullable(oc.Intro),
    Question: question,
    TimeSlots: nullable(oc.TimeSlots),
    TypeOptions: nullable(oc.TypeOptions),
    FreeTypeLabel: nullable(oc.FreeTypeLabel) || 'Δωρεάν δράση',
    Deadline: deadline || null,
    ContactEmail: email || 'hello@cultureforchange.net',
    VisibleFor: capacities(oc.VisibleFor),
    CollectInForm: oc.CollectInForm !== false,
  }
}

function resources(list: unknown, errors: string[]): any[] {
  if (!Array.isArray(list)) return []
  return list.map((r: any, i: number) => {
    const label = str(r?.Label)
    const url = str(r?.Url)
    const file = Number.isFinite(Number(r?.File)) ? Number(r.File) : null
    if (!label) errors.push(`Υλικό ${i + 1}: λείπει η ετικέτα`)
    if (!url && !file) errors.push(`Υλικό ${i + 1} («${label || '—'}»): χρειάζεται σύνδεσμο ή αρχείο`)
    if (url && !/^https?:\/\//i.test(url)) {
      errors.push(`Υλικό ${i + 1}: ο σύνδεσμος πρέπει να ξεκινά με http:// ή https://`)
    }
    return {
      Label: label,
      Url: url || null,
      ...(file && { File: file }),
      SortOrder: Number.isFinite(Number(r?.SortOrder)) ? Number(r.SortOrder) : i,
    }
  })
}

/**
 * Ο πλήρης έλεγχος. Επιστρέφει ΟΛΑ τα λάθη μαζί, όχι το πρώτο: ο συντάκτης
 * που διορθώνει ένα-ένα σε επτά γύρους εγκαταλείπει τη φόρμα.
 */
export function validateEventDraft(input: any): ValidationResult {
  const errors: string[] = []

  const title = str(input?.Title)
  if (!title) errors.push('Λείπει ο τίτλος')

  const slug = slugify(str(input?.Slug) || title)
  if (!slug) errors.push('Λείπει η διεύθυνση (slug)')

  const startDate = str(input?.StartDate)
  const endDate = str(input?.EndDate)
  if (!isDate(startDate)) errors.push('Λείπει ή είναι άκυρη η ημερομηνία έναρξης')
  if (!isDate(endDate)) errors.push('Λείπει ή είναι άκυρη η ημερομηνία λήξης')
  if (isDate(startDate) && isDate(endDate) && endDate < startDate) {
    errors.push('Η λήξη είναι πριν την έναρξη')
  }

  const deadline = str(input?.RegistrationDeadline)
  if (deadline && !isDate(deadline)) errors.push('Άκυρη προθεσμία δηλώσεων')
  // Προθεσμία ΜΕΤΑ τη λήξη είναι φόρμα που δέχεται δηλώσεις για δράση που
  // τελείωσε — το `registrationClosed` κλείνει στη λήξη ούτως ή άλλως.
  if (deadline && isDate(deadline) && isDate(endDate) && deadline > endDate) {
    errors.push('Η προθεσμία δηλώσεων είναι μετά τη λήξη της δράσης')
  }

  const audience = str(input?.Audience) || 'member'
  if (!AUDIENCES.includes(audience as Audience)) errors.push('Άκυρο κοινό')

  const months = input?.PersonalDataMonths
  if (months !== null && months !== undefined && months !== '' &&
      (!Number.isInteger(Number(months)) || Number(months) < 1 || Number(months) > 120)) {
    errors.push('Η διατήρηση προσωπικών δεδομένων πρέπει να είναι 1–120 μήνες')
  }
  const purge = input?.DietaryPurgeDays
  if (purge !== null && purge !== undefined && purge !== '' &&
      (!Number.isInteger(Number(purge)) || Number(purge) < 0 || Number(purge) > 365)) {
    errors.push('Η διαγραφή διατροφικών πρέπει να είναι 0–365 ημέρες')
  }

  const S = sessions(input?.Sessions, errors)
  const O = options(input?.Options, errors)
  const OC = openCall(input?.OpenCall, errors)
  const R = resources(input?.Resources, errors)

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    payload: {
      Title: title,
      Slug: slug,
      Subtitle: nullable(input?.Subtitle),
      Description: nullable(input?.Description),
      DescriptionEn: nullable(input?.DescriptionEn),
      StartDate: startDate,
      EndDate: endDate,
      RegistrationDeadline: deadline || null,
      Venue: nullable(input?.Venue),
      City: nullable(input?.City),
      HostedBy: nullable(input?.HostedBy),
      Audience: audience,
      Capacities: capacities(input?.Capacities),
      RegistrationOpen: input?.RegistrationOpen !== false,
      ConsentText: nullable(input?.ConsentText),
      ConsentVersion: nullable(input?.ConsentVersion),
      PersonalDataMonths: months === '' || months === null || months === undefined ? null : Number(months),
      DietaryPurgeDays: purge === '' || purge === null || purge === undefined ? null : Number(purge),
      ...(Number.isFinite(Number(input?.Cover)) && Number(input.Cover) > 0 && { Cover: Number(input.Cover) }),
      // Τα επαναλαμβανόμενα components αντικαθίστανται ΟΛΟΚΛΗΡΑ από το Strapi
      // σε κάθε PUT — γι' αυτό στέλνονται πάντα πλήρη, ποτέ «οι αλλαγμένα».
      Sessions: S,
      Options: O,
      OpenCall: OC,
      Resources: R,
    },
  }
}
