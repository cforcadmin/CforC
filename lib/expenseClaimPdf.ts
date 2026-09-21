import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'fs/promises'
import path from 'path'
import type { ClaimLine, TravelLeg } from '@/lib/expenseClaims'

/**
 * Το εξοδολόγιο σε PDF — ο αντικαταστάτης της φόρμας Word.
 *
 * Κρατά τη δομή του παλιού εντύπου (στοιχεία, τράπεζα, διαδρομή, ανάλυση
 * εξόδων, συνεπιβάτες, υπογραφή) με την τυπογραφία και την παλέτα της
 * απόδειξης είσπραξης, ώστε τα δύο έγγραφα να μοιάζουν αδέρφια.
 *
 * Η υπογραφή: αν το μέλος σχεδίασε, μπαίνει η εικόνα· σε κάθε περίπτωση
 * τυπώνεται η γραμμή «υποβλήθηκε ηλεκτρονικά από … στις …», που είναι και
 * η πραγματική απόδειξη ταυτότητας — η εικόνα είναι το έθιμο.
 */

const CORAL = rgb(1, 0.545, 0.416)
const INK = rgb(0.137, 0.122, 0.125)
const VALUE = rgb(0.263, 0.263, 0.263)
const MUTED = rgb(0.502, 0.502, 0.502)
const CREAM = rgb(0.955, 0.937, 0.914)
const BORDER = rgb(0.886, 0.894, 0.906)

export interface ExpenseClaimPdfData {
  claimNumber: string
  memberName: string
  email: string
  phone?: string | null
  bankName?: string | null
  accountHolder: string
  iban: string
  eventType: string
  eventName?: string | null
  eventStart: string
  eventEnd: string
  eventDays?: number | null
  legs: TravelLeg[]
  coTravellers?: string | null
  lines: ClaimLine[]
  total: number
  advance: number
  payable: number
  notes?: string | null
  signature?: string | null   // data URL (PNG)
  submittedAt: Date
}

const money = (n: number) =>
  `${n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const grDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

/** Κόβει κείμενο που δεν χωράει, με αποσιωπητικά — ποτέ απότομα */
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

/** Αναδίπλωση σε γραμμές που χωράνε στο πλάτος */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next
    else { if (line) out.push(line); line = w }
  }
  if (line) out.push(line)
  return out
}

export async function generateExpenseClaimPdf(d: ExpenseClaimPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const fontDir = path.join(process.cwd(), 'assets', 'fonts')
  const regular = await doc.embedFont(await readFile(path.join(fontDir, 'LiberationSans-Regular.ttf')))
  const bold = await doc.embedFont(await readFile(path.join(fontDir, 'LiberationSans-Bold.ttf')))
  const logo = await doc.embedPng(await readFile(path.join(process.cwd(), 'assets', 'cforc-logo.png')))

  const M = 48
  const W = 595
  const inner = W - M * 2
  let page = doc.addPage([W, 842])
  let y = 842

  /** Νέα σελίδα όταν τελειώνει ο χώρος — το εξοδολόγιο μπορεί να έχει πολλές γραμμές */
  const need = (h: number) => {
    if (y - h > 70) return
    page = doc.addPage([W, 842])
    y = 842 - M
  }

  const text = (s: string, x: number, size: number, font: PDFFont, color = VALUE) =>
    page.drawText(s, { x, y, size, font, color })

  // ── Κεφαλίδα
  const logoW = 108
  const logoH = (logo.height / logo.width) * logoW
  y = 842 - M - logoH
  page.drawImage(logo, { x: M, y, width: logoW, height: logoH })
  page.drawText('ΕΞΟΔΟΛΟΓΙΟ', { x: W - M - bold.widthOfTextAtSize('ΕΞΟΔΟΛΟΓΙΟ', 20), y: y + logoH - 20, size: 20, font: bold, color: INK })
  page.drawText(d.claimNumber, { x: W - M - regular.widthOfTextAtSize(d.claimNumber, 11), y: y + logoH - 36, size: 11, font: regular, color: CORAL })
  y -= 26
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: BORDER })
  y -= 26

  /** Ενότητα με τίτλο σε κοραλί κεφαλαία */
  const section = (title: string) => {
    need(40)
    page.drawText(title.toLocaleUpperCase('el'), { x: M, y, size: 9, font: bold, color: CORAL })
    y -= 16
  }

  /** Γραμμή «ετικέτα: τιμή» σε δύο στήλες */
  const row = (label: string, value: string) => {
    need(18)
    page.drawText(label, { x: M, y, size: 9.5, font: regular, color: MUTED })
    page.drawText(fit(value || '—', regular, 10, inner - 150), { x: M + 150, y, size: 10, font: regular, color: VALUE })
    y -= 17
  }

  section('Στοιχεία μέλους')
  row('Ονοματεπώνυμο', d.memberName)
  row('Email', d.email)
  if (d.phone) row('Τηλέφωνο', d.phone)
  y -= 6

  section('Τραπεζικός λογαριασμός')
  if (d.bankName) row('Τράπεζα', d.bankName)
  row('Δικαιούχος', d.accountHolder)
  row('IBAN', d.iban.replace(/(.{4})/g, '$1 ').trim())
  y -= 6

  section('Αφορμή')
  row('Δράση', d.eventName ? `${d.eventType} — ${d.eventName}` : d.eventType)
  row('Ημερομηνίες', `${grDate(d.eventStart)} – ${grDate(d.eventEnd)}${d.eventDays ? ` (${d.eventDays} ${d.eventDays === 1 ? 'ημέρα' : 'ημέρες'})` : ''}`)
  y -= 6

  if (d.legs.length) {
    section('Διαδρομή')
    for (const leg of d.legs) {
      need(17)
      const arrow = leg.direction === 'return' ? '←' : '→'
      page.drawText(`${leg.from} ${arrow} ${leg.to}`, { x: M, y, size: 10, font: regular, color: VALUE })
      page.drawText(fit(leg.mode || '—', regular, 9.5, 180), { x: M + 300, y, size: 9.5, font: regular, color: MUTED })
      y -= 17
    }
    y -= 6
  }

  if (d.coTravellers) {
    section('Μετακίνηση μαζί με')
    for (const line of wrap(d.coTravellers, regular, 10, inner)) {
      need(16)
      page.drawText(line, { x: M, y, size: 10, font: regular, color: VALUE })
      y -= 15
    }
    y -= 8
  }

  // ── Ανάλυση εξόδων
  section('Ανάλυση εξόδων')
  need(24)
  page.drawRectangle({ x: M, y: y - 6, width: inner, height: 20, color: CREAM })
  page.drawText('ΗΜΕΡΟΜΗΝΙΑ', { x: M + 8, y, size: 8, font: bold, color: MUTED })
  page.drawText('ΕΙΔΟΣ', { x: M + 132, y, size: 8, font: bold, color: MUTED })
  page.drawText('ΠΕΡΙΓΡΑΦΗ', { x: M + 250, y, size: 8, font: bold, color: MUTED })
  page.drawText('ΠΟΣΟ', { x: W - M - 8 - bold.widthOfTextAtSize('ΠΟΣΟ', 8), y, size: 8, font: bold, color: MUTED })
  y -= 22

  for (const l of d.lines) {
    need(20)
    const dates = l.dateEnd && l.dateEnd !== l.date
      ? `${grDate(l.date)}–${grDate(l.dateEnd)}`
      : grDate(l.date)
    page.drawText(fit(dates, regular, 8.5, 122), { x: M + 8, y, size: 9, font: regular, color: VALUE })
    page.drawText(fit(l.receiptType, regular, 9, 112), { x: M + 132, y, size: 9, font: regular, color: VALUE })
    page.drawText(fit(l.description || '—', regular, 9, 145), { x: M + 250, y, size: 9, font: regular, color: MUTED })
    const amount = money(Number(l.amount) || 0)
    page.drawText(amount, { x: W - M - 8 - regular.widthOfTextAtSize(amount, 9.5), y, size: 9.5, font: regular, color: VALUE })
    y -= 10
    page.drawLine({ start: { x: M + 8, y }, end: { x: W - M - 8, y }, thickness: 0.5, color: BORDER })
    y -= 10
  }

  // ── Σύνολα
  need(80)
  y -= 6
  const boxH = d.advance > 0 ? 66 : 40
  page.drawRectangle({ x: M + inner - 240, y: y - boxH + 14, width: 240, height: boxH, color: CREAM })
  const totalRow = (label: string, value: string, strong = false) => {
    const f = strong ? bold : regular
    const size = strong ? 12 : 10
    page.drawText(label, { x: M + inner - 228, y, size, font: f, color: strong ? INK : MUTED })
    page.drawText(value, { x: W - M - 12 - f.widthOfTextAtSize(value, size), y, size, font: f, color: strong ? INK : VALUE })
    y -= strong ? 20 : 17
  }
  if (d.advance > 0) {
    totalRow('Σύνολο εξόδων', money(d.total))
    totalRow('Προκαταβολή', `− ${money(d.advance)}`)
  }
  totalRow('Πληρωτέο', money(d.payable), true)
  y -= 14

  if (d.notes) {
    section('Σχόλια')
    for (const line of wrap(d.notes, regular, 10, inner)) {
      need(16)
      page.drawText(line, { x: M, y, size: 10, font: regular, color: VALUE })
      y -= 15
    }
    y -= 8
  }

  // ── Υπογραφή
  need(110)
  section('Υπογραφή')
  if (d.signature?.startsWith('data:image/png;base64,')) {
    try {
      const png = await doc.embedPng(Buffer.from(d.signature.split(',')[1], 'base64'))
      const sigW = 150
      const sigH = Math.min((png.height / png.width) * sigW, 60)
      page.drawImage(png, { x: M, y: y - sigH + 8, width: sigW, height: sigH })
      y -= sigH + 6
    } catch {
      // Χαλασμένη εικόνα δεν ρίχνει το έγγραφο — η ηλεκτρονική υποβολή αρκεί
    }
  }
  page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.7, color: BORDER })
  y -= 14
  page.drawText(d.memberName, { x: M, y, size: 10, font: bold, color: INK })
  y -= 14
  const stamp = `Υποβλήθηκε ηλεκτρονικά στις ${d.submittedAt.toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'short', timeStyle: 'short' })} · ταυτοποίηση με σύνδεση μέλους`
  page.drawText(fit(stamp, regular, 8.5, inner), { x: M, y, size: 8.5, font: regular, color: MUTED })

  // ── Υποσέλιδο σε κάθε σελίδα
  const pages = doc.getPages()
  pages.forEach((p: PDFPage, i: number) => {
    p.drawText(`Culture for Change · ${d.claimNumber} · σελίδα ${i + 1} από ${pages.length}`,
      { x: M, y: 40, size: 8, font: regular, color: MUTED })
  })

  return doc.save()
}
