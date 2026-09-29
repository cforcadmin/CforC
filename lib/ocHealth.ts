/**
 * Ζωτικά του συστήματος — η πρώτη φάση της ενότητας «Ασφάλεια++».
 *
 * Κάθε έλεγχος είναι ΑΝΕΞΑΡΤΗΤΟΣ και ΔΕΝ ρίχνει ποτέ: γυρίζει «άγνωστο» αν δεν
 * μπορεί να απαντήσει. Ένας πάροχος που δεν αποκρίνεται δεν επιτρέπεται να
 * αδειάσει ολόκληρη την οθόνη — αυτό ακριβώς είναι το πρόβλημα που η οθόνη
 * υπάρχει για να λύσει.
 *
 * ΚΑΜΙΑ τιμή μυστικού δεν φεύγει από εδώ. Ο έλεγχος «μυστικά» αναφέρει μόνο
 * ΠΑΡΟΥΣΙΑ (ναι/όχι), ποτέ την τιμή, ποτέ μέρος της.
 *
 * Δεν υπάρχει ακόμη ιστορικό: οι έλεγχοι που θέλουν μνήμη (πότε έτρεξε το κάθε
 * cron, πόσες φορές απέτυχε) περιμένουν τη συλλογή γεγονότων της Φάσης 2.
 */

export type HealthState = 'ok' | 'warn' | 'down' | 'unknown'

/** Ένα επιμέρους αρχείο/υπηρεσία μέσα σε ομαδοποιημένο έλεγχο */
export interface SubCheck {
  key: string
  label: string
  state: HealthState
  detail: string
  /** Τι να κάνει ο άνθρωπος γι' ΑΥΤΟ το αρχείο, όταν υπάρχει σαφής κίνηση */
  action?: string
}

export interface HealthCheck {
  key: string
  label: string
  state: HealthState
  /** Μία γραμμή που εξηγεί ΓΙΑΤΙ — όχι σκέτο «σφάλμα» */
  detail: string
  /**
   * Ομαδοποιημένος έλεγχος: μία γραμμή στην οθόνη που ανοίγει και δείχνει
   * κάθε αρχείο χωριστά. Επτά γραμμές Google θα έπνιγαν τα υπόλοιπα.
   */
  items?: SubCheck[]
  /** Χρόνος απόκρισης, όπου έχει νόημα */
  ms?: number
  /** Τι να κάνει ο άνθρωπος, όταν υπάρχει σαφής κίνηση */
  action?: string
}

/**
 * Το προεπιλεγμένο όριο κάθε ελέγχου.
 *
 * ΤΟ ΟΡΙΟ ΕΙΝΑΙ ΠΡΟΘΕΣΜΙΑ ΑΠΑΝΤΗΣΗΣ, ΟΧΙ ΜΕΤΡΗΣΗ ΕΠΙΔΟΣΗΣ. Ο έλεγχος
 * τελειώνει τη στιγμή που θα απαντήσει, άρα ένα γενναιόδωρο όριο δεν κοστίζει
 * τίποτα όταν όλα πάνε καλά — κοστίζει μόνο όταν κάτι όντως κρέμεται, που
 * είναι ακριβώς η ώρα που θέλουμε να περιμένουμε και να μάθουμε.
 *
 * Με 8s το `judgeStrapi` δεν μπορούσε ΠΟΤΕ να φτάσει στον κλάδο «απαντά αργά
 * (12s) — πιθανή ψυχρή εκκίνηση»: το όριο το σκότωνε πρώτα και η οθόνη έλεγε
 * «Άγνωστο» για το πιο συνηθισμένο γεγονός της ημέρας (29/9/2026).
 */
export const DEFAULT_CHECK_TIMEOUT_MS = 25000

/** Τρέχει έναν έλεγχο χωρίς ποτέ να ρίξει, με όριο χρόνου */
export async function guard(
  key: string, label: string, fn: () => Promise<Omit<HealthCheck, 'key' | 'label'>>,
  timeoutMs = DEFAULT_CHECK_TIMEOUT_MS,
): Promise<HealthCheck> {
  const started = Date.now()
  try {
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`δεν απάντησε σε ${Math.round(timeoutMs / 1000)}s`)), timeoutMs))
    const r = await Promise.race([fn(), timeout])
    return { key, label, ms: Date.now() - started, ...r }
  } catch (err) {
    return {
      key, label, state: 'unknown', ms: Date.now() - started,
      detail: err instanceof Error ? err.message : 'άγνωστο σφάλμα',
    }
  }
}

/** Ηλικία σε ανθρώπινη γλώσσα — «πριν 4 λεπτά», «πριν 3 ημέρες» */
export function ago(iso: string | null | undefined): string {
  const t = Date.parse(String(iso || ''))
  if (!Number.isFinite(t)) return 'ποτέ'
  const min = Math.round((Date.now() - t) / 60000)
  if (min < 1) return 'μόλις τώρα'
  if (min < 60) return `πριν ${min} λεπτά`
  const h = Math.round(min / 60)
  if (h < 48) return `πριν ${h} ${h === 1 ? 'ώρα' : 'ώρες'}`
  return `πριν ${Math.round(h / 24)} ημέρες`
}

/**
 * Παρουσία μυστικών — ΟΧΙ τιμές.
 *
 * Η λίστα είναι ρητή και όχι σάρωση του process.env: θέλουμε να ξέρουμε τι
 * ΛΕΙΠΕΙ, και ένα κλειδί που λείπει δεν εμφανίζεται σε καμία σάρωση.
 */
export const EXPECTED_SECRETS = [
  'JWT_SECRET', 'STRAPI_API_TOKEN', 'RESEND_API_KEY', 'SENDER_API_KEY',
  'CRON_SECRET', 'FINANCE_SHEET_WEBAPP_SECRET', 'FINANCE_SHEET_WEBAPP_URL',
  'SHEET_WEBAPP_SECRET', 'SHEET_WEBAPP_URL',
  // ΟΧΙ MEMBERSHIP_WEBHOOK_SECRET: η ροή της φόρμας Google αποσύρθηκε στις
  // 20/9/2026 (η εγγραφή πάει στο /apply) και το webhook δεν έχει καλούντα.
  'GOOGLE_SERVICE_ACCOUNT_JSON',
] as const

export function checkSecretsPresent(env: Record<string, string | undefined>): HealthCheck {
  const missing = EXPECTED_SECRETS.filter(k => !String(env[k] || '').trim())
  return {
    key: 'secrets',
    label: 'Μυστικά',
    state: missing.length === 0 ? 'ok' : 'down',
    detail: missing.length === 0
      ? `και τα ${EXPECTED_SECRETS.length} παρόντα`
      : `λείπουν: ${missing.join(', ')}`,
    ...(missing.length ? { action: 'Πρόσθεσέ τα στο Vercel → Settings → Environment Variables' } : {}),
  }
}

/**
 * Το τελευταίο deployment παραγωγής.
 *
 * ΤΟ ΠΙΟ ΧΡΗΣΙΜΟ ΣΗΜΑΔΙ ΤΗΣ ΟΘΟΝΗΣ. Στις 27/9/2026 ένα ωριαίο cron σε πλάνο
 * Hobby έριχνε κάθε build· η παραγωγή έμεινε επτά ώρες πίσω και κανένα σύστημα
 * δεν το είπε. Εδώ φαίνεται αμέσως: αν η τελευταία ΑΠΟΠΕΙΡΑ απέτυχε, κόκκινο,
 * ακόμη κι όταν η προηγούμενη είναι μια χαρά ζωντανή.
 */
export interface VercelDeployment {
  state: string                 // READY | ERROR | BUILDING | QUEUED | CANCELED
  sha?: string
  createdAt?: number
  target?: string | null
}

export function judgeDeployment(latest: VercelDeployment | null): Omit<HealthCheck, 'key' | 'label'> {
  if (!latest) return { state: 'unknown', detail: 'δεν βρέθηκε deployment παραγωγής' }
  const sha = latest.sha ? latest.sha.slice(0, 7) : '—'
  const when = latest.createdAt ? ago(new Date(latest.createdAt).toISOString()) : 'άγνωστο πότε'
  if (latest.state === 'READY') return { state: 'ok', detail: `${sha} · ${when}` }
  if (latest.state === 'ERROR') {
    return {
      state: 'down',
      detail: `Η τελευταία απόπειρα (${sha}, ${when}) ΑΠΕΤΥΧΕ — η παραγωγή τρέχει παλιότερο build`,
      action: 'Vercel → Deployments → άνοιξε το κόκκινο και δες το build log',
    }
  }
  if (latest.state === 'BUILDING' || latest.state === 'QUEUED') {
    return { state: 'warn', detail: `${sha} · χτίζεται (${when})` }
  }
  return { state: 'warn', detail: `${sha} · ${latest.state.toLowerCase()} (${when})` }
}

/** Ημέρες ως τη λήξη του πιστοποιητικού → κατάσταση */
export function judgeCertificate(daysLeft: number | null): Omit<HealthCheck, 'key' | 'label'> {
  if (daysLeft === null) return { state: 'unknown', detail: 'δεν διαβάστηκε το πιστοποιητικό' }
  if (daysLeft < 0) return { state: 'down', detail: 'ΕΛΗΞΕ', action: 'Έλεγξε τη Vercel — κανονικά ανανεώνεται μόνο του' }
  if (daysLeft <= 14) return { state: 'down', detail: `λήγει σε ${daysLeft} ημέρες` }
  if (daysLeft <= 30) return { state: 'warn', detail: `λήγει σε ${daysLeft} ημέρες` }
  return { state: 'ok', detail: `${daysLeft} ημέρες ακόμη` }
}

/**
 * Χρόνος απόκρισης του Strapi.
 *
 * Το δωρεάν πλάνο κοιμάται μετά από 10–15 λεπτά αδράνειας και ξυπνά σε 10–30
 * δευτερόλεπτα. Δεν είναι βλάβη — είναι όμως κάτι που ο επισκέπτης βλέπει.
 */
export function judgeStrapi(ok: boolean, ms: number): Omit<HealthCheck, 'key' | 'label'> {
  if (!ok) return { state: 'down', detail: 'δεν απαντά' }
  if (ms > 5000) return { state: 'warn', detail: `απαντά αργά (${(ms / 1000).toFixed(1)}s) — πιθανή ψυχρή εκκίνηση` }
  return { state: 'ok', detail: `${ms} ms` }
}

/** Πόσα εξοδολόγια έμειναν χωρίς αρχειοθέτηση στο Drive */
export function judgeUnarchived(count: number): Omit<HealthCheck, 'key' | 'label'> {
  if (count === 0) return { state: 'ok', detail: 'όλα αρχειοθετημένα' }
  return {
    state: 'warn',
    detail: `${count} ${count === 1 ? 'εξοδολόγιο' : 'εξοδολόγια'} χωρίς φάκελο στο Drive`,
    action: 'Οικονομικά → Εξοδολόγια → «Επανάληψη» σε καθένα',
  }
}

/**
 * Σύνοψη ομαδοποιημένου ελέγχου: η γραμμή παίρνει τη χειρότερη κατάσταση των
 * παιδιών της και λέει ΠΟΣΑ είναι εντάξει — «5/7 εντάξει» διαβάζεται αμέσως,
 * ενώ ένα σκέτο κόκκινο κρύβει ποιο έσπασε.
 */
export function summariseGroup(items: SubCheck[]): Omit<HealthCheck, 'key' | 'label'> {
  const state = worstOf(items as HealthCheck[])
  const ok = items.filter(i => i.state === 'ok').length
  const bad = items.filter(i => i.state === 'down' || i.state === 'unknown')
  const detail = bad.length === 0
    ? `${ok}/${items.length} εντάξει`
    : `${ok}/${items.length} εντάξει · πρόβλημα: ${bad.map(b => b.label).join(', ')}`
  return { state, detail, items }
}

/** Η χειρότερη κατάσταση της λίστας — αυτή δείχνει η κεφαλίδα */
export function worstOf(checks: HealthCheck[]): HealthState {
  if (checks.some(c => c.state === 'down')) return 'down'
  if (checks.some(c => c.state === 'warn')) return 'warn'
  if (checks.some(c => c.state === 'unknown')) return 'unknown'
  return 'ok'
}

/**
 * Κρίση για μία προγραμματισμένη εργασία.
 *
 * Τέσσερις καταστάσεις που ΔΕΝ πρέπει να μπερδευτούν, γιατί καθεμιά θέλει
 * άλλη κίνηση:
 *   · έτρεξε κανονικά                     → εντάξει
 *   · έτρεξε και πέταξε σφάλμα            → βλάβη, με το μήνυμα
 *   · ξεκίνησε και δεν τελείωσε ποτέ      → βλάβη (timeout/όριο μνήμης)
 *   · δεν υπάρχει εγγραφή ενώ έπρεπε      → βλάβη, ΔΕΝ κλήθηκε καθόλου
 *
 * Η τέταρτη είναι ο λόγος ύπαρξης του ημερολογίου: η Vercel δεν γράφει τίποτα
 * για μια εκτέλεση που δεν έγινε.
 */
export interface CronRunSummary {
  Outcome: 'running' | 'ok' | 'error'
  StartedAt: string
  Summary?: string | null
  ErrorText?: string | null
}

export function judgeCronJob(
  label: string,
  lastRun: CronRunSummary | null,
  overdue: number | null,
  now: Date = new Date(),
  /**
   * ΤΟ ΗΜΕΡΟΛΟΓΙΟ ΕΧΕΙ ΓΕΝΕΘΛΙΑ. Πριν από την πρώτη του εγγραφή δεν ξέρουμε
   * τίποτα — και «δεν ξέρω» δεν είναι «χάλασε».
   *
   * Χωρίς αυτό, την πρώτη μέρα και οι έξι εργασίες βγήκαν ΚΟΚΚΙΝΕΣ ενώ όλες
   * είχαν τρέξει κανονικά (29/9/2026): «Συγχρονισμός απεγγραφών — αργεί 411h»
   * σήμαινε απλώς ότι η μηνιαία θέση του ήταν στις 12/9, δύο εβδομάδες πριν
   * αρχίσουμε να γράφουμε. Μια οθόνη που ξεκινά με πέντε ψεύτικες βλάβες
   * διδάσκει αμέσως ότι το κόκκινο αγνοείται.
   */
  ctx: { dueAt?: Date | null; loggingSince?: Date | null } = {},
): Omit<SubCheck, 'key' | 'label'> {
  const late = overdue !== null && overdue > 0
  const lateText = late ? `αργεί ${Math.round(overdue / 3_600_000)}h` : ''

  if (!lastRun) {
    const { dueAt, loggingSince } = ctx
    if (!loggingSince) {
      return { state: 'unknown', detail: 'το ημερολόγιο μόλις ξεκίνησε — καμία καταγραφή ακόμη' }
    }
    // Η προθεσμία πέρασε ΠΡΙΝ αρχίσουμε να καταγράφουμε: δεν έχουμε στοιχεία,
    // ούτε υπέρ ούτε κατά. Η επόμενη εκτέλεση θα δώσει την απάντηση.
    if (dueAt && dueAt.getTime() < loggingSince.getTime()) {
      return { state: 'unknown', detail: `δεν καταγραφόταν ακόμη — αναμονή για την επόμενη εκτέλεση` }
    }
    return late
      ? { state: 'down', detail: `καμία εκτέλεση — ${lateText}`, action: 'Vercel → Settings → Cron Jobs → View Logs' }
      : { state: 'unknown', detail: 'καμία καταγραφή ακόμη' }
  }

  const when = ago(lastRun.StartedAt)

  if (lastRun.Outcome === 'error') {
    return {
      state: 'down',
      detail: `απέτυχε ${when}: ${String(lastRun.ErrorText || '').slice(0, 80) || 'χωρίς μήνυμα'}`,
      action: 'Vercel → Logs, φίλτρο στη διαδρομή της εργασίας',
    }
  }

  if (lastRun.Outcome === 'running') {
    const startedMsAgo = now.getTime() - Date.parse(lastRun.StartedAt)
    // Καμία εργασία δεν κρατά πάνω από 60s (maxDuration)· η μισή ώρα είναι
    // γενναιόδωρη και αποκλείει την περίπτωση «τρέχει αυτή τη στιγμή».
    if (startedMsAgo > 30 * 60_000) {
      return {
        state: 'down',
        detail: `ξεκίνησε ${when} και δεν τελείωσε ποτέ`,
        action: 'Πιθανό timeout ή όριο μνήμης — δες το log της εκτέλεσης',
      }
    }
    return { state: 'ok', detail: 'τρέχει αυτή τη στιγμή' }
  }

  if (late) {
    return {
      state: 'down',
      detail: `${lateText} — τελευταία επιτυχία ${when}`,
      action: 'Vercel → Settings → Cron Jobs: είναι ενεργό; Έχει περάσει deployment;',
    }
  }

  const did = String(lastRun.Summary || '').trim()
  return { state: 'ok', detail: did ? `${when} · ${did}` : when }
}

/**
 * Αιτήσεις που θέλουν ΑΝΘΡΩΠΙΝΟ ΧΕΡΙ.
 *
 * Καμία αυτόματη διαγραφή εδώ — ρητή απόφαση (29/9/2026). Ο κώδικας μόνο
 * ΔΕΙΧΝΕΙ· σβήνει ο άνθρωπος. Δύο καταστάσεις που αλλιώς μένουν αόρατες:
 *
 *  · Απορριφθείσες με ψήφο πέρα από τις 30 ημέρες. Δεν υπάρχει καμία
 *    αυτόματη διαδρομή γι' αυτές, άρα μένουν με πλήρη προσωπικά δεδομένα.
 *  · Αιτήσεις με απόφαση αλλά ΧΩΡΙΣ ημερομηνία απόφασης. Χωρίς αφετηρία δεν
 *    υπάρχει προθεσμία — δεν τις πιάνει ποτέ κανένας κανόνας. Συμβαίνει όταν
 *    αλλάξει κάποιος την κατάσταση με το χέρι στο Strapi.
 */
export function judgeApplicationsNeedingHand(
  overdueRejected: number,
  missingDecisionDate: number,
): Omit<HealthCheck, 'key' | 'label'> {
  const items: SubCheck[] = [
    overdueRejected === 0
      ? { key: 'rejected', label: 'Απορριφθείσες πέρα από 30 ημέρες', state: 'ok', detail: 'καμία εκκρεμότητα' }
      : {
        key: 'rejected',
        label: 'Απορριφθείσες πέρα από 30 ημέρες',
        state: 'warn',
        detail: `${overdueRejected} ${overdueRejected === 1 ? 'αίτηση κρατά' : 'αιτήσεις κρατούν'} ακόμη προσωπικά δεδομένα`,
        action: 'Διαγραφή ΜΕ ΤΟ ΧΕΡΙ: Strapi → Membership Applications, και η γραμμή στο Google Sheet',
      },
    missingDecisionDate === 0
      ? { key: 'nodate', label: 'Χωρίς αφετηρία προθεσμίας', state: 'ok', detail: 'όλες έχουν ημερομηνία απόφασης' }
      : {
        key: 'nodate',
        label: 'Χωρίς αφετηρία προθεσμίας',
        state: 'warn',
        detail: `${missingDecisionDate} με απόφαση αλλά χωρίς ημερομηνία — καμία προθεσμία δεν τρέχει`,
        action: 'Συμπλήρωσε το DecisionDate στο Strapi με την πραγματική ημερομηνία της απόφασης',
      },
  ]
  return summariseGroup(items)
}
