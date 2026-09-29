/**
 * Χάρτης δεδομένων — το αρχείο δραστηριοτήτων επεξεργασίας (GDPR, άρθρο 30).
 *
 * ΔΥΟ ΣΤΡΩΣΕΙΣ, ΕΠΙΤΗΔΕΣ:
 *
 *   1. Ο ΚΑΤΑΛΟΓΟΣ (`dataMapCatalog.json`) παράγεται από τα schema του Strapi.
 *      Μηχανικός, γενναιόδωρος, ανανεώνεται με μία εντολή. Πιάνει ό,τι ΥΠΑΡΧΕΙ.
 *
 *   2. Η ΚΡΙΣΗ (αυτό το αρχείο) είναι ανθρώπινη και δεν παράγεται ποτέ: σκοπός,
 *      νομική βάση, χρόνος διατήρησης, και ποια «ευρήματα» του ανιχνευτή δεν
 *      είναι τελικά προσωπικά δεδομένα.
 *
 * ΚΑΝΟΝΑΣ ΕΙΛΙΚΡΙΝΕΙΑΣ: ό,τι δεν έχει αποφασιστεί μένει `null` και εμφανίζεται
 * ως «εκκρεμεί απόφαση». ΔΕΝ γράφουμε εύλογες εικασίες για χρόνους διατήρησης —
 * ένα αρχείο άρθρου 30 γεμάτο επινοήσεις είναι χειρότερο από ένα με κενά, γιατί
 * τα κενά τουλάχιστον φαίνονται.
 */

import catalog from '@/lib/dataMapCatalog.json'

export interface CatalogField { name: string; type: string; personal: string | null }
export interface CatalogCollection {
  api: string
  plural: string
  displayName: string
  fields: CatalogField[]
  personalCount: number
}
export interface Catalog {
  generatedAt: string
  collections: CatalogCollection[]
}

export const CATALOG = catalog as Catalog

/** Οι τρίτοι που αγγίζουν δεδομένα. Καθένας από μεταβλητή που ήδη υπάρχει. */
export interface Processor {
  key: string
  name: string
  role: string
  region: string
}

export const PROCESSORS: Record<string, Processor> = {
  strapi: { key: 'strapi', name: 'Strapi Cloud', role: 'η κύρια βάση — εδώ ζει το μητρώο', region: 'ΕΕ' },
  vercel: { key: 'vercel', name: 'Vercel', role: 'εκτέλεση κώδικα· βλέπει ό,τι περνά από τις συναρτήσεις', region: 'ΗΠΑ/παγκόσμιο' },
  resend: { key: 'resend', name: 'Resend', role: 'συναλλακτικά email — διευθύνσεις και ονόματα παραληπτών', region: 'ΗΠΑ' },
  sender: { key: 'sender', name: 'Sender.net', role: 'newsletter — διευθύνσεις συνδρομητών', region: 'ΕΕ (Λιθουανία)' },
  drive: { key: 'drive', name: 'Google Drive', role: 'αρχείο παραστατικών και PDF', region: 'ΗΠΑ/ΕΕ' },
  sheets: { key: 'sheets', name: 'Google Sheets', role: 'ΕΣΟΔΑ-ΕΞΟΔΑ και Μητρώο — ποσά ανά μέλος', region: 'ΗΠΑ/ΕΕ' },
  calendar: { key: 'calendar', name: 'Google Calendar', role: 'συναντήσεις και συμμετέχοντες', region: 'ΗΠΑ/ΕΕ' },
}

export interface Annotation {
  /** Γιατί κρατάμε αυτά τα δεδομένα. `null` = δεν έχει καταγραφεί ακόμη. */
  purpose: string | null
  /** Πόσο. `null` = εκκρεμεί απόφαση του ΔΣ — ΔΕΝ το μαντεύουμε. */
  retention: string | null
  /** Άρθρο 6 ΓΚΠΔ. `null` = δεν έχει αποφασιστεί. */
  legalBasis: string | null
  processors: string[]
  /** Πεδία που ο ανιχνευτής σήμανε λάθος — μετά από ανθρώπινη ματιά */
  notPersonal?: string[]
  /** Ό,τι αξίζει να ξέρει όποιος διαβάσει τη γραμμή */
  note?: string
}

/**
 * Οι σημειώσεις ανά συλλογή.
 *
 * Όσα συμπληρώνονται εδώ είναι ΕΠΑΛΗΘΕΥΜΕΝΑ από τον κώδικα (διάρκειες token,
 * αυτόματες διαγραφές). Τα υπόλοιπα είναι πολιτική και ανήκουν στο ΔΣ.
 */
export const ANNOTATIONS: Record<string, Annotation> = {
  member: {
    purpose: 'Μητρώο μελών: συνδρομές, επικοινωνία, δημόσιο προφίλ στον κατάλογο',
    retention: null,
    legalBasis: 'Σύμβαση (καταστατικό) — άρθρο 6(1)(β)',
    processors: ['strapi', 'vercel', 'resend', 'sender', 'sheets'],
    note: 'Η πιο ευαίσθητη συλλογή: IBAN, ΑΦΜ, πατρώνυμο, κωδικός. Το `password` είναι hash (bcrypt), το `magicLinkToken` SHA256.',
  },
  'membership-application': {
    purpose: 'Αξιολόγηση αίτησης εγγραφής',
    retention: 'Διαγράφεται αυτόματα όταν η αίτηση λήξει χωρίς πληρωμή (cron payment-reminders), μαζί με τη φωτογραφία',
    legalBasis: 'Προσυμβατικά μέτρα — άρθρο 6(1)(β)',
    processors: ['strapi', 'vercel', 'resend'],
    note: 'Αν αποτύχει η διαγραφή της φωτογραφίας από τη Βιβλιοθήκη Πολυμέσων, ο κώδικας το αναφέρει για χειροκίνητη διαγραφή.',
  },
  'expense-claim': {
    purpose: 'Αποζημίωση εξόδων μελών και συνεργατών',
    retention: null,
    legalBasis: 'Έννομη υποχρέωση (φορολογική) — άρθρο 6(1)(γ)',
    processors: ['strapi', 'vercel', 'resend', 'drive', 'sheets'],
    note: 'Περιέχει IBAN και υπογραφή. Τα παραστατικά αρχειοθετούνται στο Drive.',
  },
  'oc-contract': {
    purpose: 'Μητρώο συμβάσεων με συνεργάτες',
    retention: null,
    legalBasis: 'Σύμβαση — άρθρο 6(1)(β)',
    processors: ['strapi', 'vercel', 'sheets'],
  },
  receipt: {
    purpose: 'Αποδείξεις συνδρομών και εσόδων',
    retention: null,
    legalBasis: 'Έννομη υποχρέωση (φορολογική) — άρθρο 6(1)(γ)',
    processors: ['strapi', 'vercel', 'drive'],
  },
  'auth-token': {
    purpose: 'Σύνδεση χωρίς κωδικό και συνεδρίες',
    retention: 'Magic link 6 ώρες · συνεδρία 30 ημέρες · newsletter 24 ώρες · πληρωμή 60 ημέρες · ερωτηματολόγιο αποχώρησης 90 ημέρες (lib/auth.ts)',
    legalBasis: 'Σύμβαση — άρθρο 6(1)(β)',
    processors: ['strapi', 'vercel'],
    note: 'Αποθηκεύονται μόνο hash (SHA256), ποτέ το ίδιο το token.',
  },
  'newsletter-subscriber': {
    purpose: 'Αποστολή newsletter',
    retention: null,
    legalBasis: 'Συγκατάθεση (double opt-in) — άρθρο 6(1)(α)',
    processors: ['strapi', 'vercel', 'sender'],
  },
  'profile-change-log': {
    purpose: 'Μηνιαία αναφορά αλλαγών προφίλ προς το ΔΣ',
    retention: null,
    legalBasis: 'Έννομο συμφέρον — άρθρο 6(1)(στ)',
    processors: ['strapi', 'vercel', 'resend'],
  },
  'exit-survey': {
    purpose: 'Λόγοι αποχώρησης μέλους',
    retention: null,
    legalBasis: 'Συγκατάθεση — άρθρο 6(1)(α)',
    processors: ['strapi', 'vercel'],
  },
  'event-attendance': {
    purpose: 'Παρουσίες σε εκδηλώσεις',
    retention: null,
    legalBasis: null,
    processors: ['strapi', 'vercel', 'calendar'],
  },
  'library-item': {
    purpose: 'Ανοιχτή βιβλιοθήκη υλικού',
    retention: null,
    legalBasis: 'Συγκατάθεση του υποβάλλοντος — άρθρο 6(1)(α)',
    processors: ['strapi', 'vercel', 'drive'],
  },
  'library-rejection': {
    purpose: 'Ιστορικό απορρίψεων υλικού',
    retention: null,
    legalBasis: null,
    processors: ['strapi', 'vercel'],
  },
  'coordination-team': {
    purpose: 'Η τρέχουσα Ομάδα Συντονισμού και οι έδρες της',
    retention: null,
    legalBasis: 'Έννομο συμφέρον — άρθρο 6(1)(στ)',
    processors: ['strapi', 'vercel'],
    notPersonal: ['Name', 'EngName', 'Image', 'ImageAltText'],
    note: 'Τα *Email είναι διευθύνσεις ΘΕΣΗΣ (finance@, it@…), όχι προσωπικές.',
  },
  expense: {
    purpose: 'Έξοδα προς προμηθευτές',
    retention: null,
    legalBasis: 'Έννομη υποχρέωση (φορολογική) — άρθρο 6(1)(γ)',
    processors: ['strapi', 'vercel', 'sheets', 'drive'],
    note: 'Αφορά κυρίως νομικά πρόσωπα· το ΑΦΜ ατομικής επιχείρησης παραμένει προσωπικό δεδομένο.',
  },
  'income-record': {
    purpose: 'Έσοδα και αντιστοίχιση καταθέσεων',
    retention: null,
    legalBasis: 'Έννομη υποχρέωση (φορολογική) — άρθρο 6(1)(γ)',
    processors: ['strapi', 'vercel', 'sheets'],
  },
  'payer-alias': { purpose: 'Αντιστοίχιση ονόματος κατάθεσης με μέλος', retention: null, legalBasis: 'Έννομο συμφέρον — άρθρο 6(1)(στ)', processors: ['strapi', 'vercel'] },
  'supplier-alias': { purpose: 'Αντιστοίχιση ονόματος προμηθευτή', retention: null, legalBasis: null, processors: ['strapi', 'vercel'], notPersonal: ['SupplierName'] },
  'oc-campaign': { purpose: 'Email και newsletter του OC', retention: null, legalBasis: 'Έννομο συμφέρον — άρθρο 6(1)(στ)', processors: ['strapi', 'vercel', 'resend', 'sender'], notPersonal: ['TemplateName'] },
  'treasury-balance': { purpose: 'Υπόλοιπα ταμείου', retention: null, legalBasis: null, processors: ['strapi', 'vercel'], notPersonal: ['Bank'] },
  activity: { purpose: 'Δράσεις — δημόσιο περιεχόμενο', retention: null, legalBasis: null, processors: ['strapi', 'vercel'], notPersonal: ['ImageAltText'], note: 'Τα Visuals μπορεί να δείχνουν πρόσωπα — εκεί ισχύει η συγκατάθεση φωτογράφησης.' },
  newsletter: { purpose: 'Αρχείο newsletter — δημόσιο', retention: null, legalBasis: null, processors: ['strapi', 'vercel'], notPersonal: ['Image'] },
  'open-call': { purpose: 'Ανοιχτές προσκλήσεις — δημόσιο', retention: null, legalBasis: null, processors: ['strapi', 'vercel'], notPersonal: ['Image', 'ImageAltText'] },
  project: { purpose: 'Έργα μελών — δημόσιο προφίλ', retention: null, legalBasis: 'Συγκατάθεση — άρθρο 6(1)(α)', processors: ['strapi', 'vercel'] },
  'project-entry': { purpose: 'Καταχωρίσεις έργων — δημόσιο', retention: null, legalBasis: 'Συγκατάθεση — άρθρο 6(1)(α)', processors: ['strapi', 'vercel'] },
  'working-group': { purpose: 'Ομάδες εργασίας — δημόσιο', retention: null, legalBasis: null, processors: ['strapi', 'vercel'], notPersonal: ['Name', 'EngName', 'Image', 'ImageAltText'] },
}

export interface MapRow {
  api: string
  displayName: string
  /** Τα πεδία που θεωρούνται προσωπικά ΜΕΤΑ την ανθρώπινη κρίση */
  personalFields: { name: string; kind: string }[]
  purpose: string | null
  retention: string | null
  legalBasis: string | null
  processors: Processor[]
  note?: string
  /** Τι λείπει από αυτή τη γραμμή για να είναι πλήρης κατά άρθρο 30 */
  missing: string[]
}

/** Ο χάρτης: κατάλογος + κρίση, μόνο οι συλλογές που κρατούν προσωπικά δεδομένα */
export function buildDataMap(): MapRow[] {
  const rows: MapRow[] = []
  for (const c of CATALOG.collections) {
    const a = ANNOTATIONS[c.api]
    const excluded = new Set(a?.notPersonal || [])
    const personalFields = c.fields
      .filter(f => f.personal && !excluded.has(f.name))
      .map(f => ({ name: f.name, kind: f.personal as string }))
    if (personalFields.length === 0) continue

    const missing: string[] = []
    if (!a) missing.push('καμία καταγραφή')
    else {
      if (!a.purpose) missing.push('σκοπός')
      if (!a.retention) missing.push('χρόνος διατήρησης')
      if (!a.legalBasis) missing.push('νομική βάση')
    }

    rows.push({
      api: c.api,
      displayName: c.displayName,
      personalFields,
      purpose: a?.purpose ?? null,
      retention: a?.retention ?? null,
      legalBasis: a?.legalBasis ?? null,
      processors: (a?.processors || []).map(k => PROCESSORS[k]).filter(Boolean),
      ...(a?.note ? { note: a.note } : {}),
      missing,
    })
  }
  return rows.sort((x, y) => y.personalFields.length - x.personalFields.length)
}

/**
 * Απόκλιση: πεδία που υπάρχουν στη ΖΩΝΤΑΝΗ βάση αλλά όχι στο στιγμιότυπο.
 *
 * Αυτό είναι που κάνει την υπόσχεση «ένα νέο πεδίο δεν ξεχνιέται» αληθινή.
 * Ένα στιγμιότυπο δεσμευμένο στο repo σαπίζει σιωπηλά· ο έλεγχος πρέπει να
 * ρωτά ΑΥΤΟ που τρέχει, όχι αυτό που γράψαμε κάποτε.
 */
export function findDrift(
  api: string,
  liveFieldNames: string[],
): { added: string[]; removed: string[] } {
  const c = CATALOG.collections.find(x => x.api === api)
  if (!c) return { added: liveFieldNames, removed: [] }
  const known = new Set(c.fields.map(f => f.name))
  const live = new Set(liveFieldNames)
  // Τα συστημικά πεδία του Strapi δεν είναι μέρος του schema μας
  const SYSTEM = new Set(['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale'])
  return {
    added: liveFieldNames.filter(f => !known.has(f) && !SYSTEM.has(f)),
    removed: [...known].filter(f => !live.has(f)),
  }
}

/** Σύνοψη για την κεφαλίδα του κουτιού */
export function summariseMap(rows: MapRow[]) {
  const fields = rows.reduce((n, r) => n + r.personalFields.length, 0)
  const incomplete = rows.filter(r => r.missing.length > 0)
  return { collections: rows.length, fields, incomplete: incomplete.length }
}
