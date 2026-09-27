import { readFileSync } from 'fs'
import path from 'path'

/**
 * Πού οδηγεί ένα τεύχος στη λίστα.
 *
 * Τα παλιά τεύχη είναι PDF στο Drive· όσα φεύγουν από το OC κρατούν το ίδιο
 * το γράμμα και ΔΕΝ έχουν DriveLink. Πριν από αυτό, μια κάρτα τεύχους του OC
 * θα είχε href="undefined" — δηλαδή η αποστολή θα δημιουργούσε εγγραφή που
 * η σελίδα δεν μπορεί να ανοίξει.
 *
 * Το έργο δεν έχει testing-library, οπότε ο έλεγχος διαβάζει την ΠΗΓΗ.
 */
const list = readFileSync(path.join(process.cwd(), 'components/NewslettersContent.tsx'), 'utf8')
const page = readFileSync(path.join(process.cwd(), 'app/newsletters/[slug]/page.tsx'), 'utf8')

describe('Σύνδεσμος τεύχους', () => {
  it('καμία κάρτα δεν δείχνει πια απευθείας στο DriveLink', () => {
    expect(list).not.toContain('href={newsletter.DriveLink}')
  })

  it('με HTML ανοίγει στη σελίδα μας, αλλιώς στο Drive', () => {
    expect(list).toContain('`/newsletters/${n.Slug}`')
    expect(list).toContain('n.DriveLink')
  })

  it('μόνο ο εξωτερικός σύνδεσμος ανοίγει σε νέα καρτέλα', () => {
    // Το target="_blank" σε εσωτερικό σύνδεσμο είναι σκέτη ενόχληση
    expect(list).toContain("link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}")
  })
})

describe('Σελίδα ανάγνωσης', () => {
  it('το γράμμα μπαίνει σε απομονωμένο πλαίσιο', () => {
    // Είναι ολόκληρο έγγραφο email· μέσα στη σελίδα θα το έβαφαν τα styles μας
    expect(page).toContain('<NewsletterFrame')
  })

  it('τεύχος των μελών θέλει σύνδεση', () => {
    expect(page).toContain("n.Audience === 'members'")
    expect(page).toContain('/login')
  })

  it('τεύχος των μελών δεν ευρετηριάζεται', () => {
    expect(page).toContain('robots: { index: false, follow: false }')
  })

  it('παλιό τεύχος χωρίς HTML δεν σπάει — πάει στο PDF', () => {
    expect(page).toContain('if (!n.Html)')
    expect(page).toContain('Άνοιγμα PDF')
  })
})
