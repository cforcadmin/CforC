import { PDFDocument, rgb, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * Απόδειξη είσπραξης συνδρομής (PDF) — πιστή απόδοση του design
 * «Apodeixi Eispraxis CforC» (Claude Design):
 * λογότυπο CforC (raster από το public/cforc_logo.svg), τυπογραφία Inter
 * (ελληνικά, κοντά στο grotesk του site), απαλοί τόνοι γκρι αντί για
 * καθαρό μαύρο, στρογγυλεμένα στοιχεία (badge, κουτί συνόλων, τράπεζα),
 * και υπογραφή Ταμία με το ελληνικό όνομα του/της τρέχοντος Financer.
 * ⟨TODO⟩: επίσημη σειριακή αρίθμηση (τώρα: Α-{έτος}-{ΑΜ με padding}).
 */

export const ORG_DETAILS = {
  name: 'Culture for Change',
  legalName: 'Σωματείο Κοινωνικής και Πολιτισμικής Καινοτομίας',
  afm: '996788256',
  address: 'Λεωφόρος Αλεξάνδρας 48, ΤΚ 11473, Αθήνα',
  email: 'hello@cultureforchange.net',
  financeEmail: 'finance@cultureforchange.net',
  website: 'cultureforchange.net',
  bank: 'ALPHA BANK',
  ibanSpaced: 'GR71 0140 1420 1420 0232 0005 140',
}

// Παλέτα design: όχι καθαρό μαύρο — μελάνι/γραφίτης + απαλά γκρι
const CORAL = rgb(0.937, 0.522, 0.404)          // #EF856x — το coral του design
const INK = rgb(0.137, 0.122, 0.125)            // #231F20 μόνο για έμφαση
const VALUE = rgb(0.263, 0.263, 0.263)          // #434343 τιμές
const MUTED = rgb(0.502, 0.502, 0.502)          // #808080 ετικέτες
const FAINT = rgb(0.62, 0.62, 0.62)             // υποσέλιδο
const CREAM = rgb(0.955, 0.937, 0.914)
const BORDER = rgb(0.886, 0.894, 0.906)

export interface ReceiptData {
  name: string
  email: string
  am: string | number
  year: number
  registrationFee: number
  subscriptionFee: number
  date: Date
  taxId?: string | null
  city?: string | null
  paymentMethod?: string
  /** Ελληνικό όνομα του/της Ταμία (Financer) για την υπογραφή */
  financerName?: string | null
}

/** Ακέραια ευρώ 0–999 ολογράφως (αρκεί για συνδρομές) */
function euroWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) return `${n} ευρώ`
  const ones = ['', 'ένα', 'δύο', 'τρία', 'τέσσερα', 'πέντε', 'έξι', 'επτά', 'οκτώ', 'εννέα']
  const teens = ['δέκα', 'έντεκα', 'δώδεκα', 'δεκατρία', 'δεκατέσσερα', 'δεκαπέντε', 'δεκαέξι', 'δεκαεπτά', 'δεκαοκτώ', 'δεκαεννέα']
  const tens = ['', '', 'είκοσι', 'τριάντα', 'σαράντα', 'πενήντα', 'εξήντα', 'εβδομήντα', 'ογδόντα', 'ενενήντα']
  const hundreds = ['', 'εκατό', 'διακόσια', 'τριακόσια', 'τετρακόσια', 'πεντακόσια', 'εξακόσια', 'επτακόσια', 'οκτακόσια', 'εννιακόσια']
  const parts: string[] = []
  const h = Math.floor(n / 100), rest = n % 100
  if (h) parts.push(h === 1 && rest ? 'εκατόν' : hundreds[h])
  if (rest >= 10 && rest < 20) parts.push(teens[rest - 10])
  else {
    const t = Math.floor(rest / 10), o = rest % 10
    if (t) parts.push(tens[t])
    if (o) parts.push(ones[o])
  }
  if (n === 0) parts.push('μηδέν')
  const words = parts.join(' ')
  return words.charAt(0).toLocaleUpperCase('el') + words.slice(1) + ' ευρώ'
}

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

/** Στρογγυλεμένο ορθογώνιο με διαφορετική ακτίνα πάνω/κάτω (y προς τα κάτω) */
function roundedRectPathRT(w: number, h: number, rTop: number, rBottom: number): string {
  return [
    `M ${rTop},0`, `L ${w - rTop},0`, `A ${rTop} ${rTop} 0 0 1 ${w},${rTop}`,
    `L ${w},${h - rBottom}`, `A ${rBottom} ${rBottom} 0 0 1 ${w - rBottom},${h}`,
    `L ${rBottom},${h}`, `A ${rBottom} ${rBottom} 0 0 1 0,${h - rBottom}`,
    `L 0,${rTop}`, `A ${rTop} ${rTop} 0 0 1 ${rTop},0`, 'Z',
  ].join(' ')
}

/** SVG path στρογγυλεμένου ορθογωνίου (y προς τα κάτω, αγκύρωση πάνω-αριστερά) */
function roundedRectPath(w: number, h: number, r: number): string {
  return [
    `M ${r},0`, `L ${w - r},0`, `A ${r} ${r} 0 0 1 ${w},${r}`,
    `L ${w},${h - r}`, `A ${r} ${r} 0 0 1 ${w - r},${h}`,
    `L ${r},${h}`, `A ${r} ${r} 0 0 1 0,${h - r}`,
    `L 0,${r}`, `A ${r} ${r} 0 0 1 ${r},0`, 'Z',
  ].join(' ')
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const fontDir = path.join(process.cwd(), 'assets', 'fonts')
  const regular = await doc.embedFont(await readFile(path.join(fontDir, 'Inter-Regular.ttf')))
  const semibold = await doc.embedFont(await readFile(path.join(fontDir, 'Inter-SemiBold.ttf')))
  const bold = await doc.embedFont(await readFile(path.join(fontDir, 'Inter-Bold.ttf')))
  const logoBytes = await readFile(path.join(process.cwd(), 'assets', 'cforc-logo.png'))
  const logo = await doc.embedPng(logoBytes)

  const page = doc.addPage([595, 842])
  const W = 595
  const M = 48
  const right = W - M
  const number = `Α-${data.year}-${String(data.am).padStart(4, '0')}`
  const total = data.registrationFee + data.subscriptionFee

  const text = (t: string, x: number, y: number, size: number, font: PDFFont, color = VALUE) =>
    page.drawText(t, { x, y, size, font, color })
  const textR = (t: string, xRight: number, y: number, size: number, font: PDFFont, color = VALUE) =>
    page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color })
  /** Ετικέτες ενοτήτων με tracking (letter-spacing) όπως στο design */
  const tracked = (t: string, x: number, y: number, size: number, font: PDFFont, color = MUTED, spacing = 0.9) => {
    let cx = x
    for (const ch of t) {
      page.drawText(ch, { x: cx, y, size, font, color })
      cx += font.widthOfTextAtSize(ch, size) + spacing
    }
    return cx - spacing
  }
  const roundRect = (x: number, yTop: number, w: number, h: number, r: number,
                     opts: { color?: any; borderColor?: any; borderWidth?: number }) =>
    page.drawSvgPath(roundedRectPath(w, h, r), { x, y: yTop, ...opts })

  // ── Header ──
  const logoW = 118
  const logoH = (logo.height / logo.width) * logoW
  page.drawImage(logo, { x: M, y: 795 - logoH, width: logoW, height: logoH })

  let ly = 795 - logoH - 20
  text(ORG_DETAILS.legalName, M, ly, 8.6, semibold, VALUE); ly -= 14
  text(ORG_DETAILS.address, M, ly, 8.6, regular, MUTED); ly -= 14
  text(`ΑΦΜ ${ORG_DETAILS.afm}`, M, ly, 8.6, regular, MUTED); ly -= 14
  text(`${ORG_DETAILS.website} · ${ORG_DETAILS.email}`, M, ly, 8.6, regular, MUTED)

  // Badge (στρογγυλεμένο) + μετα-στοιχεία δεξιά
  const badgeText = 'ΑΠΟΔΕΙΞΗ ΕΙΣΠΡΑΞΗΣ'
  const btW = semibold.widthOfTextAtSize(badgeText, 10.5) + badgeText.length * 0.8
  const bw = btW + 30
  roundRect(right - bw, 795, bw, 27, 6, { color: CORAL })
  tracked(badgeText, right - bw + 15, 795 - 18, 10.5, semibold, INK, 0.8)
  let ry = 795 - 44
  const metaRow = (label: string, value: string) => {
    textR(value, right, ry, 9.2, semibold, INK)
    textR(label, right - semibold.widthOfTextAtSize(value, 9.2) - 16, ry, 8.8, regular, MUTED)
    ry -= 16
  }
  metaRow('Σειρά', 'Α')
  metaRow('Αρ. παραστατικού', number)
  metaRow('Ημερομηνία', data.date.toLocaleDateString('el-GR'))

  // λεπτή γραμμή κάτω από το header
  let y = 682
  page.drawRectangle({ x: M, y, width: W - 2 * M, height: 1.4, color: INK })

  // ── Στοιχεία μέλους / παραστατικού ──
  y -= 30
  const colL = M
  const colR = W / 2 + 14
  tracked('ΣΤΟΙΧΕΙΑ ΜΕΛΟΥΣ', colL, y, 7.8, semibold)
  tracked('ΣΤΟΙΧΕΙΑ ΠΑΡΑΣΤΑΤΙΚΟΥ', colR, y, 7.8, semibold)
  y -= 19
  const kv = (x: number, yy: number, label: string, value: string, strong = false) => {
    text(label, x, yy, 9, regular, MUTED)
    text(value, x + 96, yy, 9.4, strong ? semibold : regular, strong ? INK : VALUE)
  }
  let yl = y, yr = y
  kv(colL, yl, 'Ονοματεπώνυμο', data.name, true); yl -= 16
  kv(colL, yl, 'Αριθμός μητρώου', String(data.am)); yl -= 16
  if (data.taxId) { kv(colL, yl, 'ΑΦΜ', String(data.taxId)); yl -= 16 }
  if (data.city) { kv(colL, yl, 'Πόλη', String(data.city)); yl -= 16 }
  kv(colL, yl, 'Email', data.email); yl -= 16
  kv(colR, yr, 'Είδος', 'Απόδειξη είσπραξης'); yr -= 16
  kv(colR, yr, 'Τρόπος πληρωμής', data.paymentMethod || 'Τραπεζική κατάθεση', true); yr -= 16
  kv(colR, yr, 'Περίοδος', `Έτος ${data.year}`); yr -= 16
  kv(colR, yr, 'Κατάσταση', '✓ Εξοφλήθη', true); yr -= 16

  // ── Πίνακας ──
  y = Math.min(yl, yr) - 26
  const cQty = right - 180, cUnit = right - 95, cVal = right
  tracked('ΑΙΤΙΟΛΟΓΙΑ', M, y, 7.8, semibold)
  tracked('ΠΟΣΟΤΗΤΑ', cQty - 52, y, 7.8, semibold)
  tracked('ΤΙΜΗ ΜΟΝΑΔΑΣ', cUnit - 72, y, 7.8, semibold)
  tracked('ΑΞΙΑ', cVal - 26, y, 7.8, semibold)
  y -= 8
  page.drawRectangle({ x: M, y, width: W - 2 * M, height: 1.1, color: CORAL })
  const item = (label: string, unit: number) => {
    y -= 22
    text(label, M, y, 9.4, regular, VALUE)
    textR('1', cQty, y, 9.4, regular, VALUE)
    textR(eur(unit), cUnit, y, 9.4, regular, VALUE)
    textR(eur(unit), cVal, y, 9.4, regular, VALUE)
    y -= 11
    page.drawRectangle({ x: M, y, width: W - 2 * M, height: 0.6, color: BORDER })
  }
  item('Εγγραφή μέλους (εφάπαξ)', data.registrationFee)
  item(`Ετήσια συνδρομή μέλους ${data.year}`, data.subscriptionFee)

  // ── Ολογράφως + κουτί συνόλων ──
  y -= 32
  const boxW = 228
  const boxX = right - boxW
  const leftMax = boxX - M - 22
  const wrapText = (t: string, font: PDFFont, size: number): string[] => {
    const words = t.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const cand = cur ? cur + ' ' + w : w
      if (font.widthOfTextAtSize(cand, size) <= leftMax) cur = cand
      else { if (cur) lines.push(cur); cur = w }
    }
    if (cur) lines.push(cur)
    return lines
  }
  const lbl = 'Ποσό ολογράφως: '
  text(lbl, M, y, 9, regular, MUTED)
  text(euroWords(total), M + regular.widthOfTextAtSize(lbl, 9), y, 9, semibold, INK)
  let wy = y - 17
  for (const line of wrapText(`Η συνδρομή αφορά την εγγραφή και την ετήσια συνδρομή μέλους στο Δίκτυο Culture for Change για το έτος ${data.year}.`, regular, 9)) {
    text(line, M, wy, 9, regular, MUTED)
    wy -= 13
  }

  // ΕΝΙΑΙΟ κουτί: γραμμές με διακριτικό περίγραμμα πάνω, coral μπάντα
  // κολλητά από κάτω — μία σιλουέτα με στρογγυλεμένες μόνο τις έξω γωνίες
  const boxTop = y + 16
  const rowsH = 62
  const bandH = 34
  page.drawSvgPath(roundedRectPathRT(boxW, rowsH + bandH, 12, 12), {
    x: boxX, y: boxTop, borderColor: BORDER, borderWidth: 1,
  })
  let by = boxTop - 18
  const boxRow = (label: string, value: string) => {
    text(label, boxX + 15, by, 9, regular, MUTED)
    textR(value, boxX + boxW - 15, by, 9.4, regular, VALUE)
    by -= 16
  }
  boxRow('Καθαρή αξία', eur(total))
  boxRow('Έκπτωση', eur(0))
  boxRow('ΦΠΑ', 'Απαλλαγή')
  page.drawSvgPath(roundedRectPathRT(boxW, bandH, 0, 12), {
    x: boxX, y: boxTop - rowsH, color: CORAL,
  })
  tracked('ΠΛΗΡΩΤΕΟ ΠΟΣΟ', boxX + 15, boxTop - rowsH - 22, 8.6, semibold, INK, 0.7)
  textR(eur(total), boxX + boxW - 15, boxTop - rowsH - 25, 14.5, bold, INK)

  // ── Λογαριασμός κατάθεσης (cream, στρογγυλεμένο) ──
  y = boxTop - 124
  roundRect(M, y, W - 2 * M, 64, 14, { color: CREAM })
  tracked('ΛΟΓΑΡΙΑΣΜΟΣ ΚΑΤΑΘΕΣΗΣ', M + 20, y - 18, 7.8, semibold)
  text(ORG_DETAILS.bank, M + 20, y - 34, 9.4, semibold, INK)
  text(ORG_DETAILS.ibanSpaced, M + 20, y - 49, 9.4, regular, VALUE)
  const c2 = W / 2 + 14
  tracked('ΔΙΚΑΙΟΥΧΟΣ', c2, y - 18, 7.8, semibold)
  text('Culture for Change — Σωματείο', c2, y - 34, 9.4, regular, VALUE)
  text(`Πληροφορίες: ${ORG_DETAILS.financeEmail}`, c2, y - 49, 9, regular, MUTED)

  // ── Υπογραφή Ταμία + σημείωση ΦΠΑ ──
  const sigY = 128
  text('Το παρόν εκδίδεται από μη κερδοσκοπικό σωματείο για την είσπραξη', M, sigY + 18, 7.6, regular, MUTED)
  text('συνδρομών μελών και δεν υπόκειται σε ΦΠΑ. Φυλάξτε το ως αποδεικτικό καταβολής.', M, sigY + 7, 7.6, regular, MUTED)
  const sigW = 165
  const sigX = right - sigW
  page.drawRectangle({ x: sigX, y: sigY + 28, width: sigW, height: 0.8, color: VALUE })
  const sigLabel = 'Για την είσπραξη · Ταμίας'
  text(sigLabel, sigX + (sigW - regular.widthOfTextAtSize(sigLabel, 8.4)) / 2, sigY + 15, 8.4, regular, MUTED)
  if (data.financerName) {
    const fn = data.financerName
    text(fn, sigX + (sigW - semibold.widthOfTextAtSize(fn, 9.6)) / 2, sigY, 9.6, semibold, INK)
  }

  // ── Υποσέλιδο ──
  page.drawRectangle({ x: M, y: 64, width: W - 2 * M, height: 0.6, color: BORDER })
  text(`${ORG_DETAILS.name} · Λεωφόρος Αλεξάνδρας 48, 11473 Αθήνα`, M, 50, 7.6, regular, FAINT)
  textR(`${number} · σελίδα 1/1`, right, 50, 7.6, regular, FAINT)

  return doc.save()
}
