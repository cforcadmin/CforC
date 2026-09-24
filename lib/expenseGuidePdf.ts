import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'fs/promises'
import path from 'path'
import { GUIDE_SECTIONS, GUIDE_TITLE, GUIDE_SUBTITLE, GUIDE_FOOTER } from '@/lib/expenseGuide'

/**
 * Ο οδηγός του εξοδολογίου σε PDF — για εκτύπωση ή προώθηση.
 * Ίδιο κείμενο με το pop-up (lib/expenseGuide), ίδια τυπογραφία με την
 * απόδειξη και το εξοδολόγιο.
 */

const CORAL = rgb(1, 0.545, 0.416)
const INK = rgb(0.137, 0.122, 0.125)
const VALUE = rgb(0.263, 0.263, 0.263)
const MUTED = rgb(0.502, 0.502, 0.502)
const CREAM = rgb(0.955, 0.937, 0.914)
const AMBER = rgb(0.98, 0.94, 0.85)

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

export async function generateExpenseGuidePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const fontDir = path.join(process.cwd(), 'assets', 'fonts')
  const regular = await doc.embedFont(await readFile(path.join(fontDir, 'LiberationSans-Regular.ttf')))
  const bold = await doc.embedFont(await readFile(path.join(fontDir, 'LiberationSans-Bold.ttf')))
  const logo = await doc.embedPng(await readFile(path.join(process.cwd(), 'assets', 'cforc-logo.png')))

  const W = 595, M = 52
  const inner = W - M * 2
  let page = doc.addPage([W, 842])
  let y = 842

  const need = (h: number) => {
    if (y - h > 70) return
    page = doc.addPage([W, 842])
    y = 842 - M
  }

  // Εξώφυλλο-κεφαλίδα
  const logoW = 108
  const logoH = (logo.height / logo.width) * logoW
  y = 842 - M - logoH
  page.drawImage(logo, { x: M, y, width: logoW, height: logoH })
  y -= 34
  page.drawText(GUIDE_TITLE.toLocaleUpperCase('el'), { x: M, y, size: 22, font: bold, color: INK })
  y -= 20
  for (const line of wrap(GUIDE_SUBTITLE, regular, 11, inner)) {
    page.drawText(line, { x: M, y, size: 11, font: regular, color: MUTED })
    y -= 15
  }
  y -= 14

  for (const section of GUIDE_SECTIONS) {
    need(70)
    page.drawRectangle({ x: M, y: y - 6, width: inner, height: 22, color: CREAM })
    page.drawText(section.heading.toLocaleUpperCase('el'), { x: M + 10, y, size: 10, font: bold, color: CORAL })
    y -= 28

    if (section.intro) {
      for (const line of wrap(section.intro, regular, 10.5, inner)) {
        need(16)
        page.drawText(line, { x: M, y, size: 10.5, font: regular, color: MUTED })
        y -= 15
      }
      y -= 6
    }

    for (const step of section.steps) {
      need(40)
      page.drawText(step.title, { x: M, y, size: 12, font: bold, color: INK })
      y -= 18
      for (const paragraph of step.body) {
        for (const line of wrap(paragraph, regular, 10.5, inner - 12)) {
          need(16)
          page.drawText(line, { x: M + 12, y, size: 10.5, font: regular, color: VALUE })
          y -= 15
        }
        y -= 4
      }
      if (step.warning) {
        const lines = wrap(`Προσοχή: ${step.warning}`, regular, 10, inner - 32)
        need(lines.length * 14 + 18)
        page.drawRectangle({ x: M + 12, y: y - lines.length * 14 + 4, width: inner - 12, height: lines.length * 14 + 14, color: AMBER })
        y -= 6
        for (const line of lines) {
          page.drawText(line, { x: M + 24, y, size: 10, font: regular, color: INK })
          y -= 14
        }
        y -= 8
      }
      y -= 6
    }
    y -= 8
  }

  need(40)
  y -= 6
  for (const line of wrap(GUIDE_FOOTER, regular, 9.5, inner)) {
    page.drawText(line, { x: M, y, size: 9.5, font: regular, color: MUTED })
    y -= 13
  }

  const pages = doc.getPages()
  pages.forEach((p: PDFPage, i: number) => {
    p.drawText(`Culture for Change · Οδηγός εξοδολογίου · σελίδα ${i + 1} από ${pages.length}`,
      { x: M, y: 40, size: 8, font: regular, color: MUTED })
  })
  return doc.save()
}
