/**
 * Ημερολόγιο εκτελέσεων — μία γραμμή ανά τρέξιμο προγραμματισμένης εργασίας.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ. Η Vercel δεν δίνει ιστορικό cron από κανένα API, και —
 * χειρότερα — η ίδια η τεκμηρίωσή της λέει: «Cron job delivery is best effort…
 * your function does not execute, and no runtime log is created for that
 * scheduled run.» Δηλαδή μια εκτέλεση που ΔΕΝ έγινε δεν αφήνει ίχνος ούτε στα
 * logs του πίνακα. Ένα cron που πέθανε σιωπηλά — υπενθυμίσεις πληρωμών που
 * σταμάτησαν να φεύγουν — είναι σήμερα αόρατο σε κάθε σύστημα που έχουμε.
 *
 * ΔΥΟ ΕΓΓΡΑΦΕΣ, ΟΧΙ ΜΙΑ. Γράφουμε «running» στην αρχή και συμπληρώνουμε στο
 * τέλος. Έτσι μια εργασία που ξεκίνησε και σκοτώθηκε στη μέση (timeout, όριο
 * μνήμης) ξεχωρίζει από μία που δεν κλήθηκε ποτέ — αλλιώς και οι δύο θα
 * φαίνονταν «καμία εγγραφή».
 *
 * Η ΚΑΤΑΓΡΑΦΗ ΔΕΝ ΡΙΧΝΕΙ ΠΟΤΕ ΤΗΝ ΕΡΓΑΣΙΑ. Αν το Strapi δεν απαντά, η δουλειά
 * γίνεται κανονικά και απλώς δεν καταγράφεται. Ένα ημερολόγιο που μπορεί να
 * σταματήσει τις υπενθυμίσεις πληρωμών είναι χειρότερο από καθόλου ημερολόγιο.
 */

import vercelConfig from '@/vercel.json'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

/** Πόσο πίσω κρατάμε ιστορικό */
export const RUN_LOG_RETENTION_DAYS = 90

export type RunOutcome = 'running' | 'ok' | 'error'

export interface RunLogRow {
  documentId?: string
  Job: string
  StartedAt: string
  FinishedAt: string | null
  Outcome: RunOutcome
  DurationMs: number | null
  Summary: string | null
  ErrorText: string | null
  Trigger: 'cron' | 'manual' | null
}

/**
 * Οι εργασίες, από το ΠΡΑΓΜΑΤΙΚΟ vercel.json.
 *
 * Δεν ξαναγράφουμε τη λίστα με το χέρι: σήμερα (29/9/2026) το έγγραφο
 * σχεδιασμού έλεγε πέντε cron ενώ είναι έξι, και ο έλεγχος θα κληρονομούσε
 * το λάθος. Ό,τι προστεθεί στο vercel.json παρακολουθείται αυτόματα.
 */
export interface CronJob {
  /** Η διαδρομή· χρησιμεύει και ως κλειδί */
  path: string
  schedule: string
  label: string
}

/** Ανθρώπινα ονόματα· ό,τι δεν είναι εδώ παίρνει τη διαδρομή του */
const LABELS: Record<string, string> = {
  '/api/cron/payment-reminders': 'Υπενθυμίσεις συνδρομών',
  '/api/cron/contract-reminders': 'Υπενθυμίσεις συμβάσεων & εξοδολογίων',
  '/api/cron/campaign-drain': 'Αποστολή προγραμματισμένων email',
  '/api/cron/finance-monthly-reminder': 'Μηνιαίο κλείσιμο οικονομικών',
  '/api/cron/sync-unsubscribes': 'Συγχρονισμός απεγγραφών',
  '/api/admin/monthly-profile-report': 'Μηνιαία αναφορά προφίλ',
}

export const CRON_JOBS: CronJob[] =
  ((vercelConfig as { crons?: { path: string; schedule: string }[] }).crons || [])
    .map(c => ({ path: c.path, schedule: c.schedule, label: LABELS[c.path] || c.path }))

async function strapi(path: string, method = 'GET', data?: unknown) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

/** Ό,τι μπορεί να σημειώσει η εργασία για τον εαυτό της */
export interface RunNote {
  /**
   * Τι έκανε πράγματι η εκτέλεση. ΚΡΙΣΙΜΟ: χωρίς αυτό, «έτρεξε και δεν είχε
   * τίποτα να κάνει» και «έτρεξε και απέτυχε σιωπηλά» μοιάζουν ίδια.
   */
  note: (text: string) => void
}

/**
 * Τρέχει την εργασία και την καταγράφει.
 *
 * Η εγγραφή τέλους γίνεται με `await` ΠΡΙΝ επιστρέψουμε: σε Vercel η συνάρτηση
 * παγώνει μόλις γυρίσει απάντηση και ένα fetch που δεν περιμέναμε πεθαίνει
 * μαζί της (μάθημα από το email αποχώρησης).
 */
export async function recordRun<T>(
  path: string,
  handler: (log: RunNote) => Promise<T>,
  opts: { trigger?: 'cron' | 'manual' } = {},
): Promise<T> {
  const startedAt = new Date()
  const notes: string[] = []
  const note = (t: string) => { notes.push(t) }

  let documentId: string | null = null
  try {
    const r = await strapi('/oc-run-logs', 'POST', {
      Job: path,
      StartedAt: startedAt.toISOString(),
      Outcome: 'running',
      Trigger: opts.trigger || 'cron',
    })
    documentId = r.json?.data?.documentId || null
  } catch { /* η καταγραφή δεν σταματά τη δουλειά */ }

  const close = async (Outcome: RunOutcome, ErrorText: string | null) => {
    if (!documentId) return
    try {
      await strapi(`/oc-run-logs/${documentId}`, 'PUT', {
        FinishedAt: new Date().toISOString(),
        DurationMs: Date.now() - startedAt.getTime(),
        Outcome,
        Summary: notes.join(' · ').slice(0, 900) || null,
        ErrorText: ErrorText ? ErrorText.slice(0, 900) : null,
      })
    } catch { /* ό,τι έγινε, έγινε */ }
  }

  try {
    const out = await handler({ note })
    /**
     * ΠΡΟΣΟΧΗ: οι διαδρομές πιάνουν μόνες τους τα σφάλματά τους και γυρίζουν
     * 500 αντί να ρίξουν. Χωρίς αυτόν τον έλεγχο το ημερολόγιο θα κατέγραφε
     * «εντάξει» για μια εκτέλεση που απέτυχε — δηλαδή θα έλεγε ψέματα ακριβώς
     * εκεί που υπάρχει για να πει την αλήθεια.
     */
    const status = (out as { status?: unknown } | null)?.status
    if (typeof status === 'number' && status >= 400) await close('error', `HTTP ${status}`)
    else await close('ok', null)
    return out
  } catch (err) {
    await close('error', err instanceof Error ? err.message : String(err))
    throw err
  }
}

/** Οι εγγραφές των τελευταίων ημερών, νεότερη πρώτη */
export async function fetchRunLog(days = RUN_LOG_RETENTION_DAYS): Promise<RunLogRow[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const qs = [
    'pagination[limit]=500',
    'sort[0]=StartedAt:desc',
    `filters[StartedAt][$gte]=${encodeURIComponent(since)}`,
  ].join('&')
  const r = await strapi(`/oc-run-logs?${qs}`)
  // Το 404 έχει μία πολύ συγκεκριμένη σημασία και αξίζει δικό της μήνυμα: η
  // συλλογή δεν έχει ακόμη δημιουργηθεί ή δεν της δόθηκαν δικαιώματα στο
  // Strapi Cloud. Ο κώδικας από μόνος του δεν φτιάχνει τη βάση.
  if (r.status === 404) throw new Error('η συλλογή δεν υπάρχει ακόμη στο Strapi Cloud')
  if (r.status === 403) throw new Error('χωρίς δικαίωμα ανάγνωσης — δες τα Roles στο Strapi')
  if (!r.ok) throw new Error(`Strapi ${r.status}`)
  return (r.json?.data || []) as RunLogRow[]
}

/**
 * Πότε ξεκίνησε να υπάρχει το ημερολόγιο — η παλιότερη εγγραφή του.
 *
 * Χωρίς αυτό δεν μπορούμε να ξεχωρίσουμε «δεν έτρεξε» από «δεν το γράφαμε
 * ακόμη», και την πρώτη μέρα η οθόνη δείχνει ψεύτικες βλάβες. Δεν το κρατάμε
 * σε σταθερά: αν κάποτε αδειάσει η συλλογή, η σταθερά θα έλεγε ψέματα ενώ
 * αυτό διορθώνεται μόνο του.
 */
export async function fetchLoggingSince(): Promise<Date | null> {
  const r = await strapi('/oc-run-logs?pagination[limit]=1&sort[0]=StartedAt:asc&fields[0]=StartedAt')
  const iso = (r.json?.data || [])[0]?.StartedAt
  const t = Date.parse(String(iso || ''))
  return Number.isFinite(t) ? new Date(t) : null
}

/** Η τελευταία εγγραφή κάθε εργασίας */
export function latestPerJob(rows: RunLogRow[]): Map<string, RunLogRow> {
  const out = new Map<string, RunLogRow>()
  // Οι γραμμές έρχονται νεότερη πρώτη· κρατάμε την πρώτη που συναντάμε
  for (const r of rows) if (!out.has(r.Job)) out.set(r.Job, r)
  return out
}

/**
 * Σβήνει ό,τι είναι παλιότερο από το όριο διατήρησης.
 *
 * Ανεκτικό εξεπίτηδες: το token του Strapi δεν είχε πάντα δικαίωμα διαγραφής.
 * Αν δεν επιτρέπεται, το λέμε και προχωράμε — δεν ρίχνουμε την εργασία που
 * τύχαινε να καλέσει τον καθαρισμό.
 */
export async function pruneRunLog(days = RUN_LOG_RETENTION_DAYS): Promise<{ deleted: number; blocked: boolean }> {
  const before = new Date(Date.now() - days * 86400_000).toISOString()
  let deleted = 0
  let blocked = false
  try {
    const qs = [
      'pagination[limit]=100',
      'fields[0]=Job',
      `filters[StartedAt][$lt]=${encodeURIComponent(before)}`,
    ].join('&')
    const r = await strapi(`/oc-run-logs?${qs}`)
    for (const row of (r.json?.data || []) as { documentId: string }[]) {
      const d = await strapi(`/oc-run-logs/${row.documentId}`, 'DELETE')
      if (d.ok) deleted++
      else { blocked = true; break }
    }
  } catch { blocked = true }
  return { deleted, blocked }
}

/**
 * Ο ίδιος έλεγχος μυστικού που κάνει κάθε cron, αλλά ΠΡΙΝ την καταγραφή.
 *
 * Χωρίς αυτό, οποιοσδήποτε χτυπούσε τη διαδρομή θα γέμιζε το ημερολόγιο με
 * γραμμές «εκτέλεση» που δεν έγιναν ποτέ. Το `!secret` δεν είναι περιττό: αν
 * λείψει η μεταβλητή, η σύγκριση με `Bearer undefined` θα περνούσε.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * Ποιος κάλεσε: η Vercel στέλνει πάντα user agent `vercel-cron/1.0`.
 * Μια χειροκίνητη δοκιμή δεν πρέπει να μοιάζει με κανονική εκτέλεση.
 */
export function triggerOf(request: Request): 'cron' | 'manual' {
  return /vercel-cron/i.test(request.headers.get('user-agent') || '') ? 'cron' : 'manual'
}
