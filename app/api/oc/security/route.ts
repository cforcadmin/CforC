import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import tls from 'node:tls'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import {
  guard, checkSecretsPresent, judgeDeployment, judgeCertificate, judgeStrapi,
  judgeUnarchived, worstOf, type HealthCheck, type VercelDeployment,
} from '@/lib/ocHealth'

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

    // ── ΕΣΟΔΑ-ΕΞΟΔΑ: το Apps Script που γράφει στο φύλλο και στο Drive
    guard('sheet', 'ΕΣΟΔΑ-ΕΞΟΔΑ', async () => {
      const url = process.env.FINANCE_SHEET_WEBAPP_URL
      const secret = process.env.FINANCE_SHEET_WEBAPP_SECRET
      if (!url || !secret) return { state: 'down' as const, detail: 'δεν έχει ρυθμιστεί' }
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, action: 'checkYearStructure', year: new Date().getFullYear() }),
        redirect: 'follow', cache: 'no-store',
      })
      const text = await r.text()
      let j: any = null
      try { j = JSON.parse(text) } catch { /* σελίδα σφάλματος του Apps Script */ }
      if (j?.ok) return { state: 'ok' as const, detail: 'απαντά' }
      const detail = String(j?.error || text.slice(0, 80))
      return /unauthorized/i.test(detail)
        ? { state: 'down' as const, detail: 'απορρίπτει το μυστικό', action: 'Σύγκρινε το FINANCE_SHEET_WEBAPP_SECRET με το Apps Script' }
        : { state: 'down' as const, detail: detail || 'δεν απαντά' }
    }),

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
