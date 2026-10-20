import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import {
  campaignPageHtml, BLOCK_LABELS, BLOCK_VARIANTS, TOC_DEFAULT_TITLE,
  visibleBlocks, PICK_SCRIPT, type Block,
} from '@/lib/campaignBlocks'
import { toPageSkin } from '@/lib/pageSkin'
import {
  CONTENT_TYPES, type ContentTypeKey, type ContentType, validateContent, articleHtmlFor,
  pageChromeHtml, contentRecord,
} from '@/lib/ocContent'

export const maxDuration = 60

/**
 * ΤΟ ΠΕΡΙΕΧΟΜΕΝΟ ΤΟΥ SITE, ΑΠΟ ΤΟ OC — Νέα, Έργα, Καταχωρήσεις.
 *
 * Μέχρι σήμερα γράφονταν απευθείας στο Strapi. Εδώ συντίθενται με τα ΙΔΙΑ
 * μπλοκ που φτιάχνουν το newsletter, ώστε ένα άρθρο να μοιάζει με το γράμμα
 * που το ανήγγειλε — και να γράφεται από ανθρώπους που δεν θέλουν να μάθουν
 * το Strapi.
 *
 * ΤΙ ΑΠΟΘΗΚΕΥΕΤΑΙ ΚΑΙ ΓΙΑΤΙ ΤΡΙΑ ΠΕΔΙΑ, ΟΧΙ ΕΝΑ:
 *  · Blocks  — η πηγή. Χωρίς αυτήν το άρθρο δεν ξανανοίγει για διόρθωση,
 *              όπως ακριβώς δεν ξανανοίγει ένα σταλμένο newsletter.
 *  · Html    — το αποτέλεσμα, έτοιμο για τη σελίδα.
 *  · Excerpt — η περίληψη. ΔΕΝ είναι διακόσμηση: σήμερα η πίσω όψη της
 *              κάρτας, η περιγραφή στο Google και η αναζήτηση βγαίνουν με
 *              extractTextFromBlocks από το Description. Μόλις το κείμενο
 *              γίνει HTML, και οι τρεις αδειάζουν σιωπηλά χωρίς αυτό.
 *
 * ΚΟΣΤΟΣ ΣΕ ΚΛΗΣΕΙΣ STRAPI: το λεξιλόγιο των μπλοκ είναι σταθερές — μηδέν
 * κλήσεις. Άνοιγμα καρτέλας = 1 (η λίστα), άνοιγμα άρθρου = 1, αποθήκευση = 1.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

/**
 * ΤΟ ΔΙΚΤΥΟ ΠΟΥ ΔΕΝ ΑΠΑΝΤΗΣΕ ΔΕΝ ΕΙΝΑΙ ΤΟ ΙΔΙΟ ΜΕ ΤΟ STRAPI ΠΟΥ ΕΙΠΕ ΟΧΙ.
 *
 * 20/10/2026: η δημοσίευση έσκασε με `ECONNRESET` στο διάβασμα — η σύνδεση
 * πέθανε πριν προλάβει να φτάσει το αίτημα. Μετρημένο: τίποτα δεν γράφτηκε
 * στο Strapi, και δώδεκα αμέσως επόμενες εγγραφές πέρασαν καθαρά. Είναι
 * παλιωμένη πρίζα της δεξαμενής συνδέσεων, όχι μέγεθος και όχι δεδομένα: οι
 * προεπισκοπήσεις δεν αγγίζουν το Strapi, οπότε η σύνδεση κάθεται αδρανής
 * όσο γράφει ο συντάκτης και σπάει ακριβώς στην πρώτη αποθήκευση.
 *
 * Στην οθόνη έβγαινε «Εσωτερικό σφάλμα» — το χειρότερο δυνατό μήνυμα, γιατί
 * στέλνει τον συντάκτη να ψάξει το κείμενό του για το λάθος.
 */
class StrapiUnreachable extends Error {
  constructor(readonly cause?: unknown) { super('Το Strapi δεν απάντησε') }
}

const isTransportFailure = (err: any): boolean =>
  err instanceof TypeError || !!err?.cause?.code

async function strapiOnce(path: string, method: string, data?: any) {
  let res: Response
  try {
    res = await fetch(`${STRAPI_URL}/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        ...(data !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(data !== undefined && { body: JSON.stringify({ data }) }),
      cache: 'no-store',
    })
  } catch (err) {
    if (isTransportFailure(err)) throw new StrapiUnreachable(err)
    throw err
  }
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

/**
 * Το POST ΔΕΝ ξαναστέλνεται στα τυφλά: μια αποτυχία στο διάβασμα δεν λέει αν
 * το Strapi πρόλαβε να γράψει, και μια τυφλή επανάληψη φτιάχνει δεύτερο
 * άρθρο. Η δεύτερη ευκαιρία του ζητιέται στο `save`, αφού ρωτηθεί πρώτα αν
 * η εγγραφή υπάρχει. Τα υπόλοιπα είναι ακίνδυνα να επαναληφθούν.
 */
async function strapi(path: string, method: string = 'GET', data?: any) {
  /* Τρεις προσπάθειες, όχι δύο: μετρήθηκαν ΔΥΟ διαδοχικές αστοχίες σε ριπή. */
  for (let i = 0; ; i++) {
    try {
      return await strapiOnce(path, method, data)
    } catch (err) {
      if (!(err instanceof StrapiUnreachable) || method === 'POST' || i >= 2) throw err
      await new Promise(r => setTimeout(r, 250 * (i + 1)))
    }
  }
}

/**
 * ΤΟ STRAPI ΞΕΡΕΙ ΠΟΙΟ ΠΕΔΙΟ ΦΤΑΙΕΙ — ΑΠΛΩΣ ΔΕΝ ΤΟΝ ΡΩΤΑΓΕ ΚΑΝΕΙΣ.
 *
 * Η οθόνη έδειχνε «Η αποθήκευση απέτυχε (HTTP 400)» και η απάντηση έλεγε
 * «Description must be defined» — ένα υποχρεωτικό πεδίο που ο συνθέτης δεν
 * στέλνει. Ένα σφάλμα που δεν λέει τι φταίει στέλνει τον συντάκτη σε εμένα·
 * ένα που το λέει, τον στέλνει στο πεδίο.
 */
const detailOf = (json: any): string => {
  const d = strapiError(json)
  return d ? ` — ${d}` : ''
}

function strapiError(json: any): string {
  const e = json?.error
  if (!e) return ''
  const list = Array.isArray(e?.details?.errors) ? e.details.errors : []
  const parts = list.map((x: any) => {
    const path = Array.isArray(x?.path) ? x.path.join('.') : String(x?.path || '')
    return [path, x?.message].filter(Boolean).join(': ')
  }).filter(Boolean)
  return (parts.length ? parts.join(' · ') : String(e.message || '')).slice(0, 300)
}

/**
 * Ποιος ΓΡΑΦΕΙ περιεχόμενο: Επικοινωνία, Media, Γραμματεία, IT.
 *
 * Το φράγμα μπαίνει στο γράψιμο, όχι στην ανάγνωση: όλο το ΔΣ βλέπει τι
 * υπάρχει, αλλά ένα άρθρο είναι ΔΗΜΟΣΙΑ σελίδα — δημοσιεύεται στο όνομα του
 * δικτύου και δεν χρειάζεται να μπορεί να το αλλάξει όποιος έχει πρόσβαση.
 */
export const CONTENT_WRITER_SEATS: OcSeat[] = ['comms', 'media', 'admin', 'it']

async function authorize(write: boolean) {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }

  const seatCookie = store.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat = effectiveSeat(
    access.seats as OcSeat[], seatCookie, store.get(OC_SEAT_MODE_COOKIE)?.value)

  if (write && (!activeSeat || !CONTENT_WRITER_SEATS.includes(activeSeat))) {
    return { error: NextResponse.json(
      { error: 'Το περιεχόμενο του site το γράφουν η Επικοινωνία, το Media, η Γραμματεία και το IT' },
      { status: 403 }) }
  }
  return { memberId: decoded.memberId, activeSeat }
}

/**
 * Η ΔΕΥΤΕΡΗ ΕΥΚΑΙΡΙΑ ΤΗΣ ΔΗΜΙΟΥΡΓΙΑΣ, ΜΕ ΜΑΡΤΥΡΑ.
 *
 * Όταν η σύνδεση πεθάνει στο διάβασμα, δεν ξέρουμε αν το Strapi πρόλαβε να
 * γράψει· μια τυφλή επανάληψη φτιάχνει δεύτερο άρθρο που μόνο άνθρωπος θα
 * προσέξει. Ρωτάμε πρώτα: υπάρχει ήδη εγγραφή με αυτό το slug;
 *
 *  · Υπάρχει → το πρώτο αίτημα ΕΙΧΕ περάσει. Επιτυχία, μία φορά.
 *  · Δεν υπάρχει → δεν έφτασε ποτέ. Ξαναστέλνεται με ήσυχη συνείδηση.
 *
 * Αν ΚΑΙ η ερώτηση πέσει, δεν ξαναστέλνεται τίποτα: άγνωστη κατάσταση
 * λέγεται, δεν μαντεύεται.
 */
async function createWithWitness(t: ContentType, record: Record<string, any>) {
  try {
    return await strapiOnce(`/${t.path}`, 'POST', record)
  } catch (err) {
    if (!(err instanceof StrapiUnreachable)) throw err

    const slug = String(record[t.slugField] || '')
    const found = slug ? await landedAlready(t, slug) : null
    if (found === true) return { ok: true, status: 200, json: { data: null } }
    if (found === null) throw err   // δεν απαντά ούτε στην ερώτηση — σταματάμε

    await new Promise(r => setTimeout(r, 400))
    try {
      return await strapiOnce(`/${t.path}`, 'POST', record)
    } catch (again) {
      /* Δεύτερη αστοχία στη ΣΕΙΡΑ — μετρήθηκε ότι συμβαίνει. Δεν ξαναρωτάμε
         και δεν ξαναστέλνουμε: ο μάρτυρας είπε «δεν υπάρχει» ΠΡΙΝ από αυτή
         την προσπάθεια, άρα τώρα η κατάσταση είναι ξανά άγνωστη. */
      throw again
    }
  }
}

/** true = υπάρχει · false = δεν υπάρχει · null = δεν μπορέσαμε να δούμε */
async function landedAlready(t: ContentType, slug: string): Promise<boolean | null> {
  try {
    const r = await strapi(
      `/${t.path}?filters[${t.slugField}][$eq]=${encodeURIComponent(slug)}`
      + `&fields[0]=${t.slugField}&pagination[limit]=1&status=draft`)
    if (!r.ok || !Array.isArray(r.json?.data)) return null
    return r.json.data.length > 0
  } catch { return null }
}

const typeOf = (v: unknown): ContentTypeKey | null =>
  typeof v === 'string' && v in CONTENT_TYPES ? v as ContentTypeKey : null

/** Το λεξιλόγιο του συνθέτη — σταθερές, καμία κλήση στο Strapi */
function composerMeta() {
  return {
    blockLabels: BLOCK_LABELS,
    blockVariants: BLOCK_VARIANTS,
    /* Τα σχέδια των email δεν ταιριάζουν σε άρθρο: μιλούν σε παραλήπτη. */
    presets: [],
    /* Οι ετικέτες του Sender ({{ firstname }}) είναι ΚΕΝΕΣ σε σελίδα —
       δεν τις γεμίζει κανείς, θα φαίνονταν αυτούσιες. */
    mergeFields: [],
    tocDefaultTitle: TOC_DEFAULT_TITLE,
    types: Object.entries(CONTENT_TYPES).map(([key, t]) => ({
      key, label: t.label, singular: t.singular, fields: t.fields,
    })),
  }
}

export async function GET(request: NextRequest) {
  const denied = await authorize(false)
  if ('error' in denied) return denied.error

  const { searchParams } = new URL(request.url)
  const key = typeOf(searchParams.get('type'))
  if (!key) return NextResponse.json({ meta: composerMeta() })

  const t = CONTENT_TYPES[key]
  const id = String(searchParams.get('id') || '').trim()

  /* ΕΝΑ στοιχείο: ολόκληρο, με τα μπλοκ του, για άνοιγμα στον συνθέτη */
  if (id) {
    const r = await strapi(`/${t.path}/${encodeURIComponent(id)}?populate=*`)
    if (!r.ok) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: r.status })
    return NextResponse.json({ item: r.json?.data ?? null })
  }

  /* Η ΛΙΣΤΑ: χωρίς Html και χωρίς Blocks — είναι δεκάδες KB το καθένα και
     κανείς δεν τα διαβάζει σε λίστα. */
  const fields = t.listFields.map((f, i) => `fields[${i}]=${encodeURIComponent(f)}`).join('&')
  const r = await strapi(`/${t.path}?${fields}&sort=${t.sort}&pagination[limit]=200&status=draft`)
  if (!r.ok) return NextResponse.json({ error: 'Αποτυχία ανάγνωσης' }, { status: r.status })

  return NextResponse.json({
    meta: composerMeta(),
    items: (r.json?.data || []).map((x: any) => ({ ...x, hasBlocks: undefined })),
  })
}

export async function POST(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const action = String(body?.action || '')
    const key = typeOf(body?.type)
    if (!key) return NextResponse.json({ error: 'Άγνωστο είδος περιεχομένου' }, { status: 400 })
    const t = CONTENT_TYPES[key]
    const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []

    /**
     * ΠΡΟΕΠΙΣΚΟΠΗΣΗ: αποδίδεται ΕΔΩ, με τον ίδιο κώδικα που θα γράψει και την
     * αποθήκευση. Αν γινόταν στον browser με δεύτερη υλοποίηση, θα ξανάρχιζε
     * το «η προεπισκόπηση δείχνει άλλο από το δημοσιευμένο».
     */
    if (action === 'preview') {
      const article = articleHtmlFor({
        title: String(body?.fields?.[t.titleField] || ''),
        blocks, headerStyle: body?.headerStyle, annotate: body?.annotate !== false,
      })
      /* Με την κορυφή της σελίδας: τίτλος και πλακίδια. Χωρίς αυτά η
         προεπισκόπηση δείχνει ένα άρθρο που αιωρείται, και δεν απαντά στην
         ερώτηση «πώς θα φαίνεται». */
      const chrome = body?.chrome === false
        ? '' : pageChromeHtml(key, body?.fields || {})
      return NextResponse.json({
        html: previewDocument(chrome + article, body?.theme === 'dark'),
      })
    }

    if (action === 'delete') {
      const id = String(body?.id || '').trim()
      if (!id) return NextResponse.json({ error: 'Λείπει το αναγνωριστικό' }, { status: 400 })
      const r = await strapi(`/${t.path}/${encodeURIComponent(id)}`, 'DELETE')
      if (!r.ok) {
        /* Το διακριτικό ΔΕΝ έχει δικαίωμα delete (επιβεβαιωμένο) — το λέμε
           καθαρά αντί για «αποτυχία», ώστε να μη ψάχνει κανείς αλλού. */
        return NextResponse.json({
          error: r.status === 403
            ? 'Η διαγραφή γίνεται μόνο από το Strapi — το διακριτικό του site δεν τη δικαιούται'
            : `Η διαγραφή απέτυχε (HTTP ${r.status})${detailOf(r.json)}`,
        }, { status: r.status })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'save') {
      const fields = (body?.fields && typeof body.fields === 'object') ? body.fields : {}
      const v = validateContent(key, fields, visibleBlocks(blocks))
      if (!v.ok) return NextResponse.json({ error: v.errors.join(' · '), errors: v.errors }, { status: 400 })

      const id = String(body?.id || '').trim()
      const record = contentRecord({
        key, fields, blocks,
        blocksEn: Array.isArray(body?.blocksEn) ? body.blocksEn : undefined,
        headerStyle: body?.headerStyle,
        isNew: !id,
      })

      const r = id
        ? await strapi(`/${t.path}/${encodeURIComponent(id)}`, 'PUT', record)
        : await createWithWitness(t, { ...record, publishedAt: new Date().toISOString() })

      if (!r.ok) {
        return NextResponse.json({
          error: r.status === 403
            ? `Το διακριτικό του site δεν έχει δικαίωμα ${id ? 'update' : 'create'} στα «${t.label}» — Strapi Cloud → Settings → API Tokens`
            : `Η αποθήκευση απέτυχε (HTTP ${r.status})${detailOf(r.json)}`,
        }, { status: r.status })
      }
      return NextResponse.json({ ok: true, id: r.json?.data?.documentId || id })
    }

    return NextResponse.json({ error: 'Μη έγκυρη ενέργεια' }, { status: 400 })
  } catch (err) {
    console.error('oc/content POST failed:', err)
    /* «Εσωτερικό σφάλμα» για αποτυχία δικτύου στέλνει τον συντάκτη να ψάξει
       το κείμενό του. Το πρόβλημα δεν είναι δικό του — και δεν χάθηκε
       τίποτα, γιατί το αίτημα δεν έφτασε ποτέ. */
    if (err instanceof StrapiUnreachable) {
      return NextResponse.json({
        error: 'Το Strapi δεν απάντησε — τίποτα δεν αποθηκεύτηκε και τίποτα δεν χάθηκε. '
          + 'Ξαναπάτησε Δημοσίευση σε λίγο.',
      }, { status: 503 })
    }
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}

/**
 * ΤΟ ΠΛΑΙΣΙΟ ΤΗΣ ΠΡΟΕΠΙΣΚΟΠΗΣΗΣ ΕΙΝΑΙ ΑΛΛΟ ΕΓΓΡΑΦΟ.
 *
 * Δεν βλέπει το globals.css ούτε την κλάση `.dark` του OC, οπότε οι
 * μεταβλητές θέματος έπεφταν στις εφεδρείες τους — δηλαδή ΠΑΝΤΑ στα χρώματα
 * του email. Σε σκοτεινό OC η προεπισκόπηση έβγαινε κατάλευκη και δεν
 * απαντούσε στην ερώτηση «πώς θα φαίνεται».
 *
 * Οι τιμές είναι ΟΙ ΙΔΙΕΣ με το .cfc-article στο globals.css. Αν αλλάξουν
 * εκεί, αλλάζουν κι εδώ — είναι το τίμημα του ξεχωριστού εγγράφου.
 */
function previewDocument(inner: string, dark: boolean): string {
  const tokens = dark
    ? `--cfc-surface:#1F2937;--cfc-tint:#273243;--cfc-ink:#F3F4F6;--cfc-ink-soft:#B6BCC4;`
      + `--cfc-ink-muted:#949BA4;--cfc-line:#374151;--cfc-hairline:#3A4049;`
      + `--cfc-invert-bg:#F3F4F6;--cfc-invert-fg:#111827;`
    : `--cfc-surface:#FFFFFF;--cfc-tint:#F5F0EB;--cfc-ink:#2D2D2D;--cfc-ink-soft:#5A5A5A;`
      + `--cfc-ink-muted:#8A8A8A;--cfc-line:#E5E7EB;--cfc-hairline:#E0D8D0;`
      + `--cfc-invert-bg:#2D2D2D;--cfc-invert-fg:#FFFFFF;`
  /* ΤΟ ΣΕΝΑΡΙΟ ΕΠΙΛΟΓΗΣ ΖΕΙ ΣΤΟ ΕΓΓΡΑΦΟ, ΟΧΙ ΣΤΑ ΜΠΛΟΚ.
     Τα μπλοκ παίρνουν σημάδια από το renderCampaignBody, αλλά αυτό που
     στέλνει το μήνυμα «πατήθηκε το 3ο» στο OC είναι το σενάριο — και το
     πρόσθετε μόνο το campaignEmailHtml. Χωρίς αυτό, το κλικ στην
     προεπισκόπηση δεν έκανε απολύτως τίποτα. */
  return `<!DOCTYPE html><html lang="el"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{${tokens}}
  body{margin:0;background-color:${dark ? '#111827' : '#F5F0EB'};}
  img{max-width:100%;height:auto;}
  @media only screen and (max-width:663px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
    .stack{display:block !important;width:100% !important;}
  }
</style></head><body>${inner}${PICK_SCRIPT}</body></html>`
}
