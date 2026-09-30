/**
 * Ασφάλεια++ → Πρόσβαση & μυστικά. Ο ΚΑΤΑΛΟΓΟΣ και η ΚΡΙΣΗ.
 *
 * Χωριστά από τη διαδρομή, όπως το ocHealth: εδώ μένουν καθαρές συναρτήσεις
 * που δοκιμάζονται χωρίς δίκτυο, και η διαδρομή κάνει μόνο τις κλήσεις.
 *
 * ΚΑΜΙΑ ΤΙΜΗ ΜΥΣΤΙΚΟΥ δεν περνά από εδώ. Δουλεύουμε με ΟΝΟΜΑΤΑ κλειδιών,
 * ημερομηνίες και περιβάλλοντα — ποτέ με περιεχόμενο. Το Vercel επιστρέφει
 * και `value` για τα μη κρυπτογραφημένα· δεν το διαβάζουμε ΠΟΤΕ.
 *
 * Γιατί δεν αρκεί το EXPECTED_SECRETS του ocHealth: εκείνο ρωτά «υπάρχει
 * στη μνήμη αυτής της διεργασίας;». Εδώ ρωτάμε τρία άλλα πράγματα που δεν
 * φαίνονται από μέσα — σε ΠΟΙΟ περιβάλλον είναι ορισμένο, ΠΟΣΟ παλιό είναι,
 * και μήπως το ΟΝΟΜΑ του υπόσχεται κάτι επικίνδυνο.
 */

/** Τι σημαίνει η απουσία ενός κλειδιού */
export type KeyNeed =
  /** Χωρίς αυτό, η λειτουργία είναι νεκρή */
  | 'required'
  /** Ο κώδικας έχει εφεδρική τιμή — η απουσία δεν σπάει τίποτα */
  | 'optional'
  /** Το δίνει η πλατφόρμα, δεν το ορίζει άνθρωπος */
  | 'platform'

export interface KeySpec {
  key: string
  need: KeyNeed
  /** Σε μία φράση: τι εξυπηρετεί */
  what: string
}

/**
 * ΟΛΑ τα κλειδιά που διαβάζει ο κώδικας, με το τι σημαίνει η απουσία τους.
 *
 * Η λίστα φτιάχτηκε με απαρίθμηση (grep σε process.env σε app/, lib/,
 * components/, scripts/) και ΟΧΙ από μνήμη — και κάθε «optional» σημαίνει
 * ότι βρέθηκε ΠΡΑΓΜΑΤΙΚΗ εφεδρική τιμή στον κώδικα, με το αρχείο δίπλα.
 */
export const KEY_CATALOGUE: KeySpec[] = [
  // ── Ταυτότητα και δεδομένα
  { key: 'JWT_SECRET', need: 'required', what: 'υπογραφή συνεδριών και μαγικών συνδέσμων' },
  { key: 'STRAPI_API_TOKEN', need: 'required', what: 'ανάγνωση και γραφή στο Strapi' },
  { key: 'STRAPI_URL', need: 'required', what: 'πού ζει το Strapi' },
  { key: 'NEXT_PUBLIC_STRAPI_URL', need: 'required', what: 'το ίδιο, για τον browser' },

  // ── Επικοινωνία
  { key: 'RESEND_API_KEY', need: 'required', what: 'αποστολή email' },
  { key: 'SENDER_API_KEY', need: 'required', what: 'λίστες newsletter' },
  { key: 'SENDER_GROUP_ID', need: 'required', what: 'η λίστα των μελών' },
  { key: 'SENDER_PAID_GROUP_ID', need: 'required', what: 'η λίστα των ταμειακά εντάξει' },
  { key: 'ACCOUNTANT_EMAIL', need: 'required', what: 'παραλήπτης των οικονομικών' },

  // ── Google
  { key: 'GOOGLE_SERVICE_ACCOUNT_JSON', need: 'required', what: 'το κλειδί για ΟΛΑ τα Google' },
  { key: 'GOOGLE_IMPERSONATE_USER', need: 'required', what: 'ποιον υποδύεται ο λογαριασμός υπηρεσίας' },
  { key: 'GOOGLE_CALENDAR_ID', need: 'required', what: 'το ημερολόγιο του OC' },
  { key: 'GOOGLE_AGENDA_DOC_ID', need: 'required', what: 'η Ημερήσια διάταξη — ΧΩΡΙΣ εφεδρική τιμή' },
  { key: 'CONTRACTS_SHEET_ID', need: 'optional', what: 'συμβάσεις (εφεδρική στο lib/contractsSheet.ts)' },
  { key: 'GOOGLE_LIBRARY_SHEET_ID', need: 'optional', what: 'Βιβλιοθήκη (εφεδρική στο lib/librarySheet.ts)' },
  { key: 'GOOGLE_LIBRARY_FOLDER_ID', need: 'optional', what: 'φάκελος Βιβλιοθήκης (εφεδρική στο lib/googleDrive.ts)' },

  // ── Φύλλα με Apps Script
  { key: 'FINANCE_SHEET_WEBAPP_URL', need: 'required', what: 'ΕΣΟΔΑ-ΕΞΟΔΑ' },
  { key: 'FINANCE_SHEET_WEBAPP_SECRET', need: 'required', what: 'υπογραφή προς ΕΣΟΔΑ-ΕΞΟΔΑ' },
  { key: 'SHEET_WEBAPP_URL', need: 'required', what: 'Μητρώο μελών' },
  { key: 'SHEET_WEBAPP_SECRET', need: 'required', what: 'υπογραφή προς το Μητρώο' },

  // ── Λειτουργία
  { key: 'CRON_SECRET', need: 'required', what: 'ποιος επιτρέπεται να τρέξει τα cron' },
  { key: 'NEXT_PUBLIC_SITE_URL', need: 'required', what: 'η δημόσια διεύθυνση του site' },
  { key: 'NEXT_PUBLIC_BASE_URL', need: 'optional', what: 'μαγικοί σύνδεσμοι (εφεδρικά η origin του αιτήματος)' },
  { key: 'GA4_PROPERTY_ID', need: 'optional', what: 'στατιστικά επισκεψιμότητας' },

  // ── Vercel: τα διαβάζει ο έλεγχος deployment των Ζωτικών
  { key: 'VERCEL_API_TOKEN', need: 'optional', what: 'έλεγχος deployment στα Ζωτικά' },
  { key: 'VERCEL_PROJECT_ID', need: 'optional', what: 'ποιο έργο ρωτά ο έλεγχος' },
  { key: 'VERCEL_TEAM_ID', need: 'optional', what: 'η ομάδα του έργου' },

  // ── Τα δίνει η πλατφόρμα
  { key: 'NODE_ENV', need: 'platform', what: 'το δίνει το Next' },
  { key: 'VERCEL', need: 'platform', what: 'το δίνει το Vercel' },
]

/** Κλειδιά που ο κώδικας ΔΕΝ διαβάζει πια, με τον λόγο — ώστε να μη
 *  φαίνονται «άγνωστα» και να μην τα ψάχνει κανείς δεύτερη φορά. */
export const KNOWN_UNUSED: Record<string, string> = {
  MEMBERSHIP_WEBHOOK_SECRET:
    'Η ροή της φόρμας Google αποσύρθηκε 20/9/2026 — η εγγραφή πάει στο /apply.',
  JWT_EXPIRES_IN:
    'ΝΕΚΡΟ: το lib/auth.ts έχει καρφωμένο 2592000 (30 ημέρες). Αλλαγή εδώ δεν κάνει τίποτα.',
  MAGIC_LINK_EXPIRES_IN:
    'ΝΕΚΡΟ: το lib/auth.ts έχει καρφωμένο 21600 (6 ώρες). Αλλαγή εδώ δεν κάνει τίποτα.',
  NEXT_PUBLIC_STRAPI_API_TOKEN:
    'Εφεδρεία που δεν χρησιμοποιείται ποτέ — το STRAPI_API_TOKEN προηγείται πάντα.',
}

/** Ένα κλειδί όπως το ξέρει το Vercel. ΧΩΡΙΣ τιμή — επίτηδες. */
export interface VercelKey {
  key: string
  /** production | preview | development */
  targets: string[]
  /** encrypted | plain | secret | system */
  type?: string
  createdAt?: number
  updatedAt?: number
}

export type AccessSeverity = 'ok' | 'warn' | 'down'

export interface AccessFinding {
  key: string
  severity: AccessSeverity
  title: string
  detail: string
  action?: string
}

/**
 * Το όνομα προδίδει προνόμιο;
 *
 * Το πρόθεμα NEXT_PUBLIC_ λέει στο Next «αυτό επιτρέπεται να φύγει στον
 * browser». Ένα διακριτικό κάτω από τέτοιο όνομα είναι μόνιμη παγίδα: μία
 * αναφορά από client component και φεύγει μέσα στο bundle, χωρίς να φωνάξει
 * κανείς. Δεν κοιτάμε τιμές — μόνο το όνομα.
 */
export function isPublicNameHoldingSecret(key: string): boolean {
  if (!key.startsWith('NEXT_PUBLIC_')) return false
  return /(TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL)/i.test(key.slice('NEXT_PUBLIC_'.length))
}

/** Ηλικία σε ημέρες από την τελευταία αλλαγή (ή τη δημιουργία) */
export function keyAgeDays(k: VercelKey, now = Date.now()): number | null {
  const t = k.updatedAt ?? k.createdAt
  if (!t || !Number.isFinite(t)) return null
  return Math.max(0, Math.round((now - t) / 86400000))
}

/**
 * Η κρίση: τι χρειάζεται μάτι.
 *
 * ΔΕΝ προτείνει εναλλαγή κλειδιών με βάση την ηλικία. Η ηλικία ΔΕΙΧΝΕΤΑΙ
 * και την κρίνει άνθρωπος — ένα κλειδί δεν είναι χαλασμένο επειδή είναι
 * παλιό, και μια οθόνη που φωνάζει χωρίς λόγο παύει να διαβάζεται.
 */
export function judgeAccess(
  vercelKeys: VercelKey[],
  catalogue: KeySpec[] = KEY_CATALOGUE,
): AccessFinding[] {
  const findings: AccessFinding[] = []
  const byKey = new Map(vercelKeys.map(k => [k.key, k]))

  // ── Λείπει από την ΠΑΡΑΓΩΓΗ ό,τι χρειάζεται πραγματικά
  for (const spec of catalogue) {
    if (spec.need === 'platform') continue
    const found = byKey.get(spec.key)
    const inProd = !!found?.targets.includes('production')
    if (!found) {
      findings.push({
        key: spec.key,
        severity: spec.need === 'required' ? 'down' : 'warn',
        title: spec.need === 'required' ? 'Λείπει εντελώς' : 'Δεν έχει οριστεί',
        detail: spec.need === 'required'
          ? `${spec.what} — η λειτουργία είναι νεκρή στην παραγωγή.`
          : `${spec.what} — ο κώδικας έχει εφεδρική τιμή, οπότε δουλεύει.`,
        ...(spec.need === 'required'
          ? { action: 'Vercel → Settings → Environment Variables' } : {}),
      })
    } else if (!inProd) {
      findings.push({
        key: spec.key,
        severity: spec.need === 'required' ? 'down' : 'warn',
        title: 'Λείπει από την παραγωγή',
        detail: `Ορισμένο μόνο σε: ${found.targets.join(', ') || '—'}. ${spec.what}`,
        action: 'Vercel → Settings → Environment Variables → πρόσθεσε το Production',
      })
    }
  }

  // ── Ονόματα που υπόσχονται δημοσιότητα ενώ κρατούν προνόμιο
  for (const k of vercelKeys) {
    if (!isPublicNameHoldingSecret(k.key)) continue
    findings.push({
      key: k.key,
      severity: 'down',
      title: 'Προνομιούχο κλειδί με δημόσιο όνομα',
      detail: KNOWN_UNUSED[k.key]
        ? `${KNOWN_UNUSED[k.key]} Το πρόθεμα NEXT_PUBLIC_ σημαίνει ότι επιτρέπεται να φύγει στον browser.`
        : 'Το πρόθεμα NEXT_PUBLIC_ σημαίνει ότι επιτρέπεται να φύγει στον browser.',
      action: 'Σβήσ’ το από το Vercel — δεν το χρειάζεται κανένας κώδικας',
    })
  }

  // ── Ορισμένα στο Vercel αλλά αδιάβαστα από τον κώδικα
  const known = new Set(catalogue.map(s => s.key))
  for (const k of vercelKeys) {
    if (known.has(k.key) || isPublicNameHoldingSecret(k.key)) continue
    findings.push({
      key: k.key,
      severity: 'warn',
      title: 'Κανένας δεν το διαβάζει',
      detail: KNOWN_UNUSED[k.key] || 'Δεν βρέθηκε αναφορά στον κώδικα.',
      action: 'Αν δεν το θέλει άλλο σύστημα, σβήσ’ το',
    })
  }

  const rank: Record<AccessSeverity, number> = { down: 0, warn: 1, ok: 2 }
  return findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.key.localeCompare(b.key))
}

/** Η χειρότερη κατάσταση της ομάδας — ίδια γραμματική με το worstOf */
export function worstAccess(findings: AccessFinding[]): AccessSeverity {
  if (findings.some(f => f.severity === 'down')) return 'down'
  if (findings.some(f => f.severity === 'warn')) return 'warn'
  return 'ok'
}
