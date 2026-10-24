import fs from 'node:fs'
import path from 'node:path'

/**
 * ΚΑΝΕΝΑ ΓΡΑΜΜΑ ΔΕΝ ΦΕΥΓΕΙ ΧΩΡΙΣ ΝΑ ΚΟΙΤΑΞΕΙ ΚΑΝΕΙΣ ΑΝ ΕΦΥΓΕ.
 *
 * 24/10/2026. Μέλος δήλωσε συμμετοχή και ανέφερε ότι δεν πήρε email. Η
 * απάντηση βρέθηκε μόνο ρωτώντας ΑΠΕΥΘΕΙΑΣ το Resend, γιατί δώδεκα σημεία
 * έκαναν σκέτο `await sendOcEmail(...)` αγνοώντας το αποτέλεσμα.
 *
 * Η παγίδα: η `sendOcEmail` ΔΕΝ ρίχνει σφάλμα όταν αποτύχει — γυρίζει
 * `false`. Άρα το try/catch από πάνω έδινε την ΨΕΥΔΑΙΣΘΗΣΗ ότι κάποιος
 * προσέχει, ενώ δεν έπιανε τίποτα. Μια απόρριψη του Resend ήταν εντελώς
 * αόρατη: η εγγραφή περασμένη, το γράμμα πουθενά, κανένα ίχνος.
 *
 * Για μη μέλος αυτό δεν είναι καλλωπισμός: ο σύνδεσμος επιβεβαίωσης ζει
 * ΜΟΝΟ μέσα σε εκείνο το γράμμα. Γράμμα που δεν έφυγε = δήλωση που δεν
 * μπορεί να ολοκληρωθεί ποτέ.
 */

const ROOT = path.join(__dirname, '..', '..')
const CALL = /(?:(\w[\w.[\]]*)\s*=\s*)?await\s+sendOcEmail\s*\(/

function offenders(): string[] {
  const bad: string[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(full); continue }
      if (!/\.tsx?$/.test(e.name)) continue
      const lines = fs.readFileSync(full, 'utf8').split('\n')
      lines.forEach((ln, i) => {
        // Τα σχόλια δεν στέλνουν email. Χωρίς αυτό, η ίδια η τεκμηρίωση του
        // κανόνα — που αναφέρει τη λάθος μορφή — καταγγέλλει τον εαυτό της.
        const t = ln.trim()
        if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return
        const m = CALL.exec(ln)
        if (!m) return
        const assigned = !!m[1]
        const inIf = /\bif\s*\(\s*!?\(?\s*await\s+sendOcEmail/.test(ln)
        const returned = ln.trim().startsWith('return')
        const pushed = ln.includes('.push(')
        if (!assigned && !inIf && !returned && !pushed) {
          bad.push(`${path.relative(ROOT, full)}:${i + 1}`)
        }
      })
    }
  }
  for (const d of ['app', 'lib', 'scripts']) {
    const p = path.join(ROOT, d)
    if (fs.existsSync(p)) walk(p)
  }
  return bad
}

describe('κάθε αποστολή email ελέγχεται', () => {
  it('βρίσκει πηγαίο κώδικα — αλλιώς το τεστ δεν ελέγχει τίποτα', () => {
    expect(fs.existsSync(path.join(ROOT, 'app'))).toBe(true)
  })

  /**
   * Αν αυτό πέσει: μην αφαιρέσεις το τεστ. Είτε κράτα το αποτέλεσμα
   * (`const sent = await sendOcEmail(...)`), είτε χρησιμοποίησε την
   * `sendOcEmailOrWarn(context, …)` που γράφει `[EMAIL-FAIL]` με παραλήπτη
   * και αιτία.
   */
  it('καμία κλήση sendOcEmail δεν αγνοεί το αποτέλεσμα', () => {
    expect(offenders()).toEqual([])
  })
})
