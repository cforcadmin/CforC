// Server-only: resolves which Operational Center (OC) seats a member holds.
// The source of truth is the CURRENT Coordination Team entry (IsCurrent=true)
// and its 7 role relations. Never expose this module to the client bundle —
// it uses the Strapi service token.

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export type OcSeat =
  | 'coordinator'
  | 'admin'
  | 'comms'
  | 'it'
  | 'community'
  | 'financer'
  | 'outreach'

// Relation field name on coordination-team → seat key
const SEAT_FIELDS: Array<{ field: string; seat: OcSeat }> = [
  { field: 'Coordinator', seat: 'coordinator' },
  { field: 'Admin', seat: 'admin' },
  { field: 'Comms', seat: 'comms' },
  { field: 'IT', seat: 'it' },
  { field: 'Community', seat: 'community' },
  { field: 'Financer', seat: 'financer' },
  { field: 'Outreach', seat: 'outreach' },
]

export const SEAT_LABELS: Record<OcSeat, string> = {
  coordinator: 'Συντονισμός',
  admin: 'Γραμματεία',
  comms: 'Επικοινωνία',
  it: 'IT',
  community: 'Κοινότητα',
  financer: 'Ταμίας',
  outreach: 'Outreach',
}

/**
 * Ποιοι ψηφίζουν στις αιτήσεις εγγραφής — και με τι βάρος.
 *
 * Το ΔΣ είναι ΠΕΝΤΕ θέσεις. Η Γραμματεία (admin) ΔΕΝ είναι μέλος του ΔΣ:
 * στηρίζει το ΔΣ, δεν ψηφίζει. Το IT ομοίως. Και οι δύο υπάρχουν ως δίχτυ
 * ασφαλείας (καθολική απόφαση) όταν κάποιος δεν ψηφίζει ή όταν έχει δώσει
 * προφορική συγκατάθεση — όχι ως επιπλέον στάδιο έγκρισης.
 *
 * Η Πρόεδρος (Συντονισμός) μετράει ΔΙΠΛΑ. Άρα το σύνολο των ψήφων είναι 6,
 * ζυγό: 3–3 είναι εφικτή ισοπαλία (π.χ. Πρόεδρος + 1 απέναντι στους άλλους 3)
 * και τότε η αίτηση μένει εκκρεμής μέχρι να αλλάξει κάποιος ψήφο ή να
 * παρέμβει IT/Γραμματεία.
 */
export const VOTING_SEATS: OcSeat[] = ['coordinator', 'comms', 'financer', 'community', 'outreach']

/** Ψηφίζει το μέλος; Αρκεί ΜΙΑ θέση με δικαίωμα ψήφου. */
export function isVoter(seats: OcSeat[]): boolean {
  return seats.some(s => VOTING_SEATS.includes(s))
}

/**
 * Βάρος ψήφου ΑΝΑ ΜΕΛΟΣ, όχι ανά ενεργή θέση: η διπλή ψήφος ανήκει στο
 * αξίωμα της Προέδρου, όχι στο ποια καρτέλα έχει ανοιχτή τη στιγμή που
 * ψηφίζει. Όποιος κατέχει τη θέση Συντονισμού μετράει 2, όλοι οι άλλοι 1
 * (και κανείς δεν μαζεύει βάρος κατέχοντας πολλές θέσεις).
 */
export function voteWeight(seats: OcSeat[]): number {
  return seats.includes('coordinator') ? 2 : 1
}

interface OcAccess {
  isBoard: boolean
  seats: OcSeat[]
}

// Board composition changes rarely — cache for 5 minutes to avoid a Strapi
// round-trip on every OC request. Cleared on server restart/redeploy.
let cache: { at: number; teams: any[] } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

async function fetchCurrentTeams(): Promise<any[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.teams

  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    console.error('ocRoles: missing STRAPI_URL or STRAPI_API_TOKEN')
    return []
  }

  const res = await fetch(
    `${STRAPI_URL}/api/coordination-teams?filters[IsCurrent][$eq]=true&populate=*`,
    {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    console.error(`ocRoles: coordination-teams fetch failed (HTTP ${res.status})`)
    return []
  }
  const json = await res.json()
  const teams = json?.data || []
  cache = { at: Date.now(), teams }
  return teams
}

/**
 * Resolve the OC seats held by a member (by documentId).
 * Returns { isBoard: false, seats: [] } for everyone not on the current
 * Coordination Team — regular members must NEVER get OC access.
 */
export async function resolveOcAccess(memberDocumentId: string): Promise<OcAccess> {
  if (!memberDocumentId) return { isBoard: false, seats: [] }

  const teams = await fetchCurrentTeams()
  const seats = new Set<OcSeat>()

  for (const team of teams) {
    for (const { field, seat } of SEAT_FIELDS) {
      const rel = team?.[field]
      // Relation may be absent (field not yet added in Strapi Cloud) or null
      if (rel?.documentId && rel.documentId === memberDocumentId) {
        seats.add(seat)
      }
    }
  }

  return { isBoard: seats.size > 0, seats: Array.from(seats) }
}

/** Invalidate the board cache (call after coordination-team edits, if ever needed). */
export function clearOcRolesCache() {
  cache = null
}

/** Ο/η τρέχων κάτοχος μιας θέσης της Συντονιστικής Ομάδας (για υπογραφές emails κ.λπ.) */
export async function getSeatHolder(seat: OcSeat): Promise<{ name: string; engName?: string; email?: string } | null> {
  const field = SEAT_FIELDS.find(f => f.seat === seat)?.field
  if (!field) return null
  const teams = await fetchCurrentTeams()
  for (const team of teams) {
    const rel = team?.[field]
    if (rel?.Name) return { name: rel.Name, engName: rel.EngName || undefined, email: rel.Email || undefined }
  }
  return null
}

export interface OcBoardMember {
  memberDocumentId: string
  seats: OcSeat[]
}

/**
 * All DISTINCT people currently holding seats on the Coordination Team,
 * with their seats. Used by the voting mechanism: an application is decided
 * when every roster member has cast a vote (unless IT/Admin override).
 */
export async function getBoardRoster(): Promise<OcBoardMember[]> {
  const teams = await fetchCurrentTeams()
  const byMember = new Map<string, Set<OcSeat>>()
  for (const team of teams) {
    for (const { field, seat } of SEAT_FIELDS) {
      const rel = team?.[field]
      if (rel?.documentId) {
        if (!byMember.has(rel.documentId)) byMember.set(rel.documentId, new Set())
        byMember.get(rel.documentId)!.add(seat)
      }
    }
  }
  return Array.from(byMember.entries()).map(([memberDocumentId, seats]) => ({
    memberDocumentId,
    seats: Array.from(seats),
  }))
}

/**
 * Θυρίδες ρόλων. Το ημερολόγιο του CforC ήδη προσκαλεί ΑΥΤΕΣ, όχι προσωπικά
 * email — και σωστά: επιβιώνουν των εκλογών χωρίς να πειραχτεί κανένα
 * επαναλαμβανόμενο γεγονός. Το προσωπικό email μένει ως εφεδρεία, για την
 * περίπτωση που μια θυρίδα δεν υπάρχει.
 */
export const SEAT_MAILBOX: Record<OcSeat, string> = {
  coordinator: 'coordination@cultureforchange.net',
  admin: 'hello@cultureforchange.net',
  comms: 'communication@cultureforchange.net',
  it: 'it@cultureforchange.net',
  community: 'community@cultureforchange.net',
  financer: 'finance@cultureforchange.net',
  outreach: 'outreach@cultureforchange.net',
}

/**
 * Όλοι οι τρέχοντες κάτοχοι θέσεων — για προσκλήσεις σε γεγονότα του
 * ημερολογίου. Προσκαλείται η ΘΥΡΙΔΑ του ρόλου· το όνομα του ατόμου
 * εμφανίζεται μόνο για να ξέρεις ποιον αφορά.
 */
export async function getSeatHoldersWithEmail(): Promise<
  Array<{ name: string; email: string; personalEmail?: string; memberDocId?: string; seats: OcSeat[]; labels: string }>
> {
  const teams = await fetchCurrentTeams()
  const out: Array<{ name: string; email: string; personalEmail?: string; memberDocId?: string; seats: OcSeat[] }> = []
  for (const team of teams) {
    for (const { field, seat } of SEAT_FIELDS) {
      const rel = team?.[field]
      if (!rel?.Name) continue
      const personal = String(rel.Email || '').trim().toLowerCase() || undefined
      const email = SEAT_MAILBOX[seat] || personal
      if (!email) continue
      if (out.some(o => o.email === email)) continue   // ίδια θυρίδα, μία φορά
      // Το memberDocId χρειάζεται για ανάθεση εκκρεμοτήτων: εκεί ο δέκτης
      // είναι ΠΡΟΣΩΠΟ (μια δουλειά την κάνει κάποιος), όχι θυρίδα.
      out.push({ name: rel.Name, email, personalEmail: personal, memberDocId: rel.documentId, seats: [seat] })
    }
  }
  return out.map(p => ({ ...p, labels: p.seats.map(s => SEAT_LABELS[s]).join(' · ') }))
}
