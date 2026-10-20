import { campaignEmailHtml, type Block, type FooterStyle, type FooterLook, type HeaderStyle } from '@/lib/campaignBlocks'
import { PUBLIC_SITE_URL } from '@/lib/siteUrl'
import { getSenderCampaignStats } from '@/lib/senderCampaigns'

/**
 * ΤΟ ΤΕΥΧΟΣ ΣΤΟ ΑΡΧΕΙΟ ΤΟΥ ΙΣΤΟΤΟΠΟΥ.
 *
 * ΤΙ ΠΗΓΕ ΣΤΡΑΒΑ (βρέθηκε 20/10/2026): η αρχειοθέτηση υπήρχε, αλλά το
 * διακριτικό δεν είχε δικαίωμα `create` στα newsletters. Τεύχη έφυγαν και
 * κανένα δεν μπήκε στο αρχείο — η αποτυχία φαινόταν ΜΟΝΟ ως ένα
 * `archived: false` στην απάντηση, που κανείς δεν κοιτάζει μετά από μια
 * επιτυχημένη αποστολή.
 *
 * ΓΙ' ΑΥΤΟ ΕΔΩ ΥΠΑΡΧΟΥΝ ΔΥΟ ΔΙΑΔΡΟΜΕΣ, ΟΧΙ ΜΙΑ:
 *
 *  · «γράψε τώρα» — τη στιγμή της αποστολής, όσο ξέρουμε ακόμη τα μπλοκ.
 *  · ΣΥΜΦΙΛΙΩΣΗ — ό,τι στάλθηκε και λείπει μπαίνει στην επόμενη ημερήσια
 *    εκτέλεση του cron. Έτσι μια στιγμιαία άρνηση (άδεια, δίκτυο, όριο) δεν
 *    κοστίζει ένα τεύχος για πάντα, και τα ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΑ τεύχη — που
 *    φεύγουν από τον Sender ώρες αργότερα, χωρίς να περάσουν ποτέ από τη
 *    διαδρομή αποστολής — μπαίνουν κι αυτά.
 *
 * Η ΤΑΥΤΟΤΗΤΑ ΕΙΝΑΙ ΤΙΤΛΟΣ+ΗΜΕΡΟΜΗΝΙΑ, ΟΧΙ SLUG. Τα τεύχη που μπήκαν με το
 * χέρι δεν ακολουθούν τον τύπο του slug (το τεύχος Οκτωβρίου είναι
 * `ta-nea-toy-diktyoy-oktovrios-2026`, χωρίς κατάληξη). Έλεγχος με slug θα
 * τα θεωρούσε απόντα και θα έγραφε ΔΙΠΛΑ.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const TOKEN = process.env.STRAPI_API_TOKEN

/**
 * ΤΙΠΟΤΑ ΕΔΩ ΔΕΝ ΠΕΤΑΕΙ — ΠΟΤΕ.
 *
 * Η αρχειοθέτηση τρέχει ΜΕΣΑ στη διαδρομή αποστολής, και μάλιστα ΜΕΤΑ που το
 * γράμμα έχει φύγει στα 115 μέλη. Μια εξαίρεση εδώ — πεσμένο δίκτυο, κενή
 * απάντηση, τίποτα — θα γύριζε 500 σε μια αποστολή που ΠΕΤΥΧΕ, και ο
 * επόμενος άνθρωπος θα πάταγε «Αποστολή» δεύτερη φορά στους ίδιους
 * παραλήπτες. Άρα κάθε αστοχία γίνεται `ok: false`, ποτέ throw.
 */
async function api(path: string, method = 'GET', data?: unknown) {
  try {
    const res = await fetch(`${STRAPI_URL}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      ...(data !== undefined && { body: JSON.stringify({ data }) }),
      cache: 'no-store',
    })
    if (!res || typeof res.ok !== 'boolean') return { ok: false, status: 0, json: null }
    let json: any = null
    try { json = await res.json() } catch { /* 204 ή κενό σώμα */ }
    return { ok: res.ok, status: res.status, json }
  } catch (err) {
    console.error('newsletterArchive: η κλήση απέτυχε —', (err as Error)?.message)
    return { ok: false, status: 0, json: null }
  }
}

/** Ελληνικά → λατινικά: ένα ελληνικό slug γίνεται «%CF%84%CE%B1…» μόλις κολληθεί κάπου */
const GREEKLISH: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'h', ψ: 'ps', ω: 'o',
}

/**
 * Το slug από το θέμα, ΧΩΡΙΣ χρονοσφραγίδα.
 *
 * Το παλιό `newsletterSlug` κόλλαγε `Date.now().toString(36)` και κρατούσε
 * ελληνικά: `τα-νέα-του-δικτύου-mh3k9x2`. Μη αναγνώσιμο στη γραμμή
 * διευθύνσεων και αδύνατο να υπολογιστεί δεύτερη φορά — άρα η συμφιλίωση
 * δεν θα μπορούσε ποτέ να βρει τι λείπει.
 */
export function newsletterSlugFor(subject: string): string {
  /**
   * Η ΣΕΙΡΑ ΕΙΝΑΙ ΤΟ ΠΑΝ: πρώτα φεύγουν οι τόνοι, μετά γίνεται η μεταγραφή.
   *
   * Αντίστροφα, το «Τεύχος Οκτωβρίου» έβγαινε «te-hos-oktovr-oy»: το
   * τονισμένο «ύ» δεν είναι το «υ» του πίνακα, οπότε δεν μεταγραφόταν, και ο
   * τελικός καθαρισμός το έκανε παύλα.
   */
  const base = String(subject || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split('').map(ch => GREEKLISH[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60).replace(/-+$/, '')
  return base || 'newsletter'
}

/**
 * ΣΕ ΠΟΙΟΥΣ ΑΠΕΥΘΥΝΕΤΑΙ. Αν στις λίστες υπάρχουν ΚΑΘΟΛΟΥ μέλη, το τεύχος
 * είναι εσωτερικό. Ο παλιός έλεγχος ζητούσε να είναι η ΜΟΝΗ λίστα
 * (`length === 1 && [0] === 'paid'`), οπότε ένα τεύχος προς «μέλη ΚΑΙ
 * εξωτερικούς» γινόταν δημόσιο: αναγνώσιμο χωρίς σύνδεση και ευρετηριάσιμο.
 */
export const audienceFor = (groups: unknown): 'members' | 'public' =>
  Array.isArray(groups) && groups.includes('paid') ? 'members' : 'public'

/** Το εξώφυλλο: η πρώτη εικόνα του ίδιου του τεύχους, αν έχει αναγνωριστικό */
export function coverIdFor(blocks: unknown): number | null {
  if (!Array.isArray(blocks)) return null
  for (const b of blocks as any[]) {
    if (b?.hidden) continue
    const kind = b?.type
    if ((kind === 'masthead' || kind === 'image' || kind === 'imageText')
      && Number.isInteger(b?.mediaId)) return b.mediaId as number
  }
  return null
}

/**
 * Το HTML της ΣΕΛΙΔΑΣ — όχι του γράμματος.
 *
 * Διαφέρει σε ένα πράγμα: καμία γραμμή απεγγραφής. Στο email τις ετικέτες
 * `{{unsubscribe_link}}` τις γεμίζει ο Sender ανά παραλήπτη· σε μια σελίδα
 * θα έμεναν ορατές αυτούσιες. (Το αρχειοθετημένο HTML μέχρι σήμερα ήταν
 * ακριβώς το tagged γράμμα, με αυτό το σφάλμα μέσα.)
 */
export function archiveHtmlFor(c: any, slug: string): string {
  const { html } = campaignEmailHtml({
    subject: String(c.Subject || ''),
    preheader: c.Preheader || undefined,
    blocks: (Array.isArray(c.Blocks) ? c.Blocks : []) as Block[],
    signer: c.Signer || undefined,
    footerStyle: (c.FooterStyle || 'signature') as FooterStyle,
    footerLook: (c.FooterLook || 'plain') as FooterLook,
    footerLogo: !!c.FooterLogo,
    headerStyle: (c.HeaderStyle || 'coral') as HeaderStyle,
    headerLogo: !!c.HeaderLogo,
    newsletterFooter: c.Footer ?? null,
    unsubscribe: false,
    omitUnsubscribe: true,
  })
  return html.replace(/\{\{ARCHIVE_URL\}\}/g, `${PUBLIC_SITE_URL}/newsletters/${slug}`)
}

export interface ArchiveEntry { Title: string; Date: string; Slug: string }
export interface ArchiveResult {
  ok: boolean
  /** true όταν το τεύχος ήταν ΗΔΗ στο αρχείο — δεν γράφτηκε δεύτερο */
  existed?: boolean
  slug?: string
  documentId?: string
  error?: string
}

/** Η ημερομηνία αποστολής του τεύχους, όπως θα φαίνεται στο αρχείο */
export const sentDateOf = (c: any): string =>
  String(c?.CompletedAt || c?.QueuedAt || c?.createdAt || new Date().toISOString()).slice(0, 10)

/** Τα τεύχη του αρχείου των τελευταίων ημερών — μία κλήση, για σύγκριση στη μνήμη */
export async function recentArchiveEntries(days = 45): Promise<ArchiveEntry[] | null> {
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const r = await api(`/newsletters?filters[Date][$gte]=${since}`
    + `&fields[0]=Title&fields[1]=Date&fields[2]=Slug&pagination[limit]=100`)
  /**
   * Απάντηση που ΔΕΝ είναι λίστα σημαίνει «δεν διάβασα», όχι «άδειο αρχείο».
   * Η διαφορά είναι κρίσιμη: το «άδειο» θα έγραφε ΔΕΥΤΕΡΟ αντίγραφο ενός
   * τεύχους που υπάρχει ήδη.
   */
  if (!r.ok || !Array.isArray(r.json?.data)) return null
  return r.json.data.map((n: any) => ({
    Title: String(n?.Title || ''), Date: String(n?.Date || ''), Slug: String(n?.Slug || ''),
  }))
}

/**
 * Μοναδικό slug: αν το βασικό είναι πιασμένο από ΑΛΛΟ τεύχος, μπαίνει ο
 * μήνας, και αν και αυτό, η μέρα.
 *
 * Η διαδρομή αποστολής το καλεί ΜΟΝΗ της: ο σύνδεσμος «δες το στον browser»
 * μπαίνει μέσα στο γράμμα, άρα το slug πρέπει να έχει κλειδώσει πριν
 * αποδοθεί το HTML.
 */
export function resolveArchiveSlug(title: string, date: string, entries: ArchiveEntry[]): string {
  const base = newsletterSlugFor(title)
  const taken = new Set(entries.map(e => e.Slug))
  if (!taken.has(base)) return base
  const withMonth = `${base}-${date.slice(0, 7)}`
  if (!taken.has(withMonth)) return withMonth
  return `${base}-${date}`
}

/**
 * Γράφει ένα τεύχος στο αρχείο — ή διαπιστώνει ότι υπάρχει ήδη.
 *
 * `known` είναι τα τεύχη που έχουν ήδη διαβαστεί (η συμφιλίωση τα φέρνει
 * ΜΙΑ φορά για όλα). Χωρίς αυτό, κάνει τη δική του ανάγνωση.
 */
export async function archiveCampaign(
  c: any,
  opts: {
    /** Τα τεύχη που έχουν ήδη διαβαστεί — η συμφιλίωση τα φέρνει ΜΙΑ φορά για όλα */
    known?: ArchiveEntry[]
    /**
     * Το slug που ΗΔΗ μπήκε στο γράμμα ως «δες το στον browser».
     *
     * Στη διαδρομή αποστολής το slug πρέπει να υπάρχει ΠΡΙΝ αποδοθεί το HTML,
     * αλλιώς ο σύνδεσμος του ίδιου του γράμματος οδηγεί σε 404. Άρα το
     * αποφασίζει εκείνη και το περνά εδώ — δεν ξαναϋπολογίζεται.
     */
    slug?: string
  } = {},
): Promise<ArchiveResult> {
  const title = String(c?.Subject || '').trim() || 'Τεύχος'
  const date = sentDateOf(c)

  const entries = opts.known ?? await recentArchiveEntries()
  if (!entries) return { ok: false, error: 'δεν διαβάστηκε το αρχείο τευχών' }

  const already = entries.find(e => e.Title.trim() === title && e.Date === date)
  if (already) return { ok: true, existed: true, slug: already.Slug }

  const slug = opts.slug || resolveArchiveSlug(title, date, entries)
  const cover = coverIdFor(c?.Blocks)

  let html: string
  try {
    html = archiveHtmlFor(c, slug)
  } catch (err) {
    return { ok: false, slug, error: `δεν αποδόθηκε το HTML — ${(err as Error)?.message}` }
  }

  const created = await api('/newsletters', 'POST', {
    Title: title,
    Date: date,
    Html: html,
    Audience: audienceFor(c?.Groups),
    Slug: slug,
    ...(cover ? { Image: cover } : {}),
    publishedAt: new Date().toISOString(),
  })
  if (!created.ok) {
    return {
      ok: false, slug,
      error: created.status === 403
        ? 'το διακριτικό δεν έχει δικαίωμα create στα newsletters'
        : `HTTP ${created.status}`,
    }
  }
  /* Η λίστα ενημερώνεται ώστε δύο τεύχη στην ΙΔΙΑ εκτέλεση να μη πάρουν ίδιο slug */
  entries.push({ Title: title, Date: date, Slug: slug })
  return { ok: true, existed: false, slug, documentId: created.json?.data?.documentId }
}

export interface ReconcileReport {
  checked: number
  created: string[]
  /** Τεύχη που βρέθηκαν σταλμένα στον Sender ενώ εδώ έγραφαν «σε αναμονή» */
  promoted: string[]
  failed: { subject: string; error: string }[]
}

/**
 * ΣΥΜΦΙΛΙΩΣΗ: ό,τι στάλθηκε και λείπει από το αρχείο, μπαίνει τώρα.
 *
 * ΓΙΑΤΙ ΔΕΝ ΑΡΚΕΙ ΤΟ `State = 'sent'`: ένα ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΟ τεύχος γράφεται
 * ως `queued` και ΚΑΝΕΙΣ δεν το προάγει ποτέ — η μόνη εγγραφή `State: 'sent'`
 * σε όλο το repo είναι το drain των μηνυμάτων, που δεν αγγίζει newsletters.
 * Φεύγει από τον Sender ώρες αργότερα και η εγγραφή μένει «σε αναμονή» για
 * πάντα. Φιλτράροντας στο `sent` η συμφιλίωση δεν θα το έβλεπε ΠΟΤΕ.
 *
 * ΜΑΡΤΥΡΑΣ ΕΙΝΑΙ Ο SENDER, ΟΧΙ ΤΟ ΡΟΛΟΪ. Δεν αρκεί «πέρασε η ώρα αποστολής»:
 * μια καμπάνια μπορεί να ακυρώθηκε ή να απέτυχε, και τότε θα δημοσιεύαμε
 * σελίδα για γράμμα που δεν έφυγε. Ρωτάμε τον Sender και θέλουμε
 * απεσταλμένα > 0 — ο ίδιος έλεγχος που κάνει το refreshSenderCounts.
 *
 * ΚΟΣΤΟΣ: 2 κλήσεις Strapi όταν δεν λείπει τίποτα (καμπάνιες + αρχείο), +1
 * ανά τεύχος που γράφεται, +1 ανά τεύχος που προάγεται. Οι κλήσεις στον
 * Sender δεν μετρούν στο όριο του Strapi. Μία εκτέλεση την ημέρα → ~60
 * κλήσεις τον μήνα.
 *
 * Κοιτάζει μόνο τις τελευταίες 45 ημέρες: ένα τεύχος που έφυγε πέρυσι και
 * δεν μπήκε δεν το θέλει κανείς να εμφανιστεί ξαφνικά σήμερα.
 */
/**
 * ΑΠΟ ΠΟΤΕ ΚΑΙ ΜΕΤΑ ΑΡΧΕΙΟΘΕΤΟΥΜΕ ΑΥΤΟΜΑΤΑ.
 *
 * Η συμφιλίωση ΔΕΝ σαρώνει αναδρομικά ό,τι στάλθηκε πριν υπάρξει αυτός ο
 * μηχανισμός. Στις 20/10/2026 οι τρεις σταλμένες καμπάνιες των τελευταίων 45
 * ημερών ήταν: το τεύχος Οκτωβρίου (12/10, μπήκε με το χέρι), ένα «Newsletter
 * #8» (16/10) και μια «Πρόσκληση & Info Note» για το Midterm (6/10). Η
 * τελευταία ΔΕΝ είναι τεύχος — είναι πρόσκληση που στάλθηκε με τον ίδιο
 * μηχανισμό. Μια αυτόματη σάρωση θα τη δημοσίευε ως «τεύχος του αρχείου».
 *
 * Ποια από τα παλιά αξίζουν σελίδα το κρίνει άνθρωπος. Από εδώ και μπρος, ο
 * μηχανισμός πιάνει ό,τι φεύγει.
 */
const AUTO_ARCHIVE_FROM = '2026-10-20'

export async function reconcileNewsletterArchives(limit = 10): Promise<ReconcileReport> {
  const out: ReconcileReport = { checked: 0, created: [], promoted: [], failed: [] }
  const window45 = new Date(Date.now() - 45 * 86400_000).toISOString()
  const since = window45 > AUTO_ARCHIVE_FROM ? window45 : `${AUTO_ARCHIVE_FROM}T00:00:00.000Z`

  const sent = await api('/oc-campaigns?filters[Kind][$eq]=newsletter'
    + '&filters[$or][0][State][$eq]=sent&filters[$or][1][State][$eq]=queued'
    + `&filters[createdAt][$gte]=${encodeURIComponent(since)}`
    + `&sort=createdAt:desc&pagination[limit]=${limit}`)
  if (!sent.ok) {
    out.failed.push({ subject: '(ανάγνωση καμπανιών)', error: `HTTP ${sent.status}` })
    return out
  }
  const campaigns: any[] = sent.json?.data || []
  if (!campaigns.length) return out

  const entries = await recentArchiveEntries()
  if (!entries) {
    out.failed.push({ subject: '(ανάγνωση αρχείου)', error: 'δεν διαβάστηκε το αρχείο' })
    return out
  }

  for (const c of campaigns) {
    const subject = String(c.Subject || '')

    /* Σε αναμονή: ρωτάμε τον Sender αν έφυγε. Αν όχι, το αφήνουμε ήσυχο — θα
       ξανακοιταχτεί αύριο. Δεν είναι σφάλμα, είναι «δεν ήρθε η ώρα». */
    if (c.State === 'queued') {
      if (!c.SenderCampaignId) continue
      const st = await getSenderCampaignStats(String(c.SenderCampaignId))
      if (!st || !(st.sent > 0)) continue
      const completed = st.sentAt || new Date().toISOString()
      const promoted = await api(`/oc-campaigns/${c.documentId}`, 'PUT', {
        State: 'sent', CompletedAt: completed,
        SentCount: st.sent, TotalCount: st.recipients || st.sent,
      })
      if (!promoted.ok) {
        out.failed.push({ subject, error: `δεν προήχθη σε «στάλθηκε» (HTTP ${promoted.status})` })
        continue
      }
      out.promoted.push(subject)
      c.CompletedAt = completed
    }

    out.checked += 1
    const r = await archiveCampaign(c, { known: entries })
    if (!r.ok) out.failed.push({ subject, error: r.error || 'άγνωστο' })
    else if (!r.existed) out.created.push(r.slug || '')
  }
  return out
}
