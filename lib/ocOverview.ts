/**
 * OC Επισκόπηση — server-side data assembly.
 * SERVER ONLY: fetches Strapi with the API token and reads the hidden
 * registry/financial member fields. The result is passed as props to the
 * board-gated OC page ONLY — it must never flow through the public proxy
 * or into any public page.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export const OC_CURRENT_YEAR = new Date().getFullYear()

export interface OcMemberRow {
  am: number
  docId: string
  name: string
  email: string
  city: string
  phone: string
  slug: string | null
  regYear: number | null
  /** 1 = πληρωμένο, 0 = δεν όφειλε, null = εκκρεμεί */
  payments: Record<string, 0 | 1 | null>
  profileVisible: boolean
  /** Δήλωση «πλήρωσα τη συνδρομή» (ανανέωση) — teal ένδειξη στα Οικονομικά */
  renewalClaimedAt: string | null
  status: OcMemberStatus
}

export type OcMemberStatus =
  | 'paid'        // Τακτοποιημένο
  | 'new-unpaid'  // Νέο μέλος, εκκρεμεί η πρώτη συνδρομή
  | 'owes-1'      // Εκκρεμεί μόνο το τρέχον έτος → προς ειδοποίηση
  | 'owes-2'      // Εκκρεμούν 2 έτη → προς διαγραφή
  | 'unknown'

export interface OcFeedEvent {
  kind: 'profile' | 'application'
  text: string
  when: string | null
}

export interface OcNewsletterStats {
  subject: string
  sentAt: string | null
  recipients: number
  opens: number
  clicks: number
  openRate: number | null
}

export interface OcOverviewData {
  currentYear: number
  activeMembers: number
  paidCurrent: number
  paidPrev: number
  newThisYear: number
  profilesVisible: number
  /** Applications in Strapi with state=approved (εγκεκριμένες, αναμονή πληρωμής) */
  approvedUnpaidApps: number
  /** Οι εγκεκριμένες-ανεξόφλητες αιτήσεις για το popup του tile (νεότερη έγκριση πρώτη) */
  approvedApps: Array<{ id: string; name: string; submittedAt: string | null; decisionDate: string | null; claimedAt: string | null }>
  /** Πόσοι έχουν δηλώσει ότι πλήρωσαν (εκκρεμεί επιβεβαίωση Financer) */
  paymentClaims: number
  notifyList: Array<{ am: number; name: string }>
  deleteList: Array<{ am: number; name: string }>
  members: OcMemberRow[]
  feed: OcFeedEvent[]
  /** Δύο σειρές (Μελών/Paid ~10 του μήνα, Κοινού/External ~15): [0] = τρέχον, [1..3] = ιστορικό */
  newsletters: { members: OcNewsletterStats[]; external: OcNewsletterStats[] }
}

async function strapiGet(path: string): Promise<any | null> {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) return null
  try {
    const res = await fetch(`${STRAPI_URL}/api${path}`, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function memberStatus(
  payments: Record<string, 0 | 1 | null>,
  regYear: number | null,
  year: number
): OcMemberStatus {
  const cur = payments[String(year)]
  if (cur === 1 || cur === 0) return 'paid'
  // Το τρέχον έτος εκκρεμεί
  if (regYear === year) return 'new-unpaid'
  const prev = payments[String(year - 1)]
  const owesPrev = prev !== 1 && prev !== 0 && (regYear === null || regYear <= year - 1)
  return owesPrev ? 'owes-2' : 'owes-1'
}

/**
 * Newsletters από το Sender API, σε ΔΥΟ σειρές (2 αποστολές/μήνα):
 *  - members: ~10 του μήνα → group Paid (SENDER_PAID_GROUP_ID / eEXKRW)
 *  - external: ~14-15 του μήνα → group External non media (SENDER_GROUP_ID),
 *    το οποίο σε κάποιες αποστολές εμφανίζεται ως send-to-all (κενά groups)
 * Οι δοκιμαστικές αποστολές (test group / <10 παραλήπτες) εξαιρούνται.
 * Κάθε σειρά: [0] = τρέχον, [1..3] = ιστορικό.
 */
async function fetchNewsletters(): Promise<{ members: OcNewsletterStats[]; external: OcNewsletterStats[] }> {
  const empty = { members: [], external: [] }
  const key = process.env.SENDER_API_KEY
  const paidGroup = process.env.SENDER_PAID_GROUP_ID
  if (!key) return empty
  try {
    const res = await fetch('https://api.sender.net/v2/campaigns?limit=30&status=sent', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      // Το Sender δεν χρειάζεται realtime — μία ώρα cache αρκεί
      next: { revalidate: 3600 },
    })
    if (!res.ok) return empty
    const json = await res.json()
    const members: OcNewsletterStats[] = []
    const external: OcNewsletterStats[] = []
    for (const c of json?.data || []) {
      const recipients = Number(c.recipient_count ?? 0)
      if (recipients < 10) continue // δοκιμαστική αποστολή
      const sent = Number(c.sent_count ?? c.recipient_count ?? 0)
      const stats: OcNewsletterStats = {
        subject: c.subject || c.title || '—',
        sentAt: c.sent_time || null,
        recipients,
        opens: Number(c.opens ?? 0),
        clicks: Number(c.clicks ?? 0),
        openRate: sent > 0 ? Math.round((Number(c.opens ?? 0) / sent) * 100) : null,
      }
      const groups: string[] = Array.isArray(c.campaign_groups) ? c.campaign_groups : []
      if (paidGroup && groups.includes(paidGroup)) members.push(stats)
      else external.push(stats)
    }
    const newestFirst = (a: OcNewsletterStats, b: OcNewsletterStats) =>
      (b.sentAt || '').localeCompare(a.sentAt || '')
    members.sort(newestFirst)
    external.sort(newestFirst)
    return { members: members.slice(0, 4), external: external.slice(0, 4) }
  } catch {
    return empty
  }
}

export async function fetchOcOverview(): Promise<OcOverviewData> {
  const year = OC_CURRENT_YEAR

  // Μέλη με τα κρυφά πεδία μητρώου (paginated — clamp 100)
  const members: OcMemberRow[] = []
  let start = 0
  while (true) {
    const page = await strapiGet(
      `/members?fields[0]=Name&fields[1]=Email&fields[2]=AM&fields[3]=RegistrationYear` +
      `&fields[4]=Payments&fields[5]=HideProfile&fields[6]=City&fields[7]=Phone&fields[8]=Slug&fields[9]=RenewalClaimedAt` +
      `&pagination[start]=${start}&pagination[limit]=100&pagination[withCount]=true`
    )
    if (!page) break
    for (const m of page.data || []) {
      if (m.AM == null) continue // λογαριασμοί εκτός μητρώου (χωρίς ΑΜ) δεν είναι ενεργά μέλη
      const payments: Record<string, 0 | 1 | null> = {}
      for (let y = 2021; y <= year; y++) {
        const v = (m.Payments || {})[String(y)]
        payments[String(y)] = v === 1 || v === 0 ? v : null
      }
      const regYear = m.RegistrationYear ?? null
      members.push({
        am: m.AM,
        docId: m.documentId,
        name: m.Name || '—',
        email: m.Email || '',
        city: m.City || '',
        phone: m.Phone || '',
        slug: m.Slug || null,
        regYear,
        payments,
        profileVisible: !m.HideProfile,
        renewalClaimedAt: m.RenewalClaimedAt || null,
        status: memberStatus(payments, regYear, year),
      })
    }
    const total = page?.meta?.pagination?.total ?? 0
    start += 100
    if (start >= total) break
  }
  members.sort((a, b) => a.am - b.am)

  const paidCurrent = members.filter(m => m.payments[String(year)] === 1).length
  const paidPrev = members.filter(m => m.payments[String(year - 1)] === 1).length
  const notifyList = members
    .filter(m => m.status === 'owes-1' || m.status === 'new-unpaid')
    .map(m => ({ am: m.am, name: m.name }))
  const deleteList = members
    .filter(m => m.status === 'owes-2')
    .map(m => ({ am: m.am, name: m.name }))

  // Εγκεκριμένες αιτήσεις σε αναμονή πληρωμής (όσες έχουν φάκελο στο Strapi)
  const approvedRes = await strapiGet(
    `/membership-applications?filters[ApplicationState][$eq]=approved&pagination[limit]=100` +
    `&sort=DecisionDate:desc&fields[0]=FirstName&fields[1]=LastName&fields[2]=SubmittedAt` +
    `&fields[3]=DecisionDate&fields[4]=PaymentClaimedAt`
  )
  const approvedApps = (approvedRes?.data || []).map((a: any) => ({
    id: a.documentId,
    name: `${a.FirstName || ''} ${a.LastName || ''}`.trim() || '—',
    submittedAt: a.SubmittedAt || null,
    decisionDate: a.DecisionDate || null,
    claimedAt: a.PaymentClaimedAt || null,
  }))
  // Νεότερη έγκριση πρώτη (χωρίς ημ. έγκρισης → κατά υποβολή)
  approvedApps.sort((a: any, b: any) =>
    String(b.decisionDate || b.submittedAt || '').localeCompare(String(a.decisionDate || a.submittedAt || '')))
  const approvedUnpaidApps = approvedRes?.meta?.pagination?.total ?? approvedApps.length
  const paymentClaims = approvedApps.filter((a: any) => a.claimedAt).length

  // Ροή δραστηριότητας: ενημερώσεις προφίλ + πρόσφατες αιτήσεις
  const feed: OcFeedEvent[] = []
  const logs = await strapiGet(
    `/profile-change-logs?sort=changedAt:desc&pagination[limit]=10&fields[0]=memberName&fields[1]=changedFields&fields[2]=changedAt`
  )
  for (const l of logs?.data || []) {
    feed.push({
      kind: 'profile',
      text: `${l.memberName} ενημέρωσε το προφίλ (${l.changedFields})`,
      when: l.changedAt || null,
    })
  }
  const recentApps = await strapiGet(
    `/membership-applications?sort=SubmittedAt:desc&pagination[limit]=5` +
    `&fields[0]=FirstName&fields[1]=LastName&fields[2]=ApplicationState&fields[3]=SubmittedAt` +
    `&filters[ApplicationState][$in][0]=submitted&filters[ApplicationState][$in][1]=approved`
  )
  for (const a of recentApps?.data || []) {
    feed.push({
      kind: 'application',
      text: `Αίτηση εγγραφής: ${a.FirstName || ''} ${a.LastName || ''}`.trim() +
        (a.ApplicationState === 'approved' ? ' (εγκρίθηκε — αναμονή πληρωμής)' : ''),
      when: a.SubmittedAt || null,
    })
  }
  feed.sort((a, b) => (b.when || '').localeCompare(a.when || ''))

  return {
    currentYear: year,
    activeMembers: members.length,
    paidCurrent,
    paidPrev,
    newThisYear: members.filter(m => m.regYear === year).length,
    profilesVisible: members.filter(m => m.profileVisible).length,
    approvedUnpaidApps,
    approvedApps,
    paymentClaims,
    notifyList,
    deleteList,
    members,
    feed: feed.slice(0, 10),
    newsletters: await fetchNewsletters(),
  }
}
