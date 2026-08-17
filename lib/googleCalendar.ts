import { getAccessToken, googleConfigured, SCOPES } from '@/lib/googleAuth'

/**
 * Ημερολόγιο δράσεων CforC — ανάγνωση από το κοινό Google Calendar.
 *
 * Πηγή αλήθειας είναι το ίδιο το ημερολόγιο: η Επικοινωνία το γράφει από
 * το κινητό της, το OC το διαβάζει. Καμία ημερομηνία δεν είναι καρφωμένη
 * στον κώδικα — αν αλλάξει ένα Cafe, αλλάζει στο ημερολόγιο και τέλος.
 */

export type EventCategory = 'cafe' | 'newsletter-internal' | 'newsletter-external'
  | 'governance' | 'deadline' | 'share' | 'meeting'

export interface CalendarEvent {
  id: string
  title: string
  start: string            // ISO ή yyyy-MM-dd για ολοήμερα
  end: string | null
  allDay: boolean
  category: EventCategory
  meetLink: string | null
  location: string | null
  description: string | null
  htmlLink: string | null
}

/**
 * Ελληνικά κεφαλαία που μοιάζουν με λατινικά ΔΕΝ είναι λατινικά: το
 * «Νewsletter» του ημερολογίου ξεκινά με ελληνικό Ν (U+039D). Χωρίς αυτή
 * τη μετατροπή το γεγονός θα έπεφτε σιωπηλά στην κατηγορία «συνάντηση».
 */
const LOOKALIKES: Record<string, string> = {
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K',
  'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
  'α': 'a', 'ε': 'e', 'ι': 'i', 'ο': 'o', 'ν': 'v', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
}

function normalise(s: string): string {
  return String(s || '')
    .replace(/[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧαειονρτυχ]/g, c => LOOKALIKES[c] ?? c)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // τόνοι
    .trim()
}

/** Κατηγορία από τον τίτλο — καμία ρύθμιση, μόνο ό,τι ήδη γράφετε */
export function categorise(title: string, allDay: boolean): EventCategory {
  const t = normalise(title)
  if (t.includes('meet up cafe') || t.includes('meetup cafe')) return 'cafe'
  if (t.includes('ewsletter')) {
    if (t.includes('εσωτερικ') || normalise('εσωτερικ') && t.includes('esoterik')) return 'newsletter-internal'
    if (t.includes('εξωτερικ') || t.includes('eksoterik')) return 'newsletter-external'
    // «Newsletter ENCC-Συλλογή υλικού» κ.λπ. → εσωτερική προετοιμασία
    return 'newsletter-internal'
  }
  if (t.includes('share my experience')) return 'share'
  if (/(^|\s)(δσ|γσ)(\s|$)/.test(t) || t.includes('εκλογ') || t.includes('γενικη συνελευση')) return 'governance'
  if (t.includes('deadline') || t.includes('dealine') || t.includes('προθεσμ')
    || t.includes('παραδοτεο') || t.includes('λήγει') || t.includes('ληγει')) return 'deadline'
  // Ολοήμερο χωρίς άλλη ένδειξη: συνήθως ορόσημο, όχι ραντεβού
  if (allDay) return 'deadline'
  return 'meeting'
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  cafe: 'Meet Up Cafe',
  'newsletter-internal': 'Newsletter μελών',
  'newsletter-external': 'Newsletter κοινού',
  governance: 'Διοικητικά',
  deadline: 'Προθεσμία',
  share: 'Share my experience',
  meeting: 'Συνάντηση',
}

export function calendarConfigured(): boolean {
  return googleConfigured() && !!process.env.GOOGLE_CALENDAR_ID
}

/**
 * Γεγονότα σε παράθυρο ημερών γύρω από σήμερα.
 * singleEvents=true ⇒ οι επαναλήψεις έρχονται ξεχωριστά, με τη σωστή ώρα.
 */
export async function fetchEvents(opts: { pastDays?: number; futureDays?: number; max?: number } = {}): Promise<CalendarEvent[]> {
  if (!calendarConfigured()) return []
  const token = await getAccessToken(SCOPES.calendar)
  if (!token) return []

  const now = Date.now()
  const timeMin = new Date(now - (opts.pastDays ?? 30) * 86400000).toISOString()
  const timeMax = new Date(now + (opts.futureDays ?? 120) * 86400000).toISOString()
  const id = encodeURIComponent(String(process.env.GOOGLE_CALENDAR_ID))

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${id}/events`
      + `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      + `&singleEvents=true&orderBy=startTime&maxResults=${opts.max ?? 250}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 900 },   // 15' — το ημερολόγιο δεν αλλάζει ανά λεπτό
    })
    if (!res.ok) {
      console.error('googleCalendar: events failed', res.status, (await res.text()).slice(0, 200))
      return []
    }
    const json: any = await res.json()
    return (json.items || [])
      .filter((e: any) => e.status !== 'cancelled')
      .map((e: any): CalendarEvent => {
        const allDay = !e.start?.dateTime
        const title = String(e.summary || '(χωρίς τίτλο)').trim()
        return {
          id: e.id,
          title,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date || null,
          allDay,
          category: categorise(title, allDay),
          meetLink: e.hangoutLink || e.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri || null,
          location: e.location || null,
          description: e.description ? String(e.description).replace(/<[^>]+>/g, ' ').trim().slice(0, 300) : null,
          htmlLink: e.htmlLink || null,
        }
      })
  } catch (err) {
    console.error('googleCalendar: fetch threw:', err)
    return []
  }
}

/**
 * Επόμενο newsletter ανά τύπο: από το ημερολόγιο αν υπάρχει καταχώρηση,
 * αλλιώς ο κανόνας (10 και 15 του μήνα) σημασμένο ως εκτίμηση.
 */
export function nextNewsletters(events: CalendarEvent[], today = new Date()) {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const todayIso = iso(today)
  const pick = (cat: EventCategory) => events
    .filter(e => e.category === cat && String(e.start).slice(0, 10) >= todayIso)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))[0]

  const ruleDay = (day: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), day)
    if (iso(d) < todayIso) d.setMonth(d.getMonth() + 1)
    return iso(d)
  }

  const internal = pick('newsletter-internal')
  const external = pick('newsletter-external')
  return {
    internal: internal
      ? { date: String(internal.start).slice(0, 10), estimated: false, title: internal.title }
      : { date: ruleDay(10), estimated: true, title: 'Newsletter μελών' },
    external: external
      ? { date: String(external.start).slice(0, 10), estimated: false, title: external.title }
      : { date: ruleDay(15), estimated: true, title: 'Newsletter κοινού' },
  }
}
