// Sheet bridge for the CforC Μητρώο — Apps Script Web App transport.
//
// The Google Sheet runs our Apps Script, deployed as a Web App executing as
// the sheet's owner. The website POSTs JSON with a shared secret; the script
// writes the row itself. No service account, no Google Cloud keys (the org
// policy blocks key creation anyway), and all sheet logic stays in one place.
//
// Env vars (server-only):
//   SHEET_WEBAPP_URL     the /exec URL from Apps Script → Deploy → Web app
//   SHEET_WEBAPP_SECRET  shared secret (must match WEBAPP_SECRET in the script)

const WEBAPP_URL = process.env.SHEET_WEBAPP_URL
const WEBAPP_SECRET = process.env.SHEET_WEBAPP_SECRET

export function sheetsConfigured(): boolean {
  return !!(WEBAPP_URL && WEBAPP_SECRET)
}

export interface ApplicantRow {
  applicationDate: string   // dd/MM/yyyy
  lastName: string
  firstName: string
  gender: string
  email: string
  phone: string
  residenceCity: string
  activityCities: string
  reviewUrl: string
}

/**
 * Appends an applicant to «Νέα Μέλη → Προς έγκριση» via the Web App.
 * Throws on failure — callers treat the Sheet as best-effort (Strapi is
 * the source of truth) and record SheetSynced accordingly.
 */
export async function appendApplicantToSheet(row: ApplicantRow): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')

  // Apps Script answers via a 302 redirect — fetch follows it by default.
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: WEBAPP_SECRET,
      action: 'appendApplicant',
      row,
    }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
}

/**
 * Applies an OC decision to the Sheet: moves the applicant's row from
 * «Προς έγκριση» to ΕΓΚΕΚΡΙΜΕΝΑ (ΠΛΗΡΩΜΗ=Όχι) or ΜΗ ΕΓΚΕΚΡΙΜΕΝΑ.
 * Throws on failure — the caller records the miss so the row can be moved
 * by hand (Strapi is already updated and remains the source of truth).
 */
/**
 * Executes the Sheet's member-deletion flow (snapshot → «Διαγρ. Μέλη»,
 * removal from Επισκόπηση/Συνδρομές) for the given ΑΜ. Initiated from the
 * OC — the Sheet skips its own back-sync (the site already updated Strapi).
 */
export async function sendMemberRemovalToSheet(am: number): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBAPP_SECRET, action: 'removeMember', am }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
}

/**
 * Records a subscription payment from the OC (Financer): the Sheet sets
 * ΠΛΗΡΩΜΗ = «Ναι» on the applicant's ΕΓΚΕΚΡΙΜΕΝΑ row and runs the full
 * promotion (ΑΜ, Επισκόπηση/Συνδρομές, member creation via sheet-sync).
 * Returns the assigned ΑΜ. Throws on failure.
 */
export async function sendPaymentToSheet(email: string): Promise<string> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBAPP_SECRET, action: 'recordPayment', email }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
  return String(json.am || '')
}

export async function sendDecisionToSheet(email: string, decision: 'approved' | 'rejected'): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: WEBAPP_SECRET,
      action: 'decide',
      email,
      decision,
    }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
}
