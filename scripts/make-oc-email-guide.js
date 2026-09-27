/**
 * Σύντομος οδηγός «Αποστολή email» για τα μέλη του OC, σε PDF.
 *
 * Γράφεται για ανθρώπους που ΔΕΝ ασχολούνται με υπολογιστές: χωρίς όρους,
 * χωρίς αγγλικά, με μικρές προτάσεις. Ζει εδώ ως script και όχι ως χειροκίνητο
 * αρχείο, ώστε όταν αλλάξει η οθόνη να ξαναβγαίνει σε ένα δευτερόλεπτο αντί να
 * μείνει ένα PDF που λέει ψέματα.
 *
 * Τρέξε από τη ρίζα:  node scripts/make-oc-email-guide.js
 * Βγάζει:             docs/OC-Odigos-Email-Newsletter.pdf
 *
 * ΠΡΟΣΟΧΗ στα σύμβολα: η Liberation Sans δεν έχει emoji ούτε σπάνια βελάκια
 * (⤓, ⠿). Ό,τι δεν υπάρχει στη γραμματοσειρά ρίχνει τη δημιουργία του αρχείου,
 * γι' αυτό ο οδηγός περιγράφει τα κουμπιά με λέξεις.
 */

const { PDFDocument, rgb } = require('pdf-lib')
const fontkit = require('@pdf-lib/fontkit')
const { readFile, writeFile, mkdir } = require('fs/promises')
const path = require('path')

const CORAL = rgb(1, 0.545, 0.416)
const INK = rgb(0.137, 0.122, 0.125)
const BODY = rgb(0.263, 0.263, 0.263)
const MUTED = rgb(0.502, 0.502, 0.502)
const CREAM = rgb(0.961, 0.941, 0.922)

const A4 = [595.28, 841.89]
const M = 56                       // περιθώριο
const W = A4[0] - M * 2            // ωφέλιμο πλάτος

/** Ο οδηγός. Κάθε ενότητα: τίτλος + σειρές. «•» = κουκκίδα, «!» = προσοχή. */
const GUIDE = [
  {
    h: '1. Δύο διαφορετικά πράγματα',
    lines: [
      'Πάνω αριστερά υπάρχει ένας διακόπτης με δύο επιλογές.',
      '• Μήνυμα: πάει σε συγκεκριμένα πρόσωπα, έδρες ή ομάδες εργασίας.',
      '• Newsletter: πάει στις λίστες συνδρομητών και έχει πάντα σύνδεσμο διαγραφής.',
      'Το καθένα κρατά τη δική του δουλειά. Αν αλλάξεις από το ένα στο άλλο και',
      'ξαναγυρίσεις, θα τα βρεις όπως τα άφησες.',
    ],
  },
  {
    h: '2. Πώς φτιάχνεις το γράμμα',
    lines: [
      'Το γράμμα χτίζεται από έτοιμα κομμάτια: τίτλος ενότητας, παράγραφος,',
      'φωτογραφία, κάρτα, κουμπί και άλλα.',
      '• Πάτα το + ανάμεσα σε δύο κομμάτια για να βάλεις κάτι ακριβώς εκεί.',
      '• Ή σύρε ένα κομμάτι από τη λίστα στο κάτω μέρος, στη θέση που θέλεις.',
      '• Τα βελάκια πάνω και κάτω το μετακινούν. Το διπλό βελάκι το πάει στο τέλος.',
      '• Κλικ πάνω σε ένα κομμάτι το επιλέγει. Διάλεξε πολλά και κινούνται μαζί.',
      '• Το ματάκι κρύβει ένα κομμάτι χωρίς να το σβήσει.',
    ],
  },
  {
    h: '3. Φωτογραφίες',
    lines: [
      'Σύρε τη φωτογραφία από τον υπολογιστή σου κατευθείαν πάνω στο πλαίσιο.',
      'Ή πάτα «Από τον υπολογιστή» και διάλεξέ την.',
      'Αν υπάρχει ήδη φωτογραφία εκεί, η καινούργια παίρνει τη θέση της.',
    ],
  },
  {
    h: '4. Προεπισκόπηση',
    lines: [
      'Δεξιά βλέπεις πώς ακριβώς θα φτάσει το γράμμα.',
      'Ο κάθετος ολισθητήρας στη μέση κατεβάζει και τα δύο μαζί.',
      'Κλικ σε ένα κείμενο της προεπισκόπησης σε πάει στο κομμάτι που το γράφει.',
    ],
  },
  {
    h: '5. Προσχέδια',
    lines: [
      'Το «Αποθήκευση προσχεδίου» το φυλάει. Το βλέπει όλο το γραφείο σου, οπότε',
      'μπορεί να το συνεχίσει και κάποιος άλλος.',
      'Δίπλα σε κάθε προσχέδιο γράφει αν είναι Μήνυμα ή Newsletter, και ανοίγει',
      'στη σωστή θέση.',
    ],
  },
  {
    h: '6. Πριν στείλεις',
    lines: [
      '• Δοκιμή: στέλνει ένα δοκιμαστικό στη θυρίδα σου. Για να δεις τη διάταξη.',
      '• Τελική δοκιμή (μόνο στο newsletter): αληθινό γράμμα, με όλους τους',
      '  συνδέσμους ενεργούς.',
      '! Μέσα στην τελική δοκιμή ΜΗΝ πατήσεις «απεγγραφή». Δεν αναιρείται, και',
      '! η θυρίδα σου θα σταματήσει να λαμβάνει το newsletter.',
    ],
  },
  {
    h: '7. Αποστολή τώρα ή αργότερα',
    lines: [
      'Άσε το πεδίο με την ημερομηνία κενό για να φύγει αμέσως.',
      'Βάλε ημερομηνία και ώρα για να φύγει αργότερα.',
      'Η ουρά ελέγχεται κάθε ώρα, οπότε η αποστολή ξεκινά την πρώτη ώρα μετά τη',
      'στιγμή που διάλεξες.',
    ],
  },
  {
    h: '8. Το κάτω μέρος του τεύχους',
    lines: [
      'Στο newsletter, το υποσέλιδο μπαίνει μόνο του: λογότυπο, κοινωνικά δίκτυα,',
      'δικαιώματα και σύνδεσμος διαγραφής.',
      'Διάλεξε μία από τις επτά διατάξεις και άλλαξε τα κείμενα αν χρειάζεται.',
    ],
  },
]

const REMEMBER = [
  'Το γράμμα φεύγει από τη θυρίδα της έδρας σου, όχι από το προσωπικό σου email.',
  'Τα χρώματα και η γραμματοσειρά είναι της ταυτότητας του δικτύου και δεν αλλάζουν.',
  'Ό,τι στείλεις δεν ανακαλείται. Κάνε πρώτα μια Δοκιμή.',
]

async function main() {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const dir = path.join(process.cwd(), 'assets', 'fonts')
  const reg = await doc.embedFont(await readFile(path.join(dir, 'LiberationSans-Regular.ttf')))
  const bold = await doc.embedFont(await readFile(path.join(dir, 'LiberationSans-Bold.ttf')))
  const logo = await doc.embedPng(await readFile(path.join(process.cwd(), 'assets', 'cforc-logo.png')))

  let page = doc.addPage(A4)
  let y = A4[1] - M

  const newPage = () => { page = doc.addPage(A4); y = A4[1] - M }
  /** Αφήνει χώρο· αν δεν υπάρχει, γυρίζει σελίδα ΠΡΙΝ γράψει */
  const need = h => { if (y - h < M + 28) newPage() }

  const write = (text, { font = reg, size = 11, color = BODY, x = M, gap = 4 } = {}) => {
    page.drawText(text, { x, y: y - size, size, font, color })
    y -= size + gap
  }

  // ── Κεφαλίδα ──────────────────────────────────────────────────────────────
  const logoW = 132
  page.drawImage(logo, { x: M, y: y - logoW * (logo.height / logo.width), width: logoW, height: logoW * (logo.height / logo.width) })
  y -= logoW * (logo.height / logo.width) + 26

  write('Αποστολή email', { font: bold, size: 26, color: INK, gap: 8 })
  write('Σύντομος οδηγός για την Ομάδα Συντονισμού', { size: 13, color: MUTED, gap: 2 })
  write('Σεπτέμβριος 2026', { size: 11, color: MUTED, gap: 22 })

  page.drawRectangle({ x: M, y, width: W, height: 3, color: CORAL })
  y -= 26

  // ── Ενότητες ──────────────────────────────────────────────────────────────
  for (const s of GUIDE) {
    need(28 + s.lines.length * 17)
    write(s.h, { font: bold, size: 13.5, color: INK, gap: 9 })
    for (const line of s.lines) {
      const warn = line.startsWith('!')
      write(warn ? line.slice(1).trim() : line, {
        size: 11, color: warn ? INK : BODY, font: warn ? bold : reg, gap: 5,
      })
    }
    y -= 14
  }

  // ── Καλό να θυμάσαι ───────────────────────────────────────────────────────
  const boxH = 30 + REMEMBER.length * 17
  need(boxH + 10)
  page.drawRectangle({ x: M, y: y - boxH, width: W, height: boxH, color: CREAM })
  page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: CORAL })
  y -= 18
  write('Καλό να θυμάσαι', { font: bold, size: 12, color: INK, x: M + 18, gap: 8 })
  for (const line of REMEMBER) write(line, { size: 10.5, x: M + 18, gap: 5 })

  // ── Υποσέλιδο σε κάθε σελίδα ──────────────────────────────────────────────
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    p.drawText(`Culture for Change  ·  σελίδα ${i + 1} από ${pages.length}  ·  απορίες: it@cultureforchange.net`, {
      x: M, y: M - 18, size: 8.5, font: reg, color: MUTED,
    })
  })

  await mkdir(path.join(process.cwd(), 'docs'), { recursive: true })
  const out = path.join(process.cwd(), 'docs', 'OC-Odigos-Email-Newsletter.pdf')
  await writeFile(out, await doc.save())
  console.log(`Έτοιμο: ${out} (${pages.length} σελίδες)`)
}

main().catch(e => { console.error(e); process.exit(1) })
