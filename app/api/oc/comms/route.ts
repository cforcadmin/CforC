import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'
import { fetchEvents, nextNewsletters, calendarConfigured } from '@/lib/googleCalendar'
import { fetchGaSummary, fetchGaDetail, gaConfigured } from '@/lib/ga4'

export const maxDuration = 60

/**
 * Επικοινωνία — μία κλήση, τρεις πηγές:
 *   Sender    : λίστες + καμπάνιες (υπάρχει ήδη, με κλειδί SENDER_API_KEY)
 *   Calendar  : ημερολόγιο δράσεων
 *   GA4       : επισκεψιμότητα ιστοσελίδας
 * Κάθε πηγή αποτυγχάνει ΜΟΝΗ της: αν λείπει μία, η σελίδα δείχνει τις άλλες
 * και λέει ποια δεν έχει ρυθμιστεί — αντί για λευκή οθόνη.
 */

const SENDER_GROUPS = { paid: 'Paid', external: 'External', media: 'Media' } as const

async function fetchLists() {
  const key = process.env.SENDER_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.sender.net/v2/groups', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json: any = await res.json()
    const find = (title: string) => (json.data || []).find((g: any) => g.title === title)
    const count = (g: any) => Number(g?.recipient_count ?? g?.subscribers_count ?? 0)
    const media = find(SENDER_GROUPS.media)
    return {
      paid: count(find(SENDER_GROUPS.paid)),
      external: count(find(SENDER_GROUPS.external)),
      media: count(media),
      mediaGroupId: media?.id ?? null,
      mediaCreated: media?.created ?? null,
    }
  } catch {
    return null
  }
}

async function fetchCampaigns() {
  const key = process.env.SENDER_API_KEY
  const paidGroup = process.env.SENDER_PAID_GROUP_ID
  if (!key) return { members: [], external: [] }
  try {
    const res = await fetch('https://api.sender.net/v2/campaigns?limit=40&status=sent', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { members: [], external: [] }
    const json: any = await res.json()
    const members: any[] = []
    const external: any[] = []
    const groupsUsed = new Set<string>()
    for (const c of json?.data || []) {
      const recipients = Number(c.recipient_count ?? 0)
      if (recipients < 10) continue                 // δοκιμαστική αποστολή
      const sent = Number(c.sent_count ?? recipients ?? 0)
      const opens = Number(c.opens ?? 0)
      const stats = {
        subject: c.subject || c.title || '—',
        sentAt: c.sent_time || null,
        recipients,
        opens,
        clicks: Number(c.clicks ?? 0),
        openRate: sent > 0 ? Math.round((opens / sent) * 100) : null,
        clickRate: sent > 0 ? Math.round((Number(c.clicks ?? 0) / sent) * 1000) / 10 : null,
      }
      const groups: string[] = Array.isArray(c.campaign_groups) ? c.campaign_groups : []
      groups.forEach(g => groupsUsed.add(g))
      if (paidGroup && groups.includes(paidGroup)) members.push(stats)
      else external.push(stats)
    }
    const newest = (a: any, b: any) => String(b.sentAt || '').localeCompare(String(a.sentAt || ''))
    members.sort(newest); external.sort(newest)
    return { members: members.slice(0, 6), external: external.slice(0, 6), groupsUsed: [...groupsUsed] }
  } catch {
    return { members: [], external: [], groupsUsed: [] }
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })

  try {
    const [lists, campaigns, events, gaSummary, gaDetail] = await Promise.all([
      fetchLists(),
      fetchCampaigns(),
      fetchEvents({ pastDays: 30, futureDays: 150 }),
      fetchGaSummary(),
      fetchGaDetail(),
    ])

    const avg = (rows: any[]) => rows.length
      ? Math.round(rows.reduce((s, r) => s + (r.openRate || 0), 0) / rows.length)
      : null

    // Η λίστα Τύπου υπάρχει από τον Μάρτιο 2026 αλλά καμία καμπάνια δεν έχει
    // σταλεί σε αυτήν. Ελέγχεται στα groups της κάθε αποστολής, όχι με εικασία.
    const mediaUsed = !!lists?.mediaGroupId && (campaigns.groupsUsed || []).includes(lists.mediaGroupId)

    return NextResponse.json({
      lists,
      mediaUsed,
      campaigns,
      averages: { members: avg(campaigns.members), external: avg(campaigns.external) },
      events,
      nextNewsletters: nextNewsletters(events),
      ga: gaSummary,
      gaDetail,
      configured: {
        sender: !!process.env.SENDER_API_KEY,
        calendar: calendarConfigured(),
        analytics: gaConfigured(),
      },
    })
  } catch (err) {
    console.error('oc/comms failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  }
}
