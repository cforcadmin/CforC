import { readFileSync } from 'fs'
import path from 'path'

/**
 * Απαντήσεις που φτάνουν εκτός σειράς.
 *
 * Το debounce ακυρώνει το χρονόμετρο, ΟΧΙ το αίτημα που ήδη ταξιδεύει. Δύο
 * αλλαγές με απόσταση μεγαλύτερη από το debounce στέλνουν δύο αιτήματα, και
 * η οθόνη κρατά όποιο ΓΥΡΙΣΕΙ τελευταίο. Στις 27/9/2026 αυτό εμφανίστηκε ως
 * «Μεγάλη → Μεσαία → Μεγάλη δεν αλλάζει την προεπισκόπηση»: η αργή απάντηση
 * της Μεσαίας πατούσε τη σωστή.
 *
 * Το έργο δεν έχει testing-library· ο έλεγχος διαβάζει την ΠΗΓΗ και φυλάει
 * ότι κάθε τέτοιο effect έχει φρουρό.
 */
const src = readFileSync(path.join(process.cwd(), 'components/oc/OcCampaigns.tsx'), 'utf8')

describe('Φρουρός σε καθυστερημένες απαντήσεις', () => {
  it('κάθε setTimeout+fetch effect καθαρίζει με alive=false', () => {
    const effects = src.split('useEffect(').slice(1)
      .filter(e => e.includes('setTimeout') && e.includes('fetch('))
    expect(effects.length).toBeGreaterThanOrEqual(2)
    for (const e of effects) {
      const head = e.slice(0, e.indexOf('}, ['))
      expect(head).toContain('let alive = true')
      expect(head).toContain('alive = false')
    }
  })

  it('η κατάσταση γράφεται ΜΟΝΟ αν η απάντηση αφορά ακόμη την οθόνη', () => {
    expect(src).toContain('if (res.ok && alive) setPreview(')
    expect(src).toContain('if (res.ok && alive) setResolved(')
  })

  it('το clearTimeout δεν έφυγε — χρειάζονται και τα δύο', () => {
    // Ο φρουρός εμποδίζει τη ζημιά· το debounce γλιτώνει τα περιττά αιτήματα
    expect(src).toContain('alive = false; clearTimeout(t)')
  })
})
