/**
 * ΑΠΑΝΤΗΣΗ ΣΕ ΑΙΤΗΜΑ ΙΣΤΟΤΟΠΟΥ — Η ΓΕΦΥΡΑ ΑΝΑΜΕΣΑ ΣΕ ΔΥΟ ΑΔΕΛΦΙΑ.
 *
 * Η λίστα αιτημάτων (OcSiteRequests) και ο συνθέτης (OcCampaigns) δεν έχουν
 * σχέση γονέα-παιδιού: το OcShell τα βάζει το ένα κάτω από το άλλο. Αντί να
 * ανέβει κατάσταση ως το OcShell για μία ενέργεια, η λίστα ΦΩΝΑΖΕΙ και ο
 * συνθέτης ακούει.
 *
 * Το συμβόλαιο ζει εδώ, σε ένα αρχείο, ώστε το όνομα του συμβάντος και το
 * σχήμα του φορτίου να μην μπορούν να αποκλίνουν σε δύο σημεία.
 */

export const OC_COMPOSE_REPLY = 'oc:compose-reply'

export interface ComposeReplyDetail {
  /** Το όνομα όπως το έγραψε ο ίδιος — μπαίνει στον χαιρετισμό */
  name: string
  /** Πού πάει η απάντηση. Χωρίς αυτό δεν προσφέρεται καν το κουμπί. */
  email: string
  /** Το αίτημα αυτούσιο — μπαίνει στο «Τι ζήτησες» */
  message: string
  /** Η σελίδα που αφορά, αν τη δήλωσε */
  pageUrl?: string | null
}

export function emitComposeReply(detail: ComposeReplyDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ComposeReplyDetail>(OC_COMPOSE_REPLY, { detail }))
}

/** Το μικρό όνομα για τον χαιρετισμό — «Αγγελική Κοσμά» → «Αγγελική» */
export function firstNameOf(full: string): string {
  return String(full || '').trim().split(/\s+/)[0] || ''
}

/**
 * Το θέμα της απάντησης: «Σχετικά με το αίτημά σου» και οι πρώτες λέξεις του,
 * ώστε να ξεχωρίζει στο γραμματοκιβώτιο όταν κάποιος έχει στείλει δύο.
 */
export function replySubject(message: string): string {
  const gist = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  return gist ? `Σχετικά με το αίτημά σου — ${gist}${gist.length === 60 ? '…' : ''}` : 'Σχετικά με το αίτημά σου'
}
