import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import tls from 'node:tls'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import {
  guard, checkSecretsPresent, judgeDeployment, judgeCertificate, judgeStrapi,
  judgeUnarchived, worstOf, summariseGroup, type HealthCheck, type SubCheck,
  type VercelDeployment,
} from '@/lib/ocHealth'
import { getAccessToken, SCOPES, googleConfigured } from '@/lib/googleAuth'

export const maxDuration = 60

/**
 * Ασφάλεια++ → Ζωτικά. ΜΟΝΟ για τη θέση IT.
 *
 * Όλοι οι έλεγχοι τρέχουν ΠΑΡΑΛΛΗΛΑ και κανένας δεν ρίχνει τους άλλους: η
 * οθόνη πρέπει να λέει την αλήθεια ακριβώς τότε που κάτι έχει χαλάσει.
 *
 * Καμία τιμή μυστικού δεν βγαίνει από αυτή τη διαδρομή.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cultureforchange.net')
  .replace(/^https?:\/\//, '').replace(/\/.*$/, '')

async function authorizeIt() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  // Η ενότητα είναι IT-only και στην οθόνη· εδώ ο έλεγχος γίνεται ΞΑΝΑ
  if (activeSeat !== 'it') return NextResponse.json({ error: 'Μόνο το IT' }, { status: 403 })
  return null
}

/** Ημέρες ως τη λήξη του πιστοποιητικού, με χειραψία TLS */
function certDaysLeft(host: string): Promise<number | null> {
  return new Promise(resolve => {
    const socket = tls.connect({ host, port: 443, servername: host }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      if (!cert?.valid_to) return resolve(null)
      const t = Date.parse(cert.valid_to)
      resolve(Number.isFinite(t) ? Math.round((t - Date.now()) / 86400000) : null)
    })
    socket.setTimeout(6000, () => { socket.destroy(); resolve(null) })
    socket.on('error', () => resolve(null))
  })
}

/**
 * Υπο-έλεγχος που δεν ρίχνει ποτέ τους αδελφούς του — ΚΑΙ ΔΕΝ ΤΟΥΣ ΚΡΕΜΑΕΙ.
 *
 * Το `Promise.all` περιμένει ΟΛΟΥΣ: χωρίς δικό του όριο χρόνου, ένας υπο-έλεγχος
 * που κολλάει σβήνει ολόκληρη τη γραμμή και οι άλλοι έξι εμφανίζονται «Άγνωστο»
 * ενώ είναι μια χαρά. Έτσι ακριβώς έγινε στις 29/9/2026.
 */
async function sub(
  key: string, label: string, fn: () => Promise<Omit<SubCheck, 'key' | 'label'>>,
  timeoutMs = 10000,
): Promise<SubCheck> {
  try {
    const cutoff = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`δεν απάντησε σε ${Math.round(timeoutMs / 1000)}s`)), timeoutMs))
    return { key, label, ...(await Promise.race([fn(), cutoff])) }
  } catch (err) {
    return { key, label, state: 'unknown', detail: err instanceof Error ? err.message : 'σφάλμα' }
  }
}

/**
 * Κλήση Apps Script — με ΔΕΥΤΕΡΗ προσπάθεια, γιατί η ψυχρή εκκίνηση είναι ο
 * κανόνας και όχι η εξαίρεση.
 *
 * Μετρημένο στις 29/9/2026, τρεις συνεχόμενες κλήσεις στο ίδιο script:
 * 33,8s → HTTP 404 με σελίδα HTML της Google · 7,1s → σωστή απάντηση · 1,4s.
 * Δηλαδή η πρώτη κλήση μετά από αδράνεια ΑΠΟΤΥΓΧΑΝΕΙ μεν, αλλά ζεσταίνει το
 * script· η δεύτερη λέει την αλήθεια. Ένα σκέτο 404 στην πρώτη κλήση ΔΕΝ είναι
 * βλάβη — και αν το αναφέραμε ως βλάβη, η οθόνη θα έλεγε ψέματα κάθε πρωί.
 */
async function appsScript(url: string, body: unknown) {
  const once = async (ms: number) => {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), redirect: 'follow', cache: 'no-store',
      signal: AbortSignal.timeout(ms),
    })
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch { /* σελίδα σφάλματος της Google */ }
    return { status: r.status, json, text }
  }
  try {
    const first = await once(14000)
    if (first.json) return { ...first, cold: false }
  } catch { /* η πρώτη κλήση μέτρησε μόνο ως ζέσταμα */ }
  return { ...(await once(20000)), cold: true }
}

/**
 * Apps Script που δεν έδωσε JSON ούτε στη ΔΕΥΤΕΡΗ κλήση.
 *
 * Η Google σερβίρει σελίδα HTML με 404 και όταν το deployment έχει σβηστεί και
 * όταν απλώς δεν πρόλαβε να ξεκινήσει. Δεν μπορούμε να τα ξεχωρίσουμε από έξω,
 * οπότε το λέμε όπως είναι αντί να διαλέξουμε την τρομακτική εκδοχή.
 */
function googleColdFailure(status: number, text: string): Omit<SubCheck, 'key' | 'label'> {
  const html = /<html/i.test(text)
  if (status === 404 && html) {
    return {
      state: 'down',
      detail: 'δεν απάντησε ούτε στη δεύτερη κλήση (404 από τη Google)',
      action: 'Αν επιμένει: Apps Script → Deploy → Manage deployments, σύγκρινε τη διεύθυνση με τη μεταβλητή στο Vercel',
    }
  }
  return { state: 'down', detail: `HTTP ${status}${html ? ' (σελίδα HTML, όχι JSON)' : `: ${text.slice(0, 60)}`}` }
}

/** Ανάγνωση με τον λογαριασμό υπηρεσίας — ΜΟΝΟ μεταδεδομένα, ποτέ περιεχόμενο */
async function googleGet(scope: string, url: string): Promise<Omit<SubCheck, 'key' | 'label'>> {
  if (!googleConfigured()) return { state: 'down', detail: 'λείπει ο λογαριασμός υπηρεσίας' }
  const token = await getAccessToken(scope)
  if (!token) return { state: 'down', detail: 'δεν εκδόθηκε token — έλεγξε τον λογαριασμό υπηρεσίας' }
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (r.ok) return { state: 'ok', detail: 'προσβάσιμο' }
  if (r.status === 404) return { state: 'down', detail: 'δεν βρέθηκε — λάθος id ή δεν έχει διαμοιραστεί' }
  if (r.status === 403) return { state: 'down', detail: 'χωρίς δικαίωμα — μοιράσου το με τον λογαριασμό υπηρεσίας' }
  return { state: 'down', detail: `HTTP ${r.status}` }
}

/** Φύλλο Google: αρκεί ο τίτλος για να ξέρουμε ότι το βλέπουμε */
const sheetSub = (key: string, label: string, id: string) =>
  sub(key, label, () => googleGet(SCOPES.sheets,
    `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties.title`))

export async function GET() {
  const denied = await authorizeIt()
  if (denied) return denied

  const checks = await Promise.all([
    // ── Strapi: η μόνη βάση. Αν πέσει, δεν λειτουργεί τίποτα.
    guard('strapi', 'Strapi', async () => {
      const t0 = Date.now()
      const r = await fetch(`${STRAPI_URL}/api/oc-campaigns?pagination[limit]=1&fields[0]=Subject`, {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store',
      })
      return judgeStrapi(r.ok, Date.now() - t0)
    }),

    // ── Το τελευταίο deployment παραγωγής
    guard('deploy', 'Deployment', async () => {
      const token = process.env.VERCEL_API_TOKEN
      const projectId = process.env.VERCEL_PROJECT_ID
      if (!token || !projectId) {
        return {
          state: 'unknown' as const,
          detail: 'λείπει το VERCEL_API_TOKEN ή το VERCEL_PROJECT_ID',
          action: 'Vercel → Account Settings → Tokens, και Project → Settings → Project ID',
        }
      }
      const teamQs = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : ''
      const r = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=1${teamQs}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (!r.ok) return { state: 'unknown' as const, detail: `Vercel API ${r.status}` }
      const j = await r.json()
      const d = j?.deployments?.[0]
      const latest: VercelDeployment | null = d ? {
        state: String(d.state || d.readyState || ''),
        sha: d.meta?.githubCommitSha,
        createdAt: d.created || d.createdAt,
        target: d.target,
      } : null
      return judgeDeployment(latest)
    }),

    // ── Google: ΟΛΑ τα αρχεία και οι υπηρεσίες, σε ΜΙΑ γραμμή που ανοίγει.
    //    Επτά χωριστές γραμμές θα έπνιγαν τα υπόλοιπα· και ένα σπασμένο
    //    Μητρώο είναι εξίσου σοβαρό με ένα σπασμένο ΕΣΟΔΑ-ΕΞΟΔΑ.
    guard('google', 'Google — αρχεία & υπηρεσίες', async () => {
      const items = await Promise.all([
        // ΕΣΟΔΑ-ΕΞΟΔΑ: έχει ΑΛΗΘΙΝΟ έλεγχο μόνο για ανάγνωση
        sub('finance', 'ΕΣΟΔΑ-ΕΞΟΔΑ (Apps Script)', async () => {
          const url = process.env.FINANCE_SHEET_WEBAPP_URL
          const secret = process.env.FINANCE_SHEET_WEBAPP_SECRET
          if (!url || !secret) return { state: 'down' as const, detail: 'δεν έχει ρυθμιστεί' }
          const { status, json, text, cold } = await appsScript(url,
            { secret, action: 'checkYearStructure', year: new Date().getFullYear() })
          if (json?.ok) {
            return { state: 'ok' as const, detail: cold ? 'απαντά, μυστικό δεκτό (ψυχρή εκκίνηση)' : 'απαντά, μυστικό δεκτό' }
          }
          if (json?.error && /unauthorized/i.test(String(json.error))) {
            return { state: 'down' as const, detail: 'απορρίπτει το μυστικό' }
          }
          if (!json) return googleColdFailure(status, text)
          return { state: 'down' as const, detail: String(json.error || 'απάντησε χωρίς ok') }
        }, 40000),

        /**
         * CforC Μητρώο: το Apps Script εκθέτει ΜΟΝΟ ενέργειες ΕΓΓΡΑΦΗΣ
         * (appendApplicant, removeMember, recordPayment). Καμία δεν επιτρέπεται
         * ως δοκιμή — άρα στέλνουμε ΑΚΥΡΟ μυστικό και άγνωστη ενέργεια. Το
         * script ελέγχει πρώτα το μυστικό και γυρίζει {"ok":false,
         * "error":"unauthorized"} χωρίς να γράψει τίποτα (επαληθευμένο
         * 29/9/2026). Αυτό λέει ΔΥΟ πράγματα με μία κλήση: ότι η διεύθυνση ζει
         * (η πιο συχνή βλάβη: νέο deployment, νέα διεύθυνση, παλιά μεταβλητή)
         * ΚΑΙ ότι η φύλαξη του μυστικού δουλεύει.
         */
        sub('registry', 'CforC Μητρώο (Apps Script)', async () => {
          const url = process.env.SHEET_WEBAPP_URL
          if (!url) return { state: 'down' as const, detail: 'δεν έχει ρυθμιστεί' }
          const { status, json, text, cold } = await appsScript(url,
            { secret: 'oc-healthcheck-invalid', action: '__healthcheck__' })
          if (json && /unauthorized/i.test(String(json.error || ''))) {
            return { state: 'ok' as const, detail: cold ? 'απαντά και φυλάει το μυστικό (ψυχρή εκκίνηση)' : 'απαντά και φυλάει το μυστικό' }
          }
          if (json?.ok === true) {
            return {
              state: 'down' as const,
              detail: 'ΔΕΧΤΗΚΕ άκυρο μυστικό',
              action: 'Άνοιξε το Apps Script του Μητρώου — ο έλεγχος του μυστικού δεν εφαρμόζεται',
            }
          }
          if (json) return { state: 'ok' as const, detail: 'απαντά' }
          return googleColdFailure(status, text)
        }, 40000),

        sheetSub('contracts', 'Μητρώο Συμβάσεων',
          process.env.CONTRACTS_SHEET_ID || '1xjl_u5pcFqYgmbYmhZV1Pw8VJXNDibOHC04mPcytxuU'),
        sheetSub('librarySheet', 'Βιβλιοθήκη — Λίστα περιεχομένων',
          process.env.GOOGLE_LIBRARY_SHEET_ID || '1lyOpSQ-NUSoaLWeMg8yo5uwjLsfQJxo9XmyGLcPoAko'),

        sub('libraryFolder', 'Βιβλιοθήκη — φάκελος Drive', async () => {
          const id = process.env.GOOGLE_LIBRARY_FOLDER_ID || '1QrZV0ixXvjITBsU95AHmoeg2Kqa2RJj9'
          return googleGet(SCOPES.drive,
            `https://www.googleapis.com/drive/v3/files/${id}?fields=name&supportsAllDrives=true`)
        }),

        sub('agendaDoc', 'Ημερήσια διάταξη (Doc)', async () => {
          const id = process.env.GOOGLE_AGENDA_DOC_ID
          if (!id) return { state: 'unknown' as const, detail: 'δεν έχει οριστεί GOOGLE_AGENDA_DOC_ID' }
          return googleGet(SCOPES.documents,
            `https://docs.googleapis.com/v1/documents/${id}?fields=title`)
        }),

        sub('calendar', 'Ημερολόγιο', async () => {
          const id = process.env.GOOGLE_CALENDAR_ID
          if (!id) return { state: 'unknown' as const, detail: 'δεν έχει οριστεί GOOGLE_CALENDAR_ID' }
          return googleGet(SCOPES.calendar,
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}`)
        }),
      ])
      return summariseGroup(items)
      // 45s: τα δύο Apps Script έχουν από 40s το καθένα ΚΑΙ τρέχουν παράλληλα,
      // άρα η γραμμή δεν περιμένει ποτέ 80. Κάτω από το maxDuration των 60.
    }, 45000),

    // ── Resend: από εδώ φεύγει κάθε συναλλακτικό email
    guard('resend', 'Resend', async () => {
      const key = process.env.RESEND_API_KEY
      if (!key) return { state: 'down' as const, detail: 'λείπει το κλειδί' }
      const r = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${key}` }, cache: 'no-store',
      })
      if (r.status === 401) {
        return { state: 'down' as const, detail: 'το κλειδί απορρίπτεται (401)', action: 'Φτιάξε νέο κλειδί στο Resend και ενημέρωσε το Vercel' }
      }
      if (!r.ok) return { state: 'unknown' as const, detail: `Resend API ${r.status}` }
      const j = await r.json()
      const domains: any[] = j?.data || []
      const ours = domains.find(d => String(d.name || '').includes('cultureforchange'))
      if (!ours) return { state: 'down' as const, detail: 'ο τομέας μας δεν είναι καταχωρημένος' }
      return ours.status === 'verified'
        ? { state: 'ok' as const, detail: `${ours.name} επαληθευμένος` }
        : { state: 'down' as const, detail: `${ours.name}: ${ours.status}` }
    }),

    // ── Sender: οι λίστες του newsletter
    guard('sender', 'Sender', async () => {
      const key = process.env.SENDER_API_KEY
      if (!key) return { state: 'unknown' as const, detail: 'λείπει το κλειδί' }
      const r = await fetch('https://api.sender.net/v2/groups', {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, cache: 'no-store',
      })
      if (!r.ok) return { state: 'down' as const, detail: `Sender API ${r.status}` }
      const j = await r.json()
      const groups: any[] = j?.data || []
      return { state: 'ok' as const, detail: `${groups.length} ${groups.length === 1 ? 'λίστα' : 'λίστες'}` }
    }),

    // ── Πιστοποιητικό του ιστότοπου
    guard('tls', 'Πιστοποιητικό', async () => judgeCertificate(await certDaysLeft(SITE_HOST))),

    // ── Εξοδολόγια που δεν έφτασαν ποτέ στο Drive (σιωπηλή αποτυχία, 28/9/2026)
    guard('claims', 'Αρχειοθέτηση εξοδολογίων', async () => {
      const r = await fetch(
        `${STRAPI_URL}/api/expense-claims?pagination[limit]=100&fields[0]=FolderUrl&fields[1]=ClaimNumber`,
        { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' })
      if (!r.ok) return { state: 'unknown' as const, detail: `Strapi ${r.status}` }
      const rows: any[] = (await r.json())?.data || []
      return judgeUnarchived(rows.filter(c => !String(c.FolderUrl || '').trim()).length)
    }),
  ])

  // Η παρουσία μυστικών δεν χρειάζεται δίκτυο
  const all: HealthCheck[] = [...checks, checkSecretsPresent(process.env)]

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    overall: worstOf(all),
    checks: all,
  })
}
