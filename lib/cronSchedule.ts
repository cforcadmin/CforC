/**
 * Πότε ΕΠΡΕΠΕ να είχε τρέξει μια προγραμματισμένη εργασία.
 *
 * Δύο πράγματα που επαληθεύτηκαν στην τεκμηρίωση της Vercel (29/9/2026) και
 * αλλάζουν τελείως το αποτέλεσμα:
 *
 * 1. «The timezone is always UTC». Το `0 8 * * *` ΔΕΝ είναι οκτώ το πρωί στην
 *    Αθήνα — είναι 11:00 το καλοκαίρι και 10:00 τον χειμώνα. Όλοι οι
 *    υπολογισμοί εδώ γίνονται σε UTC και μόνο η εμφάνιση γυρίζει σε Αθήνα.
 *
 * 2. Στο πλάνο Hobby η Vercel εκτελεί «at any point within the specified
 *    hour», για να μοιράσει το φορτίο. Άρα το `0 8 * * *` μπορεί κάλλιστα να
 *    χτυπήσει 08:47. Χωρίς περιθώριο μιας ώρας θα βγάζαμε «άργησε» κάθε μέρα.
 *
 * Και ακόμη: «Cron job delivery is best effort… your function does not
 * execute, and no runtime log is created for that scheduled run.» Δηλαδή μια
 * εκτέλεση που ΔΕΝ έγινε δεν αφήνει κανένα ίχνος πουθενά — γι' αυτό υπάρχει
 * το δικό μας ημερολόγιο.
 */

/** Το παράθυρο που δίνει η Vercel στο Hobby: οπουδήποτε μέσα στην ώρα */
export const HOBBY_SPREAD_MS = 60 * 60 * 1000
/** Επιπλέον ανοχή, για αργή εκτέλεση και για την καθυστέρηση της καταγραφής */
export const GRACE_MS = 30 * 60 * 1000

/** Ένα πεδίο έκφρασης cron → οι τιμές που ταιριάζουν */
export function expandField(field: string, min: number, max: number): Set<number> {
  const out = new Set<number>()
  for (const part of field.split(',')) {
    const [range, stepRaw] = part.split('/')
    const step = stepRaw ? Number(stepRaw) : 1
    if (!Number.isInteger(step) || step < 1) throw new Error(`άκυρο βήμα: ${part}`)
    let from = min
    let to = max
    if (range !== '*') {
      const [a, b] = range.split('-')
      from = Number(a)
      to = b === undefined ? Number(a) : Number(b)
      if (!Number.isInteger(from) || !Number.isInteger(to)) throw new Error(`άκυρο πεδίο: ${part}`)
      if (from < min || to > max || to < from) throw new Error(`εκτός ορίων: ${part}`)
    }
    for (let v = from; v <= to; v += step) out.add(v)
  }
  return out
}

export interface CronParts {
  minute: Set<number>
  hour: Set<number>
  dayOfMonth: Set<number>
  month: Set<number>
  dayOfWeek: Set<number>
  /** Το `*` στη μέρα σημαίνει «κάθε», όχι «περιορισμός» — κρατάμε ποιο δόθηκε */
  domRestricted: boolean
  dowRestricted: boolean
}

export function parseCron(expr: string): CronParts {
  const f = expr.trim().split(/\s+/)
  if (f.length !== 5) throw new Error(`η έκφραση θέλει 5 πεδία: «${expr}»`)
  const [mi, ho, dom, mo, dow] = f
  return {
    minute: expandField(mi, 0, 59),
    hour: expandField(ho, 0, 23),
    dayOfMonth: expandField(dom, 1, 31),
    month: expandField(mo, 1, 12),
    dayOfWeek: expandField(dow, 0, 6),
    domRestricted: dom !== '*',
    dowRestricted: dow !== '*',
  }
}

/**
 * Ταιριάζει η στιγμή (σε UTC) με την έκφραση;
 *
 * Η Vercel δεν επιτρέπει να οριστούν ΚΑΙ ημέρα μήνα ΚΑΙ ημέρα εβδομάδας
 * («when one has a value, the other must be `*`»), οπότε δεν χρειάζεται ο
 * περίεργος κανόνας του Unix cron που τα ενώνει με OR.
 */
export function matchesAt(p: CronParts, d: Date): boolean {
  if (!p.minute.has(d.getUTCMinutes())) return false
  if (!p.hour.has(d.getUTCHours())) return false
  if (!p.month.has(d.getUTCMonth() + 1)) return false
  if (p.domRestricted && !p.dayOfMonth.has(d.getUTCDate())) return false
  if (p.dowRestricted && !p.dayOfWeek.has(d.getUTCDay())) return false
  return true
}

/**
 * Η πιο πρόσφατη στιγμή, στις ή πριν από το `now`, που η έκφραση ήταν σε ισχύ.
 *
 * Ψάχνουμε λεπτό-λεπτό προς τα πίσω. Ακριβές και αρκετά γρήγορο: το χειρότερο
 * σενάριο εδώ είναι μια μηνιαία εργασία, δηλαδή ~45.000 βήματα αριθμητικής —
 * μικρότερο κόστος από ένα fetch, και χωρίς εξάρτηση από βιβλιοθήκη.
 */
export function lastDueAt(expr: string, now: Date, searchDays = 40): Date | null {
  const p = parseCron(expr)
  const d = new Date(now.getTime())
  d.setUTCSeconds(0, 0)
  for (let i = 0; i <= searchDays * 24 * 60; i++) {
    if (matchesAt(p, d)) return new Date(d.getTime())
    d.setUTCMinutes(d.getUTCMinutes() - 1)
  }
  return null
}

/** Ώρα Αθήνας, για τα μάτια — ποτέ για υπολογισμό */
export function athensTime(d: Date): string {
  return d.toLocaleString('el-GR', {
    timeZone: 'Europe/Athens',
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Πόσο αργεί μια εργασία: θετικό = έχει περάσει η προθεσμία της.
 *
 * Η προθεσμία δεν είναι η ώρα του cron αλλά η ώρα ΣΥΝ το παράθυρο του Hobby
 * συν την ανοχή — αλλιώς κάθε μέρα θα βλέπαμε κόκκινο για μισή ώρα.
 */
export function overdueMs(expr: string, lastRun: Date | null, now: Date): number | null {
  const due = lastDueAt(expr, now)
  if (!due) return null
  const deadline = due.getTime() + HOBBY_SPREAD_MS + GRACE_MS
  if (lastRun && lastRun.getTime() >= due.getTime()) return 0
  return Math.max(0, now.getTime() - deadline)
}
