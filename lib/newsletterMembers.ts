/**
 * Εγγραφή μέλους στο newsletter — ΜΟΝΟ όταν επιβεβαιωθεί η πληρωμή.
 *
 * Παλιά ο Sender ενημερωνόταν την πρώτη φορά που το μέλος άλλαζε το προφίλ
 * του. Αυτό ίσχυε όσο η φωτογραφία ερχόταν με email και το προφίλ «άνοιγε»
 * μόνο με την επέμβαση του μέλους. Τώρα η αίτηση φέρνει τα πάντα, οπότε το
 * σωστό σημείο είναι η στιγμή που το μέλος γίνεται ταμειακά εντάξει:
 * πληρωμένο μέλος = μέλος στο newsletter.
 *
 * Δύο προορισμοί, ανεξάρτητοι μεταξύ τους — η αποτυχία του ενός δεν ρίχνει
 * τον άλλον, και καμία δεν ρίχνει την ολοκλήρωση της πληρωμής:
 *   1) Strapi `newsletter-subscribers` — η εσωτερική βάση
 *   2) Sender, ομάδα «Paid» — από όπου φεύγει το newsletter των μελών
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export interface NewsletterEnrolment {
  strapi: 'created' | 'existed' | 'failed' | 'skipped'
  sender: 'added' | 'existed' | 'failed' | 'skipped'
  error?: string
}

/** Χωρίζει «Όνομα Επίθετο» όταν δεν έχουμε ξεχωριστά πεδία */
function splitName(firstName?: string | null, lastName?: string | null, fullName?: string | null) {
  const f = String(firstName || '').trim()
  const l = String(lastName || '').trim()
  if (f || l) return { first: f, last: l }
  const parts = String(fullName || '').trim().split(/\s+/)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') }
}

export async function enrolMemberInNewsletter(input: {
  email: string
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
}): Promise<NewsletterEnrolment> {
  const email = String(input.email || '').trim().toLowerCase()
  if (!email) return { strapi: 'skipped', sender: 'skipped', error: 'χωρίς email' }
  const { first, last } = splitName(input.firstName, input.lastName, input.fullName)
  const out: NewsletterEnrolment = { strapi: 'failed', sender: 'failed' }

  // 1) Εσωτερική βάση (Strapi)
  try {
    const found = await fetch(
      `${STRAPI_URL}/api/newsletter-subscribers?filters[Email][$eqi]=${encodeURIComponent(email)}&pagination[limit]=1`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
    )
    const fj = await found.json().catch(() => null)
    if ((fj?.data || []).length) {
      out.strapi = 'existed'
    } else {
      const created = await fetch(`${STRAPI_URL}/api/newsletter-subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        body: JSON.stringify({
          data: {
            Email: email,
            FirstName: first || undefined,
            LastName: last || undefined,
            // Το μέλος είναι ήδη επιβεβαιωμένο: πλήρωσε συνδρομή, δεν
            // χρειάζεται double opt-in όπως ο εξωτερικός κόσμος
            ConfirmedAt: new Date().toISOString(),
          },
        }),
      })
      out.strapi = created.ok ? 'created' : 'failed'
      if (!created.ok) out.error = `strapi ${created.status}`
    }
  } catch (e) {
    out.error = `strapi: ${e instanceof Error ? e.message : 'σφάλμα'}`
  }

  // 2) Sender — ομάδα μελών
  const key = process.env.SENDER_API_KEY
  const group = process.env.SENDER_PAID_GROUP_ID
  if (!key || !group) {
    out.sender = 'skipped'
    return out
  }
  try {
    const res = await fetch('https://api.sender.net/v2/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        email,
        firstname: first || undefined,
        lastname: last || undefined,
        groups: [group],
        trigger_automation: false,
      }),
    })
    if (res.ok) out.sender = 'added'
    else {
      // Ο Sender απαντά 409/422 όταν ο συνδρομητής υπάρχει ήδη — τότε αρκεί
      // να τον βάλουμε στην ομάδα
      const add = await fetch(`https://api.sender.net/v2/subscribers/groups/${group}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ subscribers: [email] }),
      })
      out.sender = add.ok ? 'existed' : 'failed'
      if (!add.ok) out.error = `${out.error ? out.error + ' · ' : ''}sender ${res.status}/${add.status}`
    }
  } catch (e) {
    out.error = `${out.error ? out.error + ' · ' : ''}sender: ${e instanceof Error ? e.message : 'σφάλμα'}`
  }
  return out
}
