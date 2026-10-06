import { NEWSLETTER_DESKS, OC_EMAIL_DESKS } from '@/components/oc/ocPrefs'
import { NEWSLETTER_AUDIENCES, normaliseAudiences, validateNewsletter, applySenderTags, unsupportedTags, SEAT_TEST_GROUPS } from '@/lib/newsletterAudiences'

/**
 * Το newsletter φεύγει σε ΛΙΣΤΕΣ, ποτέ σε διευθύνσεις που πληκτρολόγησε
 * κάποιος. Αυτός ο περιορισμός είναι το πιο σημαντικό πράγμα σε αυτό το
 * αρχείο: κρατά έξω ανθρώπους που δεν το ζήτησαν ποτέ.
 */
describe('Λίστες newsletter', () => {
  it('υπάρχουν ΜΟΝΟ δύο: Μέλη και Κοινό', () => {
    expect(NEWSLETTER_AUDIENCES.map(a => a.id)).toEqual(['paid', 'external'])
  })

  it('η ομάδα επαφών τύπου ΔΕΝ είναι επιλογή newsletter', () => {
    // Τα δελτία τύπου φεύγουν ως κανονικό μήνυμα, χωρίς σύνδεσμο απεγγραφής
    expect(NEWSLETTER_AUDIENCES.map(a => a.id)).not.toContain('media')
    expect(normaliseAudiences(['media'])).toEqual([])
  })

  it('αγνοεί ό,τι δεν είναι έγκυρη λίστα, και δεν διπλασιάζει', () => {
    expect(normaliseAudiences(['paid', 'paid', 'external', 'ολα', '', null])).toEqual(['paid', 'external'])
    expect(normaliseAudiences('paid')).toEqual([])
    expect(normaliseAudiences(undefined)).toEqual([])
  })
})

describe('Έλεγχος πριν την αποστολή', () => {
  const ok = { subject: 'Τεύχος Οκτωβρίου', blocks: [{ type: 'text' }], audiences: ['paid'] }

  it('περνά με θέμα, σώμα και λίστα', () => {
    expect(validateNewsletter(ok)).toEqual({ ok: true, errors: [] })
  })

  it('χωρίς λίστα δεν φεύγει', () => {
    expect(validateNewsletter({ ...ok, audiences: [] }).errors).toContain('Δεν έχει επιλεγεί λίστα παραληπτών')
  })

  it('χωρίς θέμα ή σώμα δεν φεύγει', () => {
    expect(validateNewsletter({ ...ok, subject: '  ' }).ok).toBe(false)
    expect(validateNewsletter({ ...ok, blocks: [] }).ok).toBe(false)
  })

  it('μια «λίστα» που δεν υπάρχει δεν μετράει ως επιλογή', () => {
    expect(validateNewsletter({ ...ok, audiences: ['media'] }).ok).toBe(false)
  })
})

describe('Πεδία → ετικέτες Sender', () => {
  it('το όνομα και το επώνυμο μεταφράζονται', () => {
    expect(applySenderTags('<p>Γεια σου {{όνομα}} {{επώνυμο}}</p>'))
      .toBe('<p>Γεια σου {{ firstname }} {{ lastname }}</p>')
  })

  it('ανέχεται κενά μέσα στα άγκιστρα', () => {
    expect(applySenderTags('{{  όνομα  }}')).toBe('{{ firstname }}')
  })

  it('δεν πειράζει ό,τι είναι ΗΔΗ ετικέτα του Sender', () => {
    const h = '<a href="{{unsubscribe_link}}">{{unsubscribe_text}}</a> {{ firstname }}'
    expect(applySenderTags(h)).toBe(h)
  })

  it('ό,τι δεν έχει αντίστοιχο μένει ορατό αντί να σβήνει', () => {
    // Καλύτερα να φανεί στη δοκιμαστική αποστολή παρά κενό σε 400 inbox
    expect(applySenderTags('ΑΜ {{ΑΜ}}')).toBe('ΑΜ {{ΑΜ}}')
    expect(unsupportedTags('{{όνομα}} {{ΑΜ}} {{έτος}}').sort()).toEqual(['έτος', 'ΑΜ'].sort())
  })

  it('χωρίς πεδία δεν αλλάζει τίποτα', () => {
    expect(applySenderTags('<p>Καθαρό κείμενο</p>')).toBe('<p>Καθαρό κείμενο</p>')
    expect(unsupportedTags('<p>Καθαρό</p>')).toEqual([])
  })
})

describe('Περιγραφές λιστών', () => {
  it('τα Μέλη είναι ΟΛΑ τα ενεργά μέλη, όχι μόνο τα ταμειακά εντάξει', () => {
    // Η ομάδα «Paid» του Sender γεμίζει με την ΠΡΩΤΗ πληρωμή και δεν αδειάζει
    // κάθε χρόνο — «ταμειακά εντάξει» ήταν λάθος περιγραφή.
    const paid = NEWSLETTER_AUDIENCES.find(a => a.id === 'paid')!
    expect(paid.hint).toContain('ενεργά μέλη')
    expect(paid.hint).not.toContain('ταμειακά')
  })

  it('κάθε λίστα λέει καθαρά ποιους περιέχει', () => {
    for (const a of NEWSLETTER_AUDIENCES) {
      expect(a.label).toBeTruthy()
      expect(a.hint.length).toBeGreaterThan(10)
    }
  })
})

/**
 * Η ΤΕΛΙΚΗ ΔΟΚΙΜΗ ΠΡΕΠΕΙ ΝΑ ΔΟΥΛΕΥΕΙ ΓΙΑ ΚΑΘΕ ΕΔΡΑ ΠΟΥ ΣΤΕΛΝΕΙ ΜΑΖΙΚΑ.
 *
 * 6/10/2026: η Γραμματεία πήρε «Η έδρα σου δεν έχει ομάδα δοκιμών στον
 * Sender» ενώ συνέθετε αληθινή πρόσκληση — το Bulk email είχε ανοίξει για τη
 * Διαχείριση, η ομάδα δοκιμών όμως δεν είχε ακολουθήσει. Το τεστ κλειδώνει
 * τη ΣΧΕΣΗ, όχι τα ids: αν αύριο ανοίξει τρίτο γραφείο, σπάει εδώ.
 */
describe('ομάδες δοκιμών ανά έδρα', () => {
  it('κάθε έδρα των γραφείων που στέλνουν μαζικά έχει ομάδα', () => {
    const seats = NEWSLETTER_DESKS.flatMap(d => OC_EMAIL_DESKS[d] || [])
    const missing = seats.filter(s => !SEAT_TEST_GROUPS[s])
    expect(missing).toEqual([])
  })
  it('η Γραμματεία και η Επικοινωνία έχουν ομάδα', () => {
    expect(SEAT_TEST_GROUPS.admin).toBeTruthy()
    expect(SEAT_TEST_GROUPS.comms).toBeTruthy()
  })
  it('καμία ομάδα δεν μοιράζεται id με άλλη — αλλιώς δοκιμή πάει σε ξένη θυρίδα', () => {
    const ids = Object.values(SEAT_TEST_GROUPS)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
