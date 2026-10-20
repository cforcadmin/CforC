import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import {
  campaignPageHtml, BLOCK_LABELS, BLOCK_VARIANTS, TOC_DEFAULT_TITLE,
  visibleBlocks, type Block,
} from '@/lib/campaignBlocks'
import { toPageSkin } from '@/lib/pageSkin'
import {
  CONTENT_TYPES, type ContentTypeKey, validateContent, articleHtmlFor, slugify, toStrapiFields,
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

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...(data !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
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
      return NextResponse.json({
        html: articleHtmlFor({
          title: String(body?.fields?.[t.titleField] || ''),
          blocks, headerStyle: body?.headerStyle, annotate: body?.annotate !== false,
        }),
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
            : `Η διαγραφή απέτυχε (HTTP ${r.status})`,
        }, { status: r.status })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'save') {
      const fields = (body?.fields && typeof body.fields === 'object') ? body.fields : {}
      const v = validateContent(key, fields, visibleBlocks(blocks))
      if (!v.ok) return NextResponse.json({ error: v.errors.join(' · '), errors: v.errors }, { status: 400 })

      const title = String(fields[t.titleField] || '').trim()
      const html = articleHtmlFor({ title, blocks, headerStyle: body?.headerStyle })
      const htmlEn = t.englishField && Array.isArray(body?.blocksEn) && body.blocksEn.length
        ? articleHtmlFor({ title: String(fields[t.engTitleField!] || title), blocks: body.blocksEn, headerStyle: body?.headerStyle })
        : null

      const record: Record<string, any> = {
        ...toStrapiFields(key, fields),
        [t.slugField]: String(fields[t.slugField] || '').trim() || slugify(title),
        Blocks: { blocks, ...(htmlEn ? { blocksEn: body.blocksEn } : {}), headerStyle: body?.headerStyle || 'none' },
        Html: html,
        ...(htmlEn ? { HtmlEn: htmlEn } : {}),
      }

      const id = String(body?.id || '').trim()
      const r = id
        ? await strapi(`/${t.path}/${encodeURIComponent(id)}`, 'PUT', record)
        : await strapi(`/${t.path}`, 'POST', { ...record, publishedAt: new Date().toISOString() })

      if (!r.ok) {
        return NextResponse.json({
          error: r.status === 403
            ? `Το διακριτικό του site δεν έχει δικαίωμα ${id ? 'update' : 'create'} στα «${t.label}» — Strapi Cloud → Settings → API Tokens`
            : `Η αποθήκευση απέτυχε (HTTP ${r.status})`,
        }, { status: r.status })
      }
      return NextResponse.json({ ok: true, id: r.json?.data?.documentId || id })
    }

    return NextResponse.json({ error: 'Μη έγκυρη ενέργεια' }, { status: 400 })
  } catch (err) {
    console.error('oc/content POST failed:', err)
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}
