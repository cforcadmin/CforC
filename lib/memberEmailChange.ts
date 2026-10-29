/**
 * Αλλαγή email μέλους — τα δύο αντίγραφα του email ΕΚΤΟΣ Strapi members:
 *   1) Strapi `newsletter-subscribers` (εσωτερική βάση newsletter)
 *   2) Sender, ομάδα «Paid» (από όπου φεύγει το newsletter των μελών)
 *
 * Κάθε βήμα γυρίζει το δικό του αποτέλεσμα· κανένα δεν ρίχνει το άλλο. Το
 * Strapi members (η ταυτότητα σύνδεσης) και το Μητρώο (Sheet) αλλάζουν από
 * τη διαδρομή /api/oc/members/email, που καλεί αυτά τα δύο στη συνέχεια.
 *
 * Sender: το API v2 ΔΕΝ αλλάζει τη διεύθυνση συνδρομητή (το PATCH δέχεται
 * όνομα, ομάδες, κατάσταση — όχι email· επιβεβαιωμένο στα docs 29/10/2026).
 * Άρα: νέος συνδρομητής με το ίδιο όνομα + ομάδα, μετά διαγραφή του παλιού.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export type StepState = 'done' | 'failed' | 'skipped' | 'unchanged'
export interface StepResult { state: StepState; detail: string }

const sHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
})

/** Strapi newsletter-subscribers: η εγγραφή με το παλιό email παίρνει το νέο. */
export async function changeNewsletterSubscriberEmail(oldEmail: string, newEmail: string): Promise<StepResult> {
  try {
    const q = (e: string) =>
      `${STRAPI_URL}/api/newsletter-subscribers?filters[Email][$eqi]=${encodeURIComponent(e)}&pagination[limit]=1`
    const [oldRes, newRes] = await Promise.all([
      fetch(q(oldEmail), { headers: sHeaders(), cache: 'no-store' }),
      fetch(q(newEmail), { headers: sHeaders(), cache: 'no-store' }),
    ])
    const oldRow = (await oldRes.json().catch(() => null))?.data?.[0]
    const newRow = (await newRes.json().catch(() => null))?.data?.[0]
    if (!oldRow && !newRow) return { state: 'skipped', detail: 'δεν υπήρχε εγγραφή newsletter' }
    if (!oldRow && newRow) return { state: 'unchanged', detail: 'το νέο email ήταν ήδη εγγεγραμμένο' }
    if (oldRow && newRow) {
      // Υπάρχουν και τα δύο: κρατάμε το νέο, σβήνουμε το παλιό
      const del = await fetch(`${STRAPI_URL}/api/newsletter-subscribers/${oldRow.documentId}`, {
        method: 'DELETE', headers: sHeaders(),
      })
      return del.ok
        ? { state: 'done', detail: 'το νέο υπήρχε ήδη· η παλιά εγγραφή διαγράφηκε' }
        : { state: 'failed', detail: `διαγραφή παλιάς εγγραφής: Strapi ${del.status}` }
    }
    const put = await fetch(`${STRAPI_URL}/api/newsletter-subscribers/${oldRow.documentId}`, {
      method: 'PUT', headers: sHeaders(), body: JSON.stringify({ data: { Email: newEmail } }),
    })
    return put.ok
      ? { state: 'done', detail: 'η εγγραφή newsletter ενημερώθηκε' }
      : { state: 'failed', detail: `Strapi ${put.status}` }
  } catch (e) {
    return { state: 'failed', detail: e instanceof Error ? e.message : 'σφάλμα' }
  }
}

const SENDER = 'https://api.sender.net/v2'
const senderHeaders = (key: string) => ({
  'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${key}`,
})

/** Sender: νέος συνδρομητής (όνομα + ομάδα Paid από τον παλιό), μετά διαγραφή του παλιού. */
export async function changeSenderSubscriberEmail(oldEmail: string, newEmail: string): Promise<StepResult> {
  const key = process.env.SENDER_API_KEY
  const paid = process.env.SENDER_PAID_GROUP_ID
  if (!key || !paid) return { state: 'skipped', detail: 'ο Sender δεν είναι ρυθμισμένος' }
  try {
    const got = await fetch(`${SENDER}/subscribers/${encodeURIComponent(oldEmail)}`, { headers: senderHeaders(key), cache: 'no-store' })
    if (got.status === 404) return { state: 'skipped', detail: 'το παλιό email δεν υπήρχε στον Sender' }
    if (!got.ok) return { state: 'failed', detail: `ανάγνωση παλιού: Sender ${got.status}` }
    const old = (await got.json().catch(() => null))?.data || {}

    // 1) νέος συνδρομητής — αν υπάρχει ήδη, αρκεί να μπει στην ομάδα
    const create = await fetch(`${SENDER}/subscribers`, {
      method: 'POST', headers: senderHeaders(key),
      body: JSON.stringify({
        email: newEmail,
        firstname: old.firstname || undefined,
        lastname: old.lastname || undefined,
        groups: [paid],
        trigger_automation: false,
      }),
    })
    let created = 'νέος συνδρομητής'
    if (!create.ok) {
      const add = await fetch(`${SENDER}/subscribers/groups/${paid}`, {
        method: 'POST', headers: senderHeaders(key), body: JSON.stringify({ subscribers: [newEmail] }),
      })
      if (!add.ok) return { state: 'failed', detail: `δημιουργία νέου: Sender ${create.status}/${add.status}` }
      created = 'το νέο υπήρχε ήδη, μπήκε στην ομάδα Paid'
    }

    // 2) διαγραφή παλιού — μόνο αφού στάθηκε ο νέος
    const del = await fetch(`${SENDER}/subscribers`, {
      method: 'DELETE', headers: senderHeaders(key), body: JSON.stringify({ subscribers: [oldEmail] }),
    })
    if (!del.ok) return { state: 'failed', detail: `${created}· ΔΕΝ διαγράφηκε ο παλιός (Sender ${del.status}) — σβήσε τον με το χέρι` }
    return { state: 'done', detail: `${created}· ο παλιός διαγράφηκε` }
  } catch (e) {
    return { state: 'failed', detail: e instanceof Error ? e.message : 'σφάλμα' }
  }
}
