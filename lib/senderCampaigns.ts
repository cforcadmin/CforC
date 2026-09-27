import { senderGroupId, type NewsletterAudienceId } from '@/lib/newsletterAudiences'

/**
 * Το newsletter φεύγει από τον Sender, όχι από εμάς.
 *
 * ΓΙΑΤΙ: εκεί ζουν οι λίστες, οι απεγγραφές και τα στατιστικά ανοιγμάτων που
 * ήδη διαβάζει η Επικοινωνία. Αν στέλναμε εμείς, θα φτιάχναμε δεύτερο σύστημα
 * δίπλα σε ένα που δουλεύει — και το ιστορικό θα κοβόταν στα δύο.
 *
 * Εμείς συνθέτουμε το HTML· ο Sender κάνει παράδοση, παρακολούθηση και
 * απεγγραφές. Οι ετικέτες {{ firstname }} και {{unsubscribe_link}} ΔΕΝ
 * αποδίδονται από εμάς: φεύγουν ωμές και τις γεμίζει εκείνος ανά παραλήπτη.
 */

const API = 'https://api.sender.net/v2'

function headers() {
  const key = process.env.SENDER_API_KEY
  if (!key) throw new Error('Λείπει το SENDER_API_KEY')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' }
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: headers(), cache: 'no-store' })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* ο Sender γυρίζει HTML σε 5xx */ }
  return { ok: res.ok, status: res.status, json, text }
}

export interface SenderCampaignInput {
  subject: string
  html: string
  /** Το όνομα που βλέπει ο παραλήπτης — όχι διεύθυνση */
  fromName: string
  /** ΠΡΕΠΕΙ να είναι επαληθευμένη διεύθυνση στον Sender */
  replyTo: string
  preheader?: string
  audiences: NewsletterAudienceId[]
  /** Εσωτερικός τίτλος για τις αναφορές του Sender */
  title?: string
}

export interface SenderResult {
  ok: boolean
  campaignId?: string
  error?: string
}

/**
 * Δημιουργεί ΠΡΟΣΧΕΔΙΟ καμπάνιας στον Sender. Δεν στέλνει τίποτα.
 *
 * Δύο βήματα (δημιουργία → αποστολή) και όχι ένα: έτσι ό,τι πάει στραβά στη
 * σύνθεση αποτυγχάνει ΠΡΙΝ φύγει γράμμα, και η καμπάνια μένει ορατή στον
 * Sender για να τη δει άνθρωπος.
 */
export async function createSenderCampaign(input: SenderCampaignInput): Promise<SenderResult> {
  const groups = input.audiences
    .map(a => senderGroupId(a))
    .filter((g): g is string => !!g)

  if (!groups.length) return { ok: false, error: 'Καμία έγκυρη λίστα στον Sender' }
  return createSenderCampaignRaw({ ...input, groups })
}

/**
 * Το ίδιο, αλλά με ΡΗΤΑ ids ομάδων αντί για λίστες newsletter.
 *
 * Το χρειάζεται η Τελική Δοκιμή, που στοχεύει ομάδα μιας θυρίδας — μια ομάδα
 * που δεν είναι, και δεν πρέπει να γίνει, επιλογή newsletter.
 */
export async function createSenderCampaignRaw(
  input: Omit<SenderCampaignInput, 'audiences'> & { groups: string[] },
): Promise<SenderResult> {
  const groups = input.groups.filter(Boolean)
  if (!groups.length) return { ok: false, error: 'Καμία ομάδα στον Sender' }

  const r = await call('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title || input.subject,
      subject: input.subject,
      from: input.fromName,
      reply_to: input.replyTo,
      ...(input.preheader ? { preheader: input.preheader } : {}),
      content_type: 'html',
      content: input.html,
      groups,
    }),
  })
  if (!r.ok) {
    console.error('[SENDER] create απέτυχε', r.status, r.text.slice(0, 300))
    return { ok: false, error: `Ο Sender δεν δέχτηκε την καμπάνια (HTTP ${r.status})` }
  }
  const id = r.json?.data?.id || r.json?.id
  if (!id) return { ok: false, error: 'Ο Sender δεν επέστρεψε ταυτότητα καμπάνιας' }
  return { ok: true, campaignId: String(id) }
}

/** Ξεκινά την αποστολή μιας καμπάνιας που ήδη υπάρχει */
export async function sendSenderCampaign(campaignId: string): Promise<SenderResult> {
  const r = await call(`/campaigns/${encodeURIComponent(campaignId)}/send`, { method: 'POST' })
  if (!r.ok) {
    console.error('[SENDER] send απέτυχε', r.status, r.text.slice(0, 300))
    return { ok: false, campaignId, error: `Η αποστολή δεν ξεκίνησε (HTTP ${r.status})` }
  }
  return { ok: true, campaignId }
}

/**
 * Προγραμματισμένη αποστολή.
 *
 * Ο Sender θέλει «Y-m-d H:i:s» ΧΩΡΙΣ ζώνη ώρας, οπότε στέλνουμε την ώρα όπως
 * τη διάβασε ο συντάκτης. Ένα ISO string με «Z» θα ερμηνευόταν λάθος.
 */
export function toSenderTime(iso: string): string | null {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export async function scheduleSenderCampaign(campaignId: string, whenIso: string): Promise<SenderResult> {
  const schedule_time = toSenderTime(whenIso)
  if (!schedule_time) return { ok: false, campaignId, error: 'Μη έγκυρη ημερομηνία' }
  const r = await call(`/campaigns/${encodeURIComponent(campaignId)}/schedule`, {
    method: 'POST', body: JSON.stringify({ schedule_time }),
  })
  if (!r.ok) {
    console.error('[SENDER] schedule απέτυχε', r.status, r.text.slice(0, 300))
    return { ok: false, campaignId, error: `Ο προγραμματισμός απέτυχε (HTTP ${r.status})` }
  }
  return { ok: true, campaignId }
}

/**
 * Το γράμμα όπως θα το δει ΕΝΑΣ παραλήπτης — για τη δοκιμαστική αποστολή.
 *
 * Ο Sender ΔΕΝ έχει endpoint δοκιμαστικής αποστολής, οπότε η δοκιμή φεύγει
 * από εμάς (Resend) στη θυρίδα του συντάκτη. Οι ετικέτες του Sender δεν
 * γεμίζουν μόνες τους εκεί, άρα τις γεμίζουμε με δείγματα: αλλιώς ο συντάκτης
 * θα έβλεπε «Γεια σου {{ firstname }}» και δεν θα ήξερε αν είναι λάθος.
 */
export function fillTagsForTest(html: string, sample = { firstname: 'Μαρία', lastname: 'Παπαδοπούλου' }): string {
  return String(html || '')
    .replace(/\{\{\s*firstname\s*\}\}/gi, sample.firstname)
    .replace(/\{\{\s*lastname\s*\}\}/gi, sample.lastname)
    .replace(/\{\{\s*email\s*\}\}/gi, 'paradeigma@cultureforchange.net')
    .replace(/\{\{\s*unsubscribe_link\s*\}\}/gi, '#')
    .replace(/\{\{\s*unsubscribe_text\s*\}\}/gi, 'Απεγγραφή')
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, '#')
}
