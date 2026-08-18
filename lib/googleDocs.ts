import { getAccessToken, googleConfigured, SCOPES } from '@/lib/googleAuth'

/**
 * Ημερήσια διάταξη & πρακτικά — ανάγνωση από το Google Doc.
 *
 * Η δομή ΔΕΝ είναι επικεφαλίδες αλλά ΧΡΩΜΑΤΑ επισήμανσης, όπως τα γράφει
 * η ομάδα εδώ και δεκάδες συνεδριάσεις:
 *   κίτρινο  #FFFF00 → συνεδρίαση  «#42 ΔΣ πρακτικό 67 (Σεπτέμβρης)»
 *   κυανό    #00FFFF → θέμα ημερήσιας διάταξης, συχνά με (υπεύθυνο)
 * Το πράσινο χρησιμοποιείται ασυνεπώς (μεταφερόμενα θέματα, σημειώσεις
 * δράσης) οπότε ΔΕΝ το ερμηνεύουμε — θα λέγαμε ψέματα.
 *
 * Το πιο πρόσφατο είναι ΠΡΩΤΟ στο έγγραφο.
 */

export interface AgendaItem {
  title: string
  owner: string | null
}
export interface AgendaMeeting {
  label: string          // «#42 ΔΣ πρακτικό 67 (Σεπτέμβρης)»
  number: number | null  // 42
  minutes: number | null // 67
  when: string | null    // «Σεπτέμβρης» / «13 Ιουλίου»
  items: AgendaItem[]
}

const DOC_ID = process.env.GOOGLE_AGENDA_DOC_ID
  || '1FB5tjSpwbJMQuH_8fKSyhmh6ssEguHqxKx2OnbtHXwk'

export function agendaConfigured(): boolean {
  return googleConfigured() && !!DOC_ID
}

export function agendaDocUrl(): string {
  return `https://docs.google.com/document/d/${DOC_ID}/edit`
}

const isColour = (rgb: any, r: number, g: number, b: number) =>
  rgb
  && Math.round((rgb.red ?? 0) * 255) === r
  && Math.round((rgb.green ?? 0) * 255) === g
  && Math.round((rgb.blue ?? 0) * 255) === b

/** «Έγκριση εξόδων (Τσιαρβούλα)» ή «ENCC Forum-Καραμέρη» → υπεύθυνος */
function splitOwner(text: string): AgendaItem {
  const paren = /^(.*)\(([^()]{3,40})\)\s*$/.exec(text)
  if (paren && !/^\d/.test(paren[2])) {
    return { title: paren[1].trim().replace(/[-–—]\s*$/, '').trim(), owner: paren[2].trim() }
  }
  const dash = /^(.{6,})[-–—]\s*([Α-ΩΆΈΉΊΌΎΏα-ωάέήίόύώ]{4,20})\s*$/.exec(text)
  if (dash) return { title: dash[1].trim(), owner: dash[2].trim() }
  return { title: text, owner: null }
}

/**
 * fresh=true παρακάμπτει την προσωρινή αποθήκευση των 15'. Χρειάζεται όταν
 * κάποιος γράφει την ημερήσια διάταξη ΤΗΝ ΩΡΑ που την κοιτάει κάποιος
 * άλλος — η αναμονή τετάρτου εκεί είναι ενοχλητική.
 */
export async function fetchAgenda(limit = 3, fresh = false): Promise<{ meetings: AgendaMeeting[]; error?: string }> {
  if (!agendaConfigured()) return { meetings: [], error: 'unconfigured' }
  const token = await getAccessToken(SCOPES.documents)
  if (!token) return { meetings: [], error: 'auth' }

  try {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${DOC_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 900 } }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('googleDocs: agenda fetch failed', res.status, body.slice(0, 160))
      return { meetings: [], error: res.status === 403 ? 'forbidden' : 'unreachable' }
    }
    const doc: any = await res.json()
    const meetings: AgendaMeeting[] = []
    let current: AgendaMeeting | null = null

    for (const el of doc.body?.content || []) {
      const p = el.paragraph
      if (!p) continue
      const runs = p.elements || []
      const text = runs.map((e: any) => e.textRun?.content || '').join('').trim()
      if (!text) continue
      const bg = runs
        .map((e: any) => e.textRun?.textStyle?.backgroundColor?.color?.rgbColor)
        .find(Boolean)

      // Συνεδρίαση
      if (isColour(bg, 255, 255, 0) && /#\s*\d+\s*ΔΣ/.test(text)) {
        if (meetings.length >= limit) break
        const m = /#\s*(\d+)\s*ΔΣ[^\d]*(\d+)?\s*(?:\(([^)]+)\))?/.exec(text)
        current = {
          label: text.replace(/\s+/g, ' ').slice(0, 120),
          number: m?.[1] ? Number(m[1]) : null,
          minutes: m?.[2] ? Number(m[2]) : null,
          when: m?.[3]?.trim() || null,
          items: [],
        }
        meetings.push(current)
        continue
      }

      // Θέμα — μόνο μέσα σε συνεδρίαση, και όχι τεράστια μπλοκ κειμένου
      if (current && isColour(bg, 0, 255, 255)) {
        const clean = text.replace(/\s+/g, ' ').trim()
        if (clean.length < 4 || clean.length > 160) continue
        if (current.items.some(i => i.title === clean)) continue
        current.items.push(splitOwner(clean))
      }
    }
    return { meetings }
  } catch (err) {
    console.error('googleDocs: agenda threw:', err)
    return { meetings: [], error: 'unreachable' }
  }
}
