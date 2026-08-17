import { getAccessToken, googleConfigured, SCOPES } from '@/lib/googleAuth'

/**
 * Google Analytics 4 — Data API, όσο χρειάζεται το OC και τίποτα παραπάνω.
 *
 * ΣΗΜΑΝΤΙΚΟ: φιλτράρουμε το referral spam. Τον Αύγουστο 2026 το
 * «trafficheap.cc» έφερνε 470 από τις 1.493 συνεδρίες και έβγαζε τις
 * Σεϋχέλλες πρώτη χώρα, μπροστά από την Ελλάδα. Ένας πίνακας που μετράει
 * σιωπηλά bots είναι χειρότερος από καθόλου πίνακας.
 */

const SPAM_SOURCES = ['trafficheap.cc', 'semalt.com', 'buttons-for-website.com', 'darodar.com']

export interface GaSummary {
  sessions: number
  users: number
  pageViews: number
  engagementRate: number
  avgSessionSeconds: number
  prev: { sessions: number; users: number }
  spamSessions: number
}

export interface GaBreakdown { label: string; value: number }

export function gaConfigured(): boolean {
  return googleConfigured() && !!process.env.GA4_PROPERTY_ID
}

const notSpam = {
  notExpression: {
    filter: {
      fieldName: 'sessionSource',
      inListFilter: { values: SPAM_SOURCES },
    },
  },
}

async function runReport(body: Record<string, any>): Promise<any | null> {
  if (!gaConfigured()) return null
  const token = await getAccessToken(SCOPES.analytics)
  if (!token) return null
  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: 3600 },   // μία ώρα — πολύ κάτω από τα όρια ποσόστωσης
      },
    )
    if (!res.ok) {
      console.error('ga4: runReport failed', res.status, (await res.text()).slice(0, 200))
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('ga4: runReport threw:', err)
    return null
  }
}

const RANGE = [{ startDate: '30daysAgo', endDate: 'yesterday' }]
const PREV = [{ startDate: '60daysAgo', endDate: '31daysAgo' }]
const num = (v: any) => Number(v ?? 0) || 0

/** Ομαδοποίηση διαδρομών σε ενότητες — τα ωμά URL δεν λένε τίποτα στο ΔΣ */
export function sectionOf(path: string): string {
  const p = String(path || '').replace(/^\/en(?=\/|$)/, '') || '/'
  if (p === '/' || p === '') return 'Αρχική'
  if (p.startsWith('/members')) return 'Μέλη'
  if (p.startsWith('/activities') || p.startsWith('/news')) return 'Δραστηριότητες'
  if (p.startsWith('/open-calls')) return 'Open calls'
  if (p.startsWith('/projects')) return 'Έργα'
  if (p.startsWith('/apply') || p.startsWith('/participation')) return 'Εγγραφή'
  if (p.startsWith('/login') || p.startsWith('/profile')) return 'Λογαριασμός'
  return 'Λοιπές σελίδες'
}

export async function fetchGaSummary(): Promise<GaSummary | null> {
  const [main, spam] = await Promise.all([
    runReport({
      dateRanges: [...RANGE, ...PREV],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' },
        { name: 'engagementRate' }, { name: 'averageSessionDuration' }],
      dimensionFilter: notSpam,
    }),
    runReport({
      dateRanges: RANGE,
      metrics: [{ name: 'sessions' }],
      dimensionFilter: { filter: { fieldName: 'sessionSource', inListFilter: { values: SPAM_SOURCES } } },
    }),
  ])
  if (!main?.rows?.length) return null
  const a = main.rows[0].metricValues
  const b = main.rows[1]?.metricValues || []
  return {
    sessions: num(a[0]?.value),
    users: num(a[1]?.value),
    pageViews: num(a[2]?.value),
    engagementRate: Math.round(num(a[3]?.value) * 100),
    avgSessionSeconds: Math.round(num(a[4]?.value)),
    prev: { sessions: num(b[0]?.value), users: num(b[1]?.value) },
    spamSessions: num(spam?.rows?.[0]?.metricValues?.[0]?.value),
  }
}

async function breakdown(dimension: string, metric: string, limit: number): Promise<GaBreakdown[]> {
  const j = await runReport({
    dateRanges: RANGE,
    dimensions: [{ name: dimension }],
    metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }],
    dimensionFilter: notSpam,
    limit,
  })
  return (j?.rows || []).map((r: any) => ({
    label: r.dimensionValues[0].value,
    value: num(r.metricValues[0].value),
  }))
}

export interface GaDetail {
  channels: GaBreakdown[]
  sections: GaBreakdown[]
  countries: GaBreakdown[]
  devices: GaBreakdown[]
  fromNewsletter: number
  applyViews: number
}

export async function fetchGaDetail(): Promise<GaDetail | null> {
  if (!gaConfigured()) return null
  const [channels, pages, countries, devices] = await Promise.all([
    breakdown('sessionDefaultChannelGroup', 'sessions', 10),
    breakdown('pagePath', 'screenPageViews', 200),
    breakdown('country', 'totalUsers', 6),
    breakdown('deviceCategory', 'sessions', 5),
  ])

  // Ενότητες αντί για διαδρομές
  const bySection = new Map<string, number>()
  for (const p of pages) {
    const k = sectionOf(p.label)
    bySection.set(k, (bySection.get(k) || 0) + p.value)
  }
  const sections = [...bySection.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const applyViews = pages
    .filter(p => /^\/(en\/)?(apply|participation)/.test(p.label))
    .reduce((s, p) => s + p.value, 0)
  const fromNewsletter = channels.find(c => c.label === 'Email')?.value ?? 0

  return { channels, sections, countries, devices, fromNewsletter, applyViews }
}
