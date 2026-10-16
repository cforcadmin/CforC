/**
 * @jest-environment jsdom
 */
import { replySubject, firstNameOf, OC_COMPOSE_REPLY, emitComposeReply } from '@/lib/ocComposeReply'

describe('Απάντηση σε αίτημα ιστότοπου', () => {
  it('ο χαιρετισμός παίρνει το μικρό όνομα', () => {
    expect(firstNameOf('Αγγελική Κοσμά')).toBe('Αγγελική')
    expect(firstNameOf('  Φωτεινή   Παπαχατζή ')).toBe('Φωτεινή')
    expect(firstNameOf('')).toBe('')
  })

  it('το θέμα κουβαλά την ουσία του αιτήματος — αλλιώς δύο απαντήσεις μοιάζουν ίδιες', () => {
    expect(replySubject('Καλημέρα δεν αποθηκεύει τις αλλαγές.'))
      .toBe('Σχετικά με το αίτημά σου — Καλημέρα δεν αποθηκεύει τις αλλαγές.')
    // Μακρύ αίτημα: κόβεται ΜΕ αποσιωπητικά, δεν κόβεται απότομα
    const long = 'Στη σελίδα News να εμφανίζονται όλες οι καταχωρήσεις χωρίς φίλτρο Τρέχοντα ή Προηγούμενα'
    const out = replySubject(long)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual('Σχετικά με το αίτημά σου — '.length + 61)
    expect(replySubject('')).toBe('Σχετικά με το αίτημά σου')
  })

  it('το συμβάν φτάνει με όλο το φορτίο', () => {
    const seen: any[] = []
    const h = (e: Event) => seen.push((e as CustomEvent).detail)
    window.addEventListener(OC_COMPOSE_REPLY, h)
    emitComposeReply({ name: 'Φωτεινή Παπαχατζή', email: 'f@x.gr', message: 'ΣΦΑΛΜΑ ΔΙΚΤΥΟΥ', pageUrl: '/profile' })
    window.removeEventListener(OC_COMPOSE_REPLY, h)
    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual({ name: 'Φωτεινή Παπαχατζή', email: 'f@x.gr', message: 'ΣΦΑΛΜΑ ΔΙΚΤΥΟΥ', pageUrl: '/profile' })
  })
})
