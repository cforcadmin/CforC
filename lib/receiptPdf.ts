import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * Απόδειξη είσπραξης συνδρομής (PDF) — ΠΡΟΣΧΕΔΙΟ ΔΟΜΗΣ.
 * ⟨TODO λεπτομερειών⟩: επίσημη σειριακή αρίθμηση (τώρα: {έτος}-{ΑΜ}),
 * τελικό layout/στοιχεία φορέα κατόπιν οδηγιών Financer.
 * DejaVuSans φορτώνεται τοπικά — τα standard PDF fonts δεν έχουν ελληνικά.
 */

const CORAL = rgb(1, 0.545, 0.416)
const INK = rgb(0.176, 0.176, 0.176)
const GREY = rgb(0.45, 0.45, 0.45)

export interface ReceiptData {
  name: string
  email: string
  am: string | number
  year: number
  registrationFee: number   // 10
  subscriptionFee: number   // 35
  date: Date
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const fontDir = path.join(process.cwd(), 'assets', 'fonts')
  const regular = await doc.embedFont(await readFile(path.join(fontDir, 'DejaVuSans.ttf')))
  const bold = await doc.embedFont(await readFile(path.join(fontDir, 'DejaVuSans-Bold.ttf')))

  const page = doc.addPage([595, 842]) // A4
  const { width } = page.getSize()
  const M = 60
  let y = 770

  // Header band
  page.drawRectangle({ x: 0, y: 792, width, height: 50, color: CORAL })
  page.drawText('CULTURE FOR CHANGE', { x: M, y: 810, size: 14, font: bold, color: rgb(1, 1, 1) })

  page.drawText('ΑΠΟΔΕΙΞΗ ΕΙΣΠΡΑΞΗΣ', { x: M, y, size: 22, font: bold, color: INK })
  y -= 22
  const number = `${data.year}-${data.am}`
  page.drawText(`Αρ. ${number} — ΠΡΟΣΧΕΔΙΟ`, { x: M, y, size: 11, font: regular, color: GREY })
  y -= 40

  const row = (label: string, value: string, isBold = false) => {
    page.drawText(label, { x: M, y, size: 11, font: regular, color: GREY })
    page.drawText(value, { x: M + 170, y, size: 11, font: isBold ? bold : regular, color: INK })
    y -= 22
  }

  row('Ημερομηνία', data.date.toLocaleDateString('el-GR'))
  row('Ονοματεπώνυμο', data.name, true)
  row('Email', data.email)
  row('Αριθμός Μητρώου (ΑΜ)', String(data.am), true)
  y -= 16

  // Amounts box
  const total = data.registrationFee + data.subscriptionFee
  page.drawRectangle({ x: M - 12, y: y - 78, width: width - 2 * M + 24, height: 104, color: rgb(0.961, 0.941, 0.922) })
  y -= 6
  row('Εγγραφή (εφάπαξ)', `${data.registrationFee.toFixed(2)} €`)
  row(`Ετήσια συνδρομή ${data.year}`, `${data.subscriptionFee.toFixed(2)} €`)
  row('Σύνολο', `${total.toFixed(2)} €`, true)
  y -= 30

  page.drawText('Η καταβολή αφορά την εγγραφή και την ετήσια συνδρομή μέλους στο δίκτυο Culture for Change.', {
    x: M, y, size: 10, font: regular, color: GREY, maxWidth: width - 2 * M,
  })
  y -= 40
  page.drawText('Culture for Change · cultureforchange.net · finance@cultureforchange.net', {
    x: M, y: 60, size: 9, font: regular, color: GREY,
  })

  return doc.save()
}
